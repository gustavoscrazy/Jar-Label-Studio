import React, { useState } from 'react';
import {
  Printer,
  Download,
  X,
  Settings,
  Layers,
  FileText,
  QrCode,
  ShieldCheck,
} from 'lucide-react';
import { Specimen, LabelConfig } from '../types/botanical';
import { BotanicalLabel } from './BotanicalLabel';
import { exportSpecimensToPdfSheet, exportSingleLabelPdf } from '../utils/pdfGenerator';
import { expandSpecimensWithDuplicates } from '../utils/botanicalFormatter';

interface PrintPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  specimens: Specimen[];
  queuedSpecimens?: Specimen[];
  selectedSpecimens?: Specimen[];
  currentSpecimen: Specimen | null;
  config: LabelConfig;
  onChangeConfig: (newConfig: LabelConfig) => void;
  initialScope?: 'current' | 'all' | 'selected' | 'queue';
}

export const PrintPreviewModal: React.FC<PrintPreviewModalProps> = ({
  isOpen,
  onClose,
  specimens,
  queuedSpecimens = [],
  selectedSpecimens = [],
  currentSpecimen,
  config,
  onChangeConfig,
  initialScope = 'all',
}) => {
  const hasQueue = queuedSpecimens && queuedSpecimens.length > 0;
  const hasSelected = selectedSpecimens && selectedSpecimens.length > 0 && selectedSpecimens.length < specimens.length;
  const [printScope, setPrintScope] = useState<'current' | 'all' | 'selected' | 'queue'>(
    initialScope === 'queue' && hasQueue
      ? 'queue'
      : initialScope === 'selected' && hasSelected
      ? 'selected'
      : hasQueue
      ? 'queue'
      : initialScope
  );
  const [isExportingPdf, setIsExportingPdf] = useState(false);

  React.useEffect(() => {
    if (isOpen) {
      if (initialScope === 'queue' && hasQueue) {
        setPrintScope('queue');
      } else if (initialScope === 'selected' && hasSelected) {
        setPrintScope('selected');
      } else if (initialScope === 'current' && currentSpecimen) {
        setPrintScope('current');
      } else if (hasQueue && initialScope === 'all') {
        setPrintScope('queue');
      } else {
        setPrintScope('all');
      }
    }
  }, [isOpen, initialScope, hasQueue, hasSelected, currentSpecimen]);

  if (!isOpen) return null;

  const baseTargetSpecimens =
    printScope === 'queue' && hasQueue
      ? queuedSpecimens
      : printScope === 'current' && currentSpecimen
      ? [currentSpecimen]
      : printScope === 'selected' && hasSelected
      ? selectedSpecimens
      : specimens;

  const targetSpecimens = expandSpecimensWithDuplicates(baseTargetSpecimens, true);

  const handleDownloadPdf = async () => {
    setIsExportingPdf(true);
    try {
      if (printScope === 'current' && currentSpecimen && targetSpecimens.length === 1) {
        await exportSingleLabelPdf(currentSpecimen, config);
      } else {
        await exportSpecimensToPdfSheet(targetSpecimens, config, false);
      }
    } catch (e) {
      console.error('Error generating PDF:', e);
    } finally {
      setIsExportingPdf(false);
    }
  };

  const handleNativePrint = () => {
    window.print();
  };

  // Group targetSpecimens into A4 pages of 4 labels each
  const labelsPerSheet = 4;
  const pages: Specimen[][] = [];
  for (let i = 0; i < targetSpecimens.length; i += labelsPerSheet) {
    pages.push(targetSpecimens.slice(i, i + labelsPerSheet));
  }

  return (
    <div className="print-modal-root fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
      <div className="print-modal-dialog w-full max-w-5xl bg-white dark:bg-slate-900 rounded-xl shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col max-h-[92vh] overflow-hidden">
        
        {/* HEADER */}
        <div className="no-print p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 rounded-lg">
              <Printer className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
                Impressão & Exportação de Etiquetas de Excicata
              </h2>
              <p className="text-xs text-slate-500">
                Layout normatizado segundo os padrões de curadoria botânica e Index Herbariorum
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

        {/* WORKSPACE */}
        <div className="print-modal-body flex-1 flex flex-col md:flex-row overflow-hidden">
          
          {/* LEFT: SETTINGS PANEL */}
          <div className="no-print w-full md:w-80 border-b md:border-b-0 md:border-r border-slate-200 dark:border-slate-800 p-5 space-y-5 overflow-y-auto bg-slate-50 dark:bg-slate-950/50">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-900 dark:text-slate-100 block">
                Escopo de Impressão
              </label>
              <div className="grid grid-cols-2 gap-1.5">
                {hasQueue && (
                  <button
                    onClick={() => setPrintScope('queue')}
                    className={`py-2 px-2 text-xs font-semibold rounded-md border text-center transition-colors ${
                      printScope === 'queue'
                        ? 'bg-emerald-50 dark:bg-emerald-950/80 border-emerald-600 text-emerald-800 dark:text-emerald-300 shadow-xs'
                        : 'border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    Fila de Impressão ({queuedSpecimens.length})
                  </button>
                )}
                {hasSelected && (
                  <button
                    onClick={() => setPrintScope('selected')}
                    className={`py-2 px-2 text-xs font-semibold rounded-md border text-center transition-colors ${
                      printScope === 'selected'
                        ? 'bg-emerald-50 dark:bg-emerald-950/80 border-emerald-600 text-emerald-800 dark:text-emerald-300 shadow-xs'
                        : 'border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    Por Tombo ({selectedSpecimens?.length})
                  </button>
                )}
                <button
                  onClick={() => setPrintScope('all')}
                  className={`py-2 px-2 text-xs font-medium rounded-md border text-center transition-colors ${
                    printScope === 'all'
                      ? 'bg-white dark:bg-slate-900 border-emerald-600 text-emerald-700 dark:text-emerald-400 shadow-xs'
                      : 'border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                  }`}
                >
                  Todas ({specimens.length})
                </button>
                <button
                  onClick={() => setPrintScope('current')}
                  disabled={!currentSpecimen}
                  className={`py-2 px-2 text-xs font-medium rounded-md border text-center transition-colors ${
                    printScope === 'current'
                      ? 'bg-white dark:bg-slate-900 border-emerald-600 text-emerald-700 dark:text-emerald-400 shadow-xs'
                      : 'border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-400 disabled:opacity-50'
                  }`}
                >
                  Apenas Atual
                </button>
              </div>
            </div>

            {/* Template Dimension */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-900 dark:text-slate-100 block">
                Formato da Etiqueta
              </label>
              <select
                value={config.template}
                onChange={(e) => onChangeConfig({ ...config, template: e.target.value as any })}
                className="w-full py-1.5 px-2.5 text-xs bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-md focus:outline-none focus:ring-1 focus:ring-emerald-500"
              >
                <option value="standard_120x100">Padrão Herbário Solicitado (12 x 10 cm - 12 de largura x 10 de comprimento)</option>
                <option value="standard_100x120">Padrão Retrato Anterior (10 x 12 cm)</option>
                <option value="standard_105x75">Padrão Internacional Herbário (10,5 x 7,5 cm)</option>
                <option value="large_140x100">Herbário Monografia / Grande (14 x 10 cm)</option>
                <option value="compact_90x60">Compacto / Briófitas & Fungos (9 x 6 cm)</option>
              </select>
            </div>

            {/* Typography (Padronizada em Serifada) */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-900 dark:text-slate-100 block">
                Tipografia Científica (Padronizada)
              </label>
              <div className="py-1.5 px-3 text-xs font-serif-botanical font-semibold rounded-md border bg-slate-100 dark:bg-slate-900 border-emerald-600/60 text-emerald-800 dark:text-emerald-400 text-center">
                Serifada Clássica (Padrão)
              </div>
            </div>

            {/* Toggles */}
            <div className="space-y-2.5 pt-2 border-t border-slate-200 dark:border-slate-800">
              <label className="flex items-center justify-between text-xs cursor-pointer">
                <span className="text-slate-700 dark:text-slate-300">Incluir Selo Oficial do Herbário</span>
                <input
                  type="checkbox"
                  checked={config.showHerbariumSeal}
                  onChange={(e) => onChangeConfig({ ...config, showHerbariumSeal: e.target.checked })}
                  className="rounded text-emerald-600 focus:ring-emerald-500"
                />
              </label>

              <label className="flex items-center justify-between text-xs cursor-pointer">
                <span className="text-slate-700 dark:text-slate-300">Bordas Externas de Corte</span>
                <input
                  type="checkbox"
                  checked={config.showBorders}
                  onChange={(e) => onChangeConfig({ ...config, showBorders: e.target.checked })}
                  className="rounded text-emerald-600 focus:ring-emerald-500"
                />
              </label>
            </div>

            {/* Official Logo & Header settings */}
            <div className="space-y-3 pt-2 border-t border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2.5 p-2 bg-emerald-50/60 dark:bg-emerald-950/40 rounded border border-emerald-200/80 dark:border-emerald-900/60">
                <img
                  src="/assets/aistudio/logo_5dd7f3b5.jpg"
                  alt="Logo Herbário JAR"
                  className="h-10 w-auto object-contain rounded shrink-0 bg-white p-0.5"
                />
                <div className="text-[11px] leading-tight text-slate-700 dark:text-slate-300">
                  <strong className="block text-slate-900 dark:text-slate-100 font-semibold">Logo Oficial Ativa</strong>
                  Herbário José Ângelo Rizzo (JAR)
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 block">
                  Cabeçalho (Nome do Herbário Fixo)
                </label>
                <input
                  type="text"
                  value="Herbário José Ângelo Rizzo (JAR)"
                  readOnly
                  className="w-full px-2.5 py-1.5 text-xs font-semibold bg-slate-100 dark:bg-slate-900 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-700 rounded-md cursor-not-allowed"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 block">
                  Instituição / Campus (Sub-cabeçalho)
                </label>
                <input
                  type="text"
                  value={config.subHeader || ''}
                  onChange={(e) => onChangeConfig({ ...config, subHeader: e.target.value })}
                  placeholder="Universidade Estadual de Goiás - Campus Sudoeste: Sede Quirinópolis"
                  className="w-full px-2.5 py-1.5 text-xs bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-md focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 block">
                  Sigla do Herbário (Fixa)
                </label>
                <input
                  type="text"
                  value="JAR"
                  readOnly
                  className="w-full px-2.5 py-1.5 text-xs font-mono font-bold uppercase bg-slate-100 dark:bg-slate-900 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-700 rounded-md cursor-not-allowed"
                />
              </div>
            </div>
          </div>

          {/* RIGHT: LIVE PRINT PREVIEW */}
          <div className="print-preview-scroll flex-1 p-6 overflow-y-auto bg-slate-200 dark:bg-slate-950 flex flex-col items-center space-y-6">
            <div className="no-print text-xs text-slate-500 font-mono">
              Visualização da Folha de Impressão A4 Paisagem (297 x 210 mm — {targetSpecimens.length} {targetSpecimens.length === 1 ? 'etiqueta' : 'etiquetas'} em {pages.length} {pages.length === 1 ? 'página' : 'páginas'})
            </div>

            {/* Simulated A4 Sheets (all pages rendered for preview & native print) */}
            {pages.map((pageSpecimens, pageIdx) => (
              <div
                key={`sheet-${pageIdx}`}
                className="w-full max-w-4xl bg-white shadow-xl p-5 border border-slate-300 print-page space-y-3"
              >
                <div className="no-print flex items-center justify-between text-[10px] font-mono text-slate-400 border-b border-slate-100 pb-1.5">
                  <span>Folha A4 #{pageIdx + 1} de {pages.length}</span>
                  <span>Formato Etiqueta: 12,0 cm (largura) × 10,0 cm (comprimento)</span>
                </div>
                <div className="print-page-grid grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  {pageSpecimens.map((specimen, idx) => (
                    <div key={`${specimen.id}-page-${pageIdx}-copy-${idx}`} className="print-label-item">
                      <BotanicalLabel
                        specimen={specimen}
                        config={config}
                      />
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

        </div>

        {/* FOOTER ACTIONS */}
        <div className="no-print p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 flex items-center justify-between">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-md transition-colors"
          >
            Fechar
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={handleNativePrint}
              className="px-4 py-2 border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200 text-xs font-medium rounded-md transition-colors flex items-center gap-1.5"
            >
              <Printer className="w-4 h-4" />
              <span>Imprimir ({targetSpecimens.length} Etiquetas)</span>
            </button>

            <button
              onClick={handleDownloadPdf}
              disabled={isExportingPdf || targetSpecimens.length === 0}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-md shadow-xs transition-colors flex items-center gap-1.5 disabled:opacity-50"
            >
              <Download className="w-4 h-4" />
              <span>{isExportingPdf ? 'Gerando PDF Vetorial...' : `Baixar PDF (${targetSpecimens.length} Etiquetas)`}</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
