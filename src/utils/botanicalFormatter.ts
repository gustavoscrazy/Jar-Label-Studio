import { Specimen, AuditIssue, HerbariumDatabaseColumns } from '../types/botanical';

export const DATABASE_COLUMNS = [
  'TOMBO',
  'FAMÍLIA',
  'GÊNERO',
  'CF',
  'ESPÉCIE',
  'AUTHOR',
  'PAÍS',
  'ESTADO',
  'CIDADE',
  'CAMPO ESPECIFICADO',
  'UC',
  'LATITUDE',
  'LONGITUDE',
  'lat_grau',
  'lat_min',
  'lat_seg',
  'ns',
  'long_grau',
  'long_min',
  'long_seg',
  'ew',
  'ALTITUDE',
  'UN',
  'DESCRIÇÃO LOCALIDADE',
  'FLORES',
  'FRUTOS',
  'ALTURA',
  'UN ALT',
  'COLETOR',
  'Nº COLETA',
  'DIA',
  'MÊS',
  'ANO',
  'DETERMINAÇÃO',
  'DIA_DET',
  'MÊS_DET',
  'ANO_DET',
  'COLEÇÃO ORIGEM',
  'COLEÇÃO DESTINO',
  'QTDE DUPLICATA',
  'OBSERVAÇÃO LOCALIDADE',
  'projeto',
  'HABITAT',
  'HÁBITO',
  'OBS',
  'RESPONSÁVEL',
  'DATA'
] as const;

/**
 * Converts month (number 1-12 or Roman numeral I-XII) to 2-digit Arabic numeral (01-12)
 */
export function getArabicMonth(monthValue: number | string): string {
  if (monthValue === undefined || monthValue === null || monthValue === '') return '';
  const romanMonths = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII'];
  const trimmed = String(monthValue).trim().toUpperCase();
  const romanIdx = romanMonths.indexOf(trimmed);
  if (romanIdx !== -1) {
    return String(romanIdx + 1).padStart(2, '0');
  }
  const num = typeof monthValue === 'number' ? monthValue : parseInt(trimmed, 10);
  if (!isNaN(num) && num >= 1 && num <= 12) {
    return String(num).padStart(2, '0');
  }
  return trimmed;
}

/**
 * Kept for backwards compatibility — returns 2-digit Arabic month (01-12)
 */
export function getRomanMonth(monthIndex: number | string): string {
  return getArabicMonth(monthIndex);
}

/**
 * Formats day, month, year into DD/MM/YYYY with Arabic numerals (e.g. 14/08/2023)
 */
export function formatBotanicalDateParts(
  day?: string | number,
  month?: string | number,
  year?: string | number
): string {
  if (!year && !month && !day) return '';
  const d = day !== undefined && day !== null && String(day).trim() !== ''
    ? String(parseInt(String(day), 10) || day).padStart(2, '0')
    : '';
  const m = month !== undefined && month !== null && String(month).trim() !== ''
    ? getArabicMonth(month)
    : '';
  const y = year !== undefined && year !== null && String(year).trim() !== ''
    ? String(year).trim()
    : '';
  return [d, m, y].filter(Boolean).join('/');
}

/**
 * Formats a generic date string into DD/MM/YYYY with Arabic numerals (e.g., "14/08/2023")
 */
export function formatBotanicalDate(dateStr?: string): string {
  if (!dateStr) return '';
  const trimmed = String(dateStr).trim();
  if (!trimmed) return '';

  // ISO YYYY-MM-DD
  if (/^\d{4}-\d{1,2}-\d{1,2}$/.test(trimmed)) {
    const [year, month, day] = trimmed.split('-');
    return formatBotanicalDateParts(day, month, year);
  }

  // DD/MM/YYYY or D/M/YYYY
  if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(trimmed)) {
    const [day, month, year] = trimmed.split('/');
    return formatBotanicalDateParts(day, month, year);
  }

  // DD.MM.YYYY or DD.ROMAN.YYYY or ROMAN.YYYY
  if (trimmed.includes('.') || trimmed.includes('-') || trimmed.includes('/')) {
    const parts = trimmed.split(/[.\-/]/).filter(Boolean);
    if (parts.length === 3) {
      // Check if first part is 4-digit year
      if (/^\d{4}$/.test(parts[0])) {
        return formatBotanicalDateParts(parts[2], parts[1], parts[0]);
      }
      return formatBotanicalDateParts(parts[0], parts[1], parts[2]);
    }
    if (parts.length === 2) {
      if (/^\d{4}$/.test(parts[0])) {
        return formatBotanicalDateParts('', parts[1], parts[0]);
      }
      return formatBotanicalDateParts('', parts[0], parts[1]);
    }
  }

  return trimmed;
}

