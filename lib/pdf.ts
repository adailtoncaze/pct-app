import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { PCT, STATUS_LABELS, ZONA_ELEITORAL_NOME } from "./types";

type RGB = [number, number, number];

const HEADER_LINES = [
  "Tribunal Regional Eleitoral da Paraíba",
  "10ª Zona Eleitoral - Guarabira",
  "Gestão de Polos de Contingência e Transmissão",
];
const COLORS: Record<string, RGB> = {
  indigo: [98, 100, 167],
  indigoSoft: [242, 244, 255],
  slate: [52, 65, 85],
  slateLight: [241, 245, 249],
  success: [46, 125, 50],
  successSoft: [236, 253, 245],
  warning: [191, 124, 0],
  warningSoft: [255, 247, 237],
  text: [32, 39, 48],
  muted: [94, 101, 109],
  border: [226, 232, 240],
};

function addHeader(doc: jsPDF, subtitle: string) {
  const pageWidth = doc.internal.pageSize.getWidth();
  const headerStartY = 16;
  const lastHeaderLineY = 26;
  const dividerY = 32;

  doc.setTextColor(...COLORS.text);
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.text(HEADER_LINES[0], 14, headerStartY);
  doc.text(HEADER_LINES[1], 14, headerStartY + 5);
  doc.text(HEADER_LINES[2], 14, lastHeaderLineY);

  doc.setFontSize(8.5);
  doc.setFont("helvetica", "normal");
  doc.text(subtitle, 14, dividerY + 4);

  doc.setDrawColor(...COLORS.border);
  doc.setLineWidth(0.4);
  doc.line(14, dividerY, pageWidth - 14, dividerY);
}

const HEADER_CONTENT_OFFSET = 48;

function addFooter(doc: jsPDF) {
  const pageCount = doc.getNumberOfPages();
  const emitido = new Date().toLocaleString("pt-BR");
  const pageWidth = doc.internal.pageSize.getWidth();
  const footerY = 286;

  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setTextColor(...COLORS.muted);
    doc.setFontSize(7);
    doc.text(`Emitido em ${emitido}`, 14, footerY);
    doc.text(`Página ${i} de ${pageCount}`, pageWidth - 32, footerY);
  }
}

function addStatusChip(doc: jsPDF, status: PCT["status"], x: number, y: number) {
  const label = STATUS_LABELS[status];
  const colors: RGB = status === "pronto_transmissao" ? COLORS.indigo : COLORS.warning;
  const soft: RGB = status === "pronto_transmissao" ? COLORS.indigoSoft : [255, 247, 237];
  const width = Math.max(34, Math.min(52, doc.getTextWidth(label) + 10));

  doc.setFillColor(...soft);
  doc.rect(x, y - 4, width, 7.5, "F");
  doc.setDrawColor(...colors);
  doc.setTextColor(...colors);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(6.5);
  doc.text(label, x + 4, y - 0.5);

  doc.setTextColor(...COLORS.text);
}

function addSummaryCard(doc: jsPDF, label: string, value: string, x: number, y: number, _fill: number[]) {
  const cardWidth = 36;
  doc.setDrawColor(...COLORS.border);
  doc.setLineWidth(0.3);
  doc.roundedRect(x, y, cardWidth, 16, 3, 3, "S");
  doc.setTextColor(...COLORS.muted);
  doc.setFontSize(6.1);
  doc.setFont("helvetica", "normal");
  doc.text(label, x + 4, y + 6);
  doc.setTextColor(...COLORS.text);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9.3);
  doc.text(value, x + 4, y + 12.5);
}

