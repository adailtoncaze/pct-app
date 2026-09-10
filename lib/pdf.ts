import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { PCT, STATUS_LABELS, ZONA_ELEITORAL_NOME } from "./types";

type RGB = [number, number, number];

/**
 * Paleta alinhada ao modelo HTML de referência (PCT-0001).
 * Mesmas cores usadas tanto na ficha individual quanto no relatório
 * consolidado, para manter identidade visual única no projeto.
 */
const COLORS: Record<string, RGB> = {
  navy: [59, 63, 122], // cor institucional dos cabeçalhos de seção e linha divisória do header
  navySoft: [236, 238, 247], // fundo do cabeçalho da tabela "Locais Vinculados" / zebra das tabelas
  purple: [91, 63, 174], // cor do rótulo PCT-XXXX
  success: [74, 157, 74], // ponto (dot) do status discreto
  successText: [74, 122, 74], // texto do status discreto
  text: [31, 36, 48], // texto principal
  muted: [107, 112, 128], // subtítulo do cabeçalho / observações
  label: [138, 143, 163], // rótulos dos campos (LOGRADOURO, CEP, etc.)
  border: [228, 229, 238], // linhas divisórias sutis (tabela de locais)
  indigo: [98, 100, 167],
  indigoSoft: [242, 244, 255],
  warning: [191, 124, 0],
  warningSoft: [255, 247, 237],
};

/**
 * Constantes de espaçamento da Ficha PCT — dimensionadas para que o
 * conteúdo inteiro (todas as seções + tabela de locais + observações)
 * caiba em uma única página A4, evitando a quebra de página vista em
 * fichas com nomes/tabelas maiores.
 */
const LAYOUT = {
  sectionBarHeight: 6.5, // altura da faixa azul do título de seção
  labelGap: 4.4, // distância entre a base da faixa (ou linha anterior) e o rótulo do campo
  valueGap: 4.4, // distância entre o rótulo e o valor do campo
  rowGap: 6, // distância entre duas linhas de campos dentro da mesma seção (ex.: Endereço)
  postSectionGap: 4, // respiro antes da próxima faixa de seção
};

/**
 * Indicador de status discreto: um ponto colorido + texto, sem caixa
 * de fundo nem borda — reflete o `.status-badge` do modelo HTML, que
 * fica ao lado do rótulo do PCT em vez de um selo grande.
 *
 * Compartilhado entre a Ficha PCT e o Relatório Consolidado.
 */
function addStatusIndicator(doc: jsPDF, status: PCT["status"], x: number, baselineY: number) {
  const label = STATUS_LABELS[status].toUpperCase();
  const dotColor: RGB = status === "pronto_transmissao" ? COLORS.success : COLORS.warning;
  const textColor: RGB = status === "pronto_transmissao" ? COLORS.successText : COLORS.warning;

  const dotRadius = 0.8;
  const dotX = x + dotRadius;
  const dotY = baselineY - 1.4;

  doc.setFillColor(...dotColor);
  doc.circle(dotX, dotY, dotRadius, "F");

  doc.setTextColor(...textColor);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7);
  doc.text(label, x + dotRadius * 2 + 2, baselineY);

  doc.setTextColor(...COLORS.text);
}

function formatDateTime(value: Date | string | null | undefined, includeSeconds = false) {
  const date = value ? new Date(value) : new Date();
  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  const pad = (n: number) => String(n).padStart(2, "0");
  const day = pad(date.getDate());
  const month = pad(date.getMonth() + 1);
  const year = date.getFullYear();
  const hours = pad(date.getHours());
  const minutes = pad(date.getMinutes());
  const seconds = pad(date.getSeconds());

  return includeSeconds
    ? `${day}/${month}/${year}, ${hours}:${minutes}:${seconds}`
    : `${day}/${month}/${year}, ${hours}:${minutes}`;
}

function formatBoolean(bool: boolean | null | undefined) {
  return bool === true ? "Sim" : "Não";
}

function splitToFit(doc: jsPDF, text: string, maxWidth: number) {
  const cleanText = text?.trim() || "—";
  if (doc.getTextWidth(cleanText) <= maxWidth) {
    return [cleanText];
  }

  return doc.splitTextToSize(cleanText, Math.max(18, maxWidth));
}

