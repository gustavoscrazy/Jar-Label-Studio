export interface HerbariumDatabaseColumns {
  TOMBO: string;
  FAMÍLIA: string;
  GÊNERO: string;
  CF?: string;
  ESPÉCIE: string;
  AUTHOR: string;
  PAÍS: string;
  ESTADO: string;
  CIDADE: string;
  'CAMPO ESPECIFICADO'?: string;
  UC?: string;
  LATITUDE: string | number;
  LONGITUDE: string | number;
  lat_grau?: string | number;
  lat_min?: string | number;
  lat_seg?: string | number;
  ns?: string;
  long_grau?: string | number;
  long_min?: string | number;
  long_seg?: string | number;
  ew?: string;
  ALTITUDE?: string | number;
  UN?: string;
  'DESCRIÇÃO LOCALIDADE'?: string;
  FLORES?: string;
  FRUTOS?: string;
  ALTURA?: string | number;
  'UN ALT'?: string;
  COLETOR: string;
  'Nº COLETA': string;
  DIA: string | number;
  MÊS: string | number;
  ANO: string | number;
  DETERMINAÇÃO?: string;
  DIA_DET?: string | number;
  MÊS_DET?: string | number;
  ANO_DET?: string | number;
  'COLEÇÃO ORIGEM'?: string;
  'COLEÇÃO DESTINO'?: string;
  'QTDE DUPLICATA'?: string | number;
  'OBSERVAÇÃO LOCALIDADE'?: string;
  projeto?: string;
  HABITAT?: string;
  HÁBITO?: string;
  OBS?: string;
  RESPONSÁVEL?: string;
  DATA?: string;
}

export interface Specimen extends HerbariumDatabaseColumns {
  id: string;
  // Computed / convenience fields for compatibility & display
  catalogNumber: string;
  institutionCode: string;
  herbariumAcronym: string;
  project?: string;
  family: string;
  scientificName: string;
  scientificNameAuthorship: string;
  vernacularName?: string;
  country: string;
  stateProvince: string;
  municipality: string;
  locality: string;
  latitude: string | number;
  longitude: string | number;
  datum?: string;
  elevation?: string | number;
  habitat: string;
  plantDescription: string;
  phenology?: string;
  recordedBy: string;
  recordNumber: string;
  additionalCollectors?: string;
  eventDate: string;
  eventDateFormatted?: string;
  identifiedBy: string;
  dateIdentified?: string;
  duplicates?: string;
  notes?: string;
  barcode?: string;
  externalUrl?: string;
  sourceDatabase?: string;
  auditStatus?: 'pending' | 'auditing' | 'clean' | 'has_warnings' | 'has_errors';
  auditResult?: SpecimenAuditResult;
  floraBrasilResult?: FloraBrasilValidationResult;
}

export interface FloraBrasilValidationResult {
  found: boolean;
  queriedBinomial: string;
  wasSpellingCorrected: boolean;
  taxonId?: number;
  taxonomicStatus?: string;
  nomenclaturalStatus?: string;
  matchedScientificName?: string;
  matchedFamily?: string;
  matchedGenus?: string;
  matchedSpecies?: string;
  matchedAuthor?: string;
  acceptedScientificName?: string;
  acceptedFamily?: string;
  acceptedGenus?: string;
  acceptedSpecies?: string;
  acceptedAuthor?: string;
  acceptedTaxonId?: number;
  refloraUrl?: string;
  lifeForm?: string[];
  habitat?: string[];
  vegetationType?: string[];
  vernacularNames?: string[];
  isExactMatch: boolean;
  hasSynonymUpdate: boolean;
  hasAuthorDiscrepancy: boolean;
  hasNameDiscrepancy: boolean;
  hasFamilyDiscrepancy: boolean;
  summaryMessage: string;
  checkedAt: string;
}

export interface AuditIssue {
  id: string;
  field: string;
  fieldLabel: string;
  severity: 'critical' | 'warning' | 'info';
  category: 'taxonomy' | 'geography' | 'date_format' | 'collector' | 'description' | 'completeness';
  originalValue: string;
  suggestedValue: string;
  reason: string;
  applied?: boolean;
}

export interface SpecimenAuditResult {
  hasErrors: boolean;
  criticalCount: number;
  warningCount: number;
  infoCount: number;
  summary: string;
  issues: AuditIssue[];
  suggestedRecord?: Partial<Specimen>;
  auditedAt: string;
}

export interface LabelConfig {
  template: 'standard_120x100' | 'standard_100x120' | 'standard_105x75' | 'large_140x100' | 'compact_90x60';
  institutionHeader: string;
  herbariumAcronym: string;
  subHeader?: string;
  showQrCode: boolean;
  showHerbariumSeal: boolean;
  showBarcode: boolean;
  showBorders: boolean;
  fontFamily: 'serif' | 'sans';
  fontScale: 'sm' | 'md' | 'lg';
  labelsPerPage: 4 | 6 | 1;
  paperSize: 'A4' | 'Letter';
}

export interface ExternalDbConfig {
  type: 'gbif' | 'specieslink' | 'custom_rest' | 'sample_data';
  endpointUrl?: string;
  apiKey?: string;
  queryParam?: string;
}
