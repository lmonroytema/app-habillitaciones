const CONTENT = {
  stats: [
    { k: 'Un solo sistema', v: 'Multiusuario, centralizado' },
    { k: 'Control documental', v: 'Trazabilidad y auditoría' },
    { k: 'Automatización', v: 'Alertas, vigencias e integración' },
  ],
  asIsHow: [
    'Cada usuario trabaja con un archivo Excel (.xlsm) instalado en su PC.',
    'Para ver o adjuntar documentos, el usuario debe sincronizar/actualizar su archivo local con el repositorio de SharePoint.',
    'Los documentos se almacenan en SharePoint, pero la lógica, reglas y estados viven en macros del archivo local.',
    'La consistencia depende de que todos ejecuten el mismo archivo, con la misma versión y con sincronización correcta.',
  ],
  asIsPain: [
    'Riesgo de versiones: usuarios con copias distintas del archivo o macros desactualizadas.',
    'Conflictos de sincronización: cambios solapados, latencia y bloqueos durante la carga/descarga de archivos.',
    'Poca trazabilidad: difícil auditar quién cambió qué, cuándo y por qué dentro del Excel.',
    'Escalabilidad limitada: al crecer usuarios/proyectos, el archivo se vuelve pesado y frágil.',
    'Costo y dependencia de licenciamiento: se requiere Microsoft Office por cada PC/usuario que use el Excel con macros.',
    'Seguridad operacional compleja: permisos repartidos entre archivos locales y SharePoint, con fugas por copias en PC.',
    'Soporte costoso: cualquier ajuste requiere distribuir una nueva versión del archivo a todos los usuarios.',
  ],
  toBeHow: [
    'Los usuarios ingresan desde navegador (PC, tablet o móvil) con autenticación y roles.',
    'Los datos se guardan en una base central; la app aplica reglas de vigencias, estados y validaciones en tiempo real.',
    'Los documentos se suben desde la interfaz y quedan vinculados a Personas/Vehículos/Embarcaciones/Requisitos, con historial.',
    'Se habilita auditoría: quién creó/actualizó, trazabilidad por registro y bitácora de eventos.',
    'La plataforma puede integrarse con sistemas externos como IAuditor y con soluciones internas de Power Platform, como Project Hub, para compartir datos y contexto operativo.',
  ],
  toBeBenefits: [
    'Sin versiones locales: se elimina el “archivo por usuario”; todos usan la misma plataforma.',
    'Menos errores de sincronización: la verdad está en el servidor; SharePoint puede integrarse como repositorio único.',
    'Mayor control: permisos por rol, segregación de funciones y acceso granular a documentos.',
    'Automatización: alertas por vencimiento, reportes programados, paneles ejecutivos y exportables.',
    'Integraciones: correo, SharePoint/Graph, Power BI, IAuditor, Project Hub y APIs para otros sistemas corporativos.',
  ],
  cmp: [
    {
      k: 'Acceso',
      a: 'Cada usuario requiere el archivo .xlsm en su PC y mantenerlo sincronizado.',
      b: 'Acceso por navegador con roles y permisos; sin instalación local.',
    },
    {
      k: 'Licenciamiento',
      a: 'Requiere Microsoft Office para ejecutar el Excel con macros en cada equipo/usuario.',
      b: 'Solo requiere internet y autenticación (navegador); el licenciamiento no depende de Office por usuario.',
    },
    {
      k: 'Versiones',
      a: 'Difícil garantizar que todos usen la misma versión de macros.',
      b: 'Una sola versión desplegada en el servidor para todos.',
    },
    {
      k: 'Auditoría',
      a: 'Limitada; depende de controles manuales y disciplina del usuario.',
      b: 'Auditoría nativa: trazabilidad por registro, usuario y fecha.',
    },
    {
      k: 'Documentos',
      a: 'En SharePoint, pero asociados por lógica local y sincronización.',
      b: 'Vinculación centralizada; SharePoint puede quedar como repositorio (Graph) o migrar a storage dedicado.',
    },
    {
      k: 'Riesgo operativo',
      a: 'Copias locales, corrupción de archivo, errores de macro, dependencias de PC.',
      b: 'Backups del servidor, control de cambios, monitoreo y políticas de seguridad.',
    },
    {
      k: 'Escalabilidad',
      a: 'El archivo crece, se vuelve lento y frágil con más datos y usuarios.',
      b: 'Escala por arquitectura: base de datos + API + frontend; se optimiza por módulo.',
    },
    {
      k: 'Eficiencia',
      a: 'Procesos manuales: sincronizar, validar, consolidar.',
      b: 'Automatización: flujos, alertas, reportes y tareas programadas.',
    },
    {
      k: 'Integración corporativa',
      a: 'Baja interoperabilidad; depende de trabajo manual o cruces fuera del Excel.',
      b: 'Integración con herramientas externas como IAuditor y plataformas internas como Project Hub en Power Platform.',
    },
  ],
  benefits: [
    {
      t: 'Gobernanza y seguridad',
      d: 'Acceso por roles, control granular, reducción de copias locales y trazabilidad para auditorías internas/externas.',
    },
    {
      t: 'Menor dependencia de Office',
      d: 'La operación diaria no depende de licencias de Microsoft Office por usuario: basta con acceso a internet y autenticación.',
    },
    {
      t: 'Trazabilidad total',
      d: 'Bitácora por registro: cambios, adjuntos, vigencias, responsable y evidencia histórica.',
    },
    {
      t: 'Menos fricción de SharePoint',
      d: 'Se elimina la dependencia de “sincronizar el Excel”. La plataforma central controla el flujo; SharePoint queda como repositorio integrado.',
    },
    {
      t: 'Calidad y consistencia',
      d: 'Validaciones de negocio en servidor y en UI; menos errores por macros/archivos dañados o flujos no controlados.',
    },
    {
      t: 'Automatización',
      d: 'Alertas por vencimiento, notificaciones por correo, reportes programados y dashboards ejecutivos por empresa/proyecto.',
    },
    {
      t: 'Integración con ecosistema corporativo',
      d: 'Permite relacionar la gestión documental y de habilitaciones con IAuditor, Project Hub y otras plataformas, evitando doble registro y mejorando la visibilidad del negocio.',
    },
    {
      t: 'Escalabilidad y soporte',
      d: 'Sin distribución de archivos: los cambios se despliegan una vez. Mejor soporte, menor tiempo de respuesta y evolución continua.',
    },
  ],
  stack: [
    { k: 'Backend API', v: 'Laravel + Sanctum', d: 'Seguridad, control de acceso, endpoints REST, validación y reglas de negocio sobre PHP, tecnología fácilmente soportada en Hostinger.' },
    { k: 'Frontend', v: 'React + Vite', d: 'Experiencia moderna, rápida y consistente; SPA con módulos por dominio.' },
    { k: 'Base de datos', v: 'MySQL', d: 'Datos centralizados, consistencia, consultas, reportes y backups; motor ampliamente disponible y simple de administrar en Hostinger.' },
    { k: 'Documentos', v: 'SharePoint / Storage', d: 'Integración Graph o almacenamiento dedicado con vínculos y control de vigencia.' },
    { k: 'Integraciones', v: 'Microsoft Graph + APIs + Power Platform', d: 'Conexión con SharePoint, IAuditor, Project Hub y otros sistemas internos/externos.' },
  ],
  steps: [
    'Levantamiento y definición de roles/permisos y flujos críticos (ingreso, adjuntos, vigencias, aprobación).',
    'Modelo de datos central y migración inicial (personas, vehículos, embarcaciones, requisitos, proyectos, empresas).',
    'Módulo documental: carga, vinculación, estados, auditoría y vista única de documentos.',
    'Alertas y reportes: vencimientos, por vencer, faltantes, tablero ejecutivo y exportables.',
    'Integración con SharePoint (opcional): carga/lectura vía Graph, o estrategia de almacenamiento propio.',
    'Integraciones corporativas: definición de intercambio con IAuditor y con Project Hub (Power Platform), incluyendo catálogo de proyectos, estados y evidencias relacionadas.',
    'Piloto controlado, pruebas, capacitación y despliegue progresivo por áreas/proyectos.',
  ],
}

