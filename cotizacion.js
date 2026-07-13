const QUOTE = {
  issuer: {
    name: "SAMO LABS S.A.C.",
    ruc: "20612416690",
  },
  client: {
    name: "MANTENIMIENTO E INGENIERIA INDUSTRIAL S.R.L. - MAININ S.R.L.",
    ruc: "20529648147",
  },
  analystName: "Luis Fernando Monroy Sovero",
  currencySymbol: "S/",
  validityDays: 7,
  paymentTerms: "50% para inicio del servicio y saldo contra entrega",
  options: [
    {
      id: "A",
      name: "Opción A — Adecuación/modificaciones + carga + pruebas + reporte",
      amountWithoutIgv: 3000,
      deliveryTime:
        "Hasta 3 semanas (contadas desde la entrega de información por parte del cliente; la entrega final podría ser en menos días)",
      includes: [
        "Adecuación/modificaciones de la solución Excel/VBA a los requerimientos del cliente",
        "Ingreso de información inicial (carga y validación de datos base)",
        "Pruebas de funcionamiento (flujos críticos y consistencia de información)",
        "Reporte de notificación por correo (seguimiento 1–2 días por semana)",
      ],
    },
    {
      id: "B",
      name: "Opción B — Solo ingreso de información + pruebas",
      amountWithoutIgv: 1500,
      deliveryTime:
        "Hasta 2 semanas (contadas desde la entrega de información por parte del cliente; la entrega final podría ser en menos días)",
      includes: [
        "Ingreso de información inicial (carga y validación de datos base)",
        "Pruebas de funcionamiento (flujos críticos y consistencia de información)",
      ],
    },
  ],
  analysisSummary: [
    "Sincronización desde archivo central a archivo local (tablas y rangos; eliminación de filtros).",
    "Dashboards y resúmenes para Personal, Vehículos y Embarcaciones.",
    "Adjunto de PDF/JPG a registros con renombrado, copia a RECURSOS y BACKUP, y actualización de estado de vigencia.",
    "Creación y depuración de estructura de carpetas por proyecto según tablas maestras.",
    "Utilitarios de mantenimiento (exportar módulos, actualizar tablas maestras, accesos directos, navegación y ocultamiento de hojas).",
  ],
  qrText: "Cotización - Aplicación Habilitaciones - RUC: 20529648147",
};

function formatDateEs(date) {
  const d = new Date(date);
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = String(d.getFullYear());
  return `${dd}/${mm}/${yyyy}`;
}

function formatMoneyPEN(amount) {
  const fixed = Number(amount).toFixed(2);
  const [intPart, decPart] = fixed.split(".");
  const withThousands = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return `${QUOTE.currencySymbol} ${withThousands}.${decPart}`;
}

function generateQuoteNumber(date) {
  const d = new Date(date);
  const yyyy = String(d.getFullYear());
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `COT-${yyyy}${mm}${dd}-001`;
}

function setText(id, value) {
  const el = document.getElementById(id);
  if (!el) return;
  el.textContent = value;
}

async function renderQr() {
  const canvas = document.getElementById("qrCanvas");
  if (!canvas) return;
  await getQrDataUrl(QUOTE.qrText, canvas.width || 198, canvas);
}

function ensureLibs() {
  const missing = [];
  if (!window.jspdf || !window.jspdf.jsPDF) missing.push("PDF");
  return missing;
}

function blobToDataUrl(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error || new Error("file-reader-error"));
    reader.readAsDataURL(blob);
  });
}

