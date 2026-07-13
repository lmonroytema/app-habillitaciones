import { FormEvent, useEffect, useMemo, useState } from 'react';
import { ApiError, apiFetch, toQuery } from '../api';

type Paginated<T> = {
  data: T[];
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
};

type Company = {
  id: number;
  name: string;
  ruc: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
};

type CompanyForm = {
  name: string;
  ruc: string;
  email: string;
  phone: string;
  address: string;
};

function emptyForm(): CompanyForm {
  return { name: '', ruc: '', email: '', phone: '', address: '' };
}

function CompanyModal({
  open,
  title,
  form,
  saving,
  onClose,
  onChange,
  onSubmit,
}: {
  open: boolean;
  title: string;
  form: CompanyForm;
  saving: boolean;
  onClose: () => void;
  onChange: (patch: Partial<CompanyForm>) => void;
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
            <label className="field" style={{ gridColumn: '1 / -1' }}>
              <div className="label">Razón social</div>
              <input value={form.name} onChange={(e) => onChange({ name: e.target.value })} autoFocus />
            </label>

            <label className="field">
              <div className="label">RUC</div>
              <input value={form.ruc} onChange={(e) => onChange({ ruc: e.target.value })} />
            </label>

            <label className="field">
              <div className="label">Correo</div>
              <input value={form.email} onChange={(e) => onChange({ email: e.target.value })} />
            </label>

            <label className="field">
              <div className="label">Teléfono</div>
              <input value={form.phone} onChange={(e) => onChange({ phone: e.target.value })} />
            </label>

            <label className="field" style={{ gridColumn: '1 / -1' }}>
              <div className="label">Dirección</div>
              <input value={form.address} onChange={(e) => onChange({ address: e.target.value })} />
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

export default function CompaniesPage() {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const perPage = 25;

  const [data, setData] = useState<Paginated<Company> | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Company | null>(null);
  const [form, setForm] = useState<CompanyForm>(emptyForm());
  const [saving, setSaving] = useState(false);

  const query = useMemo(
    () =>
      toQuery({
        search: search.trim() || null,
        page,
        per_page: perPage,
      }),
    [page, search],
  );

  async function loadCompanies() {
    setLoading(true);
    setError(null);
    try {
      const res = await apiFetch<Paginated<Company>>(`/api/companies${query}`);
      setData(res);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'No se pudo cargar la lista.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadCompanies();
  }, [query]);

  function openCreate() {
    setEditing(null);
    setForm(emptyForm());
    setModalOpen(true);
  }

  function openEdit(item: Company) {
    setEditing(item);
    setForm({
      name: item.name ?? '',
      ruc: item.ruc ?? '',
      email: item.email ?? '',
      phone: item.phone ?? '',
      address: item.address ?? '',
    });
    setModalOpen(true);
  }

  async function submitForm(e: FormEvent) {
    e.preventDefault();
    if (!form.name.trim() || saving) return;
    setSaving(true);

    try {
      await apiFetch<Company>(editing ? `/api/companies/${editing.id}` : '/api/companies', {
        method: editing ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name.trim(),
          ruc: form.ruc.trim() || null,
          email: form.email.trim() || null,
          phone: form.phone.trim() || null,
          address: form.address.trim() || null,
        }),
      });
      setModalOpen(false);
      if (page !== 1 && !editing) setPage(1);
      else await loadCompanies();
    } catch (e) {
      alert(e instanceof ApiError ? e.message : 'No se pudo guardar la empresa.');
    } finally {
      setSaving(false);
    }
  }

  async function removeCompany(item: Company) {
    if (!confirm(`Eliminar "${item.name}"?`)) return;
    try {
      await apiFetch<{ message: string }>(`/api/companies/${item.id}`, { method: 'DELETE' });
      await loadCompanies();
    } catch (e) {
      alert(e instanceof ApiError ? e.message : 'No se pudo eliminar la empresa.');
    }
  }

  return (
    <div className="page">
      <div className="pageHeader">
        <div>
          <div className="pageTitle">Empresas</div>
          <div className="pageSubtitle">Maestro de clientes, contratistas y empresas vinculadas al proceso</div>
        </div>
        <button className="btnPrimary" onClick={openCreate} type="button">
          Nueva empresa
        </button>
      </div>

      <div className="toolbar">
        <input
          className="search"
          placeholder="Buscar por razón social o RUC…"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
        />
        <div className="metaChip">{data ? `${data.total} registros` : '—'}</div>
      </div>

      {error ? <div className="alert">{error}</div> : null}

      <div className="card">
        <div className="tableWrap">
          <table className="table">
            <thead>
              <tr>
                <th style={{ width: 72 }}>ID</th>
                <th>Razón social</th>
                <th style={{ width: 150 }}>RUC</th>
                <th style={{ width: 240 }}>Correo</th>
                <th style={{ width: 140 }}>Teléfono</th>
                <th>Dirección</th>
                <th style={{ width: 180 }} />
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} className="tdMuted">
                    Cargando…
                  </td>
                </tr>
              ) : data && data.data.length ? (
                data.data.map((item) => (
                  <tr key={item.id}>
                    <td className="tdMono">{item.id}</td>
                    <td>{item.name}</td>
                    <td className="tdMono">{item.ruc ?? '—'}</td>
                    <td>{item.email ?? '—'}</td>
                    <td className="tdMono">{item.phone ?? '—'}</td>
                    <td>{item.address ?? '—'}</td>
                    <td>
                      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                        <button className="btnSoft" type="button" onClick={() => openEdit(item)}>
                          Editar
                        </button>
                        <button className="btnDanger" type="button" onClick={() => removeCompany(item)}>
                          Eliminar
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="tdMuted">
                    Sin empresas registradas.
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

      <CompanyModal
        open={modalOpen}
        title={editing ? 'Editar empresa' : 'Nueva empresa'}
        form={form}
        saving={saving}
        onClose={() => setModalOpen(false)}
        onChange={(patch) => setForm((prev) => ({ ...prev, ...patch }))}
        onSubmit={submitForm}
      />
    </div>
  );
}
