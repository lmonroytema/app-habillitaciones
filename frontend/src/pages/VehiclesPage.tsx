import type { ReactNode } from 'react';
import { FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import { ApiError, apiFetch, apiFetchBlob, toQuery } from '../api';

type Paginated<T> = {
  data: T[];
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
};

type Vehicle = {
  id: number;
  plate: string;
  vehicle_type: string | null;
  brand: string | null;
  model: string | null;
  year: string | null;
  is_active: boolean;
  documents_count: number;
};

type Document = {
  id: number;
  original_filename: string;
  url: string | null;
  status: 'SIN_VIGENCIA' | 'VENCIDO' | 'POR_VENCER' | 'VIGENTE';
  issue_date: string | null;
  expiry_date: string | null;
};

function formatDateISO(v: string | null | undefined) {
  if (!v) return '';
  return v.slice(0, 10);
}

function StatusPill({ status }: { status: Document['status'] }) {
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

function Modal({
  title,
  open,
  onClose,
  children,
}: {
  title: string;
  open: boolean;
  onClose: () => void;
  children: ReactNode;
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
        <div className="modalBody">{children}</div>
      </div>
    </div>
  );
}

export default function VehiclesPage() {
  const [search, setSearch] = useState('');
  const [onlyActive, setOnlyActive] = useState<boolean | null>(true);
  const [page, setPage] = useState(1);
  const perPage = 25;

  const [data, setData] = useState<Paginated<Vehicle> | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [createOpen, setCreateOpen] = useState(false);
  const [newPlate, setNewPlate] = useState('');
  const [newType, setNewType] = useState('');
  const [newBrand, setNewBrand] = useState('');
  const [newModel, setNewModel] = useState('');
  const [newYear, setNewYear] = useState('');
  const [newIsActive, setNewIsActive] = useState(true);
  const [creating, setCreating] = useState(false);

  const [selected, setSelected] = useState<Vehicle | null>(null);
  const [docsOpen, setDocsOpen] = useState(false);
  const [docs, setDocs] = useState<Document[]>([]);
  const [docsLoading, setDocsLoading] = useState(false);
  const [docsError, setDocsError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement | null>(null);
  const [issueDate, setIssueDate] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [observation, setObservation] = useState('');

  const query = useMemo(() => {
    return toQuery({
      search: search.trim() || null,
      is_active: onlyActive === null ? null : onlyActive,
      page,
      per_page: perPage,
    });
  }, [onlyActive, page, search]);

  useEffect(() => {
    let active = true;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await apiFetch<Paginated<Vehicle>>(`/api/vehicles${query}`);
        if (!active) return;
        setData(res);
      } catch (e) {
        if (!active) return;
        setError(e instanceof ApiError ? e.message : 'No se pudo cargar la lista.');
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [query]);

  async function openDocs(v: Vehicle) {
    setSelected(v);
    setDocsOpen(true);
    setDocs([]);
    setDocsError(null);
    setDocsLoading(true);
    try {
      const res = await apiFetch<Paginated<Document>>(
        `/api/documents${toQuery({ documentable_type: 'vehicle', documentable_id: v.id, per_page: 100 })}`,
      );
      setDocs(res.data);
    } catch (e) {
      setDocsError(e instanceof ApiError ? e.message : 'No se pudo cargar documentos.');
    } finally {
      setDocsLoading(false);
    }
  }

  async function onCreate(e: FormEvent) {
    e.preventDefault();
    if (!newPlate.trim() || creating) return;
    setCreating(true);
    try {
      await apiFetch<Vehicle>('/api/vehicles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          plate: newPlate.trim(),
          vehicle_type: newType.trim() || null,
          brand: newBrand.trim() || null,
          model: newModel.trim() || null,
          year: newYear.trim() || null,
          is_active: newIsActive,
        }),
      });
      setCreateOpen(false);
      setNewPlate('');
      setNewType('');
      setNewBrand('');
      setNewModel('');
      setNewYear('');
      setNewIsActive(true);
      setPage(1);
      const res = await apiFetch<Paginated<Vehicle>>(`/api/vehicles${toQuery({ page: 1, per_page: perPage })}`);
      setData(res);
    } catch (e) {
      alert(e instanceof ApiError ? e.message : 'No se pudo crear el vehículo.');
    } finally {
      setCreating(false);
    }
  }

  async function uploadDocument(e: FormEvent) {
    e.preventDefault();
    if (!selected || uploading) return;
    const file = fileRef.current?.files?.[0] ?? null;
    if (!file) {
      alert('Seleccione un archivo.');
      return;
    }

    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('documentable_type', 'vehicle');
      fd.append('documentable_id', String(selected.id));
      if (issueDate) fd.append('issue_date', issueDate);
      if (expiryDate) fd.append('expiry_date', expiryDate);
      if (observation.trim()) fd.append('observation', observation.trim());
      fd.append('file', file);

      const created = await apiFetch<Document>('/api/documents', { method: 'POST', body: fd });
      setDocs((prev) => [created, ...prev]);
      setIssueDate('');
      setExpiryDate('');
      setObservation('');
      if (fileRef.current) fileRef.current.value = '';
    } catch (e) {
      alert(e instanceof ApiError ? e.message : 'No se pudo subir el documento.');
    } finally {
      setUploading(false);
    }
  }

  async function deleteDocument(doc: Document) {
    if (!confirm(`Eliminar "${doc.original_filename}"?`)) return;
    try {
      await apiFetch<{ message: string }>(`/api/documents/${doc.id}`, { method: 'DELETE' });
      setDocs((prev) => prev.filter((d) => d.id !== doc.id));
    } catch (e) {
      alert(e instanceof ApiError ? e.message : 'No se pudo eliminar el documento.');
    }
  }

  async function openFile(doc: Document) {
    try {
      const blob = await apiFetchBlob(`/api/documents/${doc.id}/file`, { method: 'GET' });
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
          <div className="pageTitle">Vehículos</div>
          <div className="pageSubtitle">Listado, filtros y documentos asociados</div>
        </div>
        <button className="btnPrimary" onClick={() => setCreateOpen(true)} type="button">
          Nuevo vehículo
        </button>
      </div>

      <div className="toolbar">
        <input
          className="search"
          placeholder="Buscar por placa, marca o modelo…"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
        />
        <div className="segmented">
          <button
            type="button"
            className={onlyActive === true ? 'segBtn segBtnActive' : 'segBtn'}
            onClick={() => {
              setOnlyActive(true);
              setPage(1);
            }}
          >
            Activos
          </button>
          <button
            type="button"
            className={onlyActive === false ? 'segBtn segBtnActive' : 'segBtn'}
            onClick={() => {
              setOnlyActive(false);
              setPage(1);
            }}
          >
            Inactivos
          </button>
          <button
            type="button"
            className={onlyActive === null ? 'segBtn segBtnActive' : 'segBtn'}
            onClick={() => {
              setOnlyActive(null);
              setPage(1);
            }}
          >
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
                <th style={{ width: 140 }}>Placa</th>
                <th>Tipo</th>
                <th style={{ width: 180 }}>Marca</th>
                <th style={{ width: 200 }}>Modelo</th>
                <th style={{ width: 90 }}>Año</th>
                <th style={{ width: 110 }}>Estado</th>
                <th style={{ width: 90 }}>Docs</th>
                <th style={{ width: 130 }} />
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
                data.data.map((v) => (
                  <tr key={v.id}>
                    <td className="tdMono">{v.id}</td>
                    <td className="tdMono">{v.plate}</td>
                    <td>{v.vehicle_type ?? '—'}</td>
                    <td>{v.brand ?? '—'}</td>
                    <td>{v.model ?? '—'}</td>
                    <td className="tdMono">{v.year ?? '—'}</td>
                    <td>{v.is_active ? <span className="pill pillOk">Activo</span> : <span className="pill">Inactivo</span>}</td>
                    <td className="tdMono">{v.documents_count}</td>
                    <td>
                      <button className="btnSoft" type="button" onClick={() => openDocs(v)}>
                        Documentos
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={9} className="tdMuted">
                    Sin resultados.
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
          <button
            className="btnSoft"
            type="button"
            disabled={!data || data.current_page >= data.last_page}
            onClick={() => setPage((p) => p + 1)}
          >
            Siguiente
          </button>
        </div>
      </div>

      <Modal title="Nuevo vehículo" open={createOpen} onClose={() => setCreateOpen(false)}>
        <form onSubmit={onCreate} className="formGrid">
          <label className="field">
            <div className="label">Placa</div>
            <input value={newPlate} onChange={(e) => setNewPlate(e.target.value)} autoFocus />
          </label>
          <label className="field">
            <div className="label">Tipo</div>
            <input value={newType} onChange={(e) => setNewType(e.target.value)} />
          </label>
          <label className="field">
            <div className="label">Marca</div>
            <input value={newBrand} onChange={(e) => setNewBrand(e.target.value)} />
          </label>
          <label className="field">
            <div className="label">Modelo</div>
            <input value={newModel} onChange={(e) => setNewModel(e.target.value)} />
          </label>
          <label className="field">
            <div className="label">Año</div>
            <input value={newYear} onChange={(e) => setNewYear(e.target.value)} />
          </label>
          <label className="field">
            <div className="label">Activo</div>
            <select value={newIsActive ? '1' : '0'} onChange={(e) => setNewIsActive(e.target.value === '1')}>
              <option value="1">Sí</option>
              <option value="0">No</option>
            </select>
          </label>
          <div className="formActions">
            <button className="btnSoft" type="button" onClick={() => setCreateOpen(false)}>
              Cancelar
            </button>
            <button className="btnPrimary" type="submit" disabled={creating || !newPlate.trim()}>
              {creating ? 'Guardando…' : 'Guardar'}
            </button>
          </div>
        </form>
      </Modal>

      <Modal title={selected ? `Documentos — ${selected.plate}` : 'Documentos'} open={docsOpen} onClose={() => setDocsOpen(false)}>
        {!selected ? null : (
          <div className="docsGrid">
            <div className="docsLeft">
              <div className="sectionTitle">Subir documento</div>
              <form onSubmit={uploadDocument} className="formGrid">
                <label className="field">
                  <div className="label">Archivo</div>
                  <input ref={fileRef} type="file" />
                </label>
                <label className="field">
                  <div className="label">Fecha emisión</div>
                  <input type="date" value={issueDate} onChange={(e) => setIssueDate(e.target.value)} />
                </label>
                <label className="field">
                  <div className="label">Fecha vencimiento</div>
                  <input type="date" value={expiryDate} onChange={(e) => setExpiryDate(e.target.value)} />
                </label>
                <label className="field" style={{ gridColumn: '1 / -1' }}>
                  <div className="label">Observación</div>
                  <input value={observation} onChange={(e) => setObservation(e.target.value)} />
                </label>
                <div className="formActions" style={{ gridColumn: '1 / -1' }}>
                  <button className="btnPrimary" type="submit" disabled={uploading}>
                    {uploading ? 'Subiendo…' : 'Subir'}
                  </button>
                </div>
              </form>
            </div>

            <div className="docsRight">
              <div className="sectionTitle">Listado</div>
              {docsError ? <div className="alert">{docsError}</div> : null}
              <div className="docsList">
                {docsLoading ? (
                  <div className="tdMuted">Cargando…</div>
                ) : docs.length ? (
                  docs.map((d) => (
                    <div key={d.id} className="docItem">
                      <div className="docMain">
                        <div className="docName">{d.original_filename}</div>
                        <div className="docMeta">
                          <StatusPill status={d.status} />
                          <span className="tdMuted">
                            Emisión: <span className="tdMono">{formatDateISO(d.issue_date) || '—'}</span>
                          </span>
                          <span className="tdMuted">
                            Vence: <span className="tdMono">{formatDateISO(d.expiry_date) || '—'}</span>
                          </span>
                        </div>
                      </div>
                      <div className="docActions">
                        <button className="btnSoft" type="button" onClick={() => openFile(d)}>
                          Abrir
                        </button>
                        <button className="btnDanger" type="button" onClick={() => deleteDocument(d)}>
                          Eliminar
                        </button>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="tdMuted">No hay documentos para este vehículo.</div>
                )}
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
