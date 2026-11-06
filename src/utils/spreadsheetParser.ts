import * as XLSX from 'xlsx';
import { Specimen, HerbariumDatabaseColumns } from '../types/botanical';
import {
  DATABASE_COLUMNS,
  composeScientificName,
  formatBotanicalDate,
} from './botanicalFormatter';

/**
 * Normalizes header keys to match the 47 botanical database columns
 */
function normalizeColumnKey(rawKey: string): keyof HerbariumDatabaseColumns | string {
  const clean = rawKey
    .trim()
    .toUpperCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, ''); // Remove accents for comparison

  if (clean === 'TOMBO' || clean === 'CATALOGNUMBER' || clean === 'NUMERO' || clean === 'REGISTRO') return 'TOMBO';
  if (clean === 'FAMILIA' || clean === 'FAMILY') return 'FAMÍLIA';
  if (clean === 'GENERO' || clean === 'GENUS') return 'GÊNERO';
  if (clean === 'CF' || clean === 'AFF' || clean === 'QUALIFICADOR') return 'CF';
  if (clean === 'ESPECIE' || clean === 'SPECIES' || clean === 'EPITETO' || clean === 'SPECIFICEPITHET') return 'ESPÉCIE';
  if (clean === 'AUTHOR' || clean === 'AUTOR' || clean === 'SCIENTIFICNAMEAUTHORSHIP' || clean === 'AUTORIA') return 'AUTHOR';
  if (clean === 'PAIS' || clean === 'COUNTRY') return 'PAÍS';
  if (clean === 'ESTADO' || clean === 'STATE' || clean === 'STATEPROVINCE' || clean === 'UF') return 'ESTADO';
  if (clean === 'CIDADE' || clean === 'MUNICIPIO' || clean === 'MUNICIPALITY' || clean === 'CITY') return 'CIDADE';
  if (clean === 'CAMPO ESPECIFICADO' || clean === 'LOCAL' || clean === 'AREA' || clean === 'LOCALIDADE ESPECIFICADA') return 'CAMPO ESPECIFICADO';
  if (clean === 'UC' || clean === 'UNIDADE DE CONSERVACAO' || clean === 'PROTECTEDAREA') return 'UC';
  if (clean === 'LATITUDE' || clean === 'DECIMALLATITUDE' || clean === 'LAT') return 'LATITUDE';
  if (clean === 'LONGITUDE' || clean === 'DECIMALLONGITUDE' || clean === 'LONG' || clean === 'LNG') return 'LONGITUDE';
  if (clean === 'LAT_GRAU' || clean === 'LAT GRAU') return 'lat_grau';
  if (clean === 'LAT_MIN' || clean === 'LAT MIN') return 'lat_min';
  if (clean === 'LAT_SEG' || clean === 'LAT SEG') return 'lat_seg';
  if (clean === 'NS' || clean === 'LAT_DIR') return 'ns';
  if (clean === 'LONG_GRAU' || clean === 'LONG GRAU') return 'long_grau';
  if (clean === 'LONG_MIN' || clean === 'LONG MIN') return 'long_min';
  if (clean === 'LONG_SEG' || clean === 'LONG SEG') return 'long_seg';
  if (clean === 'EW' || clean === 'LONG_DIR') return 'ew';
  if (clean === 'ALTITUDE' || clean === 'ELEVACAO' || clean === 'ELEVATION' || clean === 'ALT') return 'ALTITUDE';
  if (clean === 'UN' || clean === 'UNIDADE ALTITUDE') return 'UN';
  if (clean === 'DESCRICAO LOCALIDADE' || clean === 'LOCALIDADE' || clean === 'LOCALITY') return 'DESCRIÇÃO LOCALIDADE';
  if (clean === 'FLORES' || clean === 'FLOR' || clean === 'FLOWERS') return 'FLORES';
  if (clean === 'FRUTOS' || clean === 'FRUTO' || clean === 'FRUITS') return 'FRUTOS';
  if (clean === 'ALTURA' || clean === 'HEIGHT' || clean === 'PORTE') return 'ALTURA';
  if (clean === 'UN ALT' || clean === 'UNIDADE ALTURA') return 'UN ALT';
  if (clean === 'COLETOR' || clean === 'RECORDEDBY' || clean === 'COLLECTOR' || clean === 'LEG') return 'COLETOR';
  if (clean === 'Nº COLETA' || clean === 'NO COLETA' || clean === 'NUMERO COLETA' || clean === 'N_COLETA' || clean === 'RECORDNUMBER') return 'Nº COLETA';
  if (clean === 'DIA' || clean === 'DAY') return 'DIA';
  if (clean === 'MES' || clean === 'MONTH') return 'MÊS';
  if (clean === 'ANO' || clean === 'YEAR') return 'ANO';
  if (clean === 'DETERMINACAO' || clean === 'DETERMINADOR' || clean === 'IDENTIFIEDBY' || clean === 'DET') return 'DETERMINAÇÃO';
  if (clean === 'DIA_DET' || clean === 'DIA DET') return 'DIA_DET';
  if (clean === 'MES_DET' || clean === 'MES DET') return 'MÊS_DET';
  if (clean === 'ANO_DET' || clean === 'ANO DET') return 'ANO_DET';
  if (clean === 'COLECAO ORIGEM' || clean === 'HERBARIO' || clean === 'INSTITUTIONCODE') return 'COLEÇÃO ORIGEM';
  if (clean === 'COLECAO DESTINO' || clean === 'DUPLICATAS' || clean === 'DUPLICATES') return 'COLEÇÃO DESTINO';
  if (clean === 'QTDE DUPLICATA' || clean === 'QTD DUPLICATAS' || clean === 'DUPLICATECOUNT') return 'QTDE DUPLICATA';
  if (clean === 'OBSERVACAO LOCALIDADE' || clean === 'OBS LOCALIDADE') return 'OBSERVAÇÃO LOCALIDADE';
  if (clean === 'PROJETO' || clean === 'PROJECT') return 'projeto';
  if (clean === 'HABITAT') return 'HABITAT';
  if (clean === 'HABITO' || clean === 'HABIT') return 'HÁBITO';
  if (clean === 'OBS' || clean === 'OBSERVACOES' || clean === 'NOTES' || clean === 'NOTAS') return 'OBS';
  if (clean === 'RESPONSAVEL' || clean === 'DIGITADOR') return 'RESPONSÁVEL';
  if (clean === 'DATA' || clean === 'DATA REGISTRO') return 'DATA';

  // Check verbatim match against official 47 columns
  const exactMatch = DATABASE_COLUMNS.find((col) => col.toUpperCase() === rawKey.trim().toUpperCase());
  return exactMatch || rawKey.trim();
}

