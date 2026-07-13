import { FormEvent, useEffect, useMemo, useState } from 'react';
import { ApiError, apiFetch, apiFetchBlob, toQuery } from '../api';

type Paginated<T> = {
  data: T[];
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
};

type RequirementOption = {
  id: number;
  name: string;
  abbreviation: string | null;
};

type UserOption = {
  id: number;
  name: string;
  email: string;
};

type DocumentItem = {
  id: number;
  original_filename: string;
  url: string | null;
  status: 'SIN_VIGENCIA' | 'VENCIDO' | 'POR_VENCER' | 'VIGENTE';
  issue_date: string | null;
  expiry_date: string | null;
  observation: string | null;
  requirement_id?: number | null;
  requirement?: RequirementOption | null;
  uploaded_by_relation?: UserOption | null;
  created_at?: string | null;
  documentable_type: string;
  documentable_id: number;
};

type DocumentForm = {
  requirement_id: string;
  issue_date: string;
  expiry_date: string;
  observation: string;
};

function emptyForm(): DocumentForm {
  return { requirement_id: '', issue_date: '', expiry_date: '', observation: '' };
}

function formatDateISO(v: string | null | undefined) {
  if (!v) return '';
  return v.slice(0, 10);
}

function formatDocumentable(type: string) {
  if (type.includes('Person')) return 'Persona';
  if (type.includes('Vehicle')) return 'Vehículo';
  if (type.includes('Vessel')) return 'Embarcación';
  return type;
}

function StatusPill({ status }: { status: DocumentItem['status'] }) {
  const cls =
    status === 'VIGENTE'
      ? 'pill pillOk'
      : status === 'POR_VENCER'
        ? 'pill pillWarn'
        : status === 'VENCIDO'
          ? 'pill pillBad'
          : 'pill';
  const label =
    status === 'SIN_VIGENCIA' ? 'Sin vigencia' : status === 'POR_VENCER' ? 'Por vencer' : status === 'VENCIDO' ? 'Vencido' : 'Vigente';
  return <span className={cls}>{label}</span>;
}

