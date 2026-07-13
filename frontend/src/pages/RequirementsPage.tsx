import { FormEvent, useEffect, useMemo, useState } from 'react';
import { ApiError, apiFetch, toQuery } from '../api';

type Paginated<T> = {
  data: T[];
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
};

type ProjectOption = {
  id: number;
  code: string;
  name: string;
};

type PositionOption = {
  id: number;
  name: string;
  category: string | null;
};

type Requirement = {
  id: number;
  scope: string;
  name: string;
  abbreviation: string | null;
  is_required: boolean;
  project_id: number | null;
  position_id: number | null;
  vehicle_type: string | null;
  project?: ProjectOption | null;
  position?: PositionOption | null;
};

type RequirementForm = {
  scope: string;
  name: string;
  abbreviation: string;
  is_required: boolean;
  project_id: string;
  position_id: string;
  vehicle_type: string;
};

const SCOPE_OPTIONS = ['PERSONA', 'VEHICULO', 'EMBARCACION', 'GENERAL'];

function emptyForm(): RequirementForm {
  return {
    scope: 'PERSONA',
    name: '',
    abbreviation: '',
    is_required: true,
    project_id: '',
    position_id: '',
    vehicle_type: '',
  };
}

function scopeLabel(scope: string) {
  return scope.charAt(0).toUpperCase() + scope.slice(1).toLowerCase();
}