/**
 * Desenha rótulo + valor de um campo a partir de uma posição de base (y),
 * SEM assumir nenhuma folga própria: quem chama decide o y de partida
 * (normalmente logo após uma faixa de seção + LAYOUT.labelGap) e soma
 * LAYOUT.postSectionGap depois do retorno antes de iniciar a próxima seção.
 * É esse contrato explícito que evita a sobreposição do rótulo com a faixa
 * azul que existia na versão anterior.
 */
function drawField(doc: jsPDF, label: string, value: string, x: number, labelY: number, width: number, strong = false) {
  doc.setTextColor(...COLORS.label);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.text(label, x, labelY);

  doc.setTextColor(...COLORS.text);
  doc.setFont("helvetica", strong ? "bold" : "normal");
  doc.setFontSize(10.5);
  const maxValueWidth = Math.max(16, width);
  const lines = splitToFit(doc, value, maxValueWidth);
  const valueY = labelY + LAYOUT.valueGap;
  doc.text(lines, x, valueY);

  return valueY + (lines.length - 1) * 4.2;
}

/**
 * Cabeçalho de seção: fundo preenchido na cor institucional e título em branco.
 * Compartilhado entre a Ficha PCT e o Relatório Consolidado.
 */
function drawSectionHeader(doc: jsPDF, title: string, y: number, x: number, width: number) {
  const h = LAYOUT.sectionBarHeight;
  doc.setFillColor(...COLORS.navy);
  doc.rect(x, y, width, h, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.text(title.toUpperCase(), x + 6, y + h / 2 + 1.5);
  return y + h;
}

function drawLocalTable(doc: jsPDF, items: Array<{ nome_escola: string; secoes_count: number }>, startY: number, x: number, tableWidth: number) {
  const col1Width = tableWidth - 26;
  const rowH = 7.4; // altura da linha — mais respiro vertical entre os locais
  // padding direito da célula (equivalente ao padding: 8px 10px do <th>/<td> do modelo)
  const cellPaddingRight = 6;
  const secoesX = x + tableWidth - cellPaddingRight;
  const textBaselineOffset = rowH / 2 + 1.6;

  doc.setFillColor(...COLORS.navySoft);
  doc.rect(x, startY, tableWidth, rowH, "F");
  doc.setTextColor(...COLORS.navy);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.text("ESCOLA / LOCAL", x + 5, startY + textBaselineOffset);
  doc.text("SEÇÕES", secoesX, startY + textBaselineOffset, { align: "right" });

  doc.setTextColor(...COLORS.text);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);

  items.forEach((item, index) => {
    const y = startY + rowH + index * rowH;
    doc.setDrawColor(...COLORS.border);
    doc.line(x, y, x + tableWidth, y);
    const truncatedName = splitToFit(doc, item.nome_escola, col1Width - 6)[0];
    doc.text(truncatedName, x + 5, y + textBaselineOffset);
    doc.setTextColor(...COLORS.navy);
    doc.setFont("helvetica", "bold");
    doc.text(String(item.secoes_count), secoesX, y + textBaselineOffset, { align: "right" });
    doc.setTextColor(...COLORS.text);
    doc.setFont("helvetica", "normal");
  });

  return startY + rowH + items.length * rowH;
}