function el(id) {
  return document.getElementById(id)
}

function renderList(container, items) {
  container.textContent = ''
  for (const text of items) {
    const div = document.createElement('div')
    div.className = 'listItem'
    div.textContent = text
    container.appendChild(div)
  }
}

function renderStats() {
  const wrap = el('heroStats')
  if (!wrap) return
  wrap.textContent = ''
  for (const s of CONTENT.stats) {
    const node = document.createElement('div')
    node.className = 'stat'
    node.innerHTML = `<div class="stat__k"></div><div class="stat__v"></div>`
    node.querySelector('.stat__k').textContent = s.k
    node.querySelector('.stat__v').textContent = s.v
    wrap.appendChild(node)
  }
}

function renderCmp() {
  const body = el('cmpRows')
  if (!body) return
  body.textContent = ''
  for (const row of CONTENT.cmp) {
    const tr = document.createElement('tr')
    tr.innerHTML = `<td></td><td></td><td></td>`
    tr.children[0].textContent = row.k
    tr.children[1].textContent = row.a
    tr.children[2].textContent = row.b
    body.appendChild(tr)
  }
}

function renderBenefits() {
  const wrap = el('benefitsGrid')
  if (!wrap) return
  wrap.textContent = ''
  for (const b of CONTENT.benefits) {
    const node = document.createElement('div')
    node.className = 'benefit'
    node.innerHTML = `<div class="benefit__title"></div><div class="benefit__desc"></div>`
    node.querySelector('.benefit__title').textContent = b.t
    node.querySelector('.benefit__desc').textContent = b.d
    wrap.appendChild(node)
  }
}