/** Gera a Ficha em PDF de um único PCT */
export function gerarFichaPCT(pct: PCT) {
  const doc = new jsPDF();
  addHeader(doc, `Ficha do Polo — ${pct.codigo}`);

  const pageWidth = doc.internal.pageSize.getWidth();
  const statusWidth = Math.max(34, Math.min(52, doc.getTextWidth(STATUS_LABELS[pct.status]) + 10));
  const rightX = pageWidth - 14 - statusWidth;
  const statusY = 35;
  const titleStartY = 48;
  addStatusChip(doc, pct.status, rightX, statusY);

  let y = titleStartY;
  doc.setTextColor(...COLORS.text);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9.5);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  const nomePCTLines = doc.splitTextToSize(`${pct.codigo} — ${pct.nome}`, 180);
  doc.text(nomePCTLines, 14, y);
  y += nomePCTLines.length * 6.2;

  const enderecoY = y + 1;
  const labelX = 14;
  const valueX = 52;
  const uniformFontSize = 9.2;
  const availableValueWidth = pageWidth - valueX - 12;
  const logradouroText = pct.logradouro || "—";
  const referenciaText = pct.ponto_referencia || "—";

  doc.setFont("helvetica", "normal");
  doc.setFontSize(uniformFontSize);
  const logradouroLines = doc.getTextWidth(logradouroText) <= availableValueWidth
    ? [logradouroText]
    : doc.splitTextToSize(logradouroText, availableValueWidth);
  const referenciaLines = doc.getTextWidth(referenciaText) <= availableValueWidth
    ? [referenciaText]
    : doc.splitTextToSize(referenciaText, availableValueWidth);
  const cepValue = pct.cep || "—";

  doc.setFont("helvetica", "bold");
  doc.setFontSize(uniformFontSize);
  doc.setTextColor(...COLORS.muted);
  doc.text("ENDEREÇO", labelX, enderecoY + 4);

  doc.setTextColor(...COLORS.text);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(uniformFontSize);
  doc.text(logradouroLines, valueX, enderecoY + 4);

  const linhaReferenciaY = enderecoY + 5;
  const linhaCepY = linhaReferenciaY + 5;

  doc.setFont("helvetica", "bold");
  doc.setTextColor(...COLORS.muted);
  doc.text("REFERÊNCIA", labelX, linhaReferenciaY + 4);

  doc.setTextColor(...COLORS.text);
  doc.setFont("helvetica", "normal");
  doc.text(referenciaLines, valueX, linhaReferenciaY + 4);

  doc.setFont("helvetica", "bold");
  doc.setTextColor(...COLORS.muted);
  doc.text("CEP", labelX, linhaCepY + 4);

  doc.setTextColor(...COLORS.text);
  doc.setFont("helvetica", "normal");
  doc.text(cepValue, valueX, linhaCepY + 4);

  y = linhaCepY + 8;
  addSummaryCard(doc, "Seções Próprias", String(pct.secoes_proprias ?? 0), 14, y, [255, 255, 255]);
  addSummaryCard(doc, "Seções Vinc.", String(pct.secoes_vinculadas ?? 0), 56, y, [255, 255, 255]);
  addSummaryCard(doc, "Locais Vinc.", String(pct.locais_vinculados?.length ?? 0), 98, y, [255, 255, 255]);
  addSummaryCard(doc, "Total de Seções", String(pct.secoes_totais ?? (pct.secoes_proprias ?? 0) + (pct.secoes_vinculadas ?? 0)), 140, y, [255, 255, 255]);
  y += 22;

  const footerSafeZone = 36;
  const maxYBeforeFooter = doc.internal.pageSize.getHeight() - footerSafeZone;
  if (y + 60 > maxYBeforeFooter) {
    doc.addPage();
    y = 24;
    addHeader(doc, `Ficha do Polo — ${pct.codigo}`);
  }

  if (pct.locais_vinculados && pct.locais_vinculados.length > 0) {
    autoTable(doc, {
      startY: y,
      head: [["Escola / Local", "Seções"]],
      body: pct.locais_vinculados.map((l) => [l.nome_escola, String(l.secoes_count)]),
      theme: "grid",
      styles: {
        fontSize: 8.5,
        cellPadding: 3,
        textColor: COLORS.text,
        lineColor: COLORS.border,
      },
      headStyles: {
        fillColor: COLORS.indigo,
        textColor: [255, 255, 255],
        fontStyle: "bold",
      },
      alternateRowStyles: { fillColor: [248, 250, 252] },
      margin: { left: 14, right: 14 },
    });
    // @ts-expect-error lastAutoTable é injetado pelo plugin em runtime
    y = doc.lastAutoTable.finalY + 8;
  }

  doc.setDrawColor(...COLORS.border);
  doc.roundedRect(14, y, 182, 26, 4, 4, "S");
  doc.setTextColor(...COLORS.muted);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.2);
  doc.text("RESPONSÁVEL ALVT", 20, y + 8);
  doc.setTextColor(...COLORS.text);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);

  if (pct.alvt) {
    doc.text(`Nome: ${pct.alvt.nome}`, 20, y + 16);
    doc.text(`Contato: ${pct.alvt.telefone}`, 120, y + 16);
  } else {
    doc.text("Não informado.", 20, y + 16);
  }

  y += 36;

  if (pct.observacoes_tecnicas) {
    doc.setFillColor(255, 250, 240);
    doc.roundedRect(14, y, 182, 22, 4, 4, "F");
    doc.setDrawColor(255, 204, 128);
    doc.roundedRect(14, y, 182, 22, 4, 4, "S");
    doc.setTextColor(...COLORS.warning);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.2);
    doc.text("OBSERVAÇÕES TÉCNICAS", 20, y + 8);
    doc.setTextColor(...COLORS.text);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    const lines = doc.splitTextToSize(pct.observacoes_tecnicas, 160);
    doc.text(lines, 20, y + 15);
  }

  addFooter(doc);
  doc.save(`Ficha_${pct.codigo}.pdf`);
}

