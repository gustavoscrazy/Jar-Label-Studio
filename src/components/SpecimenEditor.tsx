import React, { useState } from 'react';
import {
  Sparkles,
  AlertTriangle,
  CheckCircle2,
  RotateCcw,
  Compass,
  Calendar,
  Layers,
  MapPin,
  Tag,
  BookOpen,
  Info,
  Search,
  ExternalLink,
  Check,
  RefreshCw,
} from 'lucide-react';
import { Specimen, FloraBrasilValidationResult } from '../types/botanical';
import { decimalToDms } from '../utils/botanicalFormatter';

interface SpecimenEditorProps {
  specimen: Specimen;
  onChange: (updated: Specimen) => void;
  onOpenAudit: () => void;
  onTriggerAudit: () => void;
  isAuditing: boolean;
}

export const SpecimenEditor: React.FC<SpecimenEditorProps> = ({
  specimen,
  onChange,
  onOpenAudit,
  onTriggerAudit,
  isAuditing,
}) => {
  const updateField = (field: string, value: any) => {
    const updated: any = {
      ...specimen,
      [field]: value,
    };

    // Keep convenience aliases synced
    if (field === 'TOMBO') updated.catalogNumber = value;
    if (field === 'FAMÍLIA') updated.family = value;
    if (field === 'AUTHOR') updated.scientificNameAuthorship = value;
    if (field === 'PAÍS') updated.country = value;
    if (field === 'ESTADO') updated.stateProvince = value;
    if (field === 'CIDADE') updated.municipality = value;
    if (field === 'COLETOR') updated.recordedBy = value;
    if (field === 'Nº COLETA') updated.recordNumber = value;
    if (field === 'HABITAT') updated.habitat = value;
    if (field === 'OBS') updated.plantDescription = value;
    if (field === 'DESCRIÇÃO LOCALIDADE') updated.locality = value;

    if (field === 'GÊNERO' || field === 'ESPÉCIE' || field === 'CF') {
      const g = field === 'GÊNERO' ? value : (specimen.GÊNERO || '');
      const cf = field === 'CF' ? value : (specimen.CF || '');
      const sp = field === 'ESPÉCIE' ? value : (specimen.ESPÉCIE || '');
      updated.scientificName = `${g} ${cf ? cf + ' ' : ''}${sp}`.trim();
    }

    if (field === 'DIA' || field === 'MÊS' || field === 'ANO') {
      const d = field === 'DIA' ? value : specimen.DIA;
      const m = field === 'MÊS' ? value : specimen.MÊS;
      const y = field === 'ANO' ? value : specimen.ANO;
      if (y && m && d) {
        updated.eventDate = `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      }
      updated.eventDateFormatted = [
        d ? String(d).padStart(2, '0') : '',
        m ? String(m).padStart(2, '0') : '',
        y ? String(y) : '',
      ]
        .filter(Boolean)
        .join('/');
    }

    if (field === 'DIA_DET' || field === 'MÊS_DET' || field === 'ANO_DET') {
      const dDet = field === 'DIA_DET' ? value : specimen.DIA_DET;
      const mDet = field === 'MÊS_DET' ? value : specimen.MÊS_DET;
      const yDet = field === 'ANO_DET' ? value : specimen.ANO_DET;
      updated.dateIdentified = [
        dDet ? String(dDet).padStart(2, '0') : '',
        mDet ? String(mDet).padStart(2, '0') : '',
        yDet ? String(yDet) : '',
      ]
        .filter(Boolean)
        .join('/');
    }

    onChange(updated);
  };

  const [isCheckingFloraBrasil, setIsCheckingFloraBrasil] = useState(false);

  const handleCheckFloraBrasil = async () => {
    setIsCheckingFloraBrasil(true);
    try {
      const res = await fetch('/api/flora-brasil/verify-taxon', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          genus: specimen.GÊNERO,
          species: specimen.ESPÉCIE,
          scientificName: specimen.scientificName,
          author: specimen.AUTHOR || specimen.scientificNameAuthorship,
          family: specimen.FAMÍLIA || specimen.family,
        }),
      });
      const data = await res.json();
      if (data.success && data.result) {
        onChange({
          ...specimen,
          floraBrasilResult: data.result,
        });
      }
    } catch (err) {
      console.error('Erro ao consultar Flora e Funga do Brasil:', err);
    } finally {
      setIsCheckingFloraBrasil(false);
    }
  };

  const handleApplyFloraAccepted = (flora: FloraBrasilValidationResult) => {
    if (!flora.acceptedGenus || !flora.acceptedSpecies) return;
    const cf = specimen.CF ? `${specimen.CF} ` : '';
    const newSciName = `${flora.acceptedGenus} ${cf}${flora.acceptedSpecies}`.trim();
    const newFamily = (flora.acceptedFamily || specimen.FAMÍLIA || specimen.family || '').toUpperCase();
    const newAuthor = flora.acceptedAuthor || specimen.AUTHOR || '';

    const updatedFlora: FloraBrasilValidationResult = {
      ...flora,
      isExactMatch: true,
      hasSynonymUpdate: false,
      hasAuthorDiscrepancy: false,
      hasNameDiscrepancy: false,
      hasFamilyDiscrepancy: false,
      summaryMessage: `Nome aceito e autor oficial aplicados conforme Flora e Funga do Brasil (${flora.acceptedGenus} ${flora.acceptedSpecies} ${newAuthor}).`,
    };

    onChange({
      ...specimen,
      FAMÍLIA: newFamily,
      family: newFamily,
      GÊNERO: flora.acceptedGenus,
      ESPÉCIE: flora.acceptedSpecies,
      AUTHOR: newAuthor,
      scientificName: newSciName,
      scientificNameAuthorship: newAuthor,
      floraBrasilResult: updatedFlora,
    });
  };

  const handleApplyFloraMatchedOriginal = (flora: FloraBrasilValidationResult) => {
    if (!flora.matchedGenus || !flora.matchedSpecies) return;
    const cf = specimen.CF ? `${specimen.CF} ` : '';
    const newSciName = `${flora.matchedGenus} ${cf}${flora.matchedSpecies}`.trim();
    const newFamily = (flora.matchedFamily || specimen.FAMÍLIA || specimen.family || '').toUpperCase();
    const newAuthor = flora.matchedAuthor || specimen.AUTHOR || '';

    onChange({
      ...specimen,
      FAMÍLIA: newFamily,
      family: newFamily,
      GÊNERO: flora.matchedGenus,
      ESPÉCIE: flora.matchedSpecies,
      AUTHOR: newAuthor,
      scientificName: newSciName,
      scientificNameAuthorship: newAuthor,
    });
  };

  const audit = specimen.auditResult;
  const floraCheck = specimen.floraBrasilResult;

  // Swap latitude and longitude
  const handleSwapCoordinates = () => {
    const lat = specimen.LATITUDE;
    const lng = specimen.LONGITUDE;
    onChange({
      ...specimen,
      LATITUDE: lng,
      LONGITUDE: lat,
      latitude: lng,
      longitude: lat,
    });
  };

  // Ensure negative sign for Western longitude in Brazil
  const handleFixNegativeLongitude = () => {
    const num = parseFloat(String(specimen.LONGITUDE));
    if (!isNaN(num) && num > 0) {
      updateField('LONGITUDE', -num);
      updateField('ew', 'W');
    }
  };

  // Sync DMS from decimal coordinates
  const handleSyncDmsFromDecimal = () => {
    const lat = parseFloat(String(specimen.LATITUDE));
    const lng = parseFloat(String(specimen.LONGITUDE));

    if (!isNaN(lat) && !isNaN(lng)) {
      const dmsLat = decimalToDms(lat, true);
      const dmsLng = decimalToDms(lng, false);

      onChange({
        ...specimen,
        lat_grau: dmsLat.deg,
        lat_min: dmsLat.min,
        lat_seg: dmsLat.sec,
        ns: dmsLat.dir,
        long_grau: dmsLng.deg,
        long_min: dmsLng.min,
        long_seg: dmsLng.sec,
        ew: dmsLng.dir,
      });
    }
  };

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 space-y-6 shadow-xs">
      
      {/* AI AUDIT STATUS BANNER */}
      <div className="p-4 rounded-lg border bg-slate-50 dark:bg-slate-950/60 border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          {audit ? (
            audit.hasErrors ? (
              <div className="p-2 bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-400 rounded-lg shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
            ) : (
              <div className="p-2 bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400 rounded-lg shrink-0">
                <CheckCircle2 className="w-5 h-5" />
              </div>
            )
          ) : (
            <div className="p-2 bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-lg shrink-0">
              <Sparkles className="w-5 h-5" />
            </div>
          )}

          <div>
            <p className="text-xs font-semibold text-slate-900 dark:text-slate-100">
              {audit
                ? audit.hasErrors
                  ? `IA identificou ${audit.issues.length} inconsistência(s) nas colunas do banco de dados`
                  : 'Espécime aprovado na validação botânica'
                : 'Auditoria taxonômica por IA pendente'}
            </p>
            <p className="text-[11px] text-slate-500">
              {audit
                ? audit.summary
                : 'Analisa ortografia do epíteto, família botânica, formato de data e coerência de coordenadas.'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {audit && audit.issues.length > 0 && (
            <button
              onClick={onOpenAudit}
              className="px-3 py-1.5 text-xs font-medium text-amber-700 dark:text-amber-400 hover:bg-amber-100 dark:hover:bg-amber-950/40 border border-amber-300 dark:border-amber-800 rounded-md transition-colors"
            >
              Ver e Corrigir ({audit.issues.length})
            </button>
          )}

          <button
            onClick={onTriggerAudit}
            disabled={isAuditing}
            className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-md shadow-xs transition-colors flex items-center gap-1.5 disabled:opacity-50"
          >
            <Sparkles className={`w-3.5 h-3.5 ${isAuditing ? 'animate-spin' : ''}`} />
            <span>{isAuditing ? 'Auditando...' : 'Auditar com IA'}</span>
          </button>
        </div>
      </div>

      {/* SECTION 1: TOMBO, PROJETO E COLEÇÕES */}
      <div className="space-y-4">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
          <Layers className="w-3.5 h-3.5" />
          1. Identificação do Banco de Dados & Tombo
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
          <div className="space-y-1">
            <label className="text-xs font-medium text-slate-700 dark:text-slate-300 font-mono">
              SIGLA DO HERBÁRIO (FIXA)
            </label>
            <input
              type="text"
              value="JAR"
              readOnly
              className="w-full px-3 py-1.5 text-xs font-mono font-bold uppercase bg-slate-100 dark:bg-slate-900 text-slate-600 dark:text-slate-400 border border-slate-300 dark:border-slate-700 rounded-md cursor-not-allowed"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium text-slate-700 dark:text-slate-300 font-mono">
              TOMBO (Nº)
            </label>
            <input
              type="text"
              value={specimen.TOMBO || specimen.catalogNumber || ''}
              onChange={(e) => updateField('TOMBO', e.target.value)}
              placeholder="ex: 048291 ou JAR048291"
              className="w-full px-3 py-1.5 text-xs font-mono font-bold bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-md focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
          </div>

          <div className="sm:col-span-2 space-y-1">
            <label className="text-xs font-medium text-slate-700 dark:text-slate-300 font-mono">
              NOME DO HERBÁRIO (FIXO)
            </label>
            <input
              type="text"
              value="Herbário José Ângelo Rizzo (JAR)"
              readOnly
              className="w-full px-3 py-1.5 text-xs font-semibold bg-slate-100 dark:bg-slate-900 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-700 rounded-md cursor-not-allowed"
            />
          </div>

          <div className="sm:col-span-3 space-y-1">
            <label className="text-xs font-medium text-slate-700 dark:text-slate-300 font-mono">
              COLEÇÃO DESTINO
            </label>
            <input
              type="text"
              value={specimen['COLEÇÃO DESTINO'] || specimen.duplicates || ''}
              onChange={(e) => updateField('COLEÇÃO DESTINO', e.target.value)}
              placeholder="ex: RB, SPF, UB, NY"
              className="w-full px-3 py-1.5 text-xs font-mono bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-md focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium text-slate-700 dark:text-slate-300 font-mono">
              QTDE DUPLICATA
            </label>
            <input
              type="number"
              value={specimen['QTDE DUPLICATA'] || ''}
              onChange={(e) => updateField('QTDE DUPLICATA', e.target.value)}
              placeholder="ex: 4"
              className="w-full px-3 py-1.5 text-xs font-mono bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-md focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium text-slate-700 dark:text-slate-300 font-mono">
              RESPONSÁVEL
            </label>
            <input
              type="text"
              value={specimen.RESPONSÁVEL || ''}
              onChange={(e) => updateField('RESPONSÁVEL', e.target.value)}
              placeholder="Nome do digitador"
              className="w-full px-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-md focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
          </div>
        </div>
      </div>

      {/* SECTION 2: TAXONOMIA E NOMENCLATURA */}
      <div className="space-y-4 pt-3 border-t border-slate-200 dark:border-slate-800">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
            <BookOpen className="w-3.5 h-3.5" />
            2. Nomenclatura Taxonômica (Colunas Taxonômicas)
          </h3>

          <button
            type="button"
            onClick={handleCheckFloraBrasil}
            disabled={isCheckingFloraBrasil}
            className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/60 dark:hover:bg-emerald-900/60 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 text-xs font-semibold rounded-md transition-colors flex items-center gap-1.5 shadow-2xs disabled:opacity-50"
            title="Consulta em tempo real a API REST oficial do Jardim Botânico do Rio de Janeiro (servicos.jbrj.gov.br/v2/flora)"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-emerald-600 ${isCheckingFloraBrasil ? 'animate-spin' : ''}`} />
            <span>
              {isCheckingFloraBrasil
                ? 'Consultando Flora e Funga do Brasil...'
                : 'Conferir no Flora e Funga do Brasil (JBRJ)'}
            </span>
          </button>
        </div>

        {/* FLORA E FUNGA DO BRASIL VERIFICATION RESULT CARD */}
        {floraCheck && (
          <div
            className={`p-3.5 rounded-lg border text-xs space-y-2.5 ${
              !floraCheck.found
                ? 'bg-slate-50 dark:bg-slate-950 border-slate-300 dark:border-slate-800 text-slate-700 dark:text-slate-300'
                : floraCheck.isExactMatch
                ? 'bg-emerald-50/70 dark:bg-emerald-950/30 border-emerald-300 dark:border-emerald-800 text-slate-800 dark:text-slate-200'
                : 'bg-amber-50/70 dark:bg-amber-950/30 border-amber-300 dark:border-amber-800 text-slate-800 dark:text-slate-200'
            }`}
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-bold uppercase tracking-wider text-[10px] px-2 py-0.5 rounded bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 font-mono text-emerald-700 dark:text-emerald-400">
                  Flora e Funga do Brasil · JBRJ
                </span>

                {floraCheck.found ? (
                  floraCheck.isExactMatch ? (
                    <span className="inline-flex items-center gap-1 font-semibold text-emerald-700 dark:text-emerald-400">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Nome Aceito e Autor Confirmados
                    </span>
                  ) : floraCheck.hasSynonymUpdate ? (
                    <span className="inline-flex items-center gap-1 font-semibold text-amber-800 dark:text-amber-300">
                      <AlertTriangle className="w-3.5 h-3.5" />
                      Sinônimo Taxonômico Detectado
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 font-semibold text-amber-800 dark:text-amber-300">
                      <AlertTriangle className="w-3.5 h-3.5" />
                      Divergência de Autor, Grafia ou Família
                    </span>
                  )
                ) : (
                  <span className="inline-flex items-center gap-1 font-semibold text-slate-600 dark:text-slate-400">
                    <Info className="w-3.5 h-3.5" />
                    Não localizado na base nacional
                  </span>
                )}
              </div>

              {floraCheck.refloraUrl && (
                <a
                  href={floraCheck.refloraUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-700 dark:text-emerald-400 hover:underline shrink-0"
                >
                  <span>Ficha Reflora (FB{floraCheck.acceptedTaxonId || floraCheck.taxonId})</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              )}
            </div>

            <p className="text-[11.5px] leading-relaxed text-slate-700 dark:text-slate-300">
              {floraCheck.summaryMessage}
            </p>

            {floraCheck.found && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                {/* Current Specimen Values */}
                <div className="p-2.5 rounded bg-white/80 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 space-y-1">
                  <span className="text-[10px] font-mono uppercase font-bold text-slate-400 block">
                    Atual na Etiqueta
                  </span>
                  <div className="text-xs">
                    <span className="font-bold uppercase font-mono text-[11px] text-slate-600 dark:text-slate-400 mr-1.5">
                      [{specimen.FAMÍLIA || specimen.family || '—'}]
                    </span>
                    <span className="italic font-semibold text-slate-900 dark:text-slate-100">
                      {specimen.GÊNERO} {specimen.ESPÉCIE}
                    </span>{' '}
                    <span className="text-slate-700 dark:text-slate-300">
                      {specimen.AUTHOR || specimen.scientificNameAuthorship || '(sem autor)'}
                    </span>
                  </div>
                </div>

                {/* Official Flora e Funga do Brasil Accepted Record */}
                <div className="p-2.5 rounded bg-white dark:bg-slate-900 border border-emerald-200 dark:border-emerald-900/70 space-y-1">
                  <span className="text-[10px] font-mono uppercase font-bold text-emerald-700 dark:text-emerald-400 block">
                    Oficial no Flora e Funga do Brasil (Nome Aceito)
                  </span>
                  <div className="text-xs">
                    <span className="font-bold uppercase font-mono text-[11px] text-emerald-700 dark:text-emerald-400 mr-1.5">
                      [{floraCheck.acceptedFamily || '—'}]
                    </span>
                    <span className="italic font-bold text-slate-900 dark:text-slate-100">
                      {floraCheck.acceptedGenus} {floraCheck.acceptedSpecies}
                    </span>{' '}
                    <span className="font-semibold text-slate-800 dark:text-slate-200">
                      {floraCheck.acceptedAuthor}
                    </span>
                  </div>
                  {floraCheck.hasSynonymUpdate && (
                    <div className="text-[10.5px] text-slate-500 pt-0.5">
                      Sinônimo consultado: <em className="font-medium">{floraCheck.matchedGenus} {floraCheck.matchedSpecies}</em> {floraCheck.matchedAuthor}
                    </div>
                  )}
                </div>
              </div>
            )}

            {floraCheck.found && !floraCheck.isExactMatch && (
              <div className="flex flex-wrap items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => handleApplyFloraAccepted(floraCheck)}
                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-md transition-colors flex items-center gap-1.5 shadow-2xs"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>
                    Aplicar Nome Aceito e Autor ({floraCheck.acceptedGenus} {floraCheck.acceptedSpecies} {floraCheck.acceptedAuthor})
                  </span>
                </button>

                {floraCheck.hasSynonymUpdate && (
                  <button
                    type="button"
                    onClick={() => handleApplyFloraMatchedOriginal(floraCheck)}
                    className="px-2.5 py-1.5 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-700 text-xs font-medium rounded-md transition-colors"
                  >
                    Manter Sinônimo e Usar Autor ({floraCheck.matchedGenus} {floraCheck.matchedSpecies} {floraCheck.matchedAuthor})
                  </button>
                )}
              </div>
            )}
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-6 gap-3">
          <div className="sm:col-span-2 space-y-1">
            <div className="flex items-center justify-between">
              <label className="text-xs font-medium text-slate-700 dark:text-slate-300 font-mono">
                FAMÍLIA (-ACEAE)
              </label>
              <button
                type="button"
                onClick={() => updateField('FAMÍLIA', (specimen.FAMÍLIA || specimen.family || '').toUpperCase())}
                className="text-[10px] text-emerald-600 hover:underline"
              >
                MAIÚSCULAS
              </button>
            </div>
            <input
              type="text"
              value={specimen.FAMÍLIA || specimen.family || ''}
              onChange={(e) => updateField('FAMÍLIA', e.target.value)}
              placeholder="ex: BIGNONIACEAE"
              className="w-full px-3 py-1.5 text-xs font-bold uppercase bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-md focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
          </div>

          <div className="sm:col-span-2 space-y-1">
            <label className="text-xs font-medium text-slate-700 dark:text-slate-300 font-mono">
              GÊNERO
            </label>
            <input
              type="text"
              value={specimen.GÊNERO || ''}
              onChange={(e) => updateField('GÊNERO', e.target.value)}
              placeholder="ex: Handroanthus"
              className="w-full px-3 py-1.5 text-xs italic font-semibold bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-md focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium text-slate-700 dark:text-slate-300 font-mono">
              CF
            </label>
            <input
              type="text"
              value={specimen.CF || ''}
              onChange={(e) => updateField('CF', e.target.value)}
              placeholder="cf. / aff."
              className="w-full px-3 py-1.5 text-xs font-mono bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-md focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
          </div>

          <div className="sm:col-span-2 space-y-1">
            <label className="text-xs font-medium text-slate-700 dark:text-slate-300 font-mono">
              ESPÉCIE (Epíteto)
            </label>
            <input
              type="text"
              value={specimen.ESPÉCIE || ''}
              onChange={(e) => updateField('ESPÉCIE', e.target.value)}
              placeholder="ex: chrysotrichus"
              className="w-full px-3 py-1.5 text-xs italic font-medium bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-md focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
          </div>

          <div className="sm:col-span-3 space-y-1">
            <label className="text-xs font-medium text-slate-700 dark:text-slate-300 font-mono">
              AUTHOR (Autoria Flora do Brasil / IPNI)
            </label>
            <input
              type="text"
              value={specimen.AUTHOR || specimen.scientificNameAuthorship || ''}
              onChange={(e) => updateField('AUTHOR', e.target.value)}
              placeholder="ex: (Mart. ex DC.) Mattos"
              className="w-full px-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-md focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
          </div>
        </div>
      </div>

      {/* SECTION 3: GEOGRAFIA E COORDENADAS */}
      <div className="space-y-4 pt-3 border-t border-slate-200 dark:border-slate-800">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
            <MapPin className="w-3.5 h-3.5" />
            3. Localidade Geográfica & Coordenadas (GMS e Decimais)
          </h3>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleSyncDmsFromDecimal}
              className="text-[11px] text-slate-600 dark:text-slate-400 hover:text-emerald-600 flex items-center gap-1"
              title="Calcula lat_grau, min, seg a partir de LATITUDE e LONGITUDE"
            >
              <Compass className="w-3 h-3" />
              Sincronizar GMS
            </button>
            <button
              type="button"
              onClick={handleSwapCoordinates}
              className="text-[11px] text-slate-600 dark:text-slate-400 hover:text-emerald-600 flex items-center gap-1"
              title="Troca os valores de latitude e longitude"
            >
              <RotateCcw className="w-3 h-3" />
              Inverter Lat/Long
            </button>
            <button
              type="button"
              onClick={handleFixNegativeLongitude}
              className="text-[11px] text-slate-600 dark:text-slate-400 hover:text-emerald-600 flex items-center gap-1"
              title="Aplica sinal negativo na longitude ocidental"
            >
              <Compass className="w-3 h-3" />
              Long. Negativa (-)
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="space-y-1">
            <label className="text-xs font-medium text-slate-700 dark:text-slate-300 font-mono">
              PAÍS
            </label>
            <input
              type="text"
              value={specimen.PAÍS || specimen.country || 'Brasil'}
              onChange={(e) => updateField('PAÍS', e.target.value)}
              className="w-full px-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-md"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium text-slate-700 dark:text-slate-300 font-mono">
              ESTADO
            </label>
            <input
              type="text"
              value={specimen.ESTADO || specimen.stateProvince || ''}
              onChange={(e) => updateField('ESTADO', e.target.value)}
              className="w-full px-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-md"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium text-slate-700 dark:text-slate-300 font-mono">
              CIDADE
            </label>
            <input
              type="text"
              value={specimen.CIDADE || specimen.municipality || ''}
              onChange={(e) => updateField('CIDADE', e.target.value)}
              className="w-full px-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-md"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium text-slate-700 dark:text-slate-300 font-mono">
              UC (X = Sim | vazio = Não | ou nome)
            </label>
            <input
              type="text"
              value={specimen.UC || ''}
              onChange={(e) => updateField('UC', e.target.value)}
              placeholder="X (para Sim), vazio (Não) ou nome da UC"
              className="w-full px-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-md"
            />
          </div>

          <div className="sm:col-span-2 space-y-1">
            <label className="text-xs font-medium text-slate-700 dark:text-slate-300 font-mono">
              CAMPO ESPECIFICADO (Áreas)
            </label>
            <input
              type="text"
              value={specimen['CAMPO ESPECIFICADO'] || ''}
              onChange={(e) => updateField('CAMPO ESPECIFICADO', e.target.value)}
              placeholder="ex: Serra do Cipó / Fazenda Santa Rita"
              className="w-full px-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-md"
            />
          </div>

          <div className="sm:col-span-3 space-y-1">
            <label className="text-xs font-medium text-slate-700 dark:text-slate-300 font-mono">
              DESCRIÇÃO LOCALIDADE
            </label>
            <input
              type="text"
              value={specimen['DESCRIÇÃO LOCALIDADE'] || specimen.locality || ''}
              onChange={(e) => updateField('DESCRIÇÃO LOCALIDADE', e.target.value)}
              placeholder="ex: km 112 da rodovia MG-010, encosta rochosa"
              className="w-full px-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-md"
            />
          </div>

          {/* Decimais */}
          <div className="space-y-1">
            <label className="text-xs font-medium text-slate-700 dark:text-slate-300 font-mono">
              LATITUDE (Decimal)
            </label>
            <input
              type="text"
              value={specimen.LATITUDE || ''}
              onChange={(e) => updateField('LATITUDE', e.target.value)}
              placeholder="ex: -19.2847"
              className="w-full px-3 py-1.5 text-xs font-mono bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-md"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium text-slate-700 dark:text-slate-300 font-mono">
              LONGITUDE (Decimal)
            </label>
            <input
              type="text"
              value={specimen.LONGITUDE || ''}
              onChange={(e) => updateField('LONGITUDE', e.target.value)}
              placeholder="ex: -43.5912"
              className="w-full px-3 py-1.5 text-xs font-mono bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-md"
            />
          </div>

          <div className="flex gap-2">
            <div className="flex-1 space-y-1">
              <label className="text-xs font-medium text-slate-700 dark:text-slate-300 font-mono">
                ALTITUDE
              </label>
              <input
                type="text"
                value={specimen.ALTITUDE || specimen.elevation || ''}
                onChange={(e) => updateField('ALTITUDE', e.target.value)}
                placeholder="ex: 1180"
                className="w-full px-3 py-1.5 text-xs font-mono bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-md"
              />
            </div>
            <div className="w-16 space-y-1">
              <label className="text-xs font-medium text-slate-700 dark:text-slate-300 font-mono">
                UN
              </label>
              <input
                type="text"
                value={specimen.UN || 'm'}
                onChange={(e) => updateField('UN', e.target.value)}
                placeholder="m"
                className="w-full px-2 py-1.5 text-xs font-mono bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-md"
              />
            </div>
          </div>

          {/* GMS fields */}
          <div className="sm:col-span-3 bg-slate-50 dark:bg-slate-950 p-3 rounded-lg border border-slate-200 dark:border-slate-800 space-y-2">
            <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 block">
              Coordenadas GMS (Grau, Minuto, Segundo):
            </span>
            <div className="grid grid-cols-4 sm:grid-cols-8 gap-2">
              <div>
                <label className="text-[10px] font-mono text-slate-500">lat_grau</label>
                <input
                  type="text"
                  value={specimen.lat_grau ?? ''}
                  onChange={(e) => updateField('lat_grau', e.target.value)}
                  className="w-full px-2 py-1 text-xs font-mono bg-white dark:bg-slate-900 border rounded"
                />
              </div>
              <div>
                <label className="text-[10px] font-mono text-slate-500">lat_min</label>
                <input
                  type="text"
                  value={specimen.lat_min ?? ''}
                  onChange={(e) => updateField('lat_min', e.target.value)}
                  className="w-full px-2 py-1 text-xs font-mono bg-white dark:bg-slate-900 border rounded"
                />
              </div>
              <div>
                <label className="text-[10px] font-mono text-slate-500">lat_seg</label>
                <input
                  type="text"
                  value={specimen.lat_seg ?? ''}
                  onChange={(e) => updateField('lat_seg', e.target.value)}
                  className="w-full px-2 py-1 text-xs font-mono bg-white dark:bg-slate-900 border rounded"
                />
              </div>
              <div>
                <label className="text-[10px] font-mono text-slate-500">ns</label>
                <input
                  type="text"
                  value={specimen.ns || 'S'}
                  onChange={(e) => updateField('ns', e.target.value)}
                  className="w-full px-2 py-1 text-xs font-mono bg-white dark:bg-slate-900 border rounded"
                />
              </div>
              <div>
                <label className="text-[10px] font-mono text-slate-500">long_grau</label>
                <input
                  type="text"
                  value={specimen.long_grau ?? ''}
                  onChange={(e) => updateField('long_grau', e.target.value)}
                  className="w-full px-2 py-1 text-xs font-mono bg-white dark:bg-slate-900 border rounded"
                />
              </div>
              <div>
                <label className="text-[10px] font-mono text-slate-500">long_min</label>
                <input
                  type="text"
                  value={specimen.long_min ?? ''}
                  onChange={(e) => updateField('long_min', e.target.value)}
                  className="w-full px-2 py-1 text-xs font-mono bg-white dark:bg-slate-900 border rounded"
                />
              </div>
              <div>
                <label className="text-[10px] font-mono text-slate-500">long_seg</label>
                <input
                  type="text"
                  value={specimen.long_seg ?? ''}
                  onChange={(e) => updateField('long_seg', e.target.value)}
                  className="w-full px-2 py-1 text-xs font-mono bg-white dark:bg-slate-900 border rounded"
                />
              </div>
              <div>
                <label className="text-[10px] font-mono text-slate-500">ew</label>
                <input
                  type="text"
                  value={specimen.ew || 'W'}
                  onChange={(e) => updateField('ew', e.target.value)}
                  className="w-full px-2 py-1 text-xs font-mono bg-white dark:bg-slate-900 border rounded"
                />
              </div>
            </div>
          </div>

          <div className="sm:col-span-3 space-y-1">
            <label className="text-xs font-medium text-slate-700 dark:text-slate-300 font-mono">
              OBSERVAÇÃO LOCALIDADE
            </label>
            <input
              type="text"
              value={specimen['OBSERVAÇÃO LOCALIDADE'] || ''}
              onChange={(e) => updateField('OBSERVAÇÃO LOCALIDADE', e.target.value)}
              placeholder="ex: Bacia do Rio São Francisco, microclima de grota úmida"
              className="w-full px-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-md"
            />
          </div>
        </div>
      </div>

      {/* SECTION 4: HABITAT, HÁBITO E FENOLOGIA */}
      <div className="space-y-4 pt-3 border-t border-slate-200 dark:border-slate-800">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
          <Tag className="w-3.5 h-3.5" />
          4. Ecologia, Fenologia & Morfologia da Planta
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
          <div className="sm:col-span-2 space-y-1">
            <label className="text-xs font-medium text-slate-700 dark:text-slate-300 font-mono">
              HABITAT
            </label>
            <input
              type="text"
              value={specimen.HABITAT || specimen.habitat || ''}
              onChange={(e) => updateField('HABITAT', e.target.value)}
              placeholder="ex: Campo rupestre sobre afloramento de quartzito"
              className="w-full px-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-md"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium text-slate-700 dark:text-slate-300 font-mono">
              HÁBITO
            </label>
            <input
              type="text"
              value={specimen.HÁBITO || ''}
              onChange={(e) => updateField('HÁBITO', e.target.value)}
              placeholder="ex: Árvore / Arbusto / Erva"
              className="w-full px-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-md"
            />
          </div>

          <div className="flex gap-2">
            <div className="flex-1 space-y-1">
              <label className="text-xs font-medium text-slate-700 dark:text-slate-300 font-mono">
                ALTURA
              </label>
              <input
                type="text"
                value={specimen.ALTURA ?? ''}
                onChange={(e) => updateField('ALTURA', e.target.value)}
                placeholder="6"
                className="w-full px-3 py-1.5 text-xs font-mono bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-md"
              />
            </div>
            <div className="w-16 space-y-1">
              <label className="text-xs font-medium text-slate-700 dark:text-slate-300 font-mono">
                UN ALT
              </label>
              <input
                type="text"
                value={specimen['UN ALT'] || 'm'}
                onChange={(e) => updateField('UN ALT', e.target.value)}
                placeholder="m"
                className="w-full px-2 py-1.5 text-xs font-mono bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-md"
              />
            </div>
          </div>

          <div className="sm:col-span-2 space-y-1">
            <label className="text-xs font-medium text-slate-700 dark:text-slate-300 font-mono">
              FLORES
            </label>
            <input
              type="text"
              value={specimen.FLORES || ''}
              onChange={(e) => updateField('FLORES', e.target.value)}
              placeholder="ex: amarelas vistosas abundantes"
              className="w-full px-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-md"
            />
          </div>

          <div className="sm:col-span-2 space-y-1">
            <label className="text-xs font-medium text-slate-700 dark:text-slate-300 font-mono">
              FRUTOS
            </label>
            <input
              type="text"
              value={specimen.FRUTOS || ''}
              onChange={(e) => updateField('FRUTOS', e.target.value)}
              placeholder="ex: cápsulas lineares verdes / ausentes"
              className="w-full px-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-md"
            />
          </div>

          <div className="sm:col-span-4 space-y-1">
            <label className="text-xs font-medium text-slate-700 dark:text-slate-300 font-mono">
              OBS (Notas de Campo)
            </label>
            <textarea
              value={specimen.OBS || specimen.plantDescription || ''}
              onChange={(e) => updateField('OBS', e.target.value)}
              rows={2}
              placeholder="ex: Casca grossa e suberosa. Floração plena com ausência total de folhas."
              className="w-full px-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-md"
            />
          </div>
        </div>
      </div>

      {/* SECTION 5: COLETORES, DETERMINAÇÃO E DATAS */}
      <div className="space-y-4 pt-3 border-t border-slate-200 dark:border-slate-800">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
          <Calendar className="w-3.5 h-3.5" />
          5. Coleta e Determinação (Datas Separadas por Dia, Mês e Ano)
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-6 gap-3">
          <div className="sm:col-span-2 space-y-1">
            <label className="text-xs font-medium text-slate-700 dark:text-slate-300 font-mono">
              COLETOR
            </label>
            <input
              type="text"
              value={specimen.COLETOR || specimen.recordedBy || ''}
              onChange={(e) => updateField('COLETOR', e.target.value)}
              placeholder="ex: G. Soares"
              className="w-full px-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-md"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium text-slate-700 dark:text-slate-300 font-mono">
              Nº COLETA
            </label>
            <input
              type="text"
              value={specimen['Nº COLETA'] || specimen.recordNumber || ''}
              onChange={(e) => updateField('Nº COLETA', e.target.value)}
              placeholder="ex: 1420"
              className="w-full px-3 py-1.5 text-xs font-mono bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-md"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium text-slate-700 dark:text-slate-300 font-mono">
              DIA
            </label>
            <input
              type="number"
              value={specimen.DIA || ''}
              onChange={(e) => updateField('DIA', e.target.value)}
              placeholder="14"
              className="w-full px-2 py-1.5 text-xs font-mono bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-md"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium text-slate-700 dark:text-slate-300 font-mono">
              MÊS
            </label>
            <input
              type="number"
              value={specimen.MÊS || ''}
              onChange={(e) => updateField('MÊS', e.target.value)}
              placeholder="8"
              className="w-full px-2 py-1.5 text-xs font-mono bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-md"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium text-slate-700 dark:text-slate-300 font-mono">
              ANO
            </label>
            <input
              type="number"
              value={specimen.ANO || ''}
              onChange={(e) => updateField('ANO', e.target.value)}
              placeholder="2023"
              className="w-full px-2 py-1.5 text-xs font-mono bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-md"
            />
          </div>

          {/* Determinação */}
          <div className="sm:col-span-3 space-y-1">
            <label className="text-xs font-medium text-slate-700 dark:text-slate-300 font-mono">
              DETERMINAÇÃO (Taxonomista)
            </label>
            <input
              type="text"
              value={specimen.DETERMINAÇÃO || specimen.identifiedBy || ''}
              onChange={(e) => updateField('DETERMINAÇÃO', e.target.value)}
              placeholder="ex: Carlos F. Botelho"
              className="w-full px-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-md"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium text-slate-700 dark:text-slate-300 font-mono">
              DIA (Det.)
            </label>
            <input
              type="number"
              value={specimen.DIA_DET || ''}
              onChange={(e) => updateField('DIA_DET', e.target.value)}
              placeholder="15"
              className="w-full px-2 py-1.5 text-xs font-mono bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-md"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium text-slate-700 dark:text-slate-300 font-mono">
              MÊS (Det.)
            </label>
            <input
              type="number"
              value={specimen.MÊS_DET || ''}
              onChange={(e) => updateField('MÊS_DET', e.target.value)}
              placeholder="9"
              className="w-full px-2 py-1.5 text-xs font-mono bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-md"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium text-slate-700 dark:text-slate-300 font-mono">
              ANO (Det.)
            </label>
            <input
              type="number"
              value={specimen.ANO_DET || ''}
              onChange={(e) => updateField('ANO_DET', e.target.value)}
              placeholder="2023"
              className="w-full px-2 py-1.5 text-xs font-mono bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-md"
            />
          </div>
        </div>
      </div>

    </div>
  );
};