/**
 * Converts decimal degrees to Degrees Minutes Seconds (DMS)
 */
export function decimalToDms(deg: number, isLatitude: boolean): {
  deg: number;
  min: number;
  sec: number;
  dir: string;
  formatted: string;
} {
  if (isNaN(deg)) return { deg: 0, min: 0, sec: 0, dir: '', formatted: '' };
  const absolute = Math.abs(deg);
  const degrees = Math.floor(absolute);
  const minutesNotTruncated = (absolute - degrees) * 60;
  const minutes = Math.floor(minutesNotTruncated);
  const seconds = Math.round((minutesNotTruncated - minutes) * 60);

  const direction = isLatitude ? (deg >= 0 ? 'N' : 'S') : (deg >= 0 ? 'E' : 'W');
  const formatted = `${degrees}°${minutes.toString().padStart(2, '0')}'${seconds.toString().padStart(2, '0')}"${direction}`;

  return {
    deg: degrees,
    min: minutes,
    sec: seconds,
    dir: direction,
    formatted,
  };
}

/**
 * Parses and returns formatted coordinates from either DMS columns or decimal columns
 */
export function formatCoordinatesFromSpecimen(specimen: Partial<Specimen>): string {
  // If dedicated DMS columns exist and are filled
  if (specimen.lat_grau !== undefined && specimen.long_grau !== undefined) {
    const latStr = `${specimen.lat_grau}°${String(specimen.lat_min || '00').padStart(2, '0')}'${String(specimen.lat_seg || '00').padStart(2, '0')}"${specimen.ns || 'S'}`;
    const longStr = `${specimen.long_grau}°${String(specimen.long_min || '00').padStart(2, '0')}'${String(specimen.long_seg || '00').padStart(2, '0')}"${specimen.ew || 'W'}`;
    return `${latStr}, ${longStr}`;
  }

  // Fallback to decimal
  const lat = typeof specimen.LATITUDE === 'number' ? specimen.LATITUDE : parseFloat(String(specimen.LATITUDE || specimen.latitude || '').replace(',', '.'));
  const lng = typeof specimen.LONGITUDE === 'number' ? specimen.LONGITUDE : parseFloat(String(specimen.LONGITUDE || specimen.longitude || '').replace(',', '.'));

  if (isNaN(lat) || isNaN(lng)) {
    return '';
  }

  return `${decimalToDms(lat, true).formatted}, ${decimalToDms(lng, false).formatted}`;
}

/**
 * Standard coordinate string helper
 */
export function formatCoordinates(lat: string | number, lng: string | number, format: 'decimal' | 'dms' = 'dms'): string {
  const numLat = typeof lat === 'number' ? lat : parseFloat(String(lat).replace(',', '.'));
  const numLng = typeof lng === 'number' ? lng : parseFloat(String(lng).replace(',', '.'));

  if (isNaN(numLat) || isNaN(numLng)) {
    return `${lat || ''}, ${lng || ''}`;
  }

  if (format === 'decimal') {
    return `${numLat.toFixed(4)}°, ${numLng.toFixed(4)}°`;
  }

  return `${decimalToDms(numLat, true).formatted}, ${decimalToDms(numLng, false).formatted}`;
}

/**
 * Formats the Herbarium Acronym + Catalog Number (Sigla do Herbário + TOMBO)
 * e.g. "JAR048291" (removes hyphens and spaces between acronym and number)
 */
export function formatSiglaTombo(sigla?: string, tombo?: string): string {
  const cleanSigla = (sigla || '').trim();
  const cleanTombo = (tombo || '').trim();
  if (!cleanTombo) return cleanSigla;
  if (!cleanSigla) return cleanTombo.replace(/[-_\s]+/g, '');
  if (cleanTombo.toUpperCase().startsWith(cleanSigla.toUpperCase())) {
    const rest = cleanTombo.slice(cleanSigla.length).replace(/^[-_\s]+/, '');
    return `${cleanSigla}${rest}`;
  }
  return `${cleanSigla}${cleanTombo.replace(/^[-_\s]+/, '')}`;
}

/**
 * Formats UC (Unidade de Conservação) field:
 * - "Sim" if marked with "X" or "x"
 * - "Não" if blank/empty
 * - Otherwise returns the exact text written in the field
 */
export function formatUcDisplay(uc?: string | number): string {
  const raw = String(uc ?? '').trim();
  if (!raw) return 'Não';
  if (raw.toUpperCase() === 'X') return 'Sim';
  return raw;
}

/**
 * Formats FLORES field removing repeated leading words ("Flores", "Flor")
 * Example: "Flores amarelas." -> "Flores: amarelas"
 * Example: "Flor branca" -> "Flores: branca"
 */
