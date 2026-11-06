import React, { useState, useMemo } from 'react';
import {
  Sparkles,
  Printer,
  Database,
  Plus,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  Clock,
  Download,
  Search,
  BookOpen,
  Eye,
  FileDown,
  FileSpreadsheet,
  RefreshCw,
  HelpCircle,
} from 'lucide-react';

import { Specimen, LabelConfig } from './types/botanical';
import { SAMPLE_SPECIMENS } from './data/sampleSpecimens';
import { Header } from './components/Header';
import { BotanicalLabel } from './components/BotanicalLabel';
import { SpecimenEditor } from './components/SpecimenEditor';
import { AiAuditDrawer } from './components/AiAuditDrawer';
import { ExternalDbModal } from './components/ExternalDbModal';
import { PrintPreviewModal } from './components/PrintPreviewModal';
import { StandardsModal } from './components/StandardsModal';
import { TomboSelectorBar } from './components/TomboSelectorBar';
import { ImportSpreadsheetModal } from './components/ImportSpreadsheetModal';
import { exportSingleLabelPdf, exportSpecimensToPdfSheet } from './utils/pdfGenerator';
import {
  exportDatabaseTable,
  getDuplicateCount,
  expandSpecimensWithDuplicates,
} from './utils/botanicalFormatter';
import { getTomboFilterResult } from './utils/tomboFilter';

