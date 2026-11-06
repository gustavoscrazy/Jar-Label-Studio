import React, { useState, useRef } from 'react';
import {
  FileSpreadsheet,
  Upload,
  Link2,
  X,
  CheckCircle2,
  AlertCircle,
  FileText,
  ArrowRight,
  Download,
  HelpCircle,
  RefreshCw,
} from 'lucide-react';
import { Specimen } from '../types/botanical';
import {
  parseSpreadsheetFile,
  fetchAndParseGoogleSheet,
} from '../utils/spreadsheetParser';

interface ImportSpreadsheetModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportSpecimens: (specimens: Specimen[], mode: 'append' | 'replace') => void;
}

export const ImportSpreadsheetModal: React.FC<ImportSpreadsheetModalProps> = ({
  isOpen,
  onClose,
  onImportSpecimens,
}) => {
  const [activeTab, setActiveTab] = useState<'file' | 'googlesheets'>('file');
  const [googleSheetUrl, setGoogleSheetUrl] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Parsed preview state
  const [parsedSpecimens, setParsedSpecimens] = useState<Specimen[]>([]);
  const [parsedFileName, setParsedFileName] = useState<string>('');
  const [importMode, setImportMode] = useState<'append' | 'replace'>('append');

  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  // Handle local file selection (.xlsx, .xls, .csv, .tsv, etc.)
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const result = await parseSpreadsheetFile(file);
      setParsedSpecimens(result.specimens);
      setParsedFileName(file.name);
      setSuccessMsg(
        `Arquivo "${file.name}" lido com sucesso! ${result.rowCount} espécimes prontos para importação.`
      );
    } catch (err: any) {
      console.error('File parse error:', err);
      setErrorMsg(err.message || 'Falha ao processar o arquivo de planilha.');
      setParsedSpecimens([]);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle Google Sheets URL import
  const handleFetchGoogleSheet = async () => {
    if (!googleSheetUrl.trim()) {
      setErrorMsg('Por favor, informe a URL da planilha do Google Sheets.');
      return;
    }

    setIsLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const result = await fetchAndParseGoogleSheet(googleSheetUrl);
      setParsedSpecimens(result.specimens);
      setParsedFileName('Google Sheets Online');
      setSuccessMsg(
        `Planilha do Google Sheets sincronizada com sucesso! ${result.rowCount} espécimes carregados.`
      );
    } catch (err: any) {
      console.error('Google sheet fetch error:', err);
      setErrorMsg(
        err.message ||
          'Falha ao carregar a planilha do Google Sheets. Verifique o link e se a planilha está compartilhada com permissão de visualização pública.'
      );
      setParsedSpecimens([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleConfirmImport = () => {
    if (parsedSpecimens.length === 0) return;
    onImportSpecimens(parsedSpecimens, importMode);
    onClose();
  };

  const handleReset = () => {
    setParsedSpecimens([]);
    setParsedFileName('');
    setErrorMsg(null);
    setSuccessMsg(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
      <div className="w-full max-w-3xl bg-white dark:bg-slate-900 rounded-xl shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col max-h-[90vh] overflow-hidden">
        
        {/* HEADER */}
        <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 rounded-lg">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
                Importar Planilha de Dados Botânicos
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Suporta Excel (.xlsx, .xls), CSV, TSV e links diretos do Google Sheets
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

        {/* TABS: ARQUIVO LOCAL vs GOOGLE SHEETS */}
        <div className="flex border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/40 px-6 pt-2">
          <button
            onClick={() => {
              setActiveTab('file');
              handleReset();
            }}
            className={`pb-3 px-4 text-xs font-semibold border-b-2 transition-colors flex items-center gap-2 ${
              activeTab === 'file'
                ? 'border-emerald-600 text-emerald-700 dark:text-emerald-400'
                : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Arquivo Local (.xlsx, .xls, .csv, .tsv)</span>
          </button>

          <button
            onClick={() => {
              setActiveTab('googlesheets');
              handleReset();
            }}
            className={`pb-3 px-4 text-xs font-semibold border-b-2 transition-colors flex items-center gap-2 ${
              activeTab === 'googlesheets'
                ? 'border-emerald-600 text-emerald-700 dark:text-emerald-400'
                : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            <Link2 className="w-3.5 h-3.5" />
            <span>Link do Google Sheets</span>
          </button>
        </div>

        {/* CONTENT */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          
          {/* TAB 1: LOCAL FILE DROP ZONE */}
          {activeTab === 'file' && (
            <div className="space-y-4">
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx, .xls, .csv, .tsv, .ods, text/csv, text/tab-separated-values, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel"
                onChange={handleFileChange}
                className="hidden"
                id="spreadsheet-upload-input"
              />

              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-emerald-500 dark:hover:border-emerald-500 rounded-xl p-8 text-center cursor-pointer transition-colors bg-slate-50/50 dark:bg-slate-950/20 hover:bg-emerald-50/30 dark:hover:bg-emerald-950/10 group"
              >
                <div className="w-12 h-12 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 flex items-center justify-center mx-auto mb-3 group-hover:scale-110 transition-transform">
                  <Upload className="w-6 h-6" />
                </div>
                <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                  Clique para selecionar ou arraste sua planilha
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Formatos aceitos: <strong>.XLSX</strong>, <strong>.XLS</strong>, <strong>.CSV</strong>, <strong>.TSV</strong>, <strong>.ODS</strong>
                </p>
                <div className="mt-3 flex items-center justify-center gap-2">
                  <span className="text-[11px] font-mono text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950 px-2 py-0.5 rounded border border-emerald-200 dark:border-emerald-800">
                    47 colunas mapeadas automaticamente
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: GOOGLE SHEETS LINK */}
          {activeTab === 'googlesheets' && (
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-800 dark:text-slate-200 block">
                  Cole o link da sua planilha do Google Sheets:
                </label>
                <div className="flex gap-2">
                  <input
                    type="url"
                    value={googleSheetUrl}
                    onChange={(e) => setGoogleSheetUrl(e.target.value)}
                    placeholder="https://docs.google.com/spreadsheets/d/.../edit#gid=0"
                    className="flex-1 px-3 py-2 text-xs font-mono bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
                  />
                  <button
                    onClick={handleFetchGoogleSheet}
                    disabled={isLoading || !googleSheetUrl.trim()}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5 disabled:opacity-50 shrink-0"
                  >
                    {isLoading ? (
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Link2 className="w-3.5 h-3.5" />
                    )}
                    <span>{isLoading ? 'Sincronizando...' : 'Carregar Planilha'}</span>
                  </button>
                </div>
              </div>

              {/* Instructions banner */}
              <div className="p-3.5 bg-blue-50/70 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800/60 rounded-lg text-xs space-y-1.5 text-blue-900 dark:text-blue-200">
                <p className="font-semibold flex items-center gap-1.5">
                  <HelpCircle className="w-4 h-4 text-blue-600 shrink-0" />
                  Instruções para Google Sheets:
                </p>
                <ol className="list-decimal list-inside space-y-1 text-[11px] text-blue-800 dark:text-blue-300">
                  <li>No Google Sheets, clique no botão <strong>Compartilhar</strong> (canto superior direito).</li>
                  <li>Em <em>Acesso geral</em>, altere para <strong>"Qualquer pessoa com o link"</strong> como <em>Leitor</em>.</li>
                  <li>Clique em <strong>Copiar link</strong> e cole no campo acima.</li>
                </ol>
              </div>
            </div>
          )}

          {/* ERROR ALERT */}
          {errorMsg && (
            <div className="p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 rounded-lg flex items-start gap-2.5 text-xs text-red-800 dark:text-red-300">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
              <div className="flex-1">
                <span className="font-bold">Aviso de Importação: </span>
                {errorMsg}
              </div>
            </div>
          )}

          {/* SUCCESS BANNER & PREVIEW */}
          {successMsg && parsedSpecimens.length > 0 && (
            <div className="space-y-3">
              <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-lg flex items-center justify-between text-xs text-emerald-800 dark:text-emerald-300">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>{successMsg}</span>
                </div>
                <button
                  onClick={handleReset}
                  className="text-xs text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 underline"
                >
                  Trocar arquivo
                </button>
              </div>

              {/* IMPORT MODE OPTION */}
              <div className="p-3 bg-slate-50 dark:bg-slate-950/50 rounded-lg border border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                <span className="font-semibold text-slate-700 dark:text-slate-300">
                  Modo de Importação no Acervo:
                </span>
                <div className="flex items-center gap-2">
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="radio"
                      name="importMode"
                      value="append"
                      checked={importMode === 'append'}
                      onChange={() => setImportMode('append')}
                      className="text-emerald-600 focus:ring-emerald-500"
                    />
                    <span className="text-slate-700 dark:text-slate-300">
                      Adicionar à coleção atual (+)
                    </span>
                  </label>
                  <label className="flex items-center gap-1.5 cursor-pointer ml-3">
                    <input
                      type="radio"
                      name="importMode"
                      value="replace"
                      checked={importMode === 'replace'}
                      onChange={() => setImportMode('replace')}
                      className="text-emerald-600 focus:ring-emerald-500"
                    />
                    <span className="text-slate-700 dark:text-slate-300">
                      Substituir coleção atual
                    </span>
                  </label>
                </div>
              </div>

              {/* DATA PREVIEW TABLE */}
              <div className="space-y-1.5">
                <p className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                  Prévia dos Dados Mapeados (primeiros {Math.min(parsedSpecimens.length, 3)} registros):
                </p>
                <div className="border border-slate-200 dark:border-slate-800 rounded-lg overflow-x-auto text-[11px]">
                  <table className="w-full text-left">
                    <thead className="bg-slate-100 dark:bg-slate-800 font-mono text-slate-700 dark:text-slate-300 border-b border-slate-200 dark:border-slate-700">
                      <tr>
                        <th className="p-2 font-semibold">TOMBO</th>
                        <th className="p-2 font-semibold">FAMÍLIA</th>
                        <th className="p-2 font-semibold">GÊNERO</th>
                        <th className="p-2 font-semibold">ESPÉCIE</th>
                        <th className="p-2 font-semibold">AUTOR</th>
                        <th className="p-2 font-semibold">LOCALIDADE</th>
                        <th className="p-2 font-semibold">COLETOR</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                      {parsedSpecimens.slice(0, 3).map((spec, i) => (
                        <tr key={i} className="hover:bg-slate-50 dark:hover:bg-slate-900/60">
                          <td className="p-2 font-mono font-bold text-slate-900 dark:text-slate-100">{spec.TOMBO}</td>
                          <td className="p-2 uppercase text-slate-800 dark:text-slate-200">{spec.FAMÍLIA}</td>
                          <td className="p-2 italic">{spec.GÊNERO}</td>
                          <td className="p-2 italic">{spec.ESPÉCIE}</td>
                          <td className="p-2 text-slate-600 dark:text-slate-400">{spec.AUTHOR || '—'}</td>
                          <td className="p-2 truncate max-w-[150px]">{spec.CIDADE ? `${spec.CIDADE}, ${spec.ESTADO}` : '—'}</td>
                          <td className="p-2">{spec.COLETOR} {spec['Nº COLETA'] ? `nº ${spec['Nº COLETA']}` : ''}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

        </div>

        {/* FOOTER ACTIONS */}
        <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 flex items-center justify-between">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-lg transition-colors"
          >
            Cancelar
          </button>

          <button
            onClick={handleConfirmImport}
            disabled={parsedSpecimens.length === 0}
            className="px-5 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:hover:bg-emerald-600 rounded-lg transition-colors flex items-center gap-1.5 shadow-xs"
          >
            <span>Concluir Importação ({parsedSpecimens.length} espécimes)</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

      </div>
    </div>
  );
};