export function formatFloresValue(flores?: string): string {
  if (!flores) return '';
  let cleaned = String(flores).trim();
  if (!cleaned) return '';

  while (/^(?:flores|flor)\b/i.test(cleaned)) {
    cleaned = cleaned.replace(/^(?:flores|flor)\b[\s:,-]*/i, '').trim();
  }
  cleaned = cleaned.replace(/\.+$/, '').trim();

  return cleaned ? `Flores: ${cleaned}` : 'Flores';
}

/**
 * Formats FRUTOS field removing repeated leading words ("Frutos", "Fruto")
 * Example: "Frutos verdes e secos." -> "Frutos: verdes e secos"
 * Example: "Fruto imaturo" -> "Frutos: imaturo"
 */
export function formatFrutosValue(frutos?: string): string {
  if (!frutos) return '';
  let cleaned = String(frutos).trim();
  if (!cleaned) return '';

  while (/^(?:frutos|fruto)\b/i.test(cleaned)) {
    cleaned = cleaned.replace(/^(?:frutos|fruto)\b[\s:,-]*/i, '').trim();
  }
  cleaned = cleaned.replace(/\.+$/, '').trim();

  return cleaned ? `Frutos: ${cleaned}` : 'Frutos';
}

/**
 * Cleans free-text phenology strings from repeated prefixes
 */
export function cleanPhenologyText(text?: string): string {
  if (!text) return '';
  return String(text)
    .trim()
    .replace(/^fenologia\b[\s:,-]*/i, '')
    .replace(/\bFlores\s*:\s*(?:flores|flor)\b[\s:,-]*/gi, 'Flores: ')
    .replace(/\bFrutos\s*:\s*(?:frutos|fruto)\b[\s:,-]*/gi, 'Frutos: ')
    .replace(/\.+$/, '')
    .trim();
}

/**
 * Returns the number of duplicate specimens (QTDE DUPLICATA) as a non-negative integer
 */
export function getDuplicateCount(specimen: Partial<Specimen>): number {
  const raw = specimen['QTDE DUPLICATA'];
  if (raw === undefined || raw === null || raw === '') return 0;
  const parsed = parseInt(String(raw).trim(), 10);
  return isNaN(parsed) || parsed < 0 ? 0 : parsed;
}

/**
 * Expands a list of specimens so each specimen with duplicates generates
 * 1 main label + N additional labels (where N = QTDE DUPLICATA).
 */
export function expandSpecimensWithDuplicates(
  specimens: Specimen[],
  includeDuplicates: boolean = true
): Specimen[] {
  if (!includeDuplicates) return specimens;
  const expanded: Specimen[] = [];
  for (const spec of specimens) {
    const dupCount = getDuplicateCount(spec);
    const totalCopies = 1 + dupCount;
    for (let i = 0; i < totalCopies; i++) {
      expanded.push(spec);
    }
  }
  return expanded;
}


/**
 * Composes standard botanical binomial name:
 * Genero + (cf se houver, caso contrário pule) espécie
 * e.g. "Handroanthus chrysotrichus" ou "Handroanthus cf. chrysotrichus"
 */
export function composeScientificName(specimen: Partial<Specimen>): string {
  const genus = (specimen.GÊNERO || '').trim();
  let cf = (specimen.CF || '').trim();
  if (cf && !cf.endsWith('.') && (cf.toLowerCase() === 'cf' || cf.toLowerCase() === 'aff')) {
    cf = `${cf}.`;
  }
  const sp = (specimen.ESPÉCIE || '').trim();

  if (genus && sp) {
    return cf ? `${genus} ${cf} ${sp}` : `${genus} ${sp}`;
  }
  return specimen.scientificName || genus || sp || 'Espécie não identificada';
}

/**
 * Maps a field identifier to the exact database column name
 */
export function mapFieldToDatabaseColumn(field: string): string {
  const normalized = field.toUpperCase().trim();
  if (normalized === 'SCIENTIFICNAME' || normalized === 'ESPECIE') return 'ESPÉCIE';
  if (normalized === 'FAMILY' || normalized === 'FAMILIA') return 'FAMÍLIA';
  if (normalized === 'GENUS' || normalized === 'GENERO') return 'GÊNERO';
  if (normalized === 'AUTHORS' || normalized === 'SCIENTIFICNAMEAUTHORSHIP') return 'AUTHOR';
  if (normalized === 'STATEPROVINCE' || normalized === 'STATE') return 'ESTADO';
  if (normalized === 'MUNICIPALITY' || normalized === 'CITY') return 'CIDADE';
  if (normalized === 'COUNTRY') return 'PAÍS';
  if (normalized === 'LOCALITY') return 'DESCRIÇÃO LOCALIDADE';
  if (normalized === 'ELEVATION') return 'ALTITUDE';
  if (normalized === 'RECORDEDBY' || normalized === 'COLLECTOR') return 'COLETOR';
  if (normalized === 'RECORDNUMBER') return 'Nº COLETA';
  if (normalized === 'PROJECT') return 'projeto';
  if (normalized === 'HABIT') return 'HÁBITO';
  if (normalized === 'HABITAT') return 'HABITAT';
  if (normalized === 'NOTES') return 'OBS';
  if (normalized === 'CATALOGNUMBER') return 'TOMBO';
  return field;
}