/** Gera o relatório consolidado de todos os PCTs da Zona Eleitoral */
export function gerarRelatorioConsolidado(pcts: PCT[]) {
  const doc = new jsPDF({ orientation: "landscape" });
  addHeader(doc, `Relatório Consolidado de PCTs — ${ZONA_ELEITORAL_NOME}`);

  const totalPcts = pcts.length;
  const pronto = pcts.filter((p) => p.status === "pronto_transmissao").length;
  const teste = pcts.filter((p) => p.status === "em_teste_link").length;
  const vinculados = pcts.filter((p) => (p.locais_vinculados?.length ?? 0) > 0).length;

  const footerSafeZone = 26;
  let y = 42;
  addSummaryCard(doc, "Total", String(totalPcts), 14, y, [255, 255, 255]);
  addSummaryCard(doc, "Prontos", String(pronto), 68, y, [255, 255, 255]);
  addSummaryCard(doc, "Em teste", String(teste), 122, y, [255, 255, 255]);
  addSummaryCard(doc, "Com vínculos", String(vinculados), 176, y, [255, 255, 255]);

  y += 22;
  const pageHeight = doc.internal.pageSize.getHeight();
  const maxYBeforeFooter = pageHeight - footerSafeZone;
  const tableEstimatedHeight = 120;
  if (y + tableEstimatedHeight > maxYBeforeFooter) {
    doc.addPage();
    y = 20;
    addHeader(doc, `Relatório Consolidado de PCTs — ${ZONA_ELEITORAL_NOME}`);
  }

  const tableLeft = 14;
  const tableRight = 14;
  const tableWidth = doc.internal.pageSize.getWidth() - tableLeft - tableRight;

  autoTable(doc, {
    startY: y,
    head: [["Código", "Local Polo", "Status", "Seções", "ALVT", "Locais Vinculados"]],
    body: pcts.map((p) => {
      const secoesVinculadas = p.secoes_vinculadas ?? 0;
      const secoesTotais = p.secoes_totais ?? p.secoes_proprias + secoesVinculadas;
      const locais = (p.locais_vinculados ?? [])
        .map((local) => `${local.nome_escola} (${local.secoes_count})`)
        .join("\n");
      return [
        p.codigo,
        p.nome,
        STATUS_LABELS[p.status],
        `${secoesTotais} (${p.secoes_proprias}+${secoesVinculadas})`,
        p.alvt?.nome ?? "—",
        locais || "—",
      ];
    }),
    theme: "plain",
    styles: {
      fontSize: 7.1,
      cellPadding: 2.5,
      textColor: COLORS.text,
      overflow: "linebreak",
      valign: "middle",
    },
    headStyles: {
      fillColor: [245, 246, 248],
      textColor: COLORS.text,
      fontStyle: "bold",
      halign: "center",
    },
    bodyStyles: {
      fillColor: [255, 255, 255],
    },
    alternateRowStyles: { fillColor: [250, 251, 253] },
    margin: { left: tableLeft, right: tableRight },
    tableWidth,
    columnStyles: {
      0: { cellWidth: "auto" },
      1: { cellWidth: "auto" },
      2: { cellWidth: "auto" },
      3: { cellWidth: "auto" },
      4: { cellWidth: "auto" },
      5: { cellWidth: "auto" },
    },
  });

  const pageCount = doc.getNumberOfPages();
  const emitido = new Date().toLocaleString("pt-BR");
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setTextColor(...COLORS.muted);
    doc.setFontSize(7);
    const footerY = doc.internal.pageSize.getHeight() - 6;
    doc.text(`Emitido em ${emitido}`, 14, footerY);
    doc.text(`Página ${i} de ${pageCount}`, doc.internal.pageSize.getWidth() - 28, footerY);
  }

  doc.save("Relatorio_Consolidado_PCTs.pdf");
}
