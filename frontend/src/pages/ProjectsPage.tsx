import { FormEvent, useEffect, useMemo, useState } from 'react';
import { ApiError, apiFetch, toQuery } from '../api';

type Paginated<T> = {
  data: T[];
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
};

type CompanyOption = {
  id: number;
  name: string;
  ruc: string | null;
};

type Project = {
  id: number;
  code: string;
  name: string;
  company_id: number | null;
  is_active: boolean;
  company?: CompanyOption | null;
};

type ProjectForm = {
  code: string;
  name: string;
  company_id: string;
  is_active: boolean;
};

function emptyForm(): ProjectForm {
  return { code: '', name: '', company_id: '', is_active: true };
}

function ProjectModal({
  open,
  title,
  form,
  saving,
  companies,
  onClose,
  onChange,
  onSubmit,
}: {
  open: boolean;
  title: string;
  form: ProjectForm;
  saving: boolean;
  companies: CompanyOption[];
  onClose: () => void;
  onChange: (patch: Partial<ProjectForm>) => void;
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
              <div className="label">Código</div>
              <input value={form.code} onChange={(e) => onChange({ code: e.target.value })} autoFocus />
            </label>

            <label className="field">
              <div className="label">Empresa</div>
              <select value={form.company_id} onChange={(e) => onChange({ company_id: e.target.value })}>
                <option value="">Sin empresa asignada</option>
                {companies.map((company) => (
                  <option key={company.id} value={String(company.id)}>
                    {company.name}
                  </option>
                ))}
              </select>
            </label>

            <label className="field" style={{ gridColumn: '1 / -1' }}>
              <div className="label">Nombre del proyecto</div>
              <input value={form.name} onChange={(e) => onChange({ name: e.target.value })} />
            </label>

            <label className="field">
              <div className="label">Activo</div>
              <select value={form.is_active ? '1' : '0'} onChange={(e) => onChange({ is_active: e.target.value === '1' })}>
                <option value="1">Sí</option>
                <option value="0">No</option>
              </select>
            </label>

            <div className="formActions">
              <button className="btnSoft" type="button" onClick={onClose}>
                Cancelar
              </button>
              <button className="btnPrimary" type="submit" disabled={saving || !form.code.trim() || !form.name.trim()}>
                {saving ? 'Guardando…' : 'Guardar'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

export default function ProjectsPage() {
  const [search, setSearch] = useState('');
  const [onlyActive, setOnlyActive] = useState<boolean | null>(true);
  const [page, setPage] = useState(1);
  const perPage = 25;

  const [data, setData] = useState<Paginated<Project> | null>(null);
  const [companies, setCompanies] = useState<CompanyOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Project | null>(null);
  const [form, setForm] = useState<ProjectForm>(emptyForm());
  const [saving, setSaving] = useState(false);

  const query = useMemo(
    () =>
      toQuery({
        search: search.trim() || null,
        is_active: onlyActive === null ? null : onlyActive,
        page,
        per_page: perPage,
      }),
    [onlyActive, page, search],
  );

  async function loadProjects() {
    setLoading(true);
    setError(null);
    try {
      const res = await apiFetch<Paginated<Project>>(`/api/projects${query}`);
      setData(res);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'No se pudo cargar la lista.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadProjects();
  }, [query]);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const res = await apiFetch<Paginated<CompanyOption>>(`/api/companies${toQuery({ per_page: 200 })}`);
        if (!active) return;
        setCompanies(res.data);
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

  function openEdit(item: Project) {
    setEditing(item);
    setForm({
      code: item.code ?? '',
      name: item.name ?? '',
      company_id: item.company_id ? String(item.company_id) : '',
      is_active: Boolean(item.is_active),
    });
    setModalOpen(true);
  }

  async function submitForm(e: FormEvent) {
    e.preventDefault();
    if (!form.code.trim() || !form.name.trim() || saving) return;
    setSaving(true);

    try {
      await apiFetch<Project>(editing ? `/api/projects/${editing.id}` : '/api/projects', {
        method: editing ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: form.code.trim(),
          name: form.name.trim(),
          company_id: form.company_id ? Number(form.company_id) : null,
          is_active: form.is_active,
        }),
      });
      setModalOpen(false);
      if (page !== 1 && !editing) setPage(1);
      else await loadProjects();
    } catch (e) {
      alert(e instanceof ApiError ? e.message : 'No se pudo guardar el proyecto.');
    } finally {
      setSaving(false);
    }
  }

  async function removeProject(item: Project) {
    if (!confirm(`Eliminar "${item.code} - ${item.name}"?`)) return;
    try {
      await apiFetch<{ message: string }>(`/api/projects/${item.id}`, { method: 'DELETE' });
      await loadProjects();
    } catch (e) {
      alert(e instanceof ApiError ? e.message : 'No se pudo eliminar el proyecto.');
    }
  }

  return (
    <div className="page">
      <div className="pageHeader">
        <div>
          <div className="pageTitle">Proyectos</div>
          <div className="pageSubtitle">Control de proyectos y frentes operativos relacionados a habilitaciones</div>
        </div>
        <button className="btnPrimary" onClick={openCreate} type="button">
          Nuevo proyecto
        </button>
      </div>

      <div className="toolbar">
        <input
          className="search"
          placeholder="Buscar por código o nombre…"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
        />
        <div className="segmented">
          <button type="button" className={onlyActive === true ? 'segBtn segBtnActive' : 'segBtn'} onClick={() => { setOnlyActive(true); setPage(1); }}>
            Activos
          </button>
          <button type="button" className={onlyActive === false ? 'segBtn segBtnActive' : 'segBtn'} onClick={() => { setOnlyActive(false); setPage(1); }}>
            Inactivos
          </button>
          <button type="button" className={onlyActive === null ? 'segBtn segBtnActive' : 'segBtn'} onClick={() => { setOnlyActive(null); setPage(1); }}>
            Todos
          </button>
        </div>
        <div className="metaChip">{data ? `${data.total} registros` : '—'}</div>
      </div>

      {error ? <div className="alert">{error}</div> : null}

      <div className="card">
        <div className="tableWrap">
          <table className="table">
            <thead>
              <tr>
                <th style={{ width: 72 }}>ID</th>
                <th style={{ width: 140 }}>Código</th>
                <th>Proyecto</th>
                <th style={{ width: 280 }}>Empresa</th>
                <th style={{ width: 110 }}>Estado</th>
                <th style={{ width: 180 }} />
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} className="tdMuted">Cargando…</td>
                </tr>
              ) : data && data.data.length ? (
                data.data.map((item) => (
                  <tr key={item.id}>
                    <td className="tdMono">{item.id}</td>
                    <td className="tdMono">{item.code}</td>
                    <td>{item.name}</td>
                    <td>{item.company?.name ?? '—'}</td>
                    <td>{item.is_active ? <span className="pill pillOk">Activo</span> : <span className="pill">Inactivo</span>}</td>
                    <td>
                      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                        <button className="btnSoft" type="button" onClick={() => openEdit(item)}>
                          Editar
                        </button>
                        <button className="btnDanger" type="button" onClick={() => removeProject(item)}>
                          Eliminar
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="tdMuted">Sin proyectos registrados.</td>
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
            {data ? <>Página <span className="tdMono">{data.current_page}</span> de <span className="tdMono">{data.last_page}</span></> : '—'}
          </div>
          <button className="btnSoft" type="button" disabled={!data || data.current_page >= data.last_page} onClick={() => setPage((p) => p + 1)}>
            Siguiente
          </button>
        </div>
      </div>

      <ProjectModal
        open={modalOpen}
        title={editing ? 'Editar proyecto' : 'Nuevo proyecto'}
        form={form}
        saving={saving}
        companies={companies}
        onClose={() => setModalOpen(false)}
        onChange={(patch) => setForm((prev) => ({ ...prev, ...patch }))}
        onSubmit={submitForm}
      />
    </div>
  );
}