function RequirementModal({
  open,
  title,
  form,
  saving,
  projects,
  positions,
  onClose,
  onChange,
  onSubmit,
}: {
  open: boolean;
  title: string;
  form: RequirementForm;
  saving: boolean;
  projects: ProjectOption[];
  positions: PositionOption[];
  onClose: () => void;
  onChange: (patch: Partial<RequirementForm>) => void;
  onSubmit: (e: FormEvent) => void;
}) {
  if (!open) return null;

  return (
    <div className="modalOverlay" onMouseDown={onClose} role="presentation">
      <div className="modal" onMouseDown={(e) => e.stopPropagation()}>
        <div className="modalHeader">
          <div className="modalTitle">{title}</div>
          <button className="iconBtn" onClick={onClose} type="button" aria-label="Cerrar">
            ×
          </button>
        </div>
        <div className="modalBody">
          <form onSubmit={onSubmit} className="formGrid">
            <label className="field">
              <div className="label">Alcance</div>
              <select value={form.scope} onChange={(e) => onChange({ scope: e.target.value })}>
                {SCOPE_OPTIONS.map((scope) => (
                  <option key={scope} value={scope}>
                    {scopeLabel(scope)}
                  </option>
                ))}
              </select>
            </label>

            <label className="field">
              <div className="label">Abreviatura</div>
              <input value={form.abbreviation} onChange={(e) => onChange({ abbreviation: e.target.value })} />
            </label>

            <label className="field" style={{ gridColumn: '1 / -1' }}>
              <div className="label">Nombre del requisito</div>
              <input value={form.name} onChange={(e) => onChange({ name: e.target.value })} autoFocus />
            </label>

            <label className="field">
              <div className="label">Proyecto</div>
              <select value={form.project_id} onChange={(e) => onChange({ project_id: e.target.value })}>
                <option value="">Todos / No aplica</option>
                {projects.map((project) => (
                  <option key={project.id} value={String(project.id)}>
                    {project.code} - {project.name}
                  </option>
                ))}
              </select>
            </label>

            <label className="field">
              <div className="label">Cargo</div>
              <select value={form.position_id} onChange={(e) => onChange({ position_id: e.target.value })}>
                <option value="">Todos / No aplica</option>
                {positions.map((position) => (
                  <option key={position.id} value={String(position.id)}>
                    {position.name}
                  </option>
                ))}
              </select>
            </label>

            <label className="field">
              <div className="label">Tipo de vehículo</div>
              <input value={form.vehicle_type} onChange={(e) => onChange({ vehicle_type: e.target.value })} />
            </label>

            <label className="field">
              <div className="label">Obligatorio</div>
              <select value={form.is_required ? '1' : '0'} onChange={(e) => onChange({ is_required: e.target.value === '1' })}>
                <option value="1">Sí</option>
                <option value="0">No</option>
              </select>
            </label>

            <div className="formActions">
              <button className="btnSoft" type="button" onClick={onClose}>
                Cancelar
              </button>
              <button className="btnPrimary" type="submit" disabled={saving || !form.name.trim()}>
                {saving ? 'Guardando…' : 'Guardar'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

export default function RequirementsPage() {
  const [search, setSearch] = useState('');
  const [scope, setScope] = useState('');
  const [page, setPage] = useState(1);
  const perPage = 25;

  const [data, setData] = useState<Paginated<Requirement> | null>(null);
  const [projects, setProjects] = useState<ProjectOption[]>([]);
  const [positions, setPositions] = useState<PositionOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Requirement | null>(null);
  const [form, setForm] = useState<RequirementForm>(emptyForm());
  const [saving, setSaving] = useState(false);

  const query = useMemo(
    () =>
      toQuery({
        search: search.trim() || null,
        scope: scope || null,
        page,
        per_page: perPage,
      }),
    [page, perPage, scope, search],
  );

  async function loadRequirements() {
    setLoading(true);
    setError(null);
    try {
      const res = await apiFetch<Paginated<Requirement>>(`/api/requirements${query}`);
      setData(res);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'No se pudo cargar la lista.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadRequirements();
  }, [query]);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const [projectsRes, positionsRes] = await Promise.all([
          apiFetch<Paginated<ProjectOption>>(`/api/projects${toQuery({ per_page: 200, is_active: true })}`),
          apiFetch<Paginated<PositionOption>>(`/api/positions${toQuery({ per_page: 200 })}`),
        ]);
        if (!active) return;
        setProjects(projectsRes.data);
        setPositions(positionsRes.data);
      } catch {
        if (!active) return;
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  function openCreate() {
    setEditing(null);
    setForm(emptyForm());
    setModalOpen(true);
  }

  function openEdit(item: Requirement) {
    setEditing(item);
    setForm({
      scope: item.scope || 'PERSONA',
      name: item.name ?? '',
      abbreviation: item.abbreviation ?? '',
      is_required: Boolean(item.is_required),
      project_id: item.project_id ? String(item.project_id) : '',
      position_id: item.position_id ? String(item.position_id) : '',
      vehicle_type: item.vehicle_type ?? '',
    });
    setModalOpen(true);
  }

  async function submitForm(e: FormEvent) {
    e.preventDefault();
    if (!form.name.trim() || saving) return;

    setSaving(true);
    try {
      await apiFetch<Requirement>(editing ? `/api/requirements/${editing.id}` : '/api/requirements', {
        method: editing ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          scope: form.scope,
          name: form.name.trim(),
          abbreviation: form.abbreviation.trim() || null,
          is_required: form.is_required,
          project_id: form.project_id ? Number(form.project_id) : null,
          position_id: form.position_id ? Number(form.position_id) : null,
          vehicle_type: form.vehicle_type.trim() || null,
        }),
      });
      setModalOpen(false);
      setEditing(null);
      if (page !== 1 && !editing) setPage(1);
      else await loadRequirements();
    } catch (e) {
      alert(e instanceof ApiError ? e.message : 'No se pudo guardar el requisito.');
    } finally {
      setSaving(false);
    }
  }

  async function removeRequirement(item: Requirement) {
    if (!confirm(`Eliminar "${item.name}"?`)) return;
    try {
      await apiFetch<{ message: string }>(`/api/requirements/${item.id}`, { method: 'DELETE' });
      await loadRequirements();
    } catch (e) {
      alert(e instanceof ApiError ? e.message : 'No se pudo eliminar el requisito.');
    }
  }

  return (
    <div className="page">
      <div className="pageHeader">
        <div>
          <div className="pageTitle">Requisitos</div>
          <div className="pageSubtitle">Matriz configurable por alcance, proyecto, cargo y tipo de vehículo</div>
        </div>
        <button className="btnPrimary" onClick={openCreate} type="button">
          Nuevo requisito
        </button>
      </div>

      <div className="toolbar">
        <input
          className="search"
          placeholder="Buscar por nombre…"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
        />

        <select
          className="search"
          style={{ maxWidth: 220 }}
          value={scope}
          onChange={(e) => {
            setScope(e.target.value);
            setPage(1);
          }}
        >
          <option value="">Todos los alcances</option>
          {SCOPE_OPTIONS.map((item) => (
            <option key={item} value={item}>
              {scopeLabel(item)}
            </option>
          ))}
        </select>

        <div className="metaChip">{data ? `${data.total} registros` : '—'}</div>
      </div>

      {error ? <div className="alert">{error}</div> : null}

      <div className="card">
        <div className="tableWrap">
          <table className="table">
            <thead>
              <tr>
                <th style={{ width: 72 }}>ID</th>
                <th style={{ width: 130 }}>Alcance</th>
                <th>Requisito</th>
                <th style={{ width: 120 }}>Abrev.</th>
                <th style={{ width: 210 }}>Proyecto</th>
                <th style={{ width: 180 }}>Cargo</th>
                <th style={{ width: 150 }}>Tipo vehículo</th>
                <th style={{ width: 110 }}>Obligatorio</th>
                <th style={{ width: 180 }} />
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={9} className="tdMuted">
                    Cargando…
                  </td>
                </tr>
              ) : data && data.data.length ? (
                data.data.map((item) => (
                  <tr key={item.id}>
                    <td className="tdMono">{item.id}</td>
                    <td><span className="pill">{scopeLabel(item.scope)}</span></td>
                    <td>{item.name}</td>
                    <td className="tdMono">{item.abbreviation ?? '—'}</td>
                    <td>{item.project ? `${item.project.code} - ${item.project.name}` : '—'}</td>
                    <td>{item.position?.name ?? '—'}</td>
                    <td>{item.vehicle_type ?? '—'}</td>
                    <td>{item.is_required ? <span className="pill pillOk">Sí</span> : <span className="pill">No</span>}</td>
                    <td>
                      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                        <button className="btnSoft" type="button" onClick={() => openEdit(item)}>
                          Editar
                        </button>
                        <button className="btnDanger" type="button" onClick={() => removeRequirement(item)}>
                          Eliminar
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={9} className="tdMuted">
                    Sin requisitos registrados.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="pager">
          <button className="btnSoft" type="button" disabled={!data || data.current_page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>
            Anterior
          </button>
          <div className="pagerMeta">
            {data ? (
              <>
                Página <span className="tdMono">{data.current_page}</span> de <span className="tdMono">{data.last_page}</span>
              </>
            ) : (
              '—'
            )}
          </div>
          <button className="btnSoft" type="button" disabled={!data || data.current_page >= data.last_page} onClick={() => setPage((p) => p + 1)}>
            Siguiente
          </button>
        </div>
      </div>

      <RequirementModal
        open={modalOpen}
        title={editing ? 'Editar requisito' : 'Nuevo requisito'}
        form={form}
        saving={saving}
        projects={projects}
        positions={positions}
        onClose={() => setModalOpen(false)}
        onChange={(patch) => setForm((prev) => ({ ...prev, ...patch }))}
        onSubmit={submitForm}
      />
    </div>
  );
}
