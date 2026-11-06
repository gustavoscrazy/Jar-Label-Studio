import React from 'react';
import { Specimen, LabelConfig } from '../types/botanical';
import {
  cleanPhenologyText,
  formatBotanicalDate,
  formatBotanicalDateParts,
  formatCoordinatesFromSpecimen,
  formatFloresValue,
  formatFrutosValue,
  formatSiglaTombo,
  formatUcDisplay,
} from '../utils/botanicalFormatter';

interface BotanicalLabelProps {
  specimen: Specimen;
  config: LabelConfig;
  className?: string;
  onOpenAudit?: () => void;
  scale?: number;
}

export const BotanicalLabel: React.FC<BotanicalLabelProps> = ({
  specimen,
  config,
  className = '',
  onOpenAudit,
}) => {
  const tombo = specimen.TOMBO || specimen.catalogNumber || '';
  const institution = 'Herbário José Ângelo Rizzo (JAR)';
  const subInstitution = config.subHeader || 'Universidade Estadual de Goiás - Campus Sudoeste: Sede Quirinópolis';

  // Scientific name composition taking CF into account
  const sciGenus = specimen.GÊNERO || '';
  const sciCf = specimen.CF ? `${specimen.CF} ` : '';
  const sciSp = specimen.ESPÉCIE || '';
  const sciName = (sciGenus && sciSp)
    ? `${sciGenus} ${sciCf}${sciSp}`
    : (specimen.scientificName || 'Espécie não identificada');
  const sciAuthor = specimen.AUTHOR || specimen.scientificNameAuthorship || '';
  const family = (specimen.FAMÍLIA || specimen.family || 'INDETERMINADA').toUpperCase();

  // Date composition in Arabic numerals: dia/mes/ano
  const collectionDate = (specimen.DIA || specimen.MÊS || specimen.ANO)
    ? formatBotanicalDateParts(specimen.DIA, specimen.MÊS, specimen.ANO)
    : (formatBotanicalDate(specimen.eventDate || specimen.eventDateFormatted || specimen.DATA) || 's.d.');

  // Determination date in Arabic numerals: dia/mes/ano
  const detDate = (specimen.DIA_DET || specimen.MÊS_DET || specimen.ANO_DET)
    ? formatBotanicalDateParts(specimen.DIA_DET, specimen.MÊS_DET, specimen.ANO_DET)
    : formatBotanicalDate(specimen.dateIdentified);

  // Formatted coordinates from DMS or decimal columns
  const formattedCoords = formatCoordinatesFromSpecimen(specimen);

  // Check if a field has an error identified by AI
  const hasFieldError = (field: string) => {
    return specimen.auditResult?.issues.some(
      (i) => i.field.toUpperCase() === field.toUpperCase() && i.severity === 'critical'
    );
  };

  const hasFieldWarning = (field: string) => {
    return specimen.auditResult?.issues.some(
      (i) => i.field.toUpperCase() === field.toUpperCase() && i.severity === 'warning'
    );
  };

  const getAspectRatio = () => {
    if (config.template === 'standard_100x120') return '100 / 120';
    if (config.template === 'standard_105x75') return '105 / 75';
    if (config.template === 'large_140x100') return '140 / 100';
    if (config.template === 'compact_90x60') return '90 / 60';
    return '120 / 100'; // 12cm de largura x 10cm de comprimento
  };

  const getMaxWidth = () => {
    if (config.template === 'standard_100x120') return '460px';
    if (config.template === 'standard_105x75') return '520px';
    if (config.template === 'large_140x100') return '580px';
    if (config.template === 'compact_90x60') return '420px';
    return '550px'; // 12 x 10 cm landscape
  };

  // Habitat, Habit, Height & Phenology
  const habitStr = [
    specimen.HÁBITO,
    specimen.ALTURA ? `${specimen.ALTURA} ${specimen['UN ALT'] || 'm'} alt.` : '',
  ].filter(Boolean).join(', ');

  const phenologyNotes = [
    formatFloresValue(specimen.FLORES),
    formatFrutosValue(specimen.FRUTOS),
    !specimen.FLORES && !specimen.FRUTOS && specimen.phenology
      ? cleanPhenologyText(specimen.phenology)
      : '',
  ].filter(Boolean).join('. ');

  const observations = specimen.OBS || specimen.plantDescription || '';

  // Acronym & Tombo
  const herbariumAcronym = 'JAR';
  const siglaTombo = formatSiglaTombo(herbariumAcronym, tombo);

  return (
    <div
      className={`relative bg-white text-black border border-black shadow-sm p-3 select-text flex flex-col justify-between font-serif-botanical ${className}`}
      style={{
        aspectRatio: getAspectRatio(),
        width: '100%',
        maxWidth: getMaxWidth(),
        boxSizing: 'border-box',
      }}
    >
      {/* AI Error notification flag on card */}
      {specimen.auditResult?.hasErrors && (
        <div
          onClick={onOpenAudit}
          className="no-print absolute -top-2.5 right-4 z-10 cursor-pointer bg-amber-500 hover:bg-amber-600 text-slate-950 text-[11px] font-sans font-semibold px-2.5 py-0.5 rounded shadow flex items-center gap-1 transition-colors"
          title="Clique para auditar e corrigir com IA"
        >
          <span className="w-1.5 h-1.5 rounded-full bg-red-600"></span>
          <span>{specimen.auditResult.issues.length} {specimen.auditResult.issues.length === 1 ? 'inconsistência' : 'inconsistências'} detectadas</span>
        </div>
      )}

      {/* 1. CABEÇALHO: LOGO + NOME DO HERBÁRIO + SUB-CABEÇALHO + REGISTRO */}
      <div className="border-b border-black pb-1 mb-1 text-black">
        <div className="flex items-center gap-2.5">
          {config.showHerbariumSeal && (
            <img
              src="/assets/aistudio/logo_5dd7f3b5.jpg"
              alt="Logo do Herbário José Ângelo Rizzo"
              referrerPolicy="no-referrer"
              className="h-14 w-auto object-contain shrink-0"
            />
          )}

          <div className="flex-1 text-center text-black">
            <h1 className="text-[17px] sm:text-[18px] font-bold tracking-tight leading-tight text-black">
              {institution}
            </h1>
            <p className="text-[12.5px] font-medium text-black leading-tight mt-0.5">
              {subInstitution}
            </p>
            <div className="mt-0.5 flex items-baseline justify-center gap-1.5 text-black">
              <span className="text-[13px] font-bold uppercase tracking-wider text-black">
                REGISTRO:
              </span>
              <span className="text-[15px] font-extrabold tracking-wider text-black">
                {siglaTombo || 's.n.'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 2. FAMÍLIA + ESPÉCIE */}
      <div className="border-b border-black pb-1 mb-1 text-black">
        <div className="mb-0.5">
          <span
            className={`text-[16px] sm:text-[17px] font-bold uppercase tracking-wider block leading-tight text-black ${
              hasFieldError('FAMÍLIA') || hasFieldError('family') ? 'bg-red-100 text-red-900 px-1 rounded inline-block' : ''
            }`}
          >
            {family}
          </span>
        </div>

        <div className="leading-tight text-black">
          <span
            className={`text-[18px] sm:text-[19px] italic font-semibold text-black ${
              hasFieldError('GÊNERO') ? 'bg-red-100 text-red-900 px-1 rounded' : ''
            }`}
          >
            {sciGenus || (specimen.scientificName ? specimen.scientificName.split(' ')[0] : 'Indet.')}
          </span>
          {sciCf ? (
            <span className="text-[16px] not-italic font-normal mx-1 text-black">
              {sciCf}
            </span>
          ) : (
            ' '
          )}
          <span
            className={`text-[18px] sm:text-[19px] italic font-semibold text-black ${
              hasFieldError('ESPÉCIE') ? 'bg-red-100 text-red-900 px-1 rounded' : ''
            }`}
          >
            {sciSp || (specimen.scientificName ? specimen.scientificName.split(' ').slice(1).join(' ') : 'sp.')}
          </span>
          {sciAuthor && (
            <span
              className={`text-[15.5px] not-italic ml-1.5 font-normal text-black ${
                hasFieldWarning('AUTHOR') ? 'bg-amber-100 px-1 rounded' : ''
              }`}
            >
              {sciAuthor}
            </span>
          )}
          {specimen.vernacularName && (
            <span className="text-[13px] italic text-black block mt-0.5">
              N.V.: {specimen.vernacularName}
            </span>
          )}
        </div>
      </div>

      {/* 3. INFORMAÇÕES DE LOCALIZAÇÃO */}
      <div className="border-b border-black pb-1 mb-1 text-[13.5px] leading-tight space-y-0.5 text-black">
        {/* Linha 1: Campo especificado, Cidade, Estado, País */}
        <div>
          <span className="text-[14.5px] font-bold text-black">
            {[
              specimen['CAMPO ESPECIFICADO'] ? String(specimen['CAMPO ESPECIFICADO']).trim() : '',
              specimen.CIDADE || specimen.municipality,
              specimen.ESTADO || specimen.stateProvince,
              specimen.PAÍS || specimen.country || 'Brasil',
            ]
              .filter(Boolean)
              .join(', ')}
          </span>
        </div>

        {/* Linha 2: Coordenadas: Latitude, Longitude */}
        {(formattedCoords || specimen.ALTITUDE || specimen.elevation) && (
          <div className="flex flex-wrap items-center gap-x-2 text-[13.5px] text-black">
            {formattedCoords && (
              <span
                className={
                  hasFieldError('LATITUDE') || hasFieldError('LONGITUDE') || hasFieldError('lat_grau') || hasFieldError('long_grau')
                    ? 'bg-red-100 px-1 rounded'
                    : ''
                }
              >
                <span className="font-semibold text-black">Coordenadas:</span>{' '}
                <span className="tabular-nums text-black">{formattedCoords}</span>
              </span>
            )}
            {specimen.datum && <span className="text-[12.5px] text-black">({specimen.datum})</span>}
            {(specimen.ALTITUDE || specimen.elevation) && (
              <span className={`tabular-nums text-black ${hasFieldError('ALTITUDE') || hasFieldError('elevation') ? 'bg-red-100 px-1 rounded' : ''}`}>
                Alt.: {specimen.ALTITUDE || specimen.elevation} {specimen.UN || 'm'}
              </span>
            )}
          </div>
        )}

        {/* Linha 3: Descrição da Localidade: */}
        {(specimen['DESCRIÇÃO LOCALIDADE'] || specimen.locality) && (
          <p className="text-[13.5px] leading-tight text-black">
            <span className="font-semibold text-black">Descrição da Localidade:</span> {specimen['DESCRIÇÃO LOCALIDADE'] || specimen.locality}
          </p>
        )}

        {/* Linha 4: É unidade de conservação: */}
        <p className="text-[13.5px] text-black">
          <span className="font-semibold text-black">É unidade de conservação:</span> {formatUcDisplay(specimen.UC)}
        </p>

        {specimen['OBSERVAÇÃO LOCALIDADE'] && (
          <p className="text-[13px] italic text-black">
            Obs. loc.: {specimen['OBSERVAÇÃO LOCALIDADE']}
          </p>
        )}
      </div>

      {/* 4. HABITAT, HÁBITO, FENOLOGIA, NOTAS */}
      <div className="text-[13.5px] leading-tight space-y-0.5 mb-1 text-black">
        {(specimen.HABITAT || specimen.habitat) && (
          <p className="text-black">
            <span className="font-semibold text-black">Habitat:</span>{' '}
            <span className="text-black">{specimen.HABITAT || specimen.habitat}</span>
          </p>
        )}

        {habitStr && (
          <p className={`text-black ${hasFieldError('HÁBITO') || hasFieldError('ALTURA') ? 'bg-red-100 px-1 rounded inline-block' : ''}`}>
            <span className="font-semibold text-black">Hábito:</span> {habitStr}.
          </p>
        )}

        {phenologyNotes && (
          <p className="text-black">
            <span className="font-semibold text-black">Fenologia:</span> {phenologyNotes}.
          </p>
        )}

        {observations && (
          <p className="text-black">
            <span className="font-semibold text-black">Notas:</span> {observations}
          </p>
        )}
      </div>

      {/* 5. COLETOR & DET */}
      <div className="border-t border-black pt-1 mt-auto text-[13.5px] leading-tight space-y-0.5 text-black">
        <div className="flex items-baseline justify-between gap-2 text-black">
          <span className="text-[14px] font-bold text-black">
            Col.: {specimen.COLETOR || specimen.recordedBy || 's.n.'} nº {specimen['Nº COLETA'] || specimen.recordNumber || 's.n.'}
          </span>
          <span className="font-medium text-[13.5px] text-black tabular-nums">
            Data: {collectionDate}
          </span>
        </div>

        {(specimen.DETERMINAÇÃO || specimen.identifiedBy) && (
          <div className="text-[13px] text-black flex items-center justify-between">
            <span className="text-black">
              <span className="font-semibold text-black">Det.:</span> {specimen.DETERMINAÇÃO || specimen.identifiedBy}
            </span>
            {detDate && (
              <span className="text-[12.5px] text-black tabular-nums">Data Det.: {detDate}</span>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