function renderStack() {
  const wrap = el('stackGrid')
  if (!wrap) return
  wrap.textContent = ''
  for (const s of CONTENT.stack) {
    const node = document.createElement('div')
    node.className = 'chip'
    node.innerHTML = `<div class="chip__k"></div><div class="chip__v"></div><div class="chip__d"></div>`
    node.querySelector('.chip__k').textContent = s.k
    node.querySelector('.chip__v').textContent = s.v
    node.querySelector('.chip__d').textContent = s.d
    wrap.appendChild(node)
  }
}

function renderSteps() {
  const list = el('steps')
  if (!list) return
  list.textContent = ''
  for (const s of CONTENT.steps) {
    const li = document.createElement('li')
    li.textContent = s
    list.appendChild(li)
  }
}

function ensureLibs() {
  const missing = []
  if (!window.jspdf || !window.jspdf.jsPDF) missing.push('PDF')
  return missing
}

function pdfEnsureSpace(doc, y, needed, pageHeight, margin, bottomPad = 64) {
  const limit = pageHeight - margin - bottomPad
  if (y + needed <= limit) return y
  doc.addPage()
  return margin
}

function pdfWrapText(doc, text, x, y, maxWidth, lineHeight, pageHeight, margin, bottomPad = 64) {
  const lines = doc.splitTextToSize(text, maxWidth)
  for (const line of lines) {
    if (pageHeight && margin) {
      y = pdfEnsureSpace(doc, y, lineHeight, pageHeight, margin, bottomPad)
    }
    doc.text(line, x, y)
    y += lineHeight
  }
  return y
}

function pdfBulletList(doc, items, x, y, maxWidth, lineHeight, pageHeight, margin, bottomPad = 64) {
  const bullet = '•'
  for (const item of items) {
    const lines = doc.splitTextToSize(item, maxWidth - 10)
    if (lines.length === 0) continue
    if (pageHeight && margin) {
      y = pdfEnsureSpace(doc, y, lineHeight, pageHeight, margin, bottomPad)
    }
    doc.text(bullet, x, y)
    doc.text(lines[0], x + 8, y)
    y += lineHeight
    for (let i = 1; i < lines.length; i++) {
      if (pageHeight && margin) {
        y = pdfEnsureSpace(doc, y, lineHeight, pageHeight, margin, bottomPad)
      }
      doc.text(lines[i], x + 8, y)
      y += lineHeight
    }
    y += 1
  }
  return y
}

function pdfSectionTitle(doc, title, x, y) {
  doc.setTextColor(11, 18, 32)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(12)
  doc.text(title, x, y)
  return y + 14
}

function pdfNewPageIfNeeded(doc, y, pageHeight, margin) {
  if (y <= pageHeight - margin) return y
  doc.addPage()
  return margin
}