async function getQrPngDataUrlViaApi(text, size) {
  const url = `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(text)}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`qr-api:${res.status}`);
  const blob = await res.blob();
  return await blobToDataUrl(blob);
}

async function drawImageToCanvas(dataUrl, canvas) {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  const img = new Image();
  await new Promise((resolve, reject) => {
    img.onload = resolve;
    img.onerror = reject;
    img.src = dataUrl;
  });

  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
}

async function getQrDataUrl(text, size, canvas) {
  if (window.QRCode && canvas) {
    await window.QRCode.toCanvas(canvas, text, {
      errorCorrectionLevel: "M",
      margin: 1,
      width: size,
      color: { dark: "#111827", light: "#ffffff" },
    });
    return canvas.toDataURL("image/png");
  }

  try {
    const dataUrl = await getQrPngDataUrlViaApi(text, size);
    if (canvas) await drawImageToCanvas(dataUrl, canvas);
    return dataUrl;
  } catch {
    return null;
  }
}

function pdfWrapText(doc, text, x, y, maxWidth, lineHeight) {
  const lines = doc.splitTextToSize(text, maxWidth);
  for (const line of lines) {
    doc.text(line, x, y);
    y += lineHeight;
  }
  return y;
}

function pdfBulletList(doc, items, x, y, maxWidth, lineHeight) {
  const bullet = "•";
  for (const item of items) {
    const lines = doc.splitTextToSize(item, maxWidth - 10);
    if (lines.length === 0) continue;
    doc.text(bullet, x, y);
    doc.text(lines[0], x + 8, y);
    y += lineHeight;
    for (let i = 1; i < lines.length; i++) {
      doc.text(lines[i], x + 8, y);
      y += lineHeight;
    }
    y += 1;
  }
  return y;
}

async function downloadPdf() {
  const btn = document.getElementById("btnDownloadPdf");
  if (btn) btn.disabled = true;

  try {
    const missing = ensureLibs();
    if (missing.length > 0) {
      alert(`No se pudo generar el PDF. Faltan librerías: ${missing.join(", ")}.\nVerifica conexión a internet o permite carga de CDN.`);
      return;
    }

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ unit: "pt", format: "a4" });
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 42;

    const quoteDate = new Date();
    const quoteNumber = generateQuoteNumber(quoteDate);

    doc.setFillColor(17, 24, 39);
    doc.roundedRect(margin, margin, pageWidth - margin * 2, 28, 10, 10, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.text("PROFORMA / COTIZACIÓN", margin + 14, margin + 18);

    const qrDataUrl = await getQrDataUrl(QUOTE.qrText, 198, document.getElementById("qrCanvas"));
    if (qrDataUrl) {
      const qrSize = 138;
      doc.addImage(qrDataUrl, "PNG", pageWidth - margin - qrSize, margin + 44, qrSize, qrSize);
    } else {
      doc.setTextColor(107, 114, 128);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9.5);
      doc.text("QR no disponible", pageWidth - margin, margin + 94, { align: "right" });
      doc.setTextColor(17, 24, 39);
    }

    doc.setTextColor(17, 24, 39);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.text("Cotización — Aplicación Habilitaciones", margin, margin + 62);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(10.5);
    doc.text(`Emisor: ${QUOTE.issuer.name}`, margin, margin + 84);
    doc.text(`RUC: ${QUOTE.issuer.ruc}`, margin, margin + 100);
    doc.text(`Fecha: ${formatDateEs(quoteDate)}`, margin, margin + 116);
    doc.text(`N.º: ${quoteNumber}`, margin, margin + 132);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text("Cliente", margin, margin + 164);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10.5);
    doc.text(`RUC: ${QUOTE.client.ruc}`, margin, margin + 182);

    const clientLabelY = margin + 196;
    const clientValueX = margin + 90;
    const clientMaxWidth = pageWidth - margin - clientValueX;
    const clientNameLines = doc.splitTextToSize(QUOTE.client.name, clientMaxWidth);

    doc.text("Razón social:", margin, clientLabelY);
    if (clientNameLines.length > 0) {
      doc.text(clientNameLines[0], clientValueX, clientLabelY);
      for (let i = 1; i < clientNameLines.length; i++) {
        doc.text(clientNameLines[i], clientValueX, clientLabelY + i * 13);
      }
    }

    let y = clientLabelY + Math.max(clientNameLines.length, 1) * 13 + 16;
    doc.setDrawColor(229, 231, 235);
    doc.line(margin, y, pageWidth - margin, y);
    y += 18;

    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text("Resumen del servicio", margin, y);
    y += 14;

    const optionA = QUOTE.options.find((o) => o.id === "A");
    const optionB = QUOTE.options.find((o) => o.id === "B");

    doc.setFont("helvetica", "normal");
    doc.setFontSize(10.5);
    y = pdfWrapText(
      doc,
      "La cotización principal (Opción A) considera adecuaciones/modificaciones sobre la aplicación actual en Excel (Habilitaciones), además de ingreso de información inicial y pruebas funcionales, incluyendo reporte de seguimiento por correo 1–2 días por semana.",
      margin,
      y,
      pageWidth - margin * 2 - 110,
      13
    );
    y += 6;
    if (optionA) {
      y = pdfBulletList(doc, optionA.includes, margin, y, pageWidth - margin * 2 - 110, 13);
    }
    y += 4;

    doc.setFont("helvetica", "bold");
    doc.setFontSize(10.5);
    doc.text("Alternativa (Opción B)", margin, y);
    y += 12;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10.5);
    if (optionB) {
      y = pdfWrapText(
        doc,
        "Si el servicio se limita únicamente a ingreso de información y pruebas (sin adecuaciones/modificaciones), aplica una cotización reducida.",
        margin,
        y,
        pageWidth - margin * 2 - 110,
        13
      );
      y += 4;
      y = pdfBulletList(doc, optionB.includes, margin, y, pageWidth - margin * 2 - 110, 13);
    }
    y += 6;

    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text("Alcance técnico (resumen)", margin, y);
    y += 14;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10.5);
    y = pdfBulletList(doc, QUOTE.analysisSummary, margin, y, pageWidth - margin * 2, 13);

    y += 6;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text("Plazo y condiciones", margin, y);
    y += 14;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10.5);
    if (optionA) {
      doc.text(`Plazo de entrega (Opción A): ${optionA.deliveryTime}`, margin, y);
      y += 14;
    }
    if (optionB) {
      doc.text(`Plazo de entrega (Opción B): ${optionB.deliveryTime}`, margin, y);
      y += 14;
    }
    doc.text(`Forma de pago: ${QUOTE.paymentTerms}`, margin, y);
    y += 18;

    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text("Detalle económico", margin, y);
    y += 12;

    const boxTop = y + 6;
    const boxHeight = 98;
    doc.setDrawColor(229, 231, 235);
    doc.roundedRect(margin, boxTop, pageWidth - margin * 2, boxHeight, 10, 10, "S");
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10.5);
    const maxTextWidth = pageWidth - margin * 2 - 180;
    const line1Y = boxTop + 24;
    const line2Y = boxTop + 52;

    if (optionA) {
      doc.text("Opción A — Adecuación/modificaciones sobre la aplicación actual", margin + 14, line1Y, { maxWidth: maxTextWidth });
      doc.setFont("helvetica", "bold");
      doc.text(formatMoneyPEN(optionA.amountWithoutIgv), pageWidth - margin - 14, line1Y, { align: "right" });
      doc.setFont("helvetica", "normal");
    }

    if (optionB) {
      doc.text("Opción B — Solo ingreso de información inicial y pruebas", margin + 14, line2Y, { maxWidth: maxTextWidth });
      doc.setFont("helvetica", "bold");
      doc.text(formatMoneyPEN(optionB.amountWithoutIgv), pageWidth - margin - 14, line2Y, { align: "right" });
      doc.setFont("helvetica", "normal");
    }

    doc.setTextColor(107, 114, 128);
    doc.text("Importes sin IGV", pageWidth - margin - 14, boxTop + 82, { align: "right" });
    doc.setTextColor(17, 24, 39);

    y = boxTop + boxHeight + 20;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10.5);
    doc.setTextColor(55, 65, 81);
    doc.text("Precio no incluye IGV.", margin, y);

    y += 22;
    doc.setTextColor(17, 24, 39);
    doc.setFont("helvetica", "bold");
    doc.text("Responsable", margin, y);
    y += 14;
    doc.setFont("helvetica", "normal");
    doc.text(`Analista de sistemas: ${QUOTE.analystName}`, margin, y);
    y += 14;
    doc.text(`Validez de la cotización: ${QUOTE.validityDays} días calendario`, margin, y);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(9.5);
    doc.setTextColor(107, 114, 128);
    doc.text(QUOTE.qrText, margin, pageHeight - margin + 10);

    doc.save(`Cotizacion_Aplicacion_Habilitaciones_${QUOTE.client.ruc}.pdf`);
  } finally {
    if (btn) btn.disabled = false;
  }
}

function init() {
  const quoteDate = new Date();
  setText("issuerName", QUOTE.issuer.name);
  setText("issuerRuc", QUOTE.issuer.ruc);
  setText("clientRuc", QUOTE.client.ruc);
  setText("clientName", QUOTE.client.name);
  setText("analystName", QUOTE.analystName);
  setText("validityDays", `${QUOTE.validityDays} días calendario`);
  setText("quoteDate", formatDateEs(quoteDate));
  setText("quoteNumber", generateQuoteNumber(quoteDate));

  const footerLine = `${QUOTE.issuer.name} — RUC ${QUOTE.issuer.ruc} — ${formatDateEs(quoteDate)}`;
  setText("footerLine", footerLine);

  const btn = document.getElementById("btnDownloadPdf");
  if (btn) btn.addEventListener("click", downloadPdf);

  renderQr();
}

document.addEventListener("DOMContentLoaded", init);
