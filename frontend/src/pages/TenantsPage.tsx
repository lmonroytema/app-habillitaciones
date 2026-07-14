import { FormEvent, useEffect, useMemo, useState } from 'react';
import { ApiError, apiFetch, toQuery } from '../api';
import { PLAN_LABELS } from '../auth';

type Paginated<T> = {
  data: T[];
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
};

type Tenant = {
  id: number;
  name: string;
  slug: string;
  ruc: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  plan: string;
  status: string;
  trial_ends_at: string | null;
  max_users: number | null;
  users_count?: number;
};

type TenantForm = {
  name: string;
  ruc: string;
  contact_email: string;
  contact_phone: string;
  plan: string;
  status: string;
  max_users: string;
  trial_ends_at: string;
  admin_name: string;
  admin_email: string;
  admin_password: string;
};

function emptyForm(): TenantForm {
  return {
    name: '',
    ruc: '',
    contact_email: '',
    contact_phone: '',
    plan: 'trial',
    status: 'active',
    max_users: '',
    trial_ends_at: '',
    admin_name: '',
    admin_email: '',
    admin_password: '',
  };
}

function TenantModal({
  open,
  title,
  form,
  saving,
  isEditing,
  onClose,
  onChange,
  onSubmit,
}: {
  open: boolean;
  title: string;
  form: TenantForm;
  saving: boolean;
  isEditing: boolean;
  onClose: () => void;
  onChange: (patch: Partial<TenantForm>) => void;
  onSubmit: (e: FormEvent) => void;
}) {
  if (!open) return null;

  const adminOk = isEditing || (form.admin_name.trim() && form.admin_email.trim() && form.admin_password.length >= 8);

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
              <div className="label">Nombre de la organización</div>
              <input value={form.name} onChange={(e) => onChange({ name: e.target.value })} autoFocus />
            </label>

            <label className="field">
              <div className="label">RUC</div>
              <input value={form.ruc} onChange={(e) => onChange({ ruc: e.target.value })} />
            </label>

            <label className="field">
              <div className="label">Correo de contacto</div>
              <input value={form.contact_email} onChange={(e) => onChange({ contact_email: e.target.value })} />
            </label>

            <label className="field">
              <div className="label">Teléfono</div>
              <input value={form.contact_phone} onChange={(e) => onChange({ contact_phone: e.target.value })} />
            </label>

            <label className="field">
              <div className="label">Plan</div>
              <select value={form.plan} onChange={(e) => onChange({ plan: e.target.value })}>
                <option value="trial">Prueba (30 días, 3 usuarios)</option>
                <option value="basic">Básico (10 usuarios)</option>
                <option value="pro">Profesional (25 usuarios)</option>
                <option value="enterprise">Empresarial (sin límite)</option>
              </select>
            </label>

            {isEditing ? (
              <label className="field">
                <div className="label">Estado</div>
                <select value={form.status} onChange={(e) => onChange({ status: e.target.value })}>
                  <option value="active">Activa</option>
                  <option value="suspended">Suspendida</option>
                </select>
              </label>
            ) : null}

            <label className="field">
              <div className="label">Límite de usuarios (vacío = según plan)</div>
              <input
                value={form.max_users}
                onChange={(e) => onChange({ max_users: e.target.value.replace(/[^0-9]/g, '') })}
                inputMode="numeric"
              />
            </label>

            {form.plan === 'trial' ? (
              <label className="field">
                <div className="label">Fin de prueba (vacío = 30 días)</div>
                <input
                  value={form.trial_ends_at}
                  onChange={(e) => onChange({ trial_ends_at: e.target.value })}
                  type="date"
                />
              </label>
            ) : null}

            {!isEditing ? (
              <>
                <div className="label" style={{ gridColumn: '1 / -1', marginTop: 8, fontWeight: 600 }}>
                  Usuario administrador inicial
                </div>
                <label className="field">
                  <div className="label">Nombre</div>
                  <input value={form.admin_name} onChange={(e) => onChange({ admin_name: e.target.value })} />
                </label>
                <label className="field">
                  <div className="label">Email</div>
                  <input value={form.admin_email} onChange={(e) => onChange({ admin_email: e.target.value })} autoComplete="off" />
                </label>
                <label className="field">
                  <div className="label">Contraseña (mínimo 8)</div>
                  <input
                    value={form.admin_password}
                    onChange={(e) => onChange({ admin_password: e.target.value })}
                    type="password"
                    autoComplete="new-password"
                  />
                </label>
              </>
            ) : null}

            <div className="formActions">
              <button className="btnSoft" type="button" onClick={onClose}>
                Cancelar
              </button>
              <button className="btnPrimary" type="submit" disabled={saving || !form.name.trim() || !adminOk}>
                {saving ? 'Guardando…' : 'Guardar'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

export default function TenantsPage() {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const perPage = 25;

  const [data, setData] = useState<Paginated<Tenant> | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Tenant | null>(null);
  const [form, setForm] = useState<TenantForm>(emptyForm());
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

  async function loadTenants() {
    setLoading(true);
    setError(null);
    try {
      const res = await apiFetch<Paginated<Tenant>>(`/api/tenants${query}`);
      setData(res);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'No se pudo cargar la lista.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadTenants();
  }, [query]);

  function openCreate() {
    setEditing(null);
    setForm(emptyForm());
    setModalOpen(true);
  }

  function openEdit(item: Tenant) {
    setEditing(item);
    setForm({
      name: item.name,
      ruc: item.ruc ?? '',
      contact_email: item.contact_email ?? '',
      contact_phone: item.contact_phone ?? '',
      plan: item.plan,
      status: item.status,
      max_users: item.max_users !== null && item.max_users !== undefined ? String(item.max_users) : '',
      trial_ends_at: item.trial_ends_at ?? '',
      admin_name: '',
      admin_email: '',
      admin_password: '',
    });
    setModalOpen(true);
  }

  async function submitForm(e: FormEvent) {
    e.preventDefault();
    if (saving) return;
    setSaving(true);

    try {
      const body: Record<string, unknown> = {
        name: form.name.trim(),
        ruc: form.ruc.trim() || null,
        contact_email: form.contact_email.trim() || null,
        contact_phone: form.contact_phone.trim() || null,
        plan: form.plan,
        max_users: form.max_users ? Number(form.max_users) : null,
        trial_ends_at: form.plan === 'trial' && form.trial_ends_at ? form.trial_ends_at : null,
      };

      if (editing) {
        body.status = form.status;
      } else {
        body.admin_name = form.admin_name.trim();
        body.admin_email = form.admin_email.trim();
        body.admin_password = form.admin_password;
      }

      await apiFetch<Tenant>(editing ? `/api/tenants/${editing.id}` : '/api/tenants', {
        method: editing ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      setModalOpen(false);
      if (page !== 1 && !editing) setPage(1);
      else await loadTenants();
    } catch (e) {
      alert(e instanceof ApiError ? e.message : 'No se pudo guardar la organización.');
    } finally {
      setSaving(false);
    }
  }

  async function removeTenant(item: Tenant) {
    if (!confirm(`Eliminar la organización "${item.name}" y TODOS sus datos? Esta acción no se puede deshacer.`)) return;
    try {
      await apiFetch<{ message: string }>(`/api/tenants/${item.id}`, { method: 'DELETE' });
      await loadTenants();
    } catch (e) {
      alert(e instanceof ApiError ? e.message : 'No se pudo eliminar la organización.');
    }
  }

  return (
    <div className="page">
      <div className="pageHeader">
        <div>
          <div className="pageTitle">Organizaciones</div>
          <div className="pageSubtitle">Clientes de la plataforma: planes, estado y usuarios</div>
        </div>
        <button className="btnPrimary" onClick={openCreate} type="button">
          Nueva organización
        </button>
      </div>

      <div className="toolbar">
        <input
          className="search"
          placeholder="Buscar por nombre, RUC o correo…"
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
                <th>Organización</th>
                <th style={{ width: 130 }}>RUC</th>
                <th style={{ width: 140 }}>Plan</th>
                <th style={{ width: 120 }}>Estado</th>
                <th style={{ width: 110 }}>Usuarios</th>
                <th style={{ width: 140 }}>Fin de prueba</th>
                <th style={{ width: 180 }} />
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={8} className="tdMuted">
                    Cargando…
                  </td>
                </tr>
              ) : data && data.data.length ? (
                data.data.map((item) => (
                  <tr key={item.id}>
                    <td className="tdMono">{item.id}</td>
                    <td>{item.name}</td>
                    <td className="tdMono">{item.ruc ?? '—'}</td>
                    <td>{PLAN_LABELS[item.plan] ?? item.plan}</td>
                    <td>{item.status === 'active' ? 'Activa' : 'Suspendida'}</td>
                    <td className="tdMono">
                      {item.users_count ?? 0}
                      {item.max_users ? ` / ${item.max_users}` : ''}
                    </td>
                    <td className="tdMono">{item.trial_ends_at ?? '—'}</td>
                    <td>
                      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                        <button className="btnSoft" type="button" onClick={() => openEdit(item)}>
                          Editar
                        </button>
                        <button className="btnDanger" type="button" onClick={() => removeTenant(item)}>
                          Eliminar
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={8} className="tdMuted">
                    Sin organizaciones registradas.
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

      <TenantModal
        open={modalOpen}
        title={editing ? 'Editar organización' : 'Nueva organización'}
        form={form}
        saving={saving}
        isEditing={!!editing}
        onClose={() => setModalOpen(false)}
        onChange={(patch) => setForm((prev) => ({ ...prev, ...patch }))}
        onSubmit={submitForm}
      />
    </div>
  );
}