async function downloadPdf() {
  const btn = el('btnDownloadPdf')
  if (btn) btn.disabled = true

  try {
    const missing = ensureLibs()
    if (missing.length > 0) {
      alert(`No se pudo generar el PDF. Faltan librerías: ${missing.join(', ')}.\nVerifica conexión a internet o permite carga de CDN.`)
      return
    }

    const { jsPDF } = window.jspdf
    const doc = new jsPDF({ unit: 'pt', format: 'a4' })
    const pageWidth = doc.internal.pageSize.getWidth()
    const pageHeight = doc.internal.pageSize.getHeight()
    const margin = 42
    const bottomPad = 72

    doc.setFillColor(11, 18, 32)
    const headerWidth = pageWidth - margin * 2 - 80
    const headerX = margin + 40
    doc.roundedRect(headerX, margin, headerWidth, 30, 12, 12, 'F')
    doc.setTextColor(255, 255, 255)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(12)
    doc.text('JUSTIFICACIÓN DE MIGRACIÓN TECNOLÓGICA', headerX + 14, margin + 20)

    doc.setTextColor(11, 18, 32)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(16)
    let yTitle = margin + 66
    yTitle = pdfWrapText(
      doc,
      'Excel/VBA + SharePoint a Aplicación de Habilitaciones',
      margin,
      yTitle,
      pageWidth - margin * 2 - 140,
      16,
      pageHeight,
      margin,
      bottomPad,
    )

    doc.setFont('helvetica', 'normal')
    doc.setFontSize(11)
    doc.setTextColor(51, 65, 85)
    let y = Math.max(margin + 92, yTitle + 10)
    y = pdfWrapText(
      doc,
      'Pasar de un archivo local (macros) que cada usuario debe instalar y sincronizar con SharePoint, a una plataforma web centralizada como la Aplicación de Habilitaciones, reduce riesgos operativos y mejora control, seguridad, trazabilidad y escalabilidad.',
      margin,
      y,
      pageWidth - margin * 2,
      14,
      pageHeight,
      margin,
      bottomPad,
    )

    y += 10
    y = pdfSectionTitle(doc, 'Situación actual (Excel/VBA en local + SharePoint)', margin, y)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(10.5)
    doc.setTextColor(15, 23, 42)
    y = pdfBulletList(doc, CONTENT.asIsHow, margin, y, pageWidth - margin * 2, 13, pageHeight, margin, bottomPad)
    y += 6
    y = pdfBulletList(doc, CONTENT.asIsPain, margin, y, pageWidth - margin * 2, 13, pageHeight, margin, bottomPad)

    y += 10
    y = pdfNewPageIfNeeded(doc, y, pageHeight, margin)
    y = pdfSectionTitle(doc, 'Propuesta (aplicación web centralizada)', margin, y)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(10.5)
    doc.setTextColor(15, 23, 42)
    y = pdfBulletList(doc, CONTENT.toBeHow, margin, y, pageWidth - margin * 2, 13, pageHeight, margin, bottomPad)
    y += 6
    y = pdfBulletList(doc, CONTENT.toBeBenefits, margin, y, pageWidth - margin * 2, 13, pageHeight, margin, bottomPad)

    y += 10
    y = pdfNewPageIfNeeded(doc, y, pageHeight, margin)
    y = pdfSectionTitle(doc, 'Beneficios clave', margin, y)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(10.5)
    doc.setTextColor(15, 23, 42)
    y = pdfBulletList(
      doc,
      CONTENT.benefits.map((b) => `${b.t}: ${b.d}`),
      margin,
      y,
      pageWidth - margin * 2,
      13,
      pageHeight,
      margin,
      bottomPad,
    )

    y += 10
    y = pdfNewPageIfNeeded(doc, y, pageHeight, margin)
    y = pdfSectionTitle(doc, 'Stack sugerido', margin, y)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(10.5)
    doc.setTextColor(15, 23, 42)
    y = pdfBulletList(
      doc,
      CONTENT.stack.map((s) => `${s.k}: ${s.v} — ${s.d}`),
      margin,
      y,
      pageWidth - margin * 2,
      13,
      pageHeight,
      margin,
      bottomPad,
    )

    y += 10
    y = pdfNewPageIfNeeded(doc, y, pageHeight, margin)
    y = pdfSectionTitle(doc, 'Plan de implementación recomendado', margin, y)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(10.5)
    doc.setTextColor(15, 23, 42)
    y = pdfBulletList(doc, CONTENT.steps, margin, y, pageWidth - margin * 2, 13, pageHeight, margin, bottomPad)

    doc.setFont('helvetica', 'normal')
    doc.setFontSize(9.5)
    doc.setTextColor(100, 116, 139)
    doc.text(`Generado: ${new Date().toLocaleDateString('es-PE')}`, margin, pageHeight - margin)

    doc.save('Beneficios_Migracion_Excel_a_Web.pdf')
  } finally {
    if (btn) btn.disabled = false
  }
}

function init() {
  renderStats()
  renderList(el('asIsHow'), CONTENT.asIsHow)
  renderList(el('asIsPain'), CONTENT.asIsPain)
  renderList(el('toBeHow'), CONTENT.toBeHow)
  renderList(el('toBeBenefits'), CONTENT.toBeBenefits)
  renderCmp()
  renderBenefits()
  renderStack()
  renderSteps()

  const btn = el('btnDownloadPdf')
  if (btn) btn.addEventListener('click', downloadPdf)
}

document.addEventListener('DOMContentLoaded', init)
