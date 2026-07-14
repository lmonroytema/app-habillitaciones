from __future__ import annotations

import re
import sqlite3
import sys
from datetime import date, datetime
from pathlib import Path
from typing import Any

import openpyxl


ROOT = Path(__file__).resolve().parents[2]
BACKEND_DIR = ROOT / "backend"
WORKBOOK_PATH = ROOT / "App Habilitaciones Local-Hab-2025.xlsm"
SQLITE_PATH = BACKEND_DIR / "database" / "database.sqlite"
PLACEHOLDER_RELATIVE = "imports/metadata-placeholder.txt"
PLACEHOLDER_PATH = BACKEND_DIR / "storage" / "app" / "public" / "imports" / "metadata-placeholder.txt"

PERSON_TYPE = "App\\Models\\Person"
VEHICLE_TYPE = "App\\Models\\Vehicle"
VESSEL_TYPE = "App\\Models\\Vessel"

DOMAIN_TABLES = [
    "documents",
    "requirements",
    "people",
    "vehicles",
    "vessels",
    "projects",
    "companies",
    "positions",
    "personal_groups",
]


def text(value: Any) -> str:
    if value is None:
        return ""
    if isinstance(value, datetime):
        return value.isoformat(sep=" ")
    if isinstance(value, date):
        return value.isoformat()
    if isinstance(value, float):
        if value.is_integer():
            return str(int(value))
        return str(value).strip()
    if isinstance(value, int):
        return str(value)
    return re.sub(r"\s+", " ", str(value)).strip()


def key(value: Any) -> str:
    return text(value).casefold()


def parse_date(value: Any) -> str | None:
    if value in (None, ""):
        return None
    if isinstance(value, datetime):
        return value.date().isoformat()
    if isinstance(value, date):
        return value.isoformat()

    raw = text(value)
    if not raw:
        return None

    raw = raw.replace(" 00:00:00", "")
    for fmt in ("%Y-%m-%d", "%d/%m/%Y", "%m/%d/%Y"):
        try:
            return datetime.strptime(raw, fmt).date().isoformat()
        except ValueError:
            continue

    try:
        return datetime.fromisoformat(raw).date().isoformat()
    except ValueError:
        return None


def is_active(value: Any, default: bool = False) -> int:
    raw = key(value)
    if not raw:
        return 1 if default else 0
    if raw == "activo":
        return 1
    if raw == "inactivo":
        return 0
    return 1 if default else 0


def is_required(value: Any) -> int:
    return 1 if key(value) in {"si", "s", "yes", "true", "1"} else 0


def first_nonempty(*values: Any) -> str:
    for value in values:
        current = text(value)
        if current:
            return current
    return ""


def sheet_rows(workbook: openpyxl.Workbook, sheet_name: str) -> list[list[Any]]:
    rows: list[list[Any]] = []
    worksheet = workbook[sheet_name]
    for row in worksheet.iter_rows(values_only=True):
        if any(value not in (None, "") for value in row):
            rows.append(list(row))
    return rows


def ensure_placeholder() -> int:
    PLACEHOLDER_PATH.parent.mkdir(parents=True, exist_ok=True)
    if not PLACEHOLDER_PATH.exists():
        PLACEHOLDER_PATH.write_text(
            "Documento importado desde el libro XLSM.\n"
            "La base local contiene solo metadatos (nombre, emision, vigencia y observacion), no el archivo original.\n",
            encoding="utf-8",
        )
    return PLACEHOLDER_PATH.stat().st_size