/**
 * Generates an SQL and CSV correction changelog to send to the database administrator
 * so errors identified by the AI can be updated directly in the external database.
 */
export function generateDatabaseCorrectionReport(specimen: Specimen, issues: AuditIssue[]): {
  sqlScript: string;
  csvData: string;
  markdownSummary: string;
} {
  const tombo = specimen.TOMBO || specimen.catalogNumber || specimen.id;
  
  // SQL update statements targeting the user's exact database table and columns
  const sqlUpdates = issues
    .filter(i => i.suggestedValue && i.suggestedValue !== i.originalValue)
    .map(i => {
      const colName = mapFieldToDatabaseColumn(i.field);
      const valueEscaped = i.suggestedValue.replace(/'/g, "''");
      return `UPDATE herbarium_database SET "${colName}" = '${valueEscaped}' WHERE "TOMBO" = '${tombo}'; -- [${i.severity.toUpperCase()}] ${i.reason.replace(/'/g, "''")}`;
    });

  const sqlScript = sqlUpdates.length > 0
    ? `-- ====================================================================\n-- Script de Atualização para o Banco de Dados do Herbário\n-- Registro TOMBO: ${tombo}\n-- Táxon: ${composeScientificName(specimen)} (${specimen.FAMÍLIA || specimen.family})\n-- Data da Auditoria: ${new Date().toLocaleString('pt-BR')}\n-- ====================================================================\n\nBEGIN;\n${sqlUpdates.join('\n')}\nCOMMIT;\n`
    : '-- Nenhuma inconsistência pendente de correção no banco de dados.';

  // CSV format with the user's exact columns
  const csvRows = [
    'TOMBO,COLUNA_BANCO,VALOR_ORIGINAL_BANCO,VALOR_CORRIGIDO_IA,SEVERIDADE,CATEGORIA,JUSTIFICATIVA_CIENTIFICA',
    ...issues.map(i => 
      `"${tombo}","${mapFieldToDatabaseColumn(i.field)}","${(i.originalValue || '').replace(/"/g, '""')}","${(i.suggestedValue || '').replace(/"/g, '""')}","${i.severity}","${i.category}","${(i.reason || '').replace(/"/g, '""')}"`
    )
  ];

  // Markdown format for curatorial review
  const mdSummary = `# Relatório de Correções de Dados Botânicos
**TOMBO:** \`${tombo}\`
**Espécime:** *${composeScientificName(specimen)}* (${specimen.FAMÍLIA || specimen.family})
**Localidade:** ${specimen.CIDADE || specimen.municipality}, ${specimen.ESTADO || specimen.stateProvince}
**Data da Auditoria:** ${new Date().toLocaleDateString('pt-BR')}

### Inconsistências Identificadas para Correção no Banco de Dados:
${issues.map((i, idx) => `
${idx + 1}. **Coluna do Banco:** \`${mapFieldToDatabaseColumn(i.field)}\` (${i.severity.toUpperCase()})
   - **Valor atual no Banco:** \`${i.originalValue || '[Vazio]'}\`
   - **Valor sugerido pela IA:** \`${i.suggestedValue}\`
   - **Justificativa Botânica:** ${i.reason}
`).join('\n')}
`;

  return {
    sqlScript,
    csvData: csvRows.join('\n'),
    markdownSummary: mdSummary,
  };
}

/**
 * Exports all specimens into a CSV/TSV table matching the exact 47 columns requested
 */
export function exportDatabaseTable(specimens: Specimen[], format: 'csv' | 'tsv' = 'csv'): string {
  const delimiter = format === 'tsv' ? '\t' : ',';
  const headers = DATABASE_COLUMNS.join(delimiter);

  const rows = specimens.map((spec) => {
    return DATABASE_COLUMNS.map((col) => {
      let val = (spec as any)[col];
      if (val === undefined || val === null) val = '';
      const str = String(val);
      if (format === 'tsv') {
        return str.replace(/\t/g, ' ').replace(/\n/g, ' ');
      }
      return `"${str.replace(/"/g, '""')}"`;
    }).join(delimiter);
  });

  return [headers, ...rows].join('\n');
}