/** Gera a Ficha em PDF de um único PCT — layout espelha o modelo HTML PCT-0001 */
export function gerarFichaPCT(pct: PCT) {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 12;
  const left = margin;
  const right = pageWidth - margin;
  const contentWidth = right - left;
  const footerY = pageHeight - 9;
  const pageContentLimit = pageHeight - 24;

  function drawPageHeader() {
    doc.setFillColor(255, 255, 255);
    doc.rect(0, 0, pageWidth, pageHeight, "F");

    // Cabeçalho institucional: fundo branco + linha divisória (sem preenchimento)
    doc.setTextColor(...COLORS.navy);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(14.5);
    doc.text("TRIBUNAL REGIONAL ELEITORAL DA PARAÍBA", left, 18);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(10.5);
    doc.setTextColor(...COLORS.muted);
    doc.text("10ª Zona Eleitoral — Guarabira • Gestão de Polos de Contingência e Transmissão", left, 25);

    doc.setDrawColor(...COLORS.navy);
    doc.setLineWidth(0.7);
    doc.line(left, 31, right, 31);
  }

  function drawFooter() {
    const pageNumber = doc.getCurrentPageInfo().pageNumber;
    const totalPages = doc.getNumberOfPages();
    // linha divisória sutil acima do rodapé (.footer { border-top: 1px solid #e4e5ee })
    const dividerY = footerY - 5;
    doc.setDrawColor(...COLORS.border);
    doc.setLineWidth(0.25);
    doc.line(left, dividerY, right, dividerY);

    doc.setTextColor(144, 150, 168);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9.5);
    doc.text(`Emitido em ${formatDateTime(new Date(), true)}`, left, footerY);
    doc.text(`Página ${pageNumber} de ${totalPages}`, right, footerY, { align: "right" });
  }

  function ensureSpace(needed: number, cursorY: number) {
    if (cursorY + needed > pageContentLimit) {
      doc.addPage();
      drawPageHeader();
      return 40;
    }
    return cursorY;
  }

  drawPageHeader();

  let cursorY = 39;
  const sectionWidth = contentWidth;

  // PCT-XXXX + status discreto ao lado (sem selo/caixa de destaque)
  doc.setTextColor(...COLORS.purple);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text(pct.codigo, left, cursorY);
  const pctIdWidth = doc.getTextWidth(pct.codigo);
  addStatusIndicator(doc, pct.status, left + pctIdWidth + 5, cursorY);

  doc.setTextColor(...COLORS.text);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(15);
  const titleLines = splitToFit(doc, pct.nome || "—", contentWidth);
  const titleY = cursorY + 8;
  doc.text(titleLines, left, titleY);
  // reflete margin-bottom da .title-row — soma altura extra caso o nome do
  // polo quebre em mais de uma linha, para não sobrepor a próxima faixa
  cursorY = titleY + (titleLines.length - 1) * 6.4 + 7;

  // ---- Visão Geral ----
  cursorY = drawSectionHeader(doc, "Visão Geral", cursorY, left, sectionWidth);
  const summaryFields = [
    { label: "SEÇÕES TOTAIS", value: String(pct.secoes_totais ?? (pct.secoes_proprias ?? 0) + (pct.secoes_vinculadas ?? 0)) },
    { label: "LOCAIS VINCULADOS", value: String(pct.locais_vinculados?.length ?? 0) },
    { label: "SEÇÕES PRÓPRIAS", value: String(pct.secoes_proprias ?? 0) },
  ];
  const summaryX = [left, left + 58, left + 114];
  const summaryLabelY = cursorY + LAYOUT.labelGap;
  summaryFields.forEach((field, index) => {
    const x = summaryX[index];
    doc.setTextColor(...COLORS.label);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.text(field.label, x, summaryLabelY);
    doc.setTextColor(...COLORS.text);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text(field.value, x, summaryLabelY + LAYOUT.valueGap);
  });
  cursorY = summaryLabelY + LAYOUT.valueGap + LAYOUT.postSectionGap;

  // ---- Endereço ----
  cursorY = drawSectionHeader(doc, "Endereço", cursorY, left, sectionWidth);
  const enderecoTexto = pct.logradouro || "—";
  const referenciaTexto = pct.ponto_referencia || "—";
  let fieldY = cursorY + LAYOUT.labelGap;
  fieldY = drawField(doc, "LOGRADOURO", enderecoTexto, left, fieldY, sectionWidth - 2, true);
  fieldY += LAYOUT.rowGap;
  const cepValueY = drawField(doc, "CEP", pct.cep || "—", left, fieldY, 54);
  const refValueY = drawField(doc, "REFERÊNCIA", referenciaTexto, left + 71, fieldY, 94);
  cursorY = Math.max(cepValueY, refValueY) + LAYOUT.postSectionGap;

  // ---- Responsável ----
  cursorY = drawSectionHeader(doc, "Responsável", cursorY, left, sectionWidth);
  const funcao = pct.alvt ? "ALVT" : "—";
  const nomeResponsavel = pct.alvt?.nome || "Não informado";
  const telefoneResponsavel = pct.alvt?.telefone || "—";
  const respLabelY = cursorY + LAYOUT.labelGap;
  const funcaoValueY = drawField(doc, "FUNÇÃO", funcao, left, respLabelY, 40);
  const nomeValueY = drawField(doc, "NOME", nomeResponsavel, left + 46, respLabelY, 74, true);
  const telefoneValueY = drawField(doc, "TELEFONE", telefoneResponsavel, left + 123, respLabelY, 56);
  // usa a maior altura entre os três campos — se o NOME (ou outro campo)
  // quebrar em mais de uma linha, o respiro antes da próxima seção cresce
  // junto, evitando sobreposição com a faixa "Infraestrutura"
  cursorY = Math.max(funcaoValueY, nomeValueY, telefoneValueY) + LAYOUT.postSectionGap;

  // ---- Infraestrutura ----
  cursorY = drawSectionHeader(doc, "Infraestrutura", cursorY, left, sectionWidth);
  const infraLabelY = cursorY + LAYOUT.labelGap;
  const nobreakValueY = drawField(doc, "NO-BREAK", formatBoolean(pct.possui_nobreak), left, infraLabelY, 46);
  const redeValueY = drawField(doc, "PONTO DE REDE HOMOLOG.", formatBoolean(pct.ponto_rede_homologado), left + 50, infraLabelY, 52);
  const conectividadeValueY = drawField(doc, "CONECTIVIDADE", pct.conectividade || "—", left + 117, infraLabelY, 52);
  cursorY = Math.max(nobreakValueY, redeValueY, conectividadeValueY) + LAYOUT.postSectionGap;

  // ---- Atualização ----
  cursorY = drawSectionHeader(doc, "Atualização", cursorY, left, sectionWidth);
  const atualLabelY = cursorY + LAYOUT.labelGap;
  drawField(doc, "ÚLTIMA ATUALIZAÇÃO", formatDateTime(pct.updated_at, false), left, atualLabelY, 82, true);
  cursorY = atualLabelY + LAYOUT.valueGap + LAYOUT.postSectionGap;

  // ---- Locais Vinculados ----
  cursorY = drawSectionHeader(doc, "Locais Vinculados", cursorY, left, sectionWidth);
  const locais = pct.locais_vinculados ?? [];
  if (locais.length > 0) {
    const tableRequired = 8 + locais.length * 7.4;
    cursorY = ensureSpace(tableRequired, cursorY);
    cursorY = drawLocalTable(doc, locais, cursorY, left, sectionWidth) + LAYOUT.postSectionGap;
  } else {
    cursorY = ensureSpace(10, cursorY);
    doc.setTextColor(...COLORS.muted);
    doc.setFont("helvetica", "italic");
    doc.setFontSize(9.5);
    doc.text("Nenhum local vinculado informado.", left, cursorY + 4.5);
    cursorY += LAYOUT.postSectionGap + 6;
  }

  // ---- Observações Gerais ----
  cursorY = drawSectionHeader(doc, "Observações Gerais", cursorY, left, sectionWidth);
  const observacao = pct.observacoes_tecnicas?.trim() || "Campo destinado a registros complementares, ocorrências de manutenção ou pendências identificadas na preparação do polo para o pleito.";
  const obsLines = splitToFit(doc, observacao, sectionWidth - 4);
  const obsRequired = LAYOUT.labelGap + obsLines.length * 4.2;
  cursorY = ensureSpace(obsRequired, cursorY);
  doc.setTextColor(...COLORS.muted);
  doc.setFont("helvetica", "italic");
  doc.setFontSize(9.5);
  doc.text(obsLines, left, cursorY + LAYOUT.labelGap);

  for (let i = 1; i <= doc.getNumberOfPages(); i++) {
    doc.setPage(i);
    drawFooter();
  }

  doc.save(`Ficha_${pct.codigo}.pdf`);
}

