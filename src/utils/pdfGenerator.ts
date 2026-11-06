import { jsPDF } from 'jspdf';
import { Specimen, LabelConfig } from '../types/botanical';
import {
  cleanPhenologyText,
  expandSpecimensWithDuplicates,
  formatBotanicalDate,
  formatBotanicalDateParts,
  formatCoordinatesFromSpecimen,
  formatFloresValue,
  formatFrutosValue,
  formatSiglaTombo,
  formatUcDisplay,
  getDuplicateCount,
} from './botanicalFormatter';

// Herbário José Ângelo Rizzo official logo path
const HERBARIUM_SEAL_IMG = '/assets/aistudio/logo_5dd7f3b5.jpg';

/**
 * Loads an image from URL and converts to base64 for jsPDF
 */
async function getBase64ImageFromUrl(imageUrl: string): Promise<string | null> {
  try {
    const res = await fetch(imageUrl);
    const blob = await res.blob();
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch (e) {
    console.warn('Failed to load image for PDF:', e);
    return null;
  }
}

/**
 * Helper to draw a paragraph where the prefix label is bold and the rest of the text is normal,
 * wrapping cleanly within maxWidth. Returns the new Y coordinate after all lines.
 */
function drawLabeledParagraph(
  doc: jsPDF,
  fontName: string,
  fontSize: number,
  lineHeight: number,
  label: string,
  value: string,
  x: number,
  y: number,
  maxWidth: number,
  textColor: [number, number, number] = [0, 0, 0]
): number {
  doc.setFontSize(fontSize);
  doc.setTextColor(textColor[0], textColor[1], textColor[2]);

  doc.setFont(fontName, 'bold');
  const labelWidth = doc.getTextWidth(label);

  // Split full text to measure lines, but indent first line by labelWidth
  doc.setFont(fontName, 'normal');
  const words = value.trim().split(/\s+/);
  const lines: { text: string; isFirst: boolean }[] = [];

  let currentLine = '';
  let isFirstLine = true;
  const firstLineAvail = Math.max(10, maxWidth - labelWidth);

  for (const word of words) {
    const testLine = currentLine ? `${currentLine} ${word}` : word;
    const availWidth = isFirstLine ? firstLineAvail : maxWidth;
    if (doc.getTextWidth(testLine) <= availWidth || !currentLine) {
      currentLine = testLine;
    } else {
      lines.push({ text: currentLine, isFirst: isFirstLine });
      currentLine = word;
      isFirstLine = false;
    }
  }
  if (currentLine) {
    lines.push({ text: currentLine, isFirst: isFirstLine });
  }

  let currY = y;
  for (const line of lines) {
    if (line.isFirst) {
      doc.setFont(fontName, 'bold');
      doc.text(label, x, currY);
      doc.setFont(fontName, 'normal');
      doc.text(line.text, x + labelWidth, currY);
    } else {
      doc.setFont(fontName, 'normal');
      doc.text(line.text, x, currY);
    }
    currY += lineHeight;
  }

  return currY;
}

/**
 * Measure how many lines drawLabeledParagraph will take without drawing
 */
function measureLabeledParagraphHeight(
  doc: jsPDF,
  fontName: string,
  fontSize: number,
  lineHeight: number,
  label: string,
  value: string,
  maxWidth: number
): number {
  doc.setFontSize(fontSize);
  doc.setFont(fontName, 'bold');
  const labelWidth = doc.getTextWidth(label);
  doc.setFont(fontName, 'normal');

  const words = value.trim().split(/\s+/);
  let lineCount = 0;
  let currentLine = '';
  let isFirstLine = true;
  const firstLineAvail = Math.max(10, maxWidth - labelWidth);

  for (const word of words) {
    const testLine = currentLine ? `${currentLine} ${word}` : word;
    const availWidth = isFirstLine ? firstLineAvail : maxWidth;
    if (doc.getTextWidth(testLine) <= availWidth || !currentLine) {
      currentLine = testLine;
    } else {
      lineCount++;
      currentLine = word;
      isFirstLine = false;
    }
  }
  if (currentLine) {
    lineCount++;
  }

  return lineCount * lineHeight;
}

/**
 * Render a single herbarium exsiccata label inside a specified rectangular area on the PDF,
 * matching BotanicalLabel.tsx 100% visually.
 */
async function renderSpecimenLabelOnPdf(
  doc: jsPDF,
  specimen: Specimen,
  config: LabelConfig,
  x: number,
  y: number,
  width: number,
  height: number,
  sealBase64: string | null
) {
  const baseFont = 'times';

  // White card background + outer border (border-black)
  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.3);
  doc.rect(x, y, width, height, 'FD');

  const padding = 2.8; // mm
  const contentWidth = width - padding * 2;
  let currentY = y + padding;

  // Data preparation (identical to BotanicalLabel.tsx)
  const tombo = specimen.TOMBO || specimen.catalogNumber || '';
  const institution = 'Herbário José Ângelo Rizzo (JAR)';
  const subInstitution =
    config.subHeader ||
    'Universidade Estadual de Goiás - Campus Sudoeste: Sede Quirinópolis';
  const herbariumAcronym = 'JAR';
  const siglaTombo = formatSiglaTombo(herbariumAcronym, tombo);

  const sciGenus =
    specimen.GÊNERO ||
    (specimen.scientificName ? specimen.scientificName.split(' ')[0] : 'Indet.');
  const sciCf = specimen.CF ? `${specimen.CF} ` : '';
  const sciSp =
    specimen.ESPÉCIE ||
    (specimen.scientificName
      ? specimen.scientificName.split(' ').slice(1).join(' ')
      : 'sp.');
  const sciAuthor = specimen.AUTHOR || specimen.scientificNameAuthorship || '';
  const family = (
    specimen.FAMÍLIA ||
    specimen.family ||
    'INDETERMINADA'
  ).toUpperCase();

  const collectionDate =
    specimen.DIA || specimen.MÊS || specimen.ANO
      ? formatBotanicalDateParts(specimen.DIA, specimen.MÊS, specimen.ANO)
      : formatBotanicalDate(
          specimen.eventDate || specimen.eventDateFormatted || specimen.DATA
        ) || 's.d.';

  const detDate =
    specimen.DIA_DET || specimen.MÊS_DET || specimen.ANO_DET
      ? formatBotanicalDateParts(
          specimen.DIA_DET,
          specimen.MÊS_DET,
          specimen.ANO_DET
        )
      : formatBotanicalDate(specimen.dateIdentified);

  const formattedCoords = formatCoordinatesFromSpecimen(specimen);

  const habitStr = [
    specimen.HÁBITO,
    specimen.ALTURA ? `${specimen.ALTURA} ${specimen['UN ALT'] || 'm'} alt.` : '',
  ]
    .filter(Boolean)
    .join(', ');

  const phenologyNotes = [
    formatFloresValue(specimen.FLORES),
    formatFrutosValue(specimen.FRUTOS),
    !specimen.FLORES && !specimen.FRUTOS && specimen.phenology
      ? cleanPhenologyText(specimen.phenology)
      : '',
  ]
    .filter(Boolean)
    .join('. ');

  const observations = specimen.OBS || specimen.plantDescription || '';

  // =========================================================================
  // 1. CABEÇALHO: LOGO + NOME DO HERBÁRIO + SUB-CABEÇALHO + REGISTRO
  // =========================================================================
  const headerHeight = 15.2;
  const sealHeight = 13.4;
  const sealWidth = 8.5; // Aspect ratio 538 / 846 = 0.636

  if (config.showHerbariumSeal && sealBase64) {
    try {
      doc.addImage(
        sealBase64,
        'JPEG',
        x + padding,
        currentY,
        sealWidth,
        sealHeight
      );
    } catch {
      // Fallback if image fails
    }
  }

  const textStartX =
    config.showHerbariumSeal && sealBase64
      ? x + padding + sealWidth + 2.5
      : x + padding;
  const textWidth =
    config.showHerbariumSeal && sealBase64
      ? contentWidth - sealWidth - 2.5
      : contentWidth;
  const centerHeaderX = textStartX + textWidth / 2;

  doc.setFont(baseFont, 'bold');
  doc.setFontSize(12.2);
  doc.setTextColor(0, 0, 0);
  doc.text(institution, centerHeaderX, currentY + 4.2, {
    align: 'center',
    maxWidth: textWidth,
  });

  doc.setFont(baseFont, 'normal');
  doc.setFontSize(8.8);
  doc.setTextColor(0, 0, 0);
  doc.text(subInstitution, centerHeaderX, currentY + 8.1, {
    align: 'center',
    maxWidth: textWidth,
  });

  // REGISTRO inside header
  const regLabel = 'REGISTRO: ';
  const regVal = siglaTombo || 's.n.';
  doc.setFont(baseFont, 'bold');
  doc.setFontSize(9.5);
  const regLabelW = doc.getTextWidth(regLabel);
  doc.setFont(baseFont, 'bold');
  doc.setFontSize(11.2);
  const regValW = doc.getTextWidth(regVal);
  const totalRegW = regLabelW + regValW;
  const regStartX = centerHeaderX - totalRegW / 2;

  doc.setFont(baseFont, 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(0, 0, 0);
  doc.text(regLabel, regStartX, currentY + 12.6);

  doc.setFont(baseFont, 'bold');
  doc.setFontSize(11.2);
  doc.setTextColor(0, 0, 0);
  doc.text(regVal, regStartX + regLabelW, currentY + 12.7);

  currentY += headerHeight;
  // ---------- LINHA 1 (após Cabeçalho) ----------
  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.3);
  doc.line(x + padding, currentY, x + width - padding, currentY);
  currentY += 4.2;

  // =========================================================================
  // 2. FAMÍLIA + ESPÉCIE (GÊNERO + CF + ESPÉCIE + AUTOR + N.V.)
  // =========================================================================
  doc.setFont(baseFont, 'bold');
  doc.setFontSize(11.8);
  doc.setTextColor(0, 0, 0);
  doc.text(family, x + padding, currentY);
  currentY += 4.6;

  let taxonX = x + padding;
  doc.setFont(baseFont, 'bolditalic');
  doc.setFontSize(13.2);
  doc.setTextColor(0, 0, 0);
  doc.text(sciGenus, taxonX, currentY);
  taxonX += doc.getTextWidth(sciGenus);

  if (sciCf.trim()) {
    doc.setFont(baseFont, 'normal');
    doc.setFontSize(11.2);
    doc.setTextColor(0, 0, 0);
    const cfText = ` ${sciCf.trim()} `;
    doc.text(cfText, taxonX, currentY);
    taxonX += doc.getTextWidth(cfText);
  } else {
    doc.setFont(baseFont, 'bolditalic');
    doc.setFontSize(13.2);
    doc.text(' ', taxonX, currentY);
    taxonX += doc.getTextWidth(' ');
  }

  doc.setFont(baseFont, 'bolditalic');
  doc.setFontSize(13.2);
  doc.setTextColor(0, 0, 0);
  doc.text(sciSp, taxonX, currentY);
  taxonX += doc.getTextWidth(sciSp);

  if (sciAuthor) {
    doc.setFont(baseFont, 'normal');
    doc.setFontSize(11.0);
    doc.setTextColor(0, 0, 0);
    doc.text(`  ${sciAuthor}`, taxonX, currentY);
  }

  if (specimen.vernacularName) {
    currentY += 3.6;
    doc.setFont(baseFont, 'italic');
    doc.setFontSize(9.4);
    doc.setTextColor(0, 0, 0);
    doc.text(`N.V.: ${specimen.vernacularName}`, x + padding, currentY);
  }

  currentY += 2.0;
  // ---------- LINHA 2 (após Família / Espécie) ----------
  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.3);
  doc.line(x + padding, currentY, x + width - padding, currentY);
  currentY += 4.0;

  // =========================================================================
  // 3. INFORMAÇÕES DE LOCALIZAÇÃO
  // =========================================================================
  const locLineH = 3.85;
  const locX = x + padding;
  const locInnerW = contentWidth;

  const locLine1 = [
    specimen['CAMPO ESPECIFICADO']
      ? String(specimen['CAMPO ESPECIFICADO']).trim()
      : '',
    specimen.CIDADE || specimen.municipality,
    specimen.ESTADO || specimen.stateProvince,
    specimen.PAÍS || specimen.country || 'Brasil',
  ]
    .filter(Boolean)
    .join(', ');

  const hasCoordsRow = Boolean(
    formattedCoords || specimen.ALTITUDE || specimen.elevation
  );
  const locDetail = String(
    specimen['DESCRIÇÃO LOCALIDADE'] || specimen.locality || ''
  ).trim();
  const ucText = formatUcDisplay(specimen.UC);
  const obsLoc = String(specimen['OBSERVAÇÃO LOCALIDADE'] || '').trim();

  // Linha 1: Campo especificado, Cidade, Estado, País (bold)
  doc.setFont(baseFont, 'bold');
  doc.setFontSize(10.6);
  doc.setTextColor(0, 0, 0);
  doc.text(locLine1, locX, currentY, { maxWidth: locInnerW });
  currentY += locLineH;

  // Linha 2: Coordenadas: Latitude, Longitude (datum) Alt.: ...
  if (hasCoordsRow) {
    let coordX = locX;
    if (formattedCoords) {
      doc.setFont(baseFont, 'bold');
      doc.setFontSize(10.0);
      doc.setTextColor(0, 0, 0);
      const cLabel = 'Coordenadas: ';
      doc.text(cLabel, coordX, currentY);
      coordX += doc.getTextWidth(cLabel);

      doc.setFont(baseFont, 'normal');
      doc.setFontSize(10.0);
      doc.text(formattedCoords, coordX, currentY);
      coordX += doc.getTextWidth(formattedCoords) + 1.5;
    }
    if (specimen.datum) {
      doc.setFont(baseFont, 'normal');
      doc.setFontSize(9.4);
      const datumStr = `(${specimen.datum})`;
      doc.text(datumStr, coordX, currentY);
      coordX += doc.getTextWidth(datumStr) + 1.8;
    }
    if (specimen.ALTITUDE || specimen.elevation) {
      doc.setFont(baseFont, 'normal');
      doc.setFontSize(10.0);
      const altStr = `Alt.: ${specimen.ALTITUDE || specimen.elevation} ${specimen.UN || 'm'}`;
      doc.text(altStr, coordX, currentY);
    }
    currentY += locLineH;
  }

  // Linha 3: Descrição da Localidade:
  if (locDetail) {
    currentY = drawLabeledParagraph(
      doc,
      baseFont,
      10.0,
      locLineH,
      'Descrição da Localidade: ',
      locDetail,
      locX,
      currentY,
      locInnerW,
      [0, 0, 0]
    );
  }

  // Linha 4: É unidade de conservação:
  currentY = drawLabeledParagraph(
    doc,
    baseFont,
    10.0,
    locLineH,
    'É unidade de conservação: ',
    ucText,
    locX,
    currentY,
    locInnerW,
    [0, 0, 0]
  );

  // Linha 5: Obs. loc.:
  if (obsLoc) {
    doc.setFont(baseFont, 'italic');
    doc.setFontSize(9.4);
    doc.setTextColor(0, 0, 0);
    const obsLocLines = doc.splitTextToSize(`Obs. loc.: ${obsLoc}`, locInnerW);
    doc.text(obsLocLines, locX, currentY);
    currentY += obsLocLines.length * 3.5;
  }

  currentY += 0.4;
  // ---------- LINHA 3 (após Informações de localização) ----------
  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.3);
  doc.line(x + padding, currentY, x + width - padding, currentY);
  currentY += 4.0;

  // =========================================================================
  // 4. HABITAT, HÁBITO, FENOLOGIA, NOTAS
  // =========================================================================
  const sec6LineH = 3.8;
  const habitatText = String(specimen.HABITAT || specimen.habitat || '').trim();
  if (habitatText) {
    currentY = drawLabeledParagraph(
      doc,
      baseFont,
      10.0,
      sec6LineH,
      'Habitat: ',
      habitatText,
      x + padding,
      currentY,
      contentWidth,
      [0, 0, 0]
    );
  }

  if (habitStr) {
    currentY = drawLabeledParagraph(
      doc,
      baseFont,
      10.0,
      sec6LineH,
      'Hábito: ',
      `${habitStr}.`,
      x + padding,
      currentY,
      contentWidth,
      [0, 0, 0]
    );
  }

  if (phenologyNotes) {
    currentY = drawLabeledParagraph(
      doc,
      baseFont,
      10.0,
      sec6LineH,
      'Fenologia: ',
      `${phenologyNotes}.`,
      x + padding,
      currentY,
      contentWidth,
      [0, 0, 0]
    );
  }

  if (observations) {
    currentY = drawLabeledParagraph(
      doc,
      baseFont,
      10.0,
      sec6LineH,
      'Notas: ',
      String(observations),
      x + padding,
      currentY,
      contentWidth,
      [0, 0, 0]
    );
  }

  // =========================================================================
  // 5. COLETOR & DET (---------- LINHA 4 antes de Coletor/Det ----------)
  // =========================================================================
  const hasDet = Boolean(specimen.DETERMINAÇÃO || specimen.identifiedBy);
  const footerHeight = hasDet ? 10.6 : 6.8;
  const footerTopY = y + height - padding - footerHeight + 1.5;

  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.3);
  doc.line(x + padding, footerTopY, x + padding + contentWidth, footerTopY);

  const row1Y = footerTopY + 3.8;
  doc.setFont(baseFont, 'bold');
  doc.setFontSize(10.4);
  doc.setTextColor(0, 0, 0);
  const collectorName = specimen.COLETOR || specimen.recordedBy || 's.n.';
  const collectorNum = specimen['Nº COLETA'] || specimen.recordNumber || 's.n.';
  doc.text(`Col.: ${collectorName} nº ${collectorNum}`, x + padding, row1Y);

  doc.setFont(baseFont, 'normal');
  doc.setFontSize(10.0);
  doc.setTextColor(0, 0, 0);
  doc.text(
    `Data: ${collectionDate}`,
    x + padding + contentWidth,
    row1Y,
    { align: 'right' }
  );

  if (hasDet) {
    const row2Y = row1Y + 3.8;
    const detPerson = String(
      specimen.DETERMINAÇÃO || specimen.identifiedBy || ''
    );
    doc.setFont(baseFont, 'bold');
    doc.setFontSize(9.8);
    doc.setTextColor(0, 0, 0);
    const detLabel = 'Det.: ';
    doc.text(detLabel, x + padding, row2Y);
    const detLabelW = doc.getTextWidth(detLabel);

    doc.setFont(baseFont, 'normal');
    doc.text(detPerson, x + padding + detLabelW, row2Y);

    if (detDate) {
      doc.setFont(baseFont, 'normal');
      doc.setFontSize(9.5);
      doc.setTextColor(0, 0, 0);
      doc.text(
        `Data Det.: ${detDate}`,
        x + padding + contentWidth,
        row2Y,
        { align: 'right' }
      );
    }
  }
}