/**
 * Converts a raw row object from spreadsheet into a complete 47-column Specimen
 */
export function convertRawRowToSpecimen(row: Record<string, any>, index: number): Specimen {
  const mapped: any = {};

  for (const [key, val] of Object.entries(row)) {
    if (val === undefined || val === null) continue;
    const normalizedKey = normalizeColumnKey(key);
    mapped[normalizedKey] = typeof val === 'string' ? val.trim() : val;
  }

  // Fallbacks & Parsing
  const tombo = mapped.TOMBO ? String(mapped.TOMBO) : `JAR${String(index + 1).padStart(6, '0')}`;
  const genus = mapped.GÊNERO || (mapped.scientificName ? String(mapped.scientificName).split(' ')[0] : '');
  const species = mapped.ESPÉCIE || (mapped.scientificName ? String(mapped.scientificName).split(' ').slice(1).join(' ') : '');
  const family = (mapped.FAMÍLIA || 'INDETERMINADA').toUpperCase();
  const author = mapped.AUTHOR || mapped.scientificNameAuthorship || '';
  const cf = mapped.CF || '';

  // Extract date components if provided as a single string (e.g. 2024-05-18 or 18/05/2024)
  let dia = mapped.DIA ? parseInt(String(mapped.DIA), 10) : undefined;
  let mes = mapped.MÊS ? parseInt(String(mapped.MÊS), 10) : undefined;
  let ano = mapped.ANO ? parseInt(String(mapped.ANO), 10) : undefined;

  if ((!dia || !mes || !ano) && mapped.eventDate) {
    const dateStr = String(mapped.eventDate).trim();
    const parts = dateStr.split(/[-/]/);
    if (parts.length === 3) {
      if (parts[0].length === 4) {
        ano = parseInt(parts[0], 10);
        mes = parseInt(parts[1], 10);
        dia = parseInt(parts[2], 10);
      } else {
        dia = parseInt(parts[0], 10);
        mes = parseInt(parts[1], 10);
        ano = parseInt(parts[2], 10);
      }
    }
  }

  // Geographic coordinates
  const latNum = mapped.LATITUDE !== undefined && mapped.LATITUDE !== '' ? parseFloat(String(mapped.LATITUDE)) : undefined;
  const lonNum = mapped.LONGITUDE !== undefined && mapped.LONGITUDE !== '' ? parseFloat(String(mapped.LONGITUDE)) : undefined;

  const sciNameComputed = composeScientificName({ GÊNERO: genus, CF: cf, ESPÉCIE: species });

  const specimen: Specimen = {
    id: `imported-${Date.now()}-${index}`,
    // 47 Official Columns
    TOMBO: tombo,
    FAMÍLIA: family,
    GÊNERO: genus,
    CF: cf,
    ESPÉCIE: species,
    AUTHOR: author,
    PAÍS: mapped.PAÍS || 'Brasil',
    ESTADO: mapped.ESTADO || '',
    CIDADE: mapped.CIDADE || '',
    'CAMPO ESPECIFICADO': mapped['CAMPO ESPECIFICADO'] || '',
    UC: mapped.UC || '',
    LATITUDE: latNum !== undefined ? latNum : (mapped.LATITUDE !== undefined ? mapped.LATITUDE : ''),
    LONGITUDE: lonNum !== undefined ? lonNum : (mapped.LONGITUDE !== undefined ? mapped.LONGITUDE : ''),
    lat_grau: mapped.lat_grau ? parseInt(String(mapped.lat_grau), 10) : undefined,
    lat_min: mapped.lat_min ? parseInt(String(mapped.lat_min), 10) : undefined,
    lat_seg: mapped.lat_seg ? parseFloat(String(mapped.lat_seg)) : undefined,
    ns: mapped.ns ? String(mapped.ns).toUpperCase() : (latNum ? (latNum < 0 ? 'S' : 'N') : undefined),
    long_grau: mapped.long_grau ? parseInt(String(mapped.long_grau), 10) : undefined,
    long_min: mapped.long_min ? parseInt(String(mapped.long_min), 10) : undefined,
    long_seg: mapped.long_seg ? parseFloat(String(mapped.long_seg)) : undefined,
    ew: mapped.ew ? String(mapped.ew).toUpperCase() : (lonNum ? (lonNum < 0 ? 'W' : 'E') : undefined),
    ALTITUDE: mapped.ALTITUDE !== undefined && mapped.ALTITUDE !== '' ? parseFloat(String(mapped.ALTITUDE)) : undefined,
    UN: mapped.UN || 'm',
    'DESCRIÇÃO LOCALIDADE': mapped['DESCRIÇÃO LOCALIDADE'] || '',
    FLORES: mapped.FLORES || '',
    FRUTOS: mapped.FRUTOS || '',
    ALTURA: mapped.ALTURA !== undefined && mapped.ALTURA !== '' ? parseFloat(String(mapped.ALTURA)) : undefined,
    'UN ALT': mapped['UN ALT'] || 'm',
    COLETOR: mapped.COLETOR || 's.n.',
    'Nº COLETA': mapped['Nº COLETA'] !== undefined ? String(mapped['Nº COLETA']) : 's.n.',
    DIA: dia !== undefined ? dia : (mapped.DIA !== undefined ? mapped.DIA : ''),
    MÊS: mes !== undefined ? mes : (mapped.MÊS !== undefined ? mapped.MÊS : ''),
    ANO: ano !== undefined ? ano : (mapped.ANO !== undefined ? mapped.ANO : ''),
    DETERMINAÇÃO: mapped.DETERMINAÇÃO || '',
    DIA_DET: mapped.DIA_DET ? parseInt(String(mapped.DIA_DET), 10) : undefined,
    MÊS_DET: mapped.MÊS_DET ? parseInt(String(mapped.MÊS_DET), 10) : undefined,
    ANO_DET: mapped.ANO_DET ? parseInt(String(mapped.ANO_DET), 10) : undefined,
    'COLEÇÃO ORIGEM': 'Herbário José Ângelo Rizzo (JAR)',
    'COLEÇÃO DESTINO': mapped['COLEÇÃO DESTINO'] || '',
    'QTDE DUPLICATA': mapped['QTDE DUPLICATA'] ? parseInt(String(mapped['QTDE DUPLICATA']), 10) : undefined,
    'OBSERVAÇÃO LOCALIDADE': mapped['OBSERVAÇÃO LOCALIDADE'] || '',
    projeto: mapped.projeto || '',
    HABITAT: mapped.HABITAT || '',
    HÁBITO: mapped.HÁBITO || '',
    OBS: mapped.OBS || '',
    RESPONSÁVEL: mapped.RESPONSÁVEL || '',
    DATA: mapped.DATA || new Date().toISOString().slice(0, 10),

    // Unified convenience aliases
    catalogNumber: tombo,
    institutionCode: 'Herbário José Ângelo Rizzo (JAR)',
    herbariumAcronym: 'JAR',
    family: family,
    scientificName: sciNameComputed,
    scientificNameAuthorship: author,
    country: mapped.PAÍS || 'Brasil',
    stateProvince: mapped.ESTADO || '',
    municipality: mapped.CIDADE || '',
    locality: mapped['DESCRIÇÃO LOCALIDADE'] || '',
    latitude: latNum !== undefined ? latNum : (mapped.LATITUDE !== undefined ? mapped.LATITUDE : ''),
    longitude: lonNum !== undefined ? lonNum : (mapped.LONGITUDE !== undefined ? mapped.LONGITUDE : ''),
    elevation: mapped.ALTITUDE ? `${mapped.ALTITUDE} ${mapped.UN || 'm'}` : undefined,
    habitat: mapped.HABITAT || '',
    plantDescription: mapped.OBS || '',
    recordedBy: mapped.COLETOR || 's.n.',
    recordNumber: mapped['Nº COLETA'] !== undefined ? String(mapped['Nº COLETA']) : 's.n.',
    eventDate: String(mapped.DATA || (dia && mes && ano ? `${ano}-${String(mes).padStart(2, '0')}-${String(dia).padStart(2, '0')}` : '')),
    identifiedBy: mapped.DETERMINAÇÃO || '',
    duplicates: mapped['COLEÇÃO DESTINO'] || '',
    sourceDatabase: 'Planilha Importada',
    auditStatus: 'pending',
  };

  return specimen;
}

