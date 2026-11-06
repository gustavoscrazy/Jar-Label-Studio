import React from 'react';
import {
  Hash,
  X,
  Printer,
  Sparkles,
  FileSpreadsheet,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
} from 'lucide-react';
import { TomboClause } from '../utils/tomboFilter';

interface TomboSelectorBarProps {
  query: string;
  onChangeQuery: (newQuery: string) => void;
  matchedCount: number;
  totalCount: number;
  clauses: TomboClause[];
  onOpenPrintSelected: () => void;
  onAuditSelected: () => void;
  onExportSelected: () => void;
  isAuditing?: boolean;
}

export const TomboSelectorBar: React.FC<TomboSelectorBarProps> = ({
  query,
  onChangeQuery,
  matchedCount,
  totalCount,
  clauses,
  onOpenPrintSelected,
  onAuditSelected,
  onExportSelected,
  isAuditing = false,
}) => {
  const hasQuery = query.trim().length > 0;

  const presets = [
    { label: 'Tombo Único (048291)', value: '048291' },
    { label: 'Dois Tombos (048291; 048294)', value: '048291; 048294' },
    { label: 'Intervalo (048291 - 048294)', value: '048291 - 048294' },
    { label: 'Misto: Intervalo + Avulso', value: '048291 - 048293; 048295' },
  ];

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-xs space-y-3 transition-colors">
      
      {/* HEADER & INSTRUCTIONS */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 rounded-md">
            <Hash className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <span>Seleção de Espécies por Número de Tombo</span>
              <span className="text-[10px] font-normal text-slate-500 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full font-mono">
                Separação por ponto e vírgula ( ; )
              </span>
            </h3>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Digite números avulsos, intervalos com hífen (ex: <code className="text-emerald-700 dark:text-emerald-400 font-bold font-mono">048291-048294</code>) ou combinações separadas por ponto e vírgula (<code className="text-emerald-700 dark:text-emerald-400 font-bold font-mono">;</code>).
            </p>
          </div>
        </div>

        {/* STATUS COUNTER */}
        <div className="flex items-center gap-2 shrink-0">
          {hasQuery ? (
            matchedCount > 0 ? (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 font-mono">
                <CheckCircle2 className="w-3.5 h-3.5" />
                {matchedCount} {matchedCount === 1 ? 'espécime selecionado' : 'espécimes selecionados'} ({Math.round((matchedCount / totalCount) * 100)}%)
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800 font-mono">
                <AlertCircle className="w-3.5 h-3.5" />
                Nenhum tombo correspondente
              </span>
            )
          ) : (
            <span className="text-[11px] text-slate-400 font-mono">
              Todos os {totalCount} espécimes listados
            </span>
          )}
        </div>
      </div>

      {/* INPUT FIELD WITH CLEAR BUTTON */}
      <div className="relative flex items-center">
        <div className="absolute left-3.5 text-slate-400">
          <Hash className="w-4 h-4" />
        </div>
        <input
          type="text"
          value={query}
          onChange={(e) => onChangeQuery(e.target.value)}
          placeholder='Digite o número de tombo ou intervalo, separados por ";" — ex: 048291; 048293-048295; JAR048298'
          className="w-full pl-10 pr-24 py-2.5 text-xs sm:text-sm font-mono bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 dark:focus:border-emerald-500 transition-all placeholder:text-slate-400 text-slate-900 dark:text-slate-100"
        />
        {hasQuery && (
          <button
            onClick={() => onChangeQuery('')}
            className="absolute right-2.5 px-2 py-1 text-xs font-medium text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 rounded transition-colors flex items-center gap-1"
            title="Limpar filtro de tombos"
          >
            <X className="w-3 h-3" />
            <span>Limpar</span>
          </button>
        )}
      </div>

      {/* PARSED CLAUSES TAGS & ACTIONS */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-2.5 pt-1">
        {/* PARSED CRITERIA CHIPS */}
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 mr-1">
            Critérios ativos:
          </span>
          {clauses.length > 0 ? (
            clauses.map((c, idx) => (
              <span
                key={idx}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-mono font-medium bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700"
              >
                {c.type === 'range' ? (
                  <>
                    <span className="text-emerald-600 dark:text-emerald-400">Intervalo:</span>{' '}
                    <span>{c.start}</span>
                    <span className="text-slate-400">→</span>
                    <span>{c.end}</span>
                  </>
                ) : (
                  <>
                    <span className="text-blue-600 dark:text-blue-400">Tombo:</span>{' '}
                    <span>{c.value}</span>
                  </>
                )}
              </span>
            ))
          ) : (
            <span className="text-[11px] italic text-slate-400">
              Nenhum filtro de tombo aplicado (exibindo acervo completo)
            </span>
          )}
        </div>

        {/* ACTION BUTTONS WHEN FILTER IS ACTIVE */}
        {hasQuery && matchedCount > 0 && (
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={onOpenPrintSelected}
              className="px-3 py-1.5 text-xs font-semibold text-white bg-slate-900 dark:bg-emerald-600 hover:bg-slate-800 dark:hover:bg-emerald-700 rounded-lg transition-colors flex items-center gap-1.5 shadow-xs"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Imprimir Selecionados ({matchedCount})</span>
            </button>

            <button
              onClick={onAuditSelected}
              disabled={isAuditing}
              className="px-3 py-1.5 text-xs font-semibold text-emerald-800 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-950/60 hover:bg-emerald-200 dark:hover:bg-emerald-900 border border-emerald-300 dark:border-emerald-800 rounded-lg transition-colors flex items-center gap-1.5 disabled:opacity-50"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>{isAuditing ? 'Auditando...' : `Auditar com IA (${matchedCount})`}</span>
            </button>

            <button
              onClick={onExportSelected}
              className="px-2.5 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-300 dark:border-slate-700 rounded-lg transition-colors flex items-center gap-1"
              title="Exportar planilha CSV com os 47 campos apenas dos espécimes selecionados"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
              <span>Planilha ({matchedCount})</span>
            </button>
          </div>
        )}
      </div>

      {/* QUICK PRESETS / SHORTCUTS */}
      <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-slate-100 dark:border-slate-800 text-[11px]">
        <span className="text-slate-400 flex items-center gap-1">
          <HelpCircle className="w-3 h-3" />
          Exemplos rápidos de teste:
        </span>
        {presets.map((preset, idx) => (
          <button
            key={idx}
            onClick={() => onChangeQuery(preset.value)}
            className={`px-2 py-0.5 rounded border transition-colors ${
              query === preset.value
                ? 'bg-emerald-50 dark:bg-emerald-950 border-emerald-500 text-emerald-700 dark:text-emerald-300 font-semibold'
                : 'bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-slate-400'
            }`}
          >
            {preset.label}: <code className="font-mono text-emerald-600 dark:text-emerald-400">{preset.value}</code>
          </button>
        ))}
      </div>

    </div>
  );
};