function DocumentModal({
  open,
  form,
  saving,
  requirements,
  onClose,
  onChange,
  onSubmit,
}: {
  open: boolean;
  form: DocumentForm;
  saving: boolean;
  requirements: RequirementOption[];
  onClose: () => void;
  onChange: (patch: Partial<DocumentForm>) => void;
  onSubmit: (e: FormEvent) => void;
}) {
  if (!open) return null;

  return (
    <div className="modalOverlay" onMouseDown={onClose} role="presentation">
      <div className="modal" onMouseDown={(e) => e.stopPropagation()}>
        <div className="modalHeader">
          <div className="modalTitle">Editar documento</div>
          <button className="iconBtn" onClick={onClose} type="button" aria-label="Cerrar">
            ×
          </button>
        </div>
        <div className="modalBody">
          <form onSubmit={onSubmit} className="formGrid">
            <label className="field">
              <div className="label">Requisito asociado</div>
              <select value={form.requirement_id} onChange={(e) => onChange({ requirement_id: e.target.value })}>
                <option value="">Sin requisito</option>
                {requirements.map((item) => (
                  <option key={item.id} value={String(item.id)}>
                    {item.abbreviation ? `${item.abbreviation} - ` : ''}
                    {item.name}
                  </option>
                ))}
              </select>
            </label>

            <label className="field">
              <div className="label">Fecha de emisión</div>
              <input type="date" value={form.issue_date} onChange={(e) => onChange({ issue_date: e.target.value })} />
            </label>

            <label className="field">
              <div className="label">Fecha de vencimiento</div>
              <input type="date" value={form.expiry_date} onChange={(e) => onChange({ expiry_date: e.target.value })} />
            </label>

            <label className="field" style={{ gridColumn: '1 / -1' }}>
              <div className="label">Observación</div>
              <input value={form.observation} onChange={(e) => onChange({ observation: e.target.value })} />
            </label>

            <div className="formActions">
              <button className="btnSoft" type="button" onClick={onClose}>
                Cancelar
              </button>
              <button className="btnPrimary" type="submit" disabled={saving}>
                {saving ? 'Guardando…' : 'Guardar cambios'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

export default function DocumentsPage() {
  const [search, setSearch] = useState('');
  const [type, setType] = useState('');
  const [page, setPage] = useState(1);
  const perPage = 25;

  const [data, setData] = useState<Paginated<DocumentItem> | null>(null);
  const [requirements, setRequirements] = useState<RequirementOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [editing, setEditing] = useState<DocumentItem | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState<DocumentForm>(emptyForm());
  const [saving, setSaving] = useState(false);

  const query = useMemo(
    () =>
      toQuery({
        page,
        per_page: perPage,
        documentable_type: type || null,
      }),
    [page, type],
  );

  async function loadDocuments() {
    setLoading(true);
    setError(null);
    try {
      const res = await apiFetch<Paginated<DocumentItem>>(`/api/documents${query}`);
      const filtered = search.trim()
        ? {
            ...res,
            data: res.data.filter((item) =>
              `${item.original_filename} ${item.requirement?.name ?? ''} ${item.observation ?? ''}`.toLowerCase().includes(search.trim().toLowerCase()),
            ),
          }
        : res;
      setData(filtered);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'No se pudo cargar la lista.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadDocuments();
  }, [query, search]);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const res = await apiFetch<Paginated<RequirementOption>>(`/api/requirements${toQuery({ per_page: 200 })}`);
        if (!active) return;
        setRequirements(res.data);
      } catch {
        if (!active) return;
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  function openEdit(item: DocumentItem) {
    setEditing(item);
    setForm({
      requirement_id: item.requirement?.id ? String(item.requirement.id) : '',
      issue_date: formatDateISO(item.issue_date),
      expiry_date: formatDateISO(item.expiry_date),
      observation: item.observation ?? '',
    });
    setModalOpen(true);
  }

  async function submitForm(e: FormEvent) {
    e.preventDefault();
    if (!editing || saving) return;
    setSaving(true);
    try {
      await apiFetch<DocumentItem>(`/api/documents/${editing.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requirement_id: form.requirement_id ? Number(form.requirement_id) : null,
          issue_date: form.issue_date || null,
          expiry_date: form.expiry_date || null,
          observation: form.observation.trim() || null,
        }),
      });
      setModalOpen(false);
      await loadDocuments();
    } catch (e) {
      alert(e instanceof ApiError ? e.message : 'No se pudo actualizar el documento.');
    } finally {
      setSaving(false);
    }
  }

  async function removeDocument(item: DocumentItem) {
    if (!confirm(`Eliminar "${item.original_filename}"?`)) return;
    try {
      await apiFetch<{ message: string }>(`/api/documents/${item.id}`, { method: 'DELETE' });
      await loadDocuments();
    } catch (e) {
      alert(e instanceof ApiError ? e.message : 'No se pudo eliminar el documento.');
    }
  }

  async function openFile(item: DocumentItem) {
    try {
      const blob = await apiFetchBlob(`/api/documents/${item.id}/file`, { method: 'GET' });
      const url = URL.createObjectURL(blob);
      window.open(url, '_blank', 'noopener,noreferrer');
      window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } catch (e) {
      if (e instanceof ApiError) {
        alert(e.message);
      } else {
        alert('No se pudo abrir el documento.');
      }
    }
  }

  return (
    <div className="page">
      <div className="pageHeader">
        <div>
          <div className="pageTitle">Documentos</div>
          <div className="pageSubtitle">Repositorio central con enlaces, vigencias y asociación a requisitos</div>
        </div>
      </div>

      <div className="toolbar">
        <input
          className="search"
          placeholder="Buscar por archivo, requisito u observación…"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
        />
        <select
          className="search"
          style={{ maxWidth: 220 }}
          value={type}
          onChange={(e) => {
            setType(e.target.value);
            setPage(1);
          }}
        >
          <option value="">Todos los tipos</option>
          <option value="person">Personas</option>
          <option value="vehicle">Vehículos</option>
          <option value="vessel">Embarcaciones</option>
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
                <th>Archivo</th>
                <th style={{ width: 130 }}>Tipo</th>
                <th style={{ width: 90 }}>Origen</th>
                <th style={{ width: 220 }}>Requisito</th>
                <th style={{ width: 120 }}>Estado</th>
                <th style={{ width: 120 }}>Vence</th>
                <th style={{ width: 200 }}>Subido por</th>
                <th style={{ width: 220 }} />
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={9} className="tdMuted">Cargando…</td>
                </tr>
              ) : data && data.data.length ? (
                data.data.map((item) => (
                  <tr key={item.id}>
                    <td className="tdMono">{item.id}</td>
                    <td>{item.original_filename}</td>
                    <td>{formatDocumentable(item.documentable_type)}</td>
                    <td className="tdMono">{item.documentable_id}</td>
                    <td>{item.requirement?.name ?? '—'}</td>
                    <td><StatusPill status={item.status} /></td>
                    <td className="tdMono">{formatDateISO(item.expiry_date) || '—'}</td>
                    <td>{item.uploaded_by_relation?.name ?? '—'}</td>
                    <td>
                      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                        <button className="btnSoft" type="button" onClick={() => openFile(item)}>
                          Abrir
                        </button>
                        <button className="btnSoft" type="button" onClick={() => openEdit(item)}>
                          Editar
                        </button>
                        <button className="btnDanger" type="button" onClick={() => removeDocument(item)}>
                          Eliminar
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={9} className="tdMuted">Sin documentos registrados.</td>
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

      <DocumentModal
        open={modalOpen}
        form={form}
        saving={saving}
        requirements={requirements}
        onClose={() => setModalOpen(false)}
        onChange={(patch) => setForm((prev) => ({ ...prev, ...patch }))}
        onSubmit={submitForm}
      />
    </div>
  );
}