/**
 * Parses any spreadsheet file (.xlsx, .xls, .csv, .tsv, .ods) from user's disk
 */
export async function parseSpreadsheetFile(file: File): Promise<{
  specimens: Specimen[];
  sheetNames: string[];
  activeSheetName: string;
  rowCount: number;
}> {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, {
    type: 'array',
    cellDates: true,
  });

  const sheetNames = workbook.SheetNames;
  if (sheetNames.length === 0) {
    throw new Error('O arquivo de planilha não possui nenhuma aba/planilha.');
  }

  const activeSheetName = sheetNames[0];
  const worksheet = workbook.Sheets[activeSheetName];
  const rawRows: Record<string, any>[] = XLSX.utils.sheet_to_json(worksheet, {
    defval: '',
  });

  if (rawRows.length === 0) {
    throw new Error('A planilha selecionada está vazia ou não contém dados válidos.');
  }

  const specimens = rawRows.map((row, idx) => convertRawRowToSpecimen(row, idx));

  return {
    specimens,
    sheetNames,
    activeSheetName,
    rowCount: specimens.length,
  };
}

/**
 * Parses raw CSV or TSV text
 */
export function parseSpreadsheetText(text: string): {
  specimens: Specimen[];
  rowCount: number;
} {
  const workbook = XLSX.read(text, { type: 'string' });
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  const rawRows: Record<string, any>[] = XLSX.utils.sheet_to_json(worksheet, {
    defval: '',
  });

  if (rawRows.length === 0) {
    throw new Error('Os dados colados estão vazios ou não possuem formato tabular válido.');
  }

  const specimens = rawRows.map((row, idx) => convertRawRowToSpecimen(row, idx));
  return {
    specimens,
    rowCount: specimens.length,
  };
}

/**
 * Fetches and parses a public Google Sheets link
 */
export async function fetchAndParseGoogleSheet(sheetUrl: string): Promise<{
  specimens: Specimen[];
  rowCount: number;
}> {
  const res = await fetch('/api/external/fetch-google-sheet', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url: sheetUrl }),
  });

  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(data.error || 'Falha ao sincronizar com o Google Sheets');
  }

  return parseSpreadsheetText(data.csvText);
}