/**
 * Exports multiple specimens as an A4 printable sheet PDF
 * Automatically prints 1 original + N duplicate labels (QTDE DUPLICATA) per specimen when expandDuplicates is true
 */
export async function exportSpecimensToPdfSheet(
  specimens: Specimen[],
  config: LabelConfig,
  expandDuplicates: boolean = true
): Promise<void> {
  const labelsToPrint = expandDuplicates
    ? expandSpecimensWithDuplicates(specimens, true)
    : specimens;

  // Label dimensions based on configuration (Default requested: 12cm largura x 10cm comprimento)
  let labelWidth = 120; // mm (12 cm de largura)
  let labelHeight = 100; // mm (10 cm de comprimento)
  let isLandscape = true;
  let startX = 25; // Margem na folha A4 paisagem (297 x 210 mm)
  let startY = 4;
  let gapX = 7;
  let gapY = 2;
  let cols = 2;
  let rows = 2;

  if (config.template === 'standard_100x120') {
    labelWidth = 100;
    labelHeight = 120;
    isLandscape = false;
    startX = 4;
    startY = 24;
    gapX = 2;
    gapY = 7;
    cols = 2;
    rows = 2;
  } else if (config.template === 'standard_105x75') {
    labelWidth = 98;
    labelHeight = 68;
    isLandscape = false;
    startX = 6;
    startY = 10;
    gapX = 4;
    gapY = 5;
    cols = 2;
    rows = 4;
  } else if (config.template === 'large_140x100') {
    labelWidth = 140;
    labelHeight = 100;
    isLandscape = false;
    startX = 35;
    startY = 40;
    cols = 1;
    rows = 2;
  } else if (config.template === 'compact_90x60') {
    labelWidth = 90;
    labelHeight = 60;
    isLandscape = false;
    startX = 12;
    startY = 15;
    gapX = 6;
    gapY = 6;
    cols = 2;
    rows = 4;
  }

  const doc = new jsPDF({
    orientation: isLandscape ? 'landscape' : 'portrait',
    unit: 'mm',
    format: 'a4', // 297 x 210 mm ou 210 x 297 mm
  });

  const sealBase64 = await getBase64ImageFromUrl(HERBARIUM_SEAL_IMG);

  for (let i = 0; i < labelsToPrint.length; i++) {
    const pageItemIndex = i % (cols * rows);

    if (i > 0 && pageItemIndex === 0) {
      doc.addPage('a4', isLandscape ? 'landscape' : 'portrait');
    }

    const col = pageItemIndex % cols;
    const row = Math.floor(pageItemIndex / cols);

    const x = startX + col * (labelWidth + gapX);
    const y = startY + row * (labelHeight + gapY);

    await renderSpecimenLabelOnPdf(
      doc,
      labelsToPrint[i],
      config,
      x,
      y,
      labelWidth,
      labelHeight,
      sealBase64
    );

    // Subtle crop marks around the label for paper guillotining
    doc.setDrawColor(180, 180, 180);
    doc.setLineWidth(0.1);
    doc.line(x - 2, y, x, y);
    doc.line(x, y - 2, x, y);
    doc.line(x + labelWidth, y, x + labelWidth + 2, y);
    doc.line(x + labelWidth, y - 2, x + labelWidth, y);
    doc.line(x - 2, y + labelHeight, x, y + labelHeight);
    doc.line(x, y + labelHeight, x, y + labelHeight + 2);
    doc.line(x + labelWidth, y + labelHeight, x + labelWidth + 2, y + labelHeight);
    doc.line(x + labelWidth, y + labelHeight, x + labelWidth, y + labelHeight + 2);
  }

  doc.save(`etiquetas_excicatas_12x10_${new Date().toISOString().slice(0, 10)}.pdf`);
}

