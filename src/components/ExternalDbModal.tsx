import React, { useState } from 'react';
import {
  Database,
  Globe,
  Upload,
  Search,
  Sparkles,
  Check,
  AlertCircle,
  X,
  RefreshCw,
  Plus,
  Layers,
} from 'lucide-react';
import { Specimen } from '../types/botanical';
import { SAMPLE_SPECIMENS } from '../data/sampleSpecimens';

interface ExternalDbModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportSpecimens: (specimens: Specimen[]) => void;
  onOpenImportSpreadsheet?: () => void;
}

export const ExternalDbModal: React.FC<ExternalDbModalProps> = ({
  isOpen,
  onClose,
  onImportSpecimens,
  onOpenImportSpreadsheet,
}) => {
  const [activeTab, setActiveTab] = useState<'gbif' | 'custom_api' | 'csv' | 'sample'>('gbif');

  // GBIF Search state
  const [gbifQuery, setGbifQuery] = useState('Handroanthus');
  const [gbifCountry, setGbifCountry] = useState('BR');
  const [isSearchingGbif, setIsSearchingGbif] = useState(false);
  const [gbifResults, setGbifResults] = useState<any[]>([]);
  const [gbifError, setGbifError] = useState<string | null>(null);

  // Custom REST API state
  const [apiUrl, setApiUrl] = useState('https://api.gbif.org/v1/occurrence/search?scientificName=Tibouchina&country=BR&limit=5');
  const [apiAuthHeader, setApiAuthHeader] = useState('');
  const [isFetchingCustom, setIsFetchingCustom] = useState(false);
  const [customApiMessage, setCustomApiMessage] = useState<string | null>(null);

  // CSV Import state
  const [csvText, setCsvText] = useState('');

  if (!isOpen) return null;

  // Search GBIF API
  const handleSearchGbif = async () => {
    if (!gbifQuery.trim()) return;
    setIsSearchingGbif(true);
    setGbifError(null);

    try {
      const res = await fetch('/api/external/query-gbif', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          scientificName: gbifQuery,
          country: gbifCountry,
          limit: 10,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erro na consulta ao GBIF');

      setGbifResults(data.results || []);
    } catch (err: any) {
      setGbifError(err.message || 'Falha ao buscar dados no GBIF');
    } finally {
      setIsSearchingGbif(false);
    }
  };

  // Convert a GBIF record into our Specimen structure with 47 columns
  const mapGbifToSpecimen = (rec: any): Specimen => {
    const tombo = rec.catalogNumber || `GBIF-${rec.key}`;
    const family = (rec.family || 'INDETERMINADA').toUpperCase();
    const genus = rec.genus || rec.scientificName?.split(' ')[0] || '';
    const sp = rec.species ? rec.species.replace(`${genus} `, '') : (rec.scientificName?.split(' ')[1] || '');
    const author = rec.scientificName ? rec.scientificName.replace(`${rec.species || ''}`, '').trim() : '';
    const country = rec.country || 'Brasil';
    const state = rec.stateProvince || '';
    const city = rec.municipality || rec.county || '';
    const lat = rec.decimalLatitude ?? '';
    const lng = rec.decimalLongitude ?? '';
    const dateStr = rec.eventDate ? rec.eventDate.split('T')[0] : '';
    let day: any = '';
    let month: any = '';
    let year: any = '';
    if (dateStr) {
      const parts = dateStr.split('-');
      year = parts[0];
      month = parts[1];
      day = parts[2];
    } else if (rec.year) {
      year = rec.year;
      month = rec.month || '';
      day = rec.day || '';
    }

    return {
      id: `gbif-${rec.key || Math.random().toString(36).slice(2, 9)}`,
      TOMBO: tombo,
      FAMÍLIA: family,
      GÊNERO: genus,
      CF: '',
      ESPÉCIE: sp,
      AUTHOR: author,
      PAÍS: country,
      ESTADO: state,
      CIDADE: city,
      'CAMPO ESPECIFICADO': '',
      UC: '',
      LATITUDE: lat,
      LONGITUDE: lng,
      ALTITUDE: rec.elevation || '',
      UN: 'm',
      'DESCRIÇÃO LOCALIDADE': rec.locality || 'Localidade registrada no GBIF',
      FLORES: '',
      FRUTOS: '',
      ALTURA: '',
      'UN ALT': 'm',
      COLETOR: rec.recordedBy || 'Coletor s.n.',
      'Nº COLETA': rec.recordNumber || 's.n.',
      DIA: day,
      MÊS: month,
      ANO: year,
      DETERMINAÇÃO: rec.identifiedBy || '',
      'COLEÇÃO ORIGEM': rec.institutionCode || 'HERBÁRIO EXTERNO',
      'COLEÇÃO DESTINO': '',
      'QTDE DUPLICATA': '',
      'OBSERVAÇÃO LOCALIDADE': '',
      projeto: rec.collectionCode ? `Coleção: ${rec.collectionCode}` : 'Base GBIF',
      HABITAT: rec.habitat || '',
      HÁBITO: '',
      OBS: rec.occurrenceRemarks || 'Exemplar importado de banco de dados internacional.',
      RESPONSÁVEL: 'API GBIF',
      DATA: new Date().toISOString().slice(0, 10),

      // Convenience aliases
      catalogNumber: tombo,
      institutionCode: rec.institutionCode || 'HERBÁRIO EXTERNO',
      herbariumAcronym: rec.institutionCode || 'GBIF',
      project: rec.collectionCode ? `Coleção: ${rec.collectionCode}` : 'Base Externa GBIF',
      family: family,
      scientificName: `${genus} ${sp}`.trim(),
      scientificNameAuthorship: author,
      country: country,
      stateProvince: state,
      municipality: city,
      locality: rec.locality || 'Localidade registrada no GBIF',
      latitude: lat,
      longitude: lng,
      datum: rec.geodeticDatum || 'WGS84',
      elevation: rec.elevation ? `${rec.elevation} m` : '',
      habitat: rec.habitat || '',
      plantDescription: rec.occurrenceRemarks || 'Exemplar importado de banco de dados internacional.',
      recordedBy: rec.recordedBy || 'Coletor s.n.',
      recordNumber: rec.recordNumber || 's.n.',
      eventDate: dateStr,
      identifiedBy: rec.identifiedBy || '',
      barcode: String(rec.key || ''),
      externalUrl: `https://www.gbif.org/occurrence/${rec.key}`,
      sourceDatabase: 'GBIF (Global Biodiversity Information Facility)',
      auditStatus: 'pending',
    };
  };

  const handleImportGbifRecord = (rec: any) => {
    const specimen = mapGbifToSpecimen(rec);
    onImportSpecimens([specimen]);
    onClose();
  };

  const handleImportAllGbif = () => {
    if (gbifResults.length === 0) return;
    const specimens = gbifResults.map(mapGbifToSpecimen);
    onImportSpecimens(specimens);
    onClose();
  };

  // Handle CSV / TSV Import supporting the 47 database columns
  const handleParseCsv = () => {
    if (!csvText.trim()) return;

    const lines = csvText.trim().split('\n');
    if (lines.length < 2) return;

    // Detect delimiter: tab, semicolon or comma
    const firstLine = lines[0];
    const delimiter = firstLine.includes('\t') ? '\t' : (firstLine.includes(';') ? ';' : ',');

    const headers = firstLine.split(delimiter).map((h) => h.trim().replace(/^"|"$/g, ''));
    const imported: Specimen[] = [];

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i];
      if (!line.trim()) continue;
      
      const values = line.split(delimiter).map((v) => v.trim().replace(/^"|"$/g, ''));
      const row: any = {};
      headers.forEach((h, index) => {
        row[h] = values[index] || '';
      });

      const tombo = row.TOMBO || row.catalogNumber || `TOMBO-${i + 100}`;
      const family = (row.FAMÍLIA || row.family || 'INDETERMINADA').toUpperCase();
      const genus = row.GÊNERO || row.genus || '';
      const cf = row.CF || '';
      const sp = row.ESPÉCIE || row.species || '';
      const author = row.AUTHOR || row.scientificNameAuthorship || '';
      const sciName = (genus && sp) ? `${genus} ${cf ? cf + ' ' : ''}${sp}` : (row.scientificName || `${genus} ${sp}`.trim());

      imported.push({
        id: `db-${Date.now()}-${i}`,
        // 47 Database columns
        TOMBO: tombo,
        FAMÍLIA: family,
        GÊNERO: genus,
        CF: cf,
        ESPÉCIE: sp,
        AUTHOR: author,
        PAÍS: row.PAÍS || row.country || 'Brasil',
        ESTADO: row.ESTADO || row.stateProvince || '',
        CIDADE: row.CIDADE || row.municipality || '',
        'CAMPO ESPECIFICADO': row['CAMPO ESPECIFICADO'] || '',
        UC: row.UC || '',
        LATITUDE: row.LATITUDE || row.latitude || '',
        LONGITUDE: row.LONGITUDE || row.longitude || '',
        lat_grau: row.lat_grau || '',
        lat_min: row.lat_min || '',
        lat_seg: row.lat_seg || '',
        ns: row.ns || 'S',
        long_grau: row.long_grau || '',
        long_min: row.long_min || '',
        long_seg: row.long_seg || '',
        ew: row.ew || 'W',
        ALTITUDE: row.ALTITUDE || row.elevation || '',
        UN: row.UN || 'm',
        'DESCRIÇÃO LOCALIDADE': row['DESCRIÇÃO LOCALIDADE'] || row.locality || '',
        FLORES: row.FLORES || '',
        FRUTOS: row.FRUTOS || '',
        ALTURA: row.ALTURA || '',
        'UN ALT': row['UN ALT'] || 'm',
        COLETOR: row.COLETOR || row.recordedBy || 'Coletor s.n.',
        'Nº COLETA': row['Nº COLETA'] || row.recordNumber || 's.n.',
        DIA: row.DIA || '',
        MÊS: row.MÊS || '',
        ANO: row.ANO || '',
        DETERMINAÇÃO: row.DETERMINAÇÃO || row.identifiedBy || '',
        DIA_DET: row.DIA_DET || '',
        MÊS_DET: row.MÊS_DET || '',
        ANO_DET: row.ANO_DET || '',
        'COLEÇÃO ORIGEM': row['COLEÇÃO ORIGEM'] || 'HERBÁRIO UNIVERSITÁRIO',
        'COLEÇÃO DESTINO': row['COLEÇÃO DESTINO'] || '',
        'QTDE DUPLICATA': row['QTDE DUPLICATA'] || '',
        'OBSERVAÇÃO LOCALIDADE': row['OBSERVAÇÃO LOCALIDADE'] || '',
        projeto: row.projeto || 'Flora do Brasil',
        HABITAT: row.HABITAT || row.habitat || '',
        HÁBITO: row.HÁBITO || '',
        OBS: row.OBS || row.plantDescription || '',
        RESPONSÁVEL: row.RESPONSÁVEL || '',
        DATA: row.DATA || new Date().toISOString().slice(0, 10),

        // Unified aliases
        catalogNumber: tombo,
        institutionCode: row['COLEÇÃO ORIGEM'] || 'HERBÁRIO UNIVERSITÁRIO',
        herbariumAcronym: 'HBR',
        project: row.projeto || 'Flora do Brasil',
        family: family,
        scientificName: sciName,
        scientificNameAuthorship: author,
        country: row.PAÍS || row.country || 'Brasil',
        stateProvince: row.ESTADO || row.stateProvince || '',
        municipality: row.CIDADE || row.municipality || '',
        locality: row['DESCRIÇÃO LOCALIDADE'] || row.locality || '',
        latitude: row.LATITUDE || row.latitude || '',
        longitude: row.LONGITUDE || row.longitude || '',
        habitat: row.HABITAT || row.habitat || '',
        plantDescription: row.OBS || row.plantDescription || '',
        recordedBy: row.COLETOR || row.recordedBy || 'Coletor s.n.',
        recordNumber: row['Nº COLETA'] || row.recordNumber || 's.n.',
        eventDate: (row.ANO && row.MÊS && row.DIA) ? `${row.ANO}-${String(row.MÊS).padStart(2, '0')}-${String(row.DIA).padStart(2, '0')}` : '',
        identifiedBy: row.DETERMINAÇÃO || row.identifiedBy || '',
        sourceDatabase: 'Importação de Banco de Dados',
        auditStatus: 'pending',
      });
    }

    if (imported.length > 0) {
      onImportSpecimens(imported);
      onClose();
    }
  };

  // Handle Load Curated Sample Data with Errors
  const handleLoadSamples = () => {
    onImportSpecimens(SAMPLE_SPECIMENS);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
      <div className="w-full max-w-3xl bg-white dark:bg-slate-900 rounded-xl shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col max-h-[90vh] overflow-hidden">
        
        {/* HEADER */}
        <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 rounded-lg">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
                Conectar a Banco de Dados Externo
              </h2>
              <p className="text-xs text-slate-500">
                Busque registros automaticamente via GBIF, endpoints REST ou importe planilhas de campo
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-md transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* TABS */}
        <div className="flex border-b border-slate-200 dark:border-slate-800 px-6 bg-slate-50 dark:bg-slate-950/50">
          <button
            onClick={() => setActiveTab('gbif')}
            className={`py-3 px-4 text-xs font-medium border-b-2 transition-colors flex items-center gap-2 ${
              activeTab === 'gbif'
                ? 'border-emerald-600 text-emerald-700 dark:text-emerald-400 font-semibold'
                : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
            }`}
          >
            <Globe className="w-3.5 h-3.5" />
            GBIF Global Network (API)
          </button>

          <button
            onClick={() => setActiveTab('sample')}
            className={`py-3 px-4 text-xs font-medium border-b-2 transition-colors flex items-center gap-2 ${
              activeTab === 'sample'
                ? 'border-emerald-600 text-emerald-700 dark:text-emerald-400 font-semibold'
                : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
            Coleção Curada com Erros de Teste
          </button>

          <button
            onClick={() => setActiveTab('csv')}
            className={`py-3 px-4 text-xs font-medium border-b-2 transition-colors flex items-center gap-2 ${
              activeTab === 'csv'
                ? 'border-emerald-600 text-emerald-700 dark:text-emerald-400 font-semibold'
                : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
            }`}
          >
            <Upload className="w-3.5 h-3.5" />
            Planilha CSV / Darwin Core
          </button>

          <button
            onClick={() => setActiveTab('custom_api')}
            className={`py-3 px-4 text-xs font-medium border-b-2 transition-colors flex items-center gap-2 ${
              activeTab === 'custom_api'
                ? 'border-emerald-600 text-emerald-700 dark:text-emerald-400 font-semibold'
                : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
            }`}
          >
            <Database className="w-3.5 h-3.5" />
            API REST Personalizada
          </button>
        </div>

        {/* BODY */}
        <div className="flex-1 overflow-y-auto p-6">
          
          {/* TAB 1: GBIF SEARCH */}
          {activeTab === 'gbif' && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="flex-1 relative">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    value={gbifQuery}
                    onChange={(e) => setGbifQuery(e.target.value)}
                    placeholder="Gênero ou espécie (ex: Handroanthus, Cecropia, Tibouchina, Cattleya)..."
                    className="w-full pl-9 pr-3 py-2 text-xs bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-md focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    onKeyDown={(e) => e.key === 'Enter' && handleSearchGbif()}
                  />
                </div>

                <div className="w-32">
                  <select
                    value={gbifCountry}
                    onChange={(e) => setGbifCountry(e.target.value)}
                    className="w-full py-2 px-2.5 text-xs bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-md focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  >
                    <option value="BR">Brasil (BR)</option>
                    <option value="CO">Colômbia (CO)</option>
                    <option value="PE">Peru (PE)</option>
                    <option value="AR">Argentina (AR)</option>
                    <option value="">Qualquer país</option>
                  </select>
                </div>

                <button
                  onClick={handleSearchGbif}
                  disabled={isSearchingGbif}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-medium rounded-md shadow-xs transition-colors flex items-center justify-center gap-1.5 shrink-0 disabled:opacity-50"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isSearchingGbif ? 'animate-spin' : ''}`} />
                  {isSearchingGbif ? 'Consultando...' : 'Buscar no GBIF'}
                </button>
              </div>

              {gbifError && (
                <div className="p-3 bg-rose-50 text-rose-800 text-xs rounded border border-rose-200">
                  {gbifError}
                </div>
              )}

              {/* RESULTS LIST */}
              {gbifResults.length > 0 && (
                <div className="space-y-3 mt-4">
                  <div className="flex items-center justify-between text-xs text-slate-500">
                    <span>{gbifResults.length} espécimes encontrados na base do GBIF:</span>
                    <button
                      onClick={handleImportAllGbif}
                      className="text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 font-semibold"
                    >
                      Importar Todos os {gbifResults.length} Registros
                    </button>
                  </div>

                  <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                    {gbifResults.map((rec) => (
                      <div
                        key={rec.key}
                        className="p-3 bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/80 rounded-lg flex items-center justify-between gap-3 text-xs hover:border-slate-300 transition-colors"
                      >
                        <div className="space-y-1">
                          <p className="font-semibold text-slate-900 dark:text-slate-100 italic">
                            {rec.scientificName || rec.species || 'Espécie'}
                            <span className="not-italic text-slate-500 font-normal ml-2">
                              ({rec.family || 'Família n/d'})
                            </span>
                          </p>
                          <p className="text-[11px] text-slate-600 dark:text-slate-400">
                            {[rec.locality, rec.stateProvince, rec.country].filter(Boolean).join(', ')}
                            {rec.recordedBy && ` · Col.: ${rec.recordedBy}`}
                            {rec.eventDate && ` · Data: ${rec.eventDate.split('T')[0]}`}
                          </p>
                        </div>

                        <button
                          onClick={() => handleImportGbifRecord(rec)}
                          className="px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 hover:border-emerald-300 text-slate-700 dark:text-slate-200 text-xs font-medium rounded transition-colors shrink-0 flex items-center gap-1"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          Importar
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: CURATED SAMPLES WITH INTENTIONAL ERRORS */}
          {activeTab === 'sample' && (
            <div className="space-y-4">
              <div className="p-4 bg-amber-50/70 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/60 rounded-lg text-xs text-amber-900 dark:text-amber-200">
                <p className="font-semibold mb-1 flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-amber-600" />
                  Conjunto de Dados de Teste com Erros Típicos de Herbário
                </p>
                <p className="leading-relaxed">
                  Carrega 5 espécimes reais brasileiros com erros propositais de nomenclatura (ex: <i>Tabebuya chrysotrica</i>), coordenadas geográficas invertidas, sinais negativos ausentes na longitude e inconsistências de bioma para testar a IA do Gemini 3.8 Flash.
                </p>
              </div>

              <div className="space-y-2">
                {SAMPLE_SPECIMENS.map((s, idx) => (
                  <div
                    key={s.id}
                    className="p-3 bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 rounded-lg flex items-center justify-between text-xs"
                  >
                    <div>
                      <p className="font-semibold text-slate-900 dark:text-slate-100">
                        {idx + 1}. <span className="italic">{s.scientificName}</span> ({s.family})
                      </p>
                      <p className="text-[11px] text-slate-500">
                        {s.municipality}, {s.stateProvince} · Coletor: {s.recordedBy} nº {s.recordNumber}
                      </p>
                    </div>
                    <span className="text-[11px] font-mono text-slate-400">{s.catalogNumber}</span>
                  </div>
                ))}
              </div>

              <div className="pt-2">
                <button
                  onClick={handleLoadSamples}
                  className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-md shadow-xs transition-colors flex items-center justify-center gap-2"
                >
                  <Layers className="w-4 h-4" />
                  Carregar Coleção de Teste Completa
                </button>
              </div>
            </div>
          )}

          {/* TAB 3: CSV IMPORT */}
          {activeTab === 'csv' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-xs text-slate-500">
                  Importe dados colando diretamente de planilhas Excel/Google Sheets (separados por tabulação ou vírgula) contendo as 47 colunas oficiais do banco:
                </p>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      const sampleLine = `TOMBO\tFAMÍLIA\tGÊNERO\tCF\tESPÉCIE\tAUTHOR\tPAÍS\tESTADO\tCIDADE\tCAMPO ESPECIFICADO\tUC\tLATITUDE\tLONGITUDE\tlat_grau\tlat_min\tlat_seg\tns\tlong_grau\tlong_min\tlong_seg\tew\tALTITUDE\tUN\tDESCRIÇÃO LOCALIDADE\tFLORES\tFRUTOS\tALTURA\tUN ALT\tCOLETOR\tNº COLETA\tDIA\tMÊS\tANO\tDETERMINAÇÃO\tDIA_DET\tMÊS_DET\tANO_DET\tCOLEÇÃO ORIGEM\tCOLEÇÃO DESTINO\tQTDE DUPLICATA\tOBSERVAÇÃO LOCALIDADE\tprojeto\tHABITAT\tHÁBITO\tOBS\tRESPONSÁVEL\tDATA\nHBR-048296\tFABACEAE\tAnadenanthera\t\tcolubrina\t(Vell.) Brenan\tBrasil\tMinas Gerais\tDiamantina\tEstrada Biribiri\tPE Biribiri\t-18.2439\t-43.6022\t18\t14\t38\tS\t43\t36\t8\tW\t1150\tm\tMata de galeria em encosta rochosa\tbrancas aromáticas\tvagens secas marrons\t14\tm\tA. Santos\t234\t12\t4\t2023\tDr. Carlos F. Botelho\t15\t5\t2023\tHBR - HERBÁRIO UNIVERSITÁRIO\tRB, SPF\t2\tMargem do Rio das Pedras\tFlora de Minas\tCerradão e Mata de Galeria\tÁrvore\tCasca rugosa e fendida\tA. Santos\t2023-04-15`;
                      setCsvText(sampleLine);
                    }}
                    className="text-[11px] text-emerald-600 dark:text-emerald-400 hover:underline font-medium"
                  >
                    Inserir Exemplo Completo
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const headers = `TOMBO\tFAMÍLIA\tGÊNERO\tCF\tESPÉCIE\tAUTHOR\tPAÍS\tESTADO\tCIDADE\tCAMPO ESPECIFICADO\tUC\tLATITUDE\tLONGITUDE\tlat_grau\tlat_min\tlat_seg\tns\tlong_grau\tlong_min\tlong_seg\tew\tALTITUDE\tUN\tDESCRIÇÃO LOCALIDADE\tFLORES\tFRUTOS\tALTURA\tUN ALT\tCOLETOR\tNº COLETA\tDIA\tMÊS\tANO\tDETERMINAÇÃO\tDIA_DET\tMÊS_DET\tANO_DET\tCOLEÇÃO ORIGEM\tCOLEÇÃO DESTINO\tQTDE DUPLICATA\tOBSERVAÇÃO LOCALIDADE\tprojeto\tHABITAT\tHÁBITO\tOBS\tRESPONSÁVEL\tDATA`;
                      navigator.clipboard.writeText(headers);
                    }}
                    className="text-[11px] text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 underline"
                  >
                    Copiar 47 Colunas
                  </button>
                </div>
              </div>

              <div className="p-2 bg-slate-50 dark:bg-slate-950 rounded border border-slate-200 dark:border-slate-800 text-[10px] font-mono text-slate-500 overflow-x-auto whitespace-nowrap">
                TOMBO · FAMÍLIA · GÊNERO · CF · ESPÉCIE · AUTHOR · PAÍS · ESTADO · CIDADE · CAMPO ESPECIFICADO · UC · LATITUDE · LONGITUDE · lat_grau · lat_min · lat_seg · ns · long_grau · long_min · long_seg · ew · ALTITUDE · UN · DESCRIÇÃO LOCALIDADE · FLORES · FRUTOS · ALTURA · UN ALT · COLETOR · Nº COLETA · DIA · MÊS · ANO · DETERMINAÇÃO · DIA_DET · MÊS_DET · ANO_DET · COLEÇÃO ORIGEM · COLEÇÃO DESTINO · QTDE DUPLICATA · OBSERVAÇÃO LOCALIDADE · projeto · HABITAT · HÁBITO · OBS · RESPONSÁVEL · DATA
              </div>

              <textarea
                value={csvText}
                onChange={(e) => setCsvText(e.target.value)}
                placeholder="Cole aqui os dados separados por tabulação (Excel/Google Sheets) ou vírgulas (CSV)..."
                rows={7}
                className="w-full p-3 text-xs font-mono bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-md focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />

              <div className="flex items-center justify-between pt-1">
                <button
                  onClick={handleParseCsv}
                  disabled={!csvText.trim()}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-medium rounded-md shadow-xs transition-colors disabled:opacity-50"
                >
                  Importar Registros da Planilha para o Herbário
                </button>

                {onOpenImportSpreadsheet && (
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onOpenImportSpreadsheet();
                    }}
                    className="text-xs text-emerald-700 dark:text-emerald-400 hover:underline font-medium flex items-center gap-1.5"
                  >
                    <span>Importar arquivo Excel (.xlsx, .xls) ou link Google Sheets →</span>
                  </button>
                )}
              </div>
            </div>
          )}

          {/* TAB 4: CUSTOM REST API */}
          {activeTab === 'custom_api' && (
            <div className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                  URL do Endpoint REST do Banco de Dados
                </label>
                <input
                  type="text"
                  value={apiUrl}
                  onChange={(e) => setApiUrl(e.target.value)}
                  placeholder="https://meu-herbario.edu.br/api/v1/specimens?status=approved"
                  className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-md focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                  Token de Autenticação / Bearer Header (Opcional)
                </label>
                <input
                  type="password"
                  value={apiAuthHeader}
                  onChange={(e) => setApiAuthHeader(e.target.value)}
                  placeholder="Bearer seu_token_aqui..."
                  className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-md focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>

              <button
                onClick={async () => {
                  setIsFetchingCustom(true);
                  setCustomApiMessage(null);
                  try {
                    const res = await fetch(apiUrl, {
                      headers: apiAuthHeader ? { Authorization: apiAuthHeader } : {},
                    });
                    const data = await res.json();
                    const records = Array.isArray(data) ? data : (data.results || data.data || []);
                    if (records.length > 0) {
                      const specimens = records.map(mapGbifToSpecimen);
                      onImportSpecimens(specimens);
                      onClose();
                    } else {
                      setCustomApiMessage('Endpoint respondeu com sucesso, mas nenhum espécime foi retornado.');
                    }
                  } catch (e: any) {
                    setCustomApiMessage(`Erro na conexão: ${e.message}`);
                  } finally {
                    setIsFetchingCustom(false);
                  }
                }}
                disabled={isFetchingCustom || !apiUrl.trim()}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-medium rounded-md shadow-xs transition-colors flex items-center gap-2 disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isFetchingCustom ? 'animate-spin' : ''}`} />
                {isFetchingCustom ? 'Consultando Servidor...' : 'Conectar e Importar Dados'}
              </button>

              {customApiMessage && (
                <p className="text-xs text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/20 p-2.5 rounded border border-amber-200">
                  {customApiMessage}
                </p>
              )}
            </div>
          )}

        </div>

        {/* FOOTER */}
        <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-md transition-colors"
          >
            Fechar
          </button>
        </div>

      </div>
    </div>
  );
};