class Importer:
    def __init__(self, workbook: openpyxl.Workbook, conn: sqlite3.Connection) -> None:
        self.workbook = workbook
        self.conn = conn
        self.cur = conn.cursor()
        self.placeholder_size = ensure_placeholder()
        self.user_id = self.cur.execute("SELECT id FROM users ORDER BY id LIMIT 1").fetchone()
        self.uploaded_by = self.user_id[0] if self.user_id else None

        self.company_ids: dict[str, int] = {}
        self.project_ids: dict[str, int] = {}
        self.position_ids: dict[str, int] = {}
        self.group_ids: dict[str, int] = {}
        self.people_ids: dict[str, int] = {}
        self.vehicle_ids: dict[str, int] = {}
        self.vessel_ids: dict[str, int] = {}
        self.requirement_ids: dict[tuple[str, int | None, int | None, str | None, str], int] = {}

    def fail_if_domain_tables_not_empty(self) -> None:
        for table in DOMAIN_TABLES:
            count = self.cur.execute(f"SELECT COUNT(*) FROM {table}").fetchone()[0]
            if count:
                raise RuntimeError(f"La tabla '{table}' ya tiene datos. La importacion requiere tablas vacias.")

    def collect_catalogs(self) -> tuple[dict[str, dict[str, Any]], dict[str, dict[str, Any]], dict[str, dict[str, Any]], dict[str, dict[str, Any]]]:
        companies: dict[str, dict[str, Any]] = {}
        projects: dict[str, dict[str, Any]] = {}
        positions: dict[str, dict[str, Any]] = {}
        groups: dict[str, dict[str, Any]] = {}

        catalog_rows = sheet_rows(self.workbook, "CATALOGOS")[1:]
        for row in catalog_rows:
            project_code = text(row[0] if len(row) > 0 else None)
            project_name = text(row[1] if len(row) > 1 else None)
            client_name = text(row[2] if len(row) > 2 else None)
            state = text(row[5] if len(row) > 5 else None)
            vendor_name = text(row[7] if len(row) > 7 else None)
            position_name = text(row[9] if len(row) > 9 else None)
            group_name = text(row[11] if len(row) > 11 else None)

            if client_name:
                companies.setdefault(key(client_name), {"name": client_name})
            if vendor_name:
                companies.setdefault(key(vendor_name), {"name": vendor_name})
            if position_name:
                positions.setdefault(key(position_name), {"name": position_name, "category": None})
            if group_name:
                groups.setdefault(key(group_name), {"name": group_name})

            if project_code and project_name:
                projects.setdefault(
                    project_code,
                    {
                        "code": project_code,
                        "name": project_name,
                        "client_name": client_name or None,
                        "is_active": is_active(state, default=True),
                    },
                )

        master_people_rows = sheet_rows(self.workbook, "MASTER PERSONAL")[1:]
        master_person_docs_rows = sheet_rows(self.workbook, "MASTER DOCUMENTOS PERSONAL")[1:]
        person_rows = sheet_rows(self.workbook, "PERSONAL")[1:]
        for row in person_rows:
            company_name = text(row[3] if len(row) > 3 else None)
            project_code = text(row[4] if len(row) > 4 else None)
            position_name = text(row[2] if len(row) > 2 else None)
            group_name = text(row[5] if len(row) > 5 else None)

            if company_name:
                companies.setdefault(key(company_name), {"name": company_name})
            if position_name:
                positions.setdefault(key(position_name), {"name": position_name, "category": None})
            if group_name:
                groups.setdefault(key(group_name), {"name": group_name})
            if project_code and project_code not in projects:
                projects[project_code] = {
                    "code": project_code,
                    "name": project_code,
                    "client_name": None,
                    "is_active": 1,
                }

        for row in master_people_rows:
            # Touch the list so that people without assignment can still resolve phone/email later.
            _ = row

        for row in master_person_docs_rows:
            position_name = text(row[0] if len(row) > 0 else None)
            if position_name:
                positions.setdefault(key(position_name), {"name": position_name, "category": None})

        master_vehicle_rows = sheet_rows(self.workbook, "MASTER VEHICULOS")[1:]
        vehicle_rows = sheet_rows(self.workbook, "VEHICULOS")[1:]
        for row in vehicle_rows:
            company_name = text(row[3] if len(row) > 3 else None)
            project_code = text(row[4] if len(row) > 4 else None)

            if company_name:
                companies.setdefault(key(company_name), {"name": company_name})
            if project_code and project_code not in projects:
                projects[project_code] = {
                    "code": project_code,
                    "name": project_code,
                    "client_name": None,
                    "is_active": 1,
                }
        for row in master_vehicle_rows:
            _ = row

        vessel_dashboard = sheet_rows(self.workbook, "DASHBOARD EMBARCACIONES")
        vessel_company = ""
        vessel_project = ""
        vessel_registration = ""
        for row in vessel_dashboard:
            if len(row) > 2 and text(row[1]) == "PROYECTO" and not vessel_project and text(row[2]):
                vessel_project = text(row[2])
            elif len(row) > 2 and text(row[1]) == "EMPRESA" and not vessel_company and text(row[2]):
                vessel_company = text(row[2])
            elif len(row) > 2 and text(row[1]) == "PLACA" and not vessel_registration and text(row[2]):
                vessel_registration = text(row[2])

        if vessel_company:
            companies.setdefault(key(vessel_company), {"name": vessel_company})
        if vessel_project and vessel_project not in projects:
            projects[vessel_project] = {
                "code": vessel_project,
                "name": vessel_project,
                "client_name": None,
                "is_active": 1,
            }

        return companies, projects, positions, groups

    def insert_companies(self, companies: dict[str, dict[str, Any]]) -> None:
        items = sorted(companies.values(), key=lambda item: item["name"])
        for item in items:
            self.cur.execute(
                """
                INSERT INTO companies (name, ruc, email, phone, address, tenant_id, created_at, updated_at)
                VALUES (?, NULL, NULL, NULL, NULL, NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
                """,
                (item["name"],),
            )
            self.company_ids[key(item["name"])] = int(self.cur.lastrowid)

    def insert_projects(self, projects: dict[str, dict[str, Any]]) -> None:
        items = sorted(projects.values(), key=lambda item: item["code"])
        for item in items:
            company_id = self.company_ids.get(key(item["client_name"])) if item["client_name"] else None
            self.cur.execute(
                """
                INSERT INTO projects (code, name, company_id, is_active, tenant_id, created_at, updated_at)
                VALUES (?, ?, ?, ?, NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
                """,
                (item["code"], item["name"], company_id, item["is_active"]),
            )
            self.project_ids[item["code"]] = int(self.cur.lastrowid)

    def insert_positions(self, positions: dict[str, dict[str, Any]]) -> None:
        items = sorted(positions.values(), key=lambda item: item["name"])
        for item in items:
            self.cur.execute(
                """
                INSERT INTO positions (name, category, tenant_id, created_at, updated_at)
                VALUES (?, ?, NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
                """,
                (item["name"], item.get("category")),
            )
            self.position_ids[key(item["name"])] = int(self.cur.lastrowid)

    def insert_groups(self, groups: dict[str, dict[str, Any]]) -> None:
        items = sorted(groups.values(), key=lambda item: item["name"])
        for item in items:
            self.cur.execute(
                """
                INSERT INTO personal_groups (name, tenant_id, created_at, updated_at)
                VALUES (?, NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
                """,
                (item["name"],),
            )
            self.group_ids[key(item["name"])] = int(self.cur.lastrowid)

    def choose_best_row(self, current: dict[str, Any] | None, candidate: dict[str, Any]) -> dict[str, Any]:
        if current is None:
            return candidate

        def score(item: dict[str, Any]) -> tuple[int, int, int, int, int]:
            return (
                item.get("is_active", 0),
                1 if item.get("project_code") else 0,
                1 if item.get("company_name") else 0,
                1 if item.get("position_name") else 0,
                1 if item.get("group_name") else 0,
            )

        return candidate if score(candidate) > score(current) else current

    def import_people(self) -> None:
        master_rows = sheet_rows(self.workbook, "MASTER PERSONAL")[1:]
        assignment_rows = sheet_rows(self.workbook, "PERSONAL")[1:]

        master_people: dict[str, dict[str, Any]] = {}
        for row in master_rows:
            document_id = text(row[0] if len(row) > 0 else None)
            full_name = text(row[1] if len(row) > 1 else None)
            phone = text(row[2] if len(row) > 2 else None)
            email = text(row[3] if len(row) > 3 else None)
            person_key = document_id or key(full_name)
            if not person_key or not full_name:
                continue
            master_people[person_key] = {
                "document_id": document_id or None,
                "full_name": full_name,
                "phone": phone or None,
                "email": email or None,
            }

        best_assignments: dict[str, dict[str, Any]] = {}
        for row in assignment_rows:
            document_id = text(row[0] if len(row) > 0 else None)
            full_name = text(row[1] if len(row) > 1 else None)
            position_name = text(row[2] if len(row) > 2 else None)
            company_name = text(row[3] if len(row) > 3 else None)
            project_code = text(row[4] if len(row) > 4 else None)
            group_name = text(row[5] if len(row) > 5 else None)
            active = is_active(row[6] if len(row) > 6 else None)
            person_key = document_id or key(full_name)
            if not person_key or not full_name:
                continue
            best_assignments[person_key] = self.choose_best_row(
                best_assignments.get(person_key),
                {
                    "document_id": document_id or None,
                    "full_name": full_name,
                    "position_name": position_name or None,
                    "company_name": company_name or None,
                    "project_code": project_code or None,
                    "group_name": group_name or None,
                    "is_active": active,
                },
            )

        person_keys = sorted(set(master_people.keys()) | set(best_assignments.keys()))
        for person_key in person_keys:
            master = master_people.get(person_key, {})
            assignment = best_assignments.get(person_key, {})

            document_id = first_nonempty(assignment.get("document_id"), master.get("document_id")) or None
            full_name = first_nonempty(assignment.get("full_name"), master.get("full_name"))
            if not full_name:
                continue

            email = first_nonempty(master.get("email"))
            phone = first_nonempty(master.get("phone"))
            project_id = self.project_ids.get(text(assignment.get("project_code")))
            company_id = self.company_ids.get(key(assignment.get("company_name")))
            position_id = self.position_ids.get(key(assignment.get("position_name")))
            group_id = self.group_ids.get(key(assignment.get("group_name")))
            active = assignment.get("is_active", 0)

            self.cur.execute(
                """
                INSERT INTO people (
                    project_id, company_id, position_id, personal_group_id, document_id, full_name,
                    email, phone, is_active, tenant_id, created_at, updated_at
                )
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
                """,
                (
                    project_id,
                    company_id,
                    position_id,
                    group_id,
                    document_id,
                    full_name,
                    email or None,
                    phone or None,
                    active,
                ),
            )
            person_id = int(self.cur.lastrowid)
            if document_id:
                self.people_ids[document_id] = person_id

    def import_vehicles(self) -> None:
        master_rows = sheet_rows(self.workbook, "MASTER VEHICULOS")[1:]
        assignment_rows = sheet_rows(self.workbook, "VEHICULOS")[1:]

        master_vehicles: dict[str, dict[str, Any]] = {}
        for row in master_rows:
            plate = text(row[0] if len(row) > 0 else None)
            vehicle_type = text(row[1] if len(row) > 1 else None)
            brand = text(row[2] if len(row) > 2 else None)
            model = text(row[3] if len(row) > 3 else None)
            year = text(row[5] if len(row) > 5 else None)
            if not plate:
                continue
            master_vehicles[plate] = {
                "plate": plate,
                "vehicle_type": vehicle_type or None,
                "brand": brand or None,
                "model": model or None,
                "year": year or None,
            }

        best_assignments: dict[str, dict[str, Any]] = {}
        for row in assignment_rows:
            plate = text(row[0] if len(row) > 0 else None)
            service = text(row[1] if len(row) > 1 else None)
            vehicle_type = text(row[2] if len(row) > 2 else None)
            company_name = text(row[3] if len(row) > 3 else None)
            project_code = text(row[4] if len(row) > 4 else None)
            active = is_active(row[5] if len(row) > 5 else None)
            if not plate:
                continue
            best_assignments[plate] = self.choose_best_row(
                best_assignments.get(plate),
                {
                    "plate": plate,
                    "service": service or None,
                    "vehicle_type": vehicle_type or None,
                    "company_name": company_name or None,
                    "project_code": project_code or None,
                    "is_active": active,
                },
            )

        plates = sorted(set(master_vehicles.keys()) | set(best_assignments.keys()))
        for plate in plates:
            master = master_vehicles.get(plate, {})
            assignment = best_assignments.get(plate, {})

            vehicle_type = first_nonempty(assignment.get("vehicle_type"), master.get("vehicle_type")) or None
            brand = first_nonempty(master.get("brand")) or None
            model = first_nonempty(master.get("model")) or None
            year = first_nonempty(master.get("year")) or None
            project_id = self.project_ids.get(text(assignment.get("project_code")))
            company_id = self.company_ids.get(key(assignment.get("company_name")))
            active = assignment.get("is_active", 0)

            self.cur.execute(
                """
                INSERT INTO vehicles (
                    project_id, company_id, position_id, plate, vehicle_type, brand, model, year,
                    is_active, tenant_id, created_at, updated_at
                )
                VALUES (?, ?, NULL, ?, ?, ?, ?, ?, ?, NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
                """,
                (project_id, company_id, plate, vehicle_type, brand, model, year, active),
            )
            self.vehicle_ids[plate] = int(self.cur.lastrowid)

    def import_vessels(self) -> None:
        dashboard_rows = sheet_rows(self.workbook, "DASHBOARD EMBARCACIONES")
        management_rows = sheet_rows(self.workbook, "GESTION INTEGRAL EMBARCACIONES")[1:]

        vessel_project = None
        vessel_company = None
        for row in dashboard_rows:
            if len(row) > 2 and text(row[1]) == "PROYECTO" and vessel_project is None and text(row[2]):
                vessel_project = self.project_ids.get(text(row[2]))
            elif len(row) > 2 and text(row[1]) == "EMPRESA" and vessel_company is None and text(row[2]):
                vessel_company = self.company_ids.get(key(row[2]))

        for row in management_rows:
            registration = text(row[0] if len(row) > 0 else None)
            service = text(row[1] if len(row) > 1 else None)
            vessel_type = text(row[2] if len(row) > 2 else None)
            active = is_active(row[3] if len(row) > 3 else None)
            if not registration:
                continue
            name = registration
            self.cur.execute(
                """
                INSERT INTO vessels (
                    project_id, company_id, name, registration, is_active, tenant_id, created_at, updated_at
                )
                VALUES (?, ?, ?, ?, ?, NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
                """,
                (vessel_project, vessel_company, name, registration, active),
            )
            self.vessel_ids[registration] = int(self.cur.lastrowid)

    def add_requirement(
        self,
        scope: str,
        name: str,
        abbreviation: str | None,
        required_flag: int,
        project_code: str | None = None,
        position_name: str | None = None,
        vehicle_type: str | None = None,
    ) -> None:
        project_id = self.project_ids.get(project_code) if project_code else None
        position_id = self.position_ids.get(key(position_name)) if position_name else None
        normalized_name = text(name)
        requirement_key = (scope, project_id, position_id, vehicle_type or None, key(normalized_name))
        if requirement_key in self.requirement_ids or not normalized_name:
            return
        self.cur.execute(
            """
            INSERT INTO requirements (
                scope, name, abbreviation, is_required, project_id, position_id, vehicle_type,
                tenant_id, created_at, updated_at
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
            """,
            (scope, normalized_name, abbreviation, required_flag, project_id, position_id, vehicle_type),
        )
        self.requirement_ids[requirement_key] = int(self.cur.lastrowid)

    def import_requirements(self) -> None:
        doc_x_position_rows = sheet_rows(self.workbook, "DOCUMENTO X PUESTO")[1:]
        master_person_docs_rows = sheet_rows(self.workbook, "MASTER DOCUMENTOS PERSONAL")[1:]
        req_x_vehicle_rows = sheet_rows(self.workbook, "REQUISITOS X VEHICULO")[1:]
        master_vehicle_req_rows = sheet_rows(self.workbook, "MASTER REQUISITOS VEHICULO")[1:]

        person_abbreviations: dict[tuple[str, str], str] = {}
        for row in master_person_docs_rows:
            position_name = text(row[0] if len(row) > 0 else None)
            document_name = text(row[1] if len(row) > 1 else None)
            abbreviation = text(row[5] if len(row) > 5 else None)
            if position_name and document_name and abbreviation:
                person_abbreviations[(key(position_name), key(document_name))] = abbreviation
                self.add_requirement("person", document_name, abbreviation, 1, None, position_name, None)

        for row in doc_x_position_rows:
            position_name = text(row[0] if len(row) > 0 else None)
            document_name = text(row[1] if len(row) > 1 else None)
            required_flag = is_required(row[2] if len(row) > 2 else None)
            project_code = text(row[3] if len(row) > 3 else None) or None
            abbreviation = person_abbreviations.get((key(position_name), key(document_name)))
            self.add_requirement("person", document_name, abbreviation, required_flag, project_code, position_name, None)

        vehicle_abbreviations: dict[tuple[str, str, str], str] = {}
        for row in master_vehicle_req_rows:
            service = text(row[0] if len(row) > 0 else None)
            vehicle_type = text(row[1] if len(row) > 1 else None)
            requirement_name = text(row[2] if len(row) > 2 else None)
            abbreviation = text(row[6] if len(row) > 6 else None)
            scope = "vessel" if key(service) == "embarcacion" else "vehicle"
            if service and vehicle_type and requirement_name and abbreviation:
                vehicle_abbreviations[(key(service), key(vehicle_type), key(requirement_name))] = abbreviation
            self.add_requirement(scope, requirement_name, abbreviation or None, 1, None, None, vehicle_type or None)

        for row in req_x_vehicle_rows:
            service = text(row[0] if len(row) > 0 else None)
            vehicle_type = text(row[1] if len(row) > 1 else None)
            requirement_name = text(row[2] if len(row) > 2 else None)
            required_flag = is_required(row[3] if len(row) > 3 else None)
            project_code = text(row[4] if len(row) > 4 else None) or None
            scope = "vessel" if key(service) == "embarcacion" else "vehicle"
            abbreviation = vehicle_abbreviations.get((key(service), key(vehicle_type), key(requirement_name)))
            self.add_requirement(scope, requirement_name, abbreviation, required_flag, project_code, None, vehicle_type or None)

    def lookup_requirement_id(
        self,
        scope: str,
        name: str,
        project_id: int | None = None,
        position_id: int | None = None,
        vehicle_type: str | None = None,
    ) -> int | None:
        name_key = key(name)
        candidates = [
            (scope, project_id, position_id, vehicle_type, name_key),
            (scope, None, position_id, vehicle_type, name_key),
            (scope, project_id, None, vehicle_type, name_key),
            (scope, None, None, vehicle_type, name_key),
            (scope, project_id, position_id, None, name_key),
            (scope, None, position_id, None, name_key),
            (scope, project_id, None, None, name_key),
            (scope, None, None, None, name_key),
        ]
        for candidate in candidates:
            if candidate in self.requirement_ids:
                return self.requirement_ids[candidate]
        return None

    def import_documents(self) -> None:
        person_doc_rows = sheet_rows(self.workbook, "PERSONAL DOCUMENTOS")[1:]
        vehicle_doc_rows = sheet_rows(self.workbook, "VEHICULO DOCUMENTOS")

        placeholder_path = PLACEHOLDER_RELATIVE
        now = "CURRENT_TIMESTAMP"

        for row in person_doc_rows:
            document_id = text(row[0] if len(row) > 0 else None)
            document_name = text(row[1] if len(row) > 1 else None)
            issue_date = parse_date(row[2] if len(row) > 2 else None)
            expiry_date = parse_date(row[3] if len(row) > 3 else None)
            observation = text(row[4] if len(row) > 4 else None) or None
            person_id = self.people_ids.get(document_id)
            if not person_id or not document_name:
                continue

            person_row = self.cur.execute(
                "SELECT project_id, position_id FROM people WHERE id = ?",
                (person_id,),
            ).fetchone()
            project_id = int(person_row[0]) if person_row and person_row[0] is not None else None
            position_id = int(person_row[1]) if person_row and person_row[1] is not None else None
            requirement_id = self.lookup_requirement_id("person", document_name, project_id, position_id, None)

            self.cur.execute(
                f"""
                INSERT INTO documents (
                    documentable_type, documentable_id, requirement_id, issue_date, expiry_date, observation,
                    original_filename, stored_path, storage_driver, sharepoint_drive_id, sharepoint_item_id,
                    sharepoint_web_url, mime_type, size_bytes, uploaded_by, tenant_id, created_at, updated_at
                )
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'local', NULL, NULL, NULL, 'text/plain', ?, ?, NULL, {now}, {now})
                """,
                (
                    PERSON_TYPE,
                    person_id,
                    requirement_id,
                    issue_date,
                    expiry_date,
                    observation,
                    document_name,
                    placeholder_path,
                    self.placeholder_size,
                    self.uploaded_by,
                ),
            )

        start_index = 1 if vehicle_doc_rows and key(vehicle_doc_rows[0][0]) in {"placa", ""} else 0
        for row in vehicle_doc_rows[start_index:]:
            plate = text(row[0] if len(row) > 0 else None)
            document_name = text(row[1] if len(row) > 1 else None)
            issue_date = parse_date(row[2] if len(row) > 2 else None)
            expiry_date = parse_date(row[3] if len(row) > 3 else None)
            observation = text(row[4] if len(row) > 4 else None) or None
            vehicle_id = self.vehicle_ids.get(plate)
            if not vehicle_id or not document_name:
                continue

            vehicle_row = self.cur.execute(
                "SELECT project_id, vehicle_type FROM vehicles WHERE id = ?",
                (vehicle_id,),
            ).fetchone()
            project_id = int(vehicle_row[0]) if vehicle_row and vehicle_row[0] is not None else None
            vehicle_type = text(vehicle_row[1]) if vehicle_row and vehicle_row[1] is not None else None
            requirement_id = self.lookup_requirement_id("vehicle", document_name, project_id, None, vehicle_type or None)

            self.cur.execute(
                f"""
                INSERT INTO documents (
                    documentable_type, documentable_id, requirement_id, issue_date, expiry_date, observation,
                    original_filename, stored_path, storage_driver, sharepoint_drive_id, sharepoint_item_id,
                    sharepoint_web_url, mime_type, size_bytes, uploaded_by, tenant_id, created_at, updated_at
                )
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'local', NULL, NULL, NULL, 'text/plain', ?, ?, NULL, {now}, {now})
                """,
                (
                    VEHICLE_TYPE,
                    vehicle_id,
                    requirement_id,
                    issue_date,
                    expiry_date,
                    observation,
                    document_name,
                    placeholder_path,
                    self.placeholder_size,
                    self.uploaded_by,
                ),
            )

    def summary(self) -> dict[str, int]:
        result: dict[str, int] = {}
        for table in ["companies", "projects", "positions", "personal_groups", "people", "vehicles", "vessels", "requirements", "documents"]:
            result[table] = int(self.cur.execute(f"SELECT COUNT(*) FROM {table}").fetchone()[0])
        return result


def main() -> int:
    if not WORKBOOK_PATH.exists():
        print(f"No se encontro el archivo: {WORKBOOK_PATH}")
        return 1

    if not SQLITE_PATH.exists():
        print(f"No se encontro la base SQLite: {SQLITE_PATH}")
        return 1

    workbook = openpyxl.load_workbook(WORKBOOK_PATH, data_only=True, keep_vba=True)
    conn = sqlite3.connect(SQLITE_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")

    importer = Importer(workbook, conn)
    try:
        importer.fail_if_domain_tables_not_empty()
        companies, projects, positions, groups = importer.collect_catalogs()
        with conn:
            importer.insert_companies(companies)
            importer.insert_projects(projects)
            importer.insert_positions(positions)
            importer.insert_groups(groups)
            importer.import_people()
            importer.import_vehicles()
            importer.import_vessels()
            importer.import_requirements()
            importer.import_documents()
        print(importer.summary())
    except Exception as exc:  # pragma: no cover - one-off operational script
        print(f"Importacion fallida: {exc}")
        return 1
    finally:
        conn.close()

    return 0


if __name__ == "__main__":
    sys.exit(main())