/**
 * Exports a single specimen's label(s) in its exact physical dimension (Default: 120mm x 100mm).
 * If the specimen has duplicates (QTDE DUPLICATA > 0), prints 1 + QTDE DUPLICATA labels.
 */
export async function exportSingleLabelPdf(
  specimen: Specimen,
  config: LabelConfig
): Promise<void> {
  let labelWidth = 120; // mm (12 cm de largura)
  let labelHeight = 100; // mm (10 cm de comprimento)

  if (config.template === 'standard_100x120') {
    labelWidth = 100;
    labelHeight = 120;
  } else if (config.template === 'standard_105x75') {
    labelWidth = 105;
    labelHeight = 75;
  } else if (config.template === 'large_140x100') {
    labelWidth = 140;
    labelHeight = 100;
  } else if (config.template === 'compact_90x60') {
    labelWidth = 90;
    labelHeight = 60;
  }

  const orientation = labelWidth > labelHeight ? 'landscape' : 'portrait';

  const doc = new jsPDF({
    orientation,
    unit: 'mm',
    format: [labelWidth, labelHeight],
  });

  const sealBase64 = await getBase64ImageFromUrl(HERBARIUM_SEAL_IMG);
  const totalCopies = 1 + getDuplicateCount(specimen);

  for (let i = 0; i < totalCopies; i++) {
    if (i > 0) {
      doc.addPage([labelWidth, labelHeight], orientation);
    }
    await renderSpecimenLabelOnPdf(
      doc,
      specimen,
      config,
      2,
      2,
      labelWidth - 4,
      labelHeight - 4,
      sealBase64
    );
  }

  const filename = `etiqueta_12x10_${specimen.catalogNumber || 'excicata'}_${specimen.scientificName?.replace(/\s+/g, '_') || 'botanica'}.pdf`;
  doc.save(filename);
}