export default function App() {
  const [specimens, setSpecimens] = useState<Specimen[]>(SAMPLE_SPECIMENS);
  const [selectedId, setSelectedId] = useState<string>(SAMPLE_SPECIMENS[0]?.id || '');
  const [searchFilter, setSearchFilter] = useState('');
  const [tomboFilterQuery, setTomboFilterQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'errors' | 'clean' | 'pending'>('all');
  const [printQueueIds, setPrintQueueIds] = useState<string[]>([]);

  // Modal & Drawer states
  const [isImportSpreadsheetOpen, setIsImportSpreadsheetOpen] = useState(false);
  const [isAuditDrawerOpen, setIsAuditDrawerOpen] = useState(false);
  const [isExternalDbOpen, setIsExternalDbOpen] = useState(false);
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const [printModalInitialScope, setPrintModalInitialScope] = useState<'all' | 'current' | 'selected' | 'queue'>('all');
  const [isStandardsOpen, setIsStandardsOpen] = useState(false);

  // Auditing state
  const [isAuditingCurrent, setIsAuditingCurrent] = useState(false);
  const [isAuditingBatch, setIsAuditingBatch] = useState(false);
  const [isCheckingFloraBatch, setIsCheckingFloraBatch] = useState(false);

  // Label configuration
  const [labelConfig, setLabelConfig] = useState<LabelConfig>({
    template: 'standard_120x100',
    institutionHeader: 'Herbário José Ângelo Rizzo (JAR)',
    herbariumAcronym: 'JAR',
    subHeader: 'Universidade Estadual de Goiás - Campus Sudoeste: Sede Quirinópolis',
    showQrCode: false,
    showHerbariumSeal: true,
    showBarcode: true,
    showBorders: true,
    fontFamily: 'serif',
    fontScale: 'md',
    labelsPerPage: 4,
    paperSize: 'A4',
  });

  // Tombo query evaluation (suporta tombos avulsos e intervalos separados por ;)
  const tomboResult = useMemo(() => {
    return getTomboFilterResult(specimens, tomboFilterQuery);
  }, [specimens, tomboFilterQuery]);

  // Filtered specimen list
  const filteredSpecimens = specimens.filter((s) => {
    // If tombo filter is active, only include matching tombos
    if (tomboResult.isQueryActive && !tomboResult.matchedIds.has(s.id)) {
      return false;
    }

    const matchesSearch =
      s.scientificName.toLowerCase().includes(searchFilter.toLowerCase()) ||
      s.family.toLowerCase().includes(searchFilter.toLowerCase()) ||
      s.catalogNumber.toLowerCase().includes(searchFilter.toLowerCase()) ||
      s.municipality.toLowerCase().includes(searchFilter.toLowerCase()) ||
      s.recordedBy.toLowerCase().includes(searchFilter.toLowerCase());

    if (!matchesSearch) return false;

    if (statusFilter === 'errors') return s.auditResult?.hasErrors;
    if (statusFilter === 'clean') return s.auditResult && !s.auditResult.hasErrors;
    if (statusFilter === 'pending') return !s.auditResult;

    return true;
  });

  const currentSpecimen =
    specimens.find((s) => s.id === selectedId) ||
    filteredSpecimens[0] ||
    specimens[0] ||
    null;

  // Specimen CRUD
  const handleUpdateSpecimen = (updated: Specimen) => {
    setSpecimens((prev) => prev.map((s) => (s.id === updated.id ? updated : s)));
  };

  const handleAddNewSpecimen = () => {
    const tombo = `JAR${Math.floor(100000 + Math.random() * 900000)}`;
    const newSpecimen: Specimen = {
      id: `specimen-${Date.now()}`,
      // 47 Database Columns
      TOMBO: tombo,
      FAMÍLIA: 'BIGNONIACEAE',
      GÊNERO: 'Handroanthus',
      CF: '',
      ESPÉCIE: 'serratifolius',
      AUTHOR: '(Vahl) S.O.Grose',
      PAÍS: 'Brasil',
      ESTADO: 'Goiás',
      CIDADE: 'Quirinópolis',
      'CAMPO ESPECIFICADO': 'Campus Universitário UEG',
      UC: '',
      LATITUDE: -18.4489,
      LONGITUDE: -50.4519,
      lat_grau: 18,
      lat_min: 26,
      lat_seg: 56,
      ns: 'S',
      long_grau: 50,
      long_min: 27,
      long_seg: 7,
      ew: 'W',
      ALTITUDE: 541,
      UN: 'm',
      'DESCRIÇÃO LOCALIDADE': 'Campus Sudoeste, cerrado rupestre em regeneração',
      FLORES: 'amarelas vistosas, inflorescências apicais',
      FRUTOS: 'ausentes no momento',
      ALTURA: 12,
      'UN ALT': 'm',
      COLETOR: 'G. Soares',
      'Nº COLETA': '1501',
      DIA: 10,
      MÊS: 9,
      ANO: 2024,
      DETERMINAÇÃO: 'José Ângelo Rizzo',
      DIA_DET: 15,
      MÊS_DET: 9,
      ANO_DET: 2024,
      'COLEÇÃO ORIGEM': 'Herbário José Ângelo Rizzo (JAR)',
      'COLEÇÃO DESTINO': 'UB, JAR',
      'QTDE DUPLICATA': 2,
      'OBSERVAÇÃO LOCALIDADE': 'Região Sudoeste Goiano',
      projeto: '',
      HABITAT: 'Cerradão e Campo Sujo',
      HÁBITO: 'Árvore',
      OBS: 'Árvore de grande porte, floração abundante.',
      RESPONSÁVEL: 'G. Soares',
      DATA: new Date().toISOString().slice(0, 10),

      // Unified convenience aliases
      catalogNumber: tombo,
      institutionCode: 'Herbário José Ângelo Rizzo (JAR)',
      herbariumAcronym: 'JAR',
      project: 'Flora do Brasil',
      family: 'BIGNONIACEAE',
      scientificName: 'Handroanthus serratifolius',
      scientificNameAuthorship: '(Vahl) S.O.Grose',
      vernacularName: 'Ipê-amarelo',
      country: 'Brasil',
      stateProvince: 'Minas Gerais',
      municipality: 'Belo Horizonte',
      locality: 'Campus Universitário, mata de galeria preservada',
      latitude: -19.8692,
      longitude: -43.9664,
      datum: 'WGS84',
      elevation: '820 m',
      habitat: 'Floresta Estacional Semidecidual',
      plantDescription: 'Árvore de 14 m de altura com flores amarelas.',
      phenology: 'Floração plena',
      recordedBy: 'G. Soares',
      recordNumber: '1501',
      eventDate: '2024-09-10',
      eventDateFormatted: '10/09/2024',
      identifiedBy: 'Carlos F. Botelho',
      dateIdentified: '15/09/2024',
      duplicates: 'RB, SPF (2 dup.)',
      sourceDatabase: 'Inserção Manual',
      auditStatus: 'pending',
    };

    setSpecimens((prev) => [newSpecimen, ...prev]);
    setSelectedId(newSpecimen.id);
  };

  const handleDeleteSpecimen = (id: string) => {
    const remaining = specimens.filter((s) => s.id !== id);
    setSpecimens(remaining);
    setPrintQueueIds((prev) => prev.filter((itemId) => itemId !== id));
    if (selectedId === id && remaining.length > 0) {
      setSelectedId(remaining[0].id);
    }
  };

  // Print queue management
  const queuedSpecimens = useMemo(() => {
    return printQueueIds
      .map((id) => specimens.find((s) => s.id === id))
      .filter((s): s is Specimen => Boolean(s));
  }, [printQueueIds, specimens]);

  const totalQueuedLabels = useMemo(() => {
    return expandSpecimensWithDuplicates(queuedSpecimens, true).length;
  }, [queuedSpecimens]);

  const togglePrintQueue = (id: string) => {
    setPrintQueueIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const allFilteredInQueue =
    filteredSpecimens.length > 0 &&
    filteredSpecimens.every((s) => printQueueIds.includes(s.id));

  const handleToggleAllFilteredToQueue = () => {
    if (allFilteredInQueue) {
      const filteredSet = new Set(filteredSpecimens.map((s) => s.id));
      setPrintQueueIds((prev) => prev.filter((id) => !filteredSet.has(id)));
    } else {
      setPrintQueueIds((prev) => {
        const next = [...prev];
        for (const s of filteredSpecimens) {
          if (!next.includes(s.id)) {
            next.push(s.id);
          }
        }
        return next;
      });
    }
  };

  const handleOpenPrintQueueModal = () => {
    setPrintModalInitialScope('queue');
    setIsPrintModalOpen(true);
  };

  // Trigger AI audit for a single specimen
  const runAuditForSpecimen = async (specimenToAudit: Specimen) => {
    setIsAuditingCurrent(true);
    try {
      const response = await fetch('/api/gemini/audit-specimen', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ specimen: specimenToAudit }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || data.error || 'Erro na auditoria botânica');
      }

      const auditResult = data.audit;
      const updatedSpecimen: Specimen = {
        ...specimenToAudit,
        auditStatus: auditResult.hasErrors ? 'has_errors' : 'clean',
        auditResult: auditResult,
        floraBrasilResult: data.floraBrasilResult || specimenToAudit.floraBrasilResult,
      };

      handleUpdateSpecimen(updatedSpecimen);
    } catch (err: any) {
      console.error('Audit failed:', err);
    } finally {
      setIsAuditingCurrent(false);
    }
  };

  // Batch verification against Flora e Funga do Brasil (JBRJ) API
  const handleVerifyAllFloraBrasil = async () => {
    const targets = filteredSpecimens.length > 0 ? filteredSpecimens : specimens;
    if (targets.length === 0) return;
    setIsCheckingFloraBatch(true);
    try {
      const res = await fetch('/api/flora-brasil/verify-batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ specimens: targets }),
      });
      const data = await res.json();
      if (data.success && data.resultsById) {
        setSpecimens((prev) =>
          prev.map((s) =>
            data.resultsById[s.id]
              ? { ...s, floraBrasilResult: data.resultsById[s.id] }
              : s
          )
        );
      }
    } catch (err) {
      console.error('Erro na verificação em lote no Flora do Brasil:', err);
    } finally {
      setIsCheckingFloraBatch(false);
    }
  };

  const handleApplyFloraToSpecimen = (spec: Specimen) => {
    const flora = spec.floraBrasilResult;
    if (!flora || !flora.found || !flora.acceptedGenus || !flora.acceptedSpecies) return;
    const cf = spec.CF ? `${spec.CF} ` : '';
    const newSciName = `${flora.acceptedGenus} ${cf}${flora.acceptedSpecies}`.trim();
    const newFamily = (flora.acceptedFamily || spec.FAMÍLIA || spec.family || '').toUpperCase();
    const newAuthor = flora.acceptedAuthor || spec.AUTHOR || '';

    const updated: Specimen = {
      ...spec,
      FAMÍLIA: newFamily,
      family: newFamily,
      GÊNERO: flora.acceptedGenus,
      ESPÉCIE: flora.acceptedSpecies,
      AUTHOR: newAuthor,
      scientificName: newSciName,
      scientificNameAuthorship: newAuthor,
      floraBrasilResult: {
        ...flora,
        isExactMatch: true,
        hasSynonymUpdate: false,
        hasAuthorDiscrepancy: false,
        hasNameDiscrepancy: false,
        hasFamilyDiscrepancy: false,
        summaryMessage: `Nome aceito e autor oficial aplicados conforme Flora e Funga do Brasil (${flora.acceptedGenus} ${flora.acceptedSpecies} ${newAuthor}).`,
      },
    };
    handleUpdateSpecimen(updated);
  };

  // Trigger AI audit for entire collection batch
  const handleAuditAllSpecimens = async () => {
    setIsAuditingBatch(true);
    for (const spec of specimens) {
      try {
        const response = await fetch('/api/gemini/audit-specimen', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ specimen: spec }),
        });
        const data = await response.json();
        if (response.ok && data.audit) {
          setSpecimens((prev) =>
            prev.map((s) =>
              s.id === spec.id
                ? {
                    ...s,
                    auditStatus: data.audit.hasErrors ? 'has_errors' : 'clean',
                    auditResult: data.audit,
                  }
                : s
            )
          );
        }
      } catch (err) {
        console.error('Batch audit error on specimen', spec.id, err);
      }
    }
    setIsAuditingBatch(false);
  };

  // Apply suggested corrections from AI
  const handleApplyCorrections = (corrections: Partial<Specimen>) => {
    if (!currentSpecimen) return;

    const updated: Specimen = {
      ...currentSpecimen,
      ...corrections,
      // If family or coordinates were updated, ensure formatting
      family: corrections.family ? corrections.family.toUpperCase() : currentSpecimen.family,
    };

    // Mark corrected issues as addressed
    if (updated.auditResult) {
      const remainingIssues = updated.auditResult.issues.filter(
        (issue) => !(issue.field in corrections)
      );
      updated.auditResult = {
        ...updated.auditResult,
        issues: remainingIssues,
        hasErrors: remainingIssues.length > 0,
      };
      if (remainingIssues.length === 0) {
        updated.auditStatus = 'clean';
      }
    }

    handleUpdateSpecimen(updated);
  };

  // Export full collection matching the 47 database columns
  const handleExportDatabaseCsv = (format: 'csv' | 'tsv' = 'csv') => {
    const content = exportDatabaseTable(specimens, format);
    const mime = format === 'csv' ? 'text/csv;charset=utf-8;' : 'text/tab-separated-values;charset=utf-8;';
    const ext = format === 'csv' ? 'csv' : 'tsv';
    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `banco_herbario_47_colunas_${new Date().toISOString().slice(0, 10)}.${ext}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Actions specifically for the selected tombos
  const handleOpenPrintSelected = () => {
    setPrintModalInitialScope('selected');
    setIsPrintModalOpen(true);
  };

  const handleAuditSelectedTombos = async () => {
    const targets = tomboResult.isQueryActive ? tomboResult.matchedSpecimens : specimens;
    setIsAuditingBatch(true);
    for (const spec of targets) {
      try {
        const res = await fetch('/api/gemini/audit-specimen', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ specimen: spec }),
        });
        const data = await res.json();
        if (data.success && data.audit) {
          setSpecimens((prev) =>
            prev.map((s) =>
              s.id === spec.id
                ? {
                    ...s,
                    auditResult: data.audit,
                    auditStatus: data.audit.hasErrors ? 'has_errors' : 'clean',
                  }
                : s
            )
          );
        }
      } catch (err) {
        console.error('Audit error for tombo', spec.TOMBO, err);
      }
    }
    setIsAuditingBatch(false);
  };

  const handleExportSelectedTombosCsv = () => {
    const target = tomboResult.isQueryActive ? tomboResult.matchedSpecimens : specimens;
    const content = exportDatabaseTable(target, 'csv');
    const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `tombos_selecionados_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Count metrics
  const errorCount = specimens.filter((s) => s.auditResult?.hasErrors).length;
  const cleanCount = specimens.filter((s) => s.auditResult && !s.auditResult.hasErrors).length;
  const pendingCount = specimens.filter((s) => !s.auditResult).length;

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col font-sans transition-colors">
      <div className="no-print flex-1 flex flex-col">
      {/* 3-ZONE TOP BAR */}
      <Header
        onOpenImportSpreadsheet={() => setIsImportSpreadsheetOpen(true)}
        onOpenExternalDb={() => setIsExternalDbOpen(true)}
        onOpenAuditAll={() => {
          if (currentSpecimen) {
            setIsAuditDrawerOpen(true);
          }
        }}
        onOpenPrintPreview={() => setIsPrintModalOpen(true)}
        onOpenStandards={() => setIsStandardsOpen(true)}
      />

      {/* BOTANICAL TELEMETRY & STATS RIBBON */}
      <div className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800">
        <div className="max-w-7xl mx-auto px-6 py-2.5 flex flex-wrap items-center justify-between gap-4 text-xs">
          
          {/* Metadata badges with clean unboxed text and dot separators */}
          <div className="flex items-center gap-3 text-slate-600 dark:text-slate-400 font-mono tabular-nums">
            <span>
              Total: <strong className="text-slate-900 dark:text-slate-100">{specimens.length}</strong> espécimes
            </span>
            <span aria-hidden="true" className="text-slate-300 dark:text-slate-700">·</span>
            <span className="flex items-center gap-1 text-amber-700 dark:text-amber-400">
              <AlertTriangle className="w-3.5 h-3.5" />
              <strong>{errorCount}</strong> com pendências
            </span>
            <span aria-hidden="true" className="text-slate-300 dark:text-slate-700">·</span>
            <span className="flex items-center gap-1 text-emerald-700 dark:text-emerald-400">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <strong>{cleanCount}</strong> validados
            </span>
            {pendingCount > 0 && (
              <>
                <span aria-hidden="true" className="text-slate-300 dark:text-slate-700">·</span>
                <span className="text-slate-500">
                  {pendingCount} não auditados
                </span>
              </>
            )}
          </div>

        </div>
      </div>

      {/* MAIN SCIENTIFIC WORKSPACE */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-6 space-y-6">

        {/* CAMPO DE SELEÇÃO POR NÚMERO DE TOMBO E INTERVALOS (SEPARADOS POR ;) */}
        <TomboSelectorBar
          query={tomboFilterQuery}
          onChangeQuery={setTomboFilterQuery}
          matchedCount={tomboResult.matchedCount}
          totalCount={specimens.length}
          clauses={tomboResult.clauses}
          onOpenPrintSelected={handleOpenPrintSelected}
          onAuditSelected={handleAuditSelectedTombos}
          onExportSelected={handleExportSelectedTombosCsv}
          isAuditing={isAuditingBatch}
        />

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* LEFT COLUMN: SPECIMEN LIST & EDITOR (7 Cols) */}
          <section className="lg:col-span-7 space-y-6">
          
          {/* COLLECTION LIST PANEL */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-xs">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 mb-3">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={searchFilter}
                  onChange={(e) => setSearchFilter(e.target.value)}
                  placeholder="Buscar por táxon, família, município ou coletor..."
                  className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-md focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>

              {/* Status Segmented Controls */}
              <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-950 rounded-lg shrink-0">
                <button
                  onClick={() => setStatusFilter('all')}
                  className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors ${
                    statusFilter === 'all'
                      ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 shadow-xs'
                      : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-200'
                  }`}
                >
                  Todos ({specimens.length})
                </button>
                <button
                  onClick={() => setStatusFilter('errors')}
                  className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors ${
                    statusFilter === 'errors'
                      ? 'bg-white dark:bg-slate-800 text-amber-700 dark:text-amber-400 shadow-xs'
                      : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-200'
                  }`}
                >
                  Erros ({errorCount})
                </button>
                <button
                  onClick={() => setStatusFilter('clean')}
                  className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors ${
                    statusFilter === 'clean'
                      ? 'bg-white dark:bg-slate-800 text-emerald-700 dark:text-emerald-400 shadow-xs'
                      : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-200'
                  }`}
                >
                  Validados ({cleanCount})
                </button>
              </div>

              <button
                onClick={handleAddNewSpecimen}
                className="px-3 py-1.5 bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 text-xs font-semibold rounded-md hover:bg-slate-800 dark:hover:bg-white transition-colors flex items-center justify-center gap-1 shrink-0"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Novo</span>
              </button>
            </div>

            {/* Select all filtered helper bar + Flora do Brasil Batch Check */}
            {filteredSpecimens.length > 0 && (
              <div className="flex flex-wrap items-center justify-between gap-2 px-2.5 py-1.5 mb-2 bg-slate-50 dark:bg-slate-950/60 border border-slate-200/80 dark:border-slate-800 rounded-lg text-[11px]">
                <label className="flex items-center gap-2 cursor-pointer text-slate-700 dark:text-slate-300 font-medium select-none">
                  <input
                    type="checkbox"
                    checked={allFilteredInQueue}
                    onChange={handleToggleAllFilteredToQueue}
                    className="w-3.5 h-3.5 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                  />
                  <span>
                    Marcar todas na busca para fila de impressão ({filteredSpecimens.length})
                  </span>
                </label>

                <div className="flex items-center gap-2">
                  {queuedSpecimens.length > 0 && (
                    <span className="font-mono font-semibold text-emerald-700 dark:text-emerald-400">
                      {queuedSpecimens.length} na fila
                    </span>
                  )}

                  <button
                    type="button"
                    onClick={handleVerifyAllFloraBrasil}
                    disabled={isCheckingFloraBatch}
                    className="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/70 dark:hover:bg-emerald-900/60 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 rounded-md font-semibold flex items-center gap-1.5 transition-colors disabled:opacity-50"
                    title="Conferir nomes científicos e autores de todas as espécies listadas na API do Flora e Funga do Brasil (JBRJ)"
                  >
                    <RefreshCw className={`w-3 h-3 text-emerald-600 ${isCheckingFloraBatch ? 'animate-spin' : ''}`} />
                    <span>
                      {isCheckingFloraBatch
                        ? 'Consultando Flora do Brasil...'
                        : 'Conferir Nomes e Autores (Flora do Brasil)'}
                    </span>
                  </button>
                </div>
              </div>
            )}

            {/* Specimen Items Scroll List */}
            <div className="max-h-56 overflow-y-auto space-y-1.5 pr-1">
              {filteredSpecimens.map((specimen) => {
                const isSelected = specimen.id === selectedId;
                const isInQueue = printQueueIds.includes(specimen.id);
                const audit = specimen.auditResult;

                return (
                  <div
                    key={specimen.id}
                    onClick={() => setSelectedId(specimen.id)}
                    className={`p-2.5 rounded-lg border text-xs cursor-pointer transition-colors flex items-center justify-between gap-3 ${
                      isSelected
                        ? 'bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-500 text-slate-900 dark:text-slate-100 shadow-xs'
                        : 'bg-white dark:bg-slate-900/60 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    {/* Checkbox to add/remove species from print queue */}
                    <div
                      onClick={(e) => e.stopPropagation()}
                      className="flex items-center shrink-0"
                      title={isInQueue ? 'Remover da fila de impressão de etiquetas' : 'Adicionar à fila de impressão de etiquetas'}
                    >
                      <input
                        type="checkbox"
                        checked={isInQueue}
                        onChange={() => togglePrintQueue(specimen.id)}
                        aria-label={`Adicionar ${specimen.scientificName} à fila de impressão`}
                        className="w-4 h-4 rounded border-slate-300 dark:border-slate-600 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                      />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900 dark:text-slate-100 italic truncate">
                          {specimen.scientificName}
                        </span>
                        <span className="text-[10px] uppercase font-mono text-slate-500 shrink-0">
                          [{specimen.family}]
                        </span>
                        {isInQueue && (
                          <span className="text-[9.5px] font-mono font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-950/80 px-1.5 py-0.5 rounded border border-emerald-300 dark:border-emerald-800 shrink-0">
                            Na Fila
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2 text-[11px] text-slate-500 truncate mt-0.5">
                        <span className="font-mono font-bold text-slate-700 dark:text-slate-300">
                          {specimen.catalogNumber || specimen.TOMBO}
                        </span>
                        {getDuplicateCount(specimen) > 0 && (
                          <span className="text-[9.5px] font-mono font-semibold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.2 rounded border border-slate-200 dark:border-slate-700">
                            +{getDuplicateCount(specimen)} dup. ({1 + getDuplicateCount(specimen)} etiq.)
                          </span>
                        )}
                        {tomboResult.isQueryActive && tomboResult.matchedIds.has(specimen.id) && (
                          <span className="text-[9px] font-mono font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-950/80 px-1 py-0.2 rounded border border-emerald-300 dark:border-emerald-800">
                            Selecionado
                          </span>
                        )}
                        <span>·</span>
                        <span>{specimen.municipality || specimen.stateProvince}</span>
                        <span>·</span>
                        <span>Col.: {specimen.recordedBy} nº {specimen.recordNumber}</span>
                      </div>
                    </div>

                    {/* Flora do Brasil & Audit status badges */}
                    <div className="flex items-center gap-2 shrink-0">
                      {specimen.floraBrasilResult && (
                        specimen.floraBrasilResult.found ? (
                          specimen.floraBrasilResult.isExactMatch ? (
                            <span
                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800"
                              title={specimen.floraBrasilResult.summaryMessage}
                            >
                              <CheckCircle2 className="w-3 h-3" />
                              <span>Flora BR: OK</span>
                            </span>
                          ) : (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleApplyFloraToSpecimen(specimen);
                              }}
                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/70 dark:hover:bg-amber-900 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-800 transition-colors"
                              title={`${specimen.floraBrasilResult.summaryMessage} — Clique para aplicar: ${specimen.floraBrasilResult.acceptedGenus} ${specimen.floraBrasilResult.acceptedSpecies} ${specimen.floraBrasilResult.acceptedAuthor}`}
                            >
                              <AlertTriangle className="w-3 h-3" />
                              <span>
                                {specimen.floraBrasilResult.hasSynonymUpdate
                                  ? `Sinônimo → ${specimen.floraBrasilResult.acceptedGenus} ${specimen.floraBrasilResult.acceptedSpecies}`
                                  : 'Corrigir Nome/Autor (Flora BR)'}
                              </span>
                            </button>
                          )
                        ) : (
                          <span
                            className="text-[10px] font-mono text-slate-400 px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800"
                            title={specimen.floraBrasilResult.summaryMessage}
                          >
                            Não loc. Flora BR
                          </span>
                        )
                      )}

                      {audit ? (
                        audit.hasErrors ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-600 dark:text-amber-400">
                            <AlertTriangle className="w-3.5 h-3.5" />
                            {audit.issues.length} erro(s)
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            Validado
                          </span>
                        )
                      ) : (
                        !specimen.floraBrasilResult && (
                          <span className="text-[10px] text-slate-400 font-mono">
                            Pendente
                          </span>
                        )
                      )}

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteSpecimen(specimen.id);
                        }}
                        className="p-1 text-slate-400 hover:text-rose-600 transition-colors"
                        title="Remover espécime"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}

              {filteredSpecimens.length === 0 && (
                <div className="p-8 text-center text-slate-400 space-y-2">
                  <AlertCircle className="w-8 h-8 mx-auto text-amber-500/70" />
                  <p className="text-xs font-medium text-slate-600 dark:text-slate-400">
                    Nenhum espécime encontrado com os critérios de filtro atuais.
                  </p>
                  {tomboFilterQuery && (
                    <button
                      onClick={() => setTomboFilterQuery('')}
                      className="text-xs text-emerald-600 dark:text-emerald-400 hover:underline font-medium"
                    >
                      Limpar filtro de número de tombo: "{tomboFilterQuery}"
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* CAMPO FILA DE IMPRESSÃO LOGO ABAIXO DO CAMPO DE BUSCA */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-xs space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 rounded-md">
                  <Printer className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-slate-100 flex flex-wrap items-center gap-2">
                    <span>Fila de Impressão de Etiquetas</span>
                    <span className="text-[11px] font-mono font-bold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                      {queuedSpecimens.length} {queuedSpecimens.length === 1 ? 'espécie' : 'espécies'} · {totalQueuedLabels} {totalQueuedLabels === 1 ? 'etiqueta' : 'etiquetas'}
                    </span>
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Cada espécie com duplicatas imprime 1 etiqueta principal + etiquetas adicionais iguais à quantidade de duplicatas.
                  </p>
                </div>
              </div>

              {queuedSpecimens.length > 0 && (
                <div className="flex flex-wrap items-center gap-2 shrink-0">
                  <button
                    onClick={() => setPrintQueueIds([])}
                    className="px-2.5 py-1.5 text-xs font-medium text-slate-600 dark:text-slate-300 hover:text-rose-600 dark:hover:text-rose-400 bg-slate-100 dark:bg-slate-800 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition-colors flex items-center gap-1"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Limpar Fila</span>
                  </button>

                  <button
                    onClick={() => exportSpecimensToPdfSheet(queuedSpecimens, labelConfig, true)}
                    className="px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5 shadow-xs"
                  >
                    <FileDown className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Baixar PDF ({totalQueuedLabels} etiq.)</span>
                  </button>

                  <button
                    onClick={handleOpenPrintQueueModal}
                    className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5 shadow-xs"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    <span>Imprimir Fila ({totalQueuedLabels} etiq.)</span>
                  </button>
                </div>
              )}
            </div>

            {queuedSpecimens.length > 0 ? (
              <div className="max-h-44 overflow-y-auto space-y-1.5 pr-1 pt-1 border-t border-slate-100 dark:border-slate-800">
                {queuedSpecimens.map((spec, index) => {
                  const dupCount = getDuplicateCount(spec);
                  const totalForSpec = 1 + dupCount;
                  return (
                    <div
                      key={spec.id}
                      onClick={() => setSelectedId(spec.id)}
                      className="px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800 hover:border-emerald-400 dark:hover:border-emerald-700 flex items-center justify-between gap-2 text-xs cursor-pointer transition-colors"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className="text-[10px] font-mono font-bold text-slate-400 w-5">
                          #{index + 1}
                        </span>
                        <span className="font-mono font-bold text-emerald-700 dark:text-emerald-400 shrink-0">
                          {spec.catalogNumber || spec.TOMBO}
                        </span>
                        <span className="font-semibold italic text-slate-900 dark:text-slate-100 truncate">
                          {spec.scientificName}
                        </span>
                        <span className="text-[10px] font-mono uppercase text-slate-500 shrink-0 hidden sm:inline">
                          [{spec.family}]
                        </span>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                          {dupCount > 0
                            ? `1 + ${dupCount} dup. = ${totalForSpec} etiquetas`
                            : '1 etiqueta'}
                        </span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            togglePrintQueue(spec.id);
                          }}
                          className="p-1 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 rounded transition-colors"
                          title="Remover da fila de impressão"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="p-4 rounded-lg bg-slate-50 dark:bg-slate-950/50 border border-dashed border-slate-200 dark:border-slate-800 text-center text-xs text-slate-500 dark:text-slate-400">
                Nenhuma espécie adicionada à fila de impressão. Marque a caixa de seleção ao lado das espécies no campo de busca acima para montar sua lista de impressão de etiquetas.
              </div>
            )}
          </div>

          {/* SPECIMEN FULL EDITOR */}
          {currentSpecimen && (
            <SpecimenEditor
              specimen={currentSpecimen}
              onChange={handleUpdateSpecimen}
              onOpenAudit={() => setIsAuditDrawerOpen(true)}
              onTriggerAudit={() => runAuditForSpecimen(currentSpecimen)}
              isAuditing={isAuditingCurrent}
            />
          )}

        </section>

        {/* RIGHT COLUMN: LIVE PRINTABLE LABEL PREVIEW (5 Cols) */}
        <section className="lg:col-span-5 space-y-6">
          
          <div className="sticky top-20 space-y-4">
            
            {/* CARD TITLE & ACTIONS BAR */}
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <span>Pré-visualização da Etiqueta de Excicata</span>
                  <span className="text-[10px] font-mono text-slate-500 uppercase">
                    (12,0 x 10,0 cm)
                  </span>
                </h2>
                <p className="text-xs text-slate-500">
                  Renderização fidedigna nas normas do Herbário José Ângelo Rizzo - JAR
                </p>
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setIsStandardsOpen(true)}
                  className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
                  title="Normas de Herbário"
                >
                  <HelpCircle className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* LIVE BOTANICAL LABEL COMPONENT */}
            {currentSpecimen ? (
              <div className="bg-slate-200 dark:bg-slate-900/60 p-4 rounded-xl border border-slate-300 dark:border-slate-800 flex flex-col items-center shadow-inner">
                <BotanicalLabel
                  specimen={currentSpecimen}
                  config={labelConfig}
                  onOpenAudit={() => setIsAuditDrawerOpen(true)}
                />
              </div>
            ) : (
              <div className="p-8 text-center text-xs text-slate-400 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl">
                Nenhum espécime selecionado
              </div>
            )}

            {/* QUICK ACTIONS FOR THIS SPECIMEN */}
            {currentSpecimen && (
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => exportSingleLabelPdf(currentSpecimen, labelConfig)}
                  className="px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200 text-xs font-semibold rounded-lg transition-colors flex items-center justify-center gap-1.5 shadow-xs"
                >
                  <FileDown className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Baixar PDF Individual</span>
                </button>

                <button
                  onClick={() => setIsPrintModalOpen(true)}
                  className="px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg transition-colors flex items-center justify-center gap-1.5 shadow-xs"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Imprimir em Lote (A4)</span>
                </button>
              </div>
            )}

            {/* EXSICCATA MOUNTING VISUAL REFERENCE CARD */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 space-y-3 shadow-xs">
              <div className="flex items-center justify-between text-xs font-semibold text-slate-800 dark:text-slate-200">
                <span className="flex items-center gap-1.5">
                  <BookOpen className="w-3.5 h-3.5 text-emerald-600" />
                  Montagem da Excicata em Acervo
                </span>
                <span className="text-[11px] font-mono text-slate-400">Cartolina 29x42 cm</span>
              </div>

              <div className="relative rounded-lg overflow-hidden border border-slate-200 dark:border-slate-800 aspect-3/4 max-h-56 bg-slate-50 flex items-center justify-center group">
                <img
                  src="/src/assets/images/botanical_exsiccata_sample_1793938404243.jpg"
                  alt="Espécime de Excicata Botânica"
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover transition-transform group-hover:scale-105 duration-300"
                />
                
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent flex flex-col justify-end p-3 text-white">
                  <p className="text-xs font-bold leading-tight">
                    Posicionamento Arquivístico
                  </p>
                  <p className="text-[10px] text-slate-300 mt-0.5">
                    A etiqueta impressa deve ser colada no canto inferior direito da cartolina de herbário, preservando o ramo prensado e estruturas reprodutivas.
                  </p>
                </div>
              </div>
            </div>

          </div>

        </section>

        </div>
      </main>

      {/* FOOTER */}
      <footer className="border-t border-slate-200 dark:border-slate-800 py-4 px-6 text-center text-xs text-slate-500">
        <p>
          HerbariumLabel Studio · Sistema Científico para Herbários e Coleções Botânicas · Em conformidade com Index Herbariorum & APG IV
        </p>
      </footer>
      </div>

      {/* DRAWERS AND MODALS */}
      <ImportSpreadsheetModal
        isOpen={isImportSpreadsheetOpen}
        onClose={() => setIsImportSpreadsheetOpen(false)}
        onImportSpecimens={(imported, mode) => {
          if (mode === 'replace') {
            setSpecimens(imported);
          } else {
            setSpecimens((prev) => [...imported, ...prev]);
          }
          if (imported.length > 0) {
            setSelectedId(imported[0].id);
          }
        }}
      />

      <AiAuditDrawer
        isOpen={isAuditDrawerOpen}
        onClose={() => setIsAuditDrawerOpen(false)}
        specimen={currentSpecimen}
        onApplyCorrections={handleApplyCorrections}
        onTriggerAudit={runAuditForSpecimen}
        isAuditing={isAuditingCurrent}
      />

      <ExternalDbModal
        isOpen={isExternalDbOpen}
        onClose={() => setIsExternalDbOpen(false)}
        onOpenImportSpreadsheet={() => {
          setIsExternalDbOpen(false);
          setIsImportSpreadsheetOpen(true);
        }}
        onImportSpecimens={(imported) => {
          setSpecimens((prev) => [...imported, ...prev]);
          if (imported.length > 0) {
            setSelectedId(imported[0].id);
          }
        }}
      />

      <PrintPreviewModal
        isOpen={isPrintModalOpen}
        onClose={() => {
          setIsPrintModalOpen(false);
          setPrintModalInitialScope('all');
        }}
        specimens={specimens}
        queuedSpecimens={queuedSpecimens}
        selectedSpecimens={tomboResult.matchedSpecimens}
        currentSpecimen={currentSpecimen}
        config={labelConfig}
        onChangeConfig={setLabelConfig}
        initialScope={printModalInitialScope}
      />

      <StandardsModal
        isOpen={isStandardsOpen}
        onClose={() => setIsStandardsOpen(false)}
      />

    </div>
  );
}
