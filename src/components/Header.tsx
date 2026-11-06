import React from 'react';
import { Printer, FileSpreadsheet } from 'lucide-react';

interface HeaderProps {
  onOpenImportSpreadsheet: () => void;
  onOpenExternalDb: () => void;
  onOpenAuditAll: () => void;
  onOpenPrintPreview: () => void;
  onOpenStandards: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  onOpenImportSpreadsheet,
  onOpenExternalDb,
  onOpenAuditAll,
  onOpenPrintPreview,
  onOpenStandards,
}) => {
  return (
    <header className="sticky top-0 z-40 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 transition-colors">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-8 px-6 py-3.5">
        
        {/* Zone 1: Herbário José Ângelo Rizzo Logo & Brand */}
        <a
          href="#"
          className="whitespace-nowrap shrink-0 flex items-center gap-2.5 group"
        >
          <img
            src="/assets/aistudio/logo_5dd7f3b5.jpg"
            alt="Logo do Herbário José Ângelo Rizzo"
            className="h-10 w-auto object-contain rounded-xs"
          />
          <div className="flex flex-col">
            <span className="leading-tight text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5 group-hover:text-emerald-700 dark:group-hover:text-emerald-400 transition-colors">
              <span>Herbário José Ângelo Rizzo</span>
              <span className="text-[10px] font-mono font-bold bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 px-1.5 py-0.2 rounded border border-emerald-300 dark:border-emerald-700">
                JAR
              </span>
            </span>
            <span className="text-[10px] font-normal text-slate-500 dark:text-slate-400 leading-tight">
              Universidade Estadual de Goiás — Campus Sudoeste: Quirinópolis
            </span>
          </div>
        </a>

        {/* Action buttons from screenshot */}
        <div className="flex items-center gap-2.5 shrink-0">
          <button
            onClick={onOpenImportSpreadsheet}
            className="px-3.5 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5 border border-slate-300 dark:border-slate-700"
            title="Importar planilha de dados (.xlsx, .csv, Google Sheets)"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
            <span>Importar Planilha</span>
          </button>

          <button
            onClick={onOpenPrintPreview}
            className="px-4 py-2 text-xs font-semibold text-white bg-slate-900 dark:bg-emerald-600 hover:bg-slate-800 dark:hover:bg-emerald-700 rounded-lg transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5 shadow-xs"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Imprimir / Exportar PDF</span>
          </button>
        </div>

      </div>
    </header>
  );
};
