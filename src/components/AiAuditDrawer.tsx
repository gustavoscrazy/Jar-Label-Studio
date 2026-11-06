import React, { useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  ArrowRight,
  Database,
  FileSpreadsheet,
  FileCode,
  Copy,
  Check,
  X,
  RefreshCw,
} from 'lucide-react';
import { Specimen, AuditIssue } from '../types/botanical';
import { generateDatabaseCorrectionReport } from '../utils/botanicalFormatter';

interface AiAuditDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  specimen: Specimen | null;
  onApplyCorrections: (correctedFields: Partial<Specimen>) => void;
  onTriggerAudit: (specimen: Specimen) => Promise<void>;
  isAuditing: boolean;
}

export const AiAuditDrawer: React.FC<AiAuditDrawerProps> = ({
  isOpen,
  onClose,
  specimen,
  onApplyCorrections,
  onTriggerAudit,
  isAuditing,
}) => {
  const [activeTab, setActiveTab] = useState<'issues' | 'database_export'>('issues');
  const [copiedFormat, setCopiedFormat] = useState<string | null>(null);

  if (!isOpen || !specimen) return null;

  const audit = specimen.auditResult;
  const issues = audit?.issues || [];

  const handleCopy = (text: string, format: string) => {
    navigator.clipboard.writeText(text);
    setCopiedFormat(format);
    setTimeout(() => setCopiedFormat(null), 2500);
  };

  const reports = generateDatabaseCorrectionReport(specimen, issues);

  const handleApplyAll = () => {
    if (audit?.suggestedRecord) {
      onApplyCorrections(audit.suggestedRecord);
    } else {
      // Fallback: build record from individual issues
      const partial: Partial<Specimen> = {};
      issues.forEach((i) => {
        if (i.suggestedValue) {
          (partial as any)[i.field] = i.suggestedValue;
        }
      });
      onApplyCorrections(partial);
    }
  };

  const handleApplySingle = (issue: AuditIssue) => {
    onApplyCorrections({ [issue.field]: issue.suggestedValue });
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/40 backdrop-blur-xs transition-opacity">
      <div className="w-full max-w-2xl bg-white dark:bg-slate-900 h-full shadow-2xl flex flex-col border-l border-slate-200 dark:border-slate-800">
        
        {/* MODAL HEADER */}
        <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                Auditoria Taxonômica & Correção por IA
                <span className="text-xs font-mono font-normal text-slate-500">Gemini 3.8 Flash</span>
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Espécime: <span className="font-mono font-medium text-slate-800 dark:text-slate-200">{specimen.catalogNumber}</span> ({specimen.scientificName})
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

        {/* SUBHEADER TABS */}
        <div className="flex border-b border-slate-200 dark:border-slate-800 px-6 bg-slate-50 dark:bg-slate-950/50">
          <button
            onClick={() => setActiveTab('issues')}
            className={`py-3 px-4 text-xs font-medium border-b-2 transition-colors ${
              activeTab === 'issues'
                ? 'border-emerald-600 text-emerald-700 dark:text-emerald-400 font-semibold'
                : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
            }`}
          >
            Inconsistências Detectadas ({issues.length})
          </button>
          <button
            onClick={() => setActiveTab('database_export')}
            className={`py-3 px-4 text-xs font-medium border-b-2 transition-colors flex items-center gap-1.5 ${
              activeTab === 'database_export'
                ? 'border-emerald-600 text-emerald-700 dark:text-emerald-400 font-semibold'
                : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
            }`}
          >
            <Database className="w-3.5 h-3.5" />
            Exportar Correções p/ Banco de Dados
          </button>
        </div>

        {/* CONTENT BODY */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          
          {/* Audit Action Banner */}
          <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800/40 rounded-lg border border-slate-200 dark:border-slate-700">
            <div>
              <p className="text-xs font-medium text-slate-900 dark:text-slate-100">
                {audit ? 'Diagnóstico taxonômico realizado' : 'Aguardando auditoria botânica'}
              </p>
              <p className="text-[11px] text-slate-500">
                {audit ? `Última verificação: ${new Date(audit.auditedAt).toLocaleTimeString('pt-BR')}` : 'Clique para verificar nomenclatura, coordenadas e formatação.'}
              </p>
            </div>

            <button
              onClick={() => onTriggerAudit(specimen)}
              disabled={isAuditing}
              className="inline-flex items-center gap-2 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-medium rounded-md shadow-xs transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isAuditing ? 'animate-spin' : ''}`} />
              {isAuditing ? 'Analisando Espécime...' : 'Reavaliar com IA'}
            </button>
          </div>

          {activeTab === 'issues' && (
            <>
              {/* SUMMARY HIGHLIGHT */}
              {audit && (
                <div
                  className={`p-4 rounded-lg border text-xs leading-relaxed ${
                    audit.hasErrors
                      ? 'bg-amber-50/70 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800/60 text-amber-900 dark:text-amber-200'
                      : 'bg-emerald-50/70 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800/60 text-emerald-900 dark:text-emerald-200'
                  }`}
                >
                  <div className="flex items-start gap-2.5">
                    {audit.hasErrors ? (
                      <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                    ) : (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                    )}
                    <div>
                      <p className="font-semibold mb-1">
                        {audit.hasErrors ? 'Inconsistências Encontradas no Registro' : 'Espécime Botanicamente Válido'}
                      </p>
                      <p className="text-slate-700 dark:text-slate-300">{audit.summary}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* LIST OF ISSUES */}
              {issues.length > 0 ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-between text-xs text-slate-500">
                    <span>
                      {issues.length} {issues.length === 1 ? 'campo precisa' : 'campos precisam'} de revisão:
                    </span>
                    <button
                      onClick={handleApplyAll}
                      className="text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 font-semibold hover:underline"
                    >
                      Aplicar Todas as Correções na Etiqueta
                    </button>
                  </div>

                  {issues.map((issue) => (
                    <div
                      key={issue.id}
                      className="p-4 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 hover:border-slate-300 dark:hover:border-slate-700 transition-colors space-y-3"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-2">
                          {issue.severity === 'critical' ? (
                            <span className="flex items-center gap-1 text-[11px] font-semibold text-rose-700 dark:text-rose-400">
                              <AlertCircle className="w-3.5 h-3.5" />
                              Crítico
                            </span>
                          ) : (
                            <span className="flex items-center gap-1 text-[11px] font-semibold text-amber-700 dark:text-amber-400">
                              <AlertTriangle className="w-3.5 h-3.5" />
                              Alerta
                            </span>
                          )}
                          <span className="text-slate-300 dark:text-slate-700">·</span>
                          <span className="text-xs font-semibold text-slate-900 dark:text-slate-100">
                            {issue.fieldLabel || issue.field}
                          </span>
                        </div>

                        <button
                          onClick={() => handleApplySingle(issue)}
                          className="px-2.5 py-1 text-xs font-medium text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 rounded transition-colors"
                        >
                          Aplicar na Etiqueta
                        </button>
                      </div>

                      {/* Side by side comparison */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs bg-slate-50 dark:bg-slate-950/60 p-3 rounded border border-slate-100 dark:border-slate-800">
                        <div>
                          <span className="text-[10px] uppercase font-mono text-slate-400 block mb-0.5">
                            Valor no Banco de Dados:
                          </span>
                          <span className="line-through text-slate-500 font-mono text-[11px] break-all">
                            {issue.originalValue || '[Vazio]'}
                          </span>
                        </div>

                        <div>
                          <span className="text-[10px] uppercase font-mono text-emerald-600 dark:text-emerald-400 block mb-0.5">
                            Sugestão da IA (Corrigido):
                          </span>
                          <span className="text-slate-900 dark:text-slate-100 font-mono font-medium text-[11px] break-all">
                            {issue.suggestedValue}
                          </span>
                        </div>
                      </div>

                      {/* Scientific rationale */}
                      <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed italic">
                        {issue.reason}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 px-4">
                  <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto mb-3" />
                  <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                    Nenhum erro identificado
                  </h3>
                  <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
                    Os dados deste espécime atendem aos padrões botânicos de nomenclatura, formato geográfico e regras do herbário.
                  </p>
                </div>
              )}
            </>
          )}

          {activeTab === 'database_export' && (
            <div className="space-y-6">
              <div className="p-4 bg-blue-50/70 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900/60 rounded-lg text-xs text-blue-900 dark:text-blue-200">
                <p className="font-semibold mb-1">Feedback para o Banco de Dados Original</p>
                <p className="leading-relaxed">
                  Para manter a integridade dos dados no sistema do herbário (BRAHMS, JABOT, Specify ou planilhas de campo), envie os scripts e planilhas gerados abaixo ao administrador do banco de dados para que os erros sejam corrigidos na fonte.
                </p>
              </div>

              {/* SQL TAB */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-800 dark:text-slate-200">
                    <FileCode className="w-4 h-4 text-slate-500" />
                    <span>Script SQL de Atualização (UPDATE)</span>
                  </div>
                  <button
                    onClick={() => handleCopy(reports.sqlScript, 'sql')}
                    className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded transition-colors"
                  >
                    {copiedFormat === 'sql' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                    {copiedFormat === 'sql' ? 'Copiado!' : 'Copiar SQL'}
                  </button>
                </div>
                <pre className="p-3 bg-slate-950 text-slate-100 text-[11px] font-mono rounded-lg overflow-x-auto max-h-48 border border-slate-800">
                  {reports.sqlScript}
                </pre>
              </div>

              {/* CSV CHANGELOG */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-800 dark:text-slate-200">
                    <FileSpreadsheet className="w-4 h-4 text-slate-500" />
                    <span>Planilha de Auditoria (CSV Changelog)</span>
                  </div>
                  <button
                    onClick={() => handleCopy(reports.csvData, 'csv')}
                    className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded transition-colors"
                  >
                    {copiedFormat === 'csv' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                    {copiedFormat === 'csv' ? 'Copiado!' : 'Copiar CSV'}
                  </button>
                </div>
                <pre className="p-3 bg-slate-100 dark:bg-slate-950 text-slate-800 dark:text-slate-200 text-[11px] font-mono rounded-lg overflow-x-auto max-h-36 border border-slate-200 dark:border-slate-800">
                  {reports.csvData}
                </pre>
              </div>

              {/* MARKDOWN SUMMARY */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                    Relatório Resumido para Curadoria (Markdown)
                  </span>
                  <button
                    onClick={() => handleCopy(reports.markdownSummary, 'md')}
                    className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded transition-colors"
                  >
                    {copiedFormat === 'md' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                    {copiedFormat === 'md' ? 'Copiado!' : 'Copiar Texto'}
                  </button>
                </div>
                <div className="p-3 bg-slate-50 dark:bg-slate-950 text-slate-700 dark:text-slate-300 text-xs rounded-lg border border-slate-200 dark:border-slate-800 max-h-40 overflow-y-auto whitespace-pre-wrap">
                  {reports.markdownSummary}
                </div>
              </div>

            </div>
          )}
        </div>

        {/* MODAL FOOTER */}
        <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 flex items-center justify-between">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-md transition-colors"
          >
            Fechar
          </button>

          {issues.length > 0 && activeTab === 'issues' && (
            <button
              onClick={handleApplyAll}
              className="inline-flex items-center gap-2 px-4 py-2 bg-slate-900 hover:bg-slate-800 dark:bg-slate-100 dark:hover:bg-white text-white dark:text-slate-900 text-xs font-medium rounded-md shadow-sm transition-colors"
            >
              <span>Aplicar {issues.length} Correções na Etiqueta</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

      </div>
    </div>
  );
};