/**
 * Gera o relatório consolidado de todos os PCTs da Zona Eleitoral.
 *
 * Segue a mesma identidade visual da Ficha PCT (gerarFichaPCT): cabeçalho
 * institucional grande, faixas de seção navy, cores de status e rodapé
 * padronizado — em vez do cabeçalho/rodapé genéricos usados anteriormente.
 * As informações apresentadas continuam as mesmas: contagens gerais no
 * topo e a tabela completa por PCT (Código, Local Polo, Status, Seções,
 * ALVT e Locais Vinculados).
 */
export function gerarRelatorioConsolidado(pcts: PCT[]) {
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const marginX = 14;
  const left = marginX;
  const right = pageWidth - marginX;
  const contentWidth = right - left;
  const footerY = pageHeight - 9;

  const reportTitle = `Relatório Consolidado de PCTs — ${ZONA_ELEITORAL_NOME}`;

  function drawPageHeader() {
    // Cabeçalho institucional, no mesmo padrão da Ficha PCT
    doc.setTextColor(...COLORS.navy);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(14.5);
    doc.text("TRIBUNAL REGIONAL ELEITORAL DA PARAÍBA", left, 16);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(10.5);
    doc.setTextColor(...COLORS.muted);
    doc.text("10ª Zona Eleitoral — Guarabira • Gestão de Polos de Contingência e Transmissão", left, 22.5);

    doc.setDrawColor(...COLORS.navy);
    doc.setLineWidth(0.7);
    doc.line(left, 27, right, 27);

    doc.setTextColor(...COLORS.text);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.text(reportTitle, left, 34);
  }

  function drawFooter() {
    const pageNumber = doc.getCurrentPageInfo().pageNumber;
    const totalPages = doc.getNumberOfPages();
    const dividerY = footerY - 5;
    doc.setDrawColor(...COLORS.border);
    doc.setLineWidth(0.25);
    doc.line(left, dividerY, right, dividerY);

    doc.setTextColor(144, 150, 168);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9.5);
    doc.text(`Emitido em ${formatDateTime(new Date(), true)}`, left, footerY);
    doc.text(`Página ${pageNumber} de ${totalPages}`, right, footerY, { align: "right" });
  }

  drawPageHeader();
  let cursorY = 40;

  // ---- Resumo Geral ----
  cursorY = drawSectionHeader(doc, "Resumo Geral", cursorY, left, contentWidth);

  const totalPcts = pcts.length;
  const pronto = pcts.filter((p) => p.status === "pronto_transmissao").length;
  const teste = pcts.filter((p) => p.status === "em_teste_link").length;
  const vinculados = pcts.filter((p) => (p.locais_vinculados?.length ?? 0) > 0).length;

  const summaryFields = [
    { label: "TOTAL DE PCTs", value: String(totalPcts) },
    { label: "PRONTOS P/ TRANSMISSÃO", value: String(pronto) },
    { label: "EM TESTE DE LINK", value: String(teste) },
    { label: "COM LOCAIS VINCULADOS", value: String(vinculados) },
  ];
  const summaryColWidth = contentWidth / summaryFields.length;
  const summaryLabelY = cursorY + LAYOUT.labelGap;
  summaryFields.forEach((field, index) => {
    const x = left + index * summaryColWidth;
    doc.setTextColor(...COLORS.label);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.text(field.label, x, summaryLabelY);
    doc.setTextColor(...COLORS.text);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(15);
    doc.text(field.value, x, summaryLabelY + 7);
  });
  cursorY = summaryLabelY + 7 + LAYOUT.postSectionGap;

  // ---- Detalhamento por PCT ----
  cursorY = drawSectionHeader(doc, "Detalhamento por PCT", cursorY, left, contentWidth);
  const tableStartY = cursorY + 2.5;
  const headerBottomForTable = 43; // espaço reservado nas páginas seguintes para repetir o cabeçalho institucional

  autoTable(doc, {
    startY: tableStartY,
    margin: { top: headerBottomForTable, left, right: marginX },
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
      font: "helvetica",
      fontSize: 7.6,
      cellPadding: 2.6,
      textColor: COLORS.text,
      overflow: "linebreak",
      valign: "middle",
      lineColor: COLORS.border,
      lineWidth: 0.15,
    },
    headStyles: {
      fillColor: COLORS.navy,
      textColor: [255, 255, 255],
      fontStyle: "bold",
      fontSize: 8,
      halign: "left",
    },
    bodyStyles: {
      fillColor: [255, 255, 255],
    },
    alternateRowStyles: { fillColor: COLORS.navySoft },
    columnStyles: {
      0: { cellWidth: 18, fontStyle: "bold", textColor: COLORS.purple },
      1: { cellWidth: "auto" },
      2: { cellWidth: 26 },
      3: { cellWidth: 20, halign: "center" },
      4: { cellWidth: 42 },
      5: { cellWidth: "auto" },
    },
    // Colore o texto da coluna Status com as mesmas cores de sucesso/alerta
    // usadas no indicador discreto da Ficha PCT (COLORS.success / warning).
    didParseCell: (data: any) => {
      if (data.section === "body" && data.column.index === 2) {
        const pct = pcts[data.row.index];
        if (pct) {
          const isReady = pct.status === "pronto_transmissao";
          data.cell.styles.textColor = isReady ? COLORS.successText : COLORS.warning;
          data.cell.styles.fontStyle = "bold";
        }
      }
    },
    // Repete o cabeçalho institucional em todas as páginas geradas pela tabela
    didDrawPage: () => {
      drawPageHeader();
    },
  });

  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    drawFooter();
  }

  doc.save("Relatorio_Consolidado_PCTs.pdf");
}