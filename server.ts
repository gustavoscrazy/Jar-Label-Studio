import express from 'express';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI, Type } from '@google/genai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json({ limit: '10mb' }));

// Server-side Gemini initialization
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    },
  },
});

const FLORA_BRASIL_BASE_URL = 'https://servicos.jbrj.gov.br/v2/flora';

/**
 * Generates Latin botanical orthographic candidate spellings when a direct lookup returns empty
 * e.g. "Tabebuya chrysotrica" -> "Tabebuia chrysotricha"
 */
function generateOrthographicCandidates(genus: string, species: string): string[] {
  const candidates = new Set<string>();
  const gClean = genus.trim();
  const sClean = species.trim();

  const gVariants = new Set<string>([gClean]);
  if (/uya$/i.test(gClean)) gVariants.add(gClean.replace(/uya$/i, 'uia'));
  if (/y/i.test(gClean)) gVariants.add(gClean.replace(/y/gi, 'i'));
  if (/ph/i.test(gClean)) gVariants.add(gClean.replace(/ph/gi, 'f'));

  const sVariants = new Set<string>([sClean]);
  if (/trica$/i.test(sClean)) sVariants.add(sClean.replace(/trica$/i, 'tricha'));
  if (/tricus$/i.test(sClean)) sVariants.add(sClean.replace(/tricus$/i, 'trichus'));
  if (/tricum$/i.test(sClean)) sVariants.add(sClean.replace(/tricum$/i, 'trichum'));
  if (/stachia$/i.test(sClean)) sVariants.add(sClean.replace(/stachia$/i, 'stachya'));
  if (/phylla$/i.test(sClean)) sVariants.add(sClean.replace(/fila$/i, 'phylla'));
  if (/i$/i.test(sClean) && !/ii$/i.test(sClean)) sVariants.add(`${sClean}i`);
  if (/ii$/i.test(sClean)) sVariants.add(sClean.replace(/ii$/i, 'i'));

  for (const gv of gVariants) {
    for (const sv of sVariants) {
      const combined = `${gv} ${sv}`.trim();
      if (combined.toLowerCase() !== `${gClean} ${sClean}`.toLowerCase()) {
        candidates.add(combined);
      }
    }
  }

  return Array.from(candidates);
}

/**
 * Fetches JSON array from JBRJ Flora e Funga do Brasil REST API for a given taxon name
 */
async function fetchJbrjTaxon(taxonName: string): Promise<any[]> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    const url = `${FLORA_BRASIL_BASE_URL}/taxon/${encodeURIComponent(taxonName.trim())}`;
    const res = await fetch(url, {
      headers: { Accept: 'application/json' },
      signal: controller.signal,
    });
    clearTimeout(timeout);
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data) ? data : [];
  } catch (err) {
    console.warn(`Flora do Brasil API lookup error for "${taxonName}":`, err);
    return [];
  }
}

/**
 * Parses a full scientific name with authorship (e.g. "Paubrasilia echinata (Lam.) Gagnon, H.C.Lima & G.P.Lewis")
 * into { genus, species, author }
 */
function parseAcceptedNameUsageString(fullUsage: string): {
  binomial: string;
  genus: string;
  species: string;
  author: string;
} {
  const parts = fullUsage.trim().split(/\s+/);
  const genus = parts[0] || '';
  const species = parts[1] || '';
  const binomial = `${genus} ${species}`.trim();
  const author = parts.slice(2).join(' ').trim();
  return { binomial, genus, species, author };
}

/**
 * Queries the official Flora e Funga do Brasil (JBRJ / Reflora) API and compares against a specimen's fields
 */
async function verifyTaxonInFloraBrasil(input: {
  genus?: string;
  species?: string;
  scientificName?: string;
  author?: string;
  family?: string;
}) {
  let rawGenus = (input.genus || '').trim();
  let rawSpecies = (input.species || '').trim();

  if ((!rawGenus || !rawSpecies) && input.scientificName) {
    const cleanedSci = input.scientificName
      .replace(/\b(cf\.?|aff\.?)\s+/gi, '')
      .trim();
    const parts = cleanedSci.split(/\s+/);
    if (!rawGenus && parts[0]) rawGenus = parts[0];
    if (!rawSpecies && parts[1]) rawSpecies = parts[1];
  }

  const queriedBinomial = `${rawGenus} ${rawSpecies}`.trim();
  if (!queriedBinomial) {
    return {
      found: false,
      queriedBinomial: '',
      wasSpellingCorrected: false,
      isExactMatch: false,
      hasSynonymUpdate: false,
      hasAuthorDiscrepancy: false,
      hasNameDiscrepancy: false,
      hasFamilyDiscrepancy: false,
      summaryMessage: 'Informe o Gênero e a Espécie para consultar o Flora e Funga do Brasil.',
      checkedAt: new Date().toISOString(),
    };
  }

  // 1. Direct query to JBRJ Flora e Funga do Brasil API
  let records = await fetchJbrjTaxon(queriedBinomial);
  let wasSpellingCorrected = false;

  // 2. If empty, try Latin orthographic candidates
  if (records.length === 0 && rawGenus && rawSpecies) {
    const candidates = generateOrthographicCandidates(rawGenus, rawSpecies);
    for (const candidate of candidates) {
      const candidateRes = await fetchJbrjTaxon(candidate);
      if (candidateRes.length > 0) {
        records = candidateRes;
        wasSpellingCorrected = true;
        break;
      }
    }
  }

  // 3. If still empty, try AI orthographic spellcheck then verify in JBRJ API
  if (records.length === 0 && process.env.GEMINI_API_KEY) {
    try {
      const aiResp = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: `Corrija apenas erros ortográficos deste binômio botânico brasileiro para consulta na API Flora e Funga do Brasil: "${queriedBinomial}". Retorne APENAS as duas palavras (Gênero espécie) sem autor e sem formatação.`,
      });
      const suggestedBinomial = (aiResp.text || '').trim().split('\n')[0].trim();
      if (
        suggestedBinomial &&
        suggestedBinomial.split(/\s+/).length === 2 &&
        suggestedBinomial.toLowerCase() !== queriedBinomial.toLowerCase()
      ) {
        const aiCandidateRes = await fetchJbrjTaxon(suggestedBinomial);
        if (aiCandidateRes.length > 0) {
          records = aiCandidateRes;
          wasSpellingCorrected = true;
        }
      }
    } catch {
      // Ignore AI spellcheck error if unavailable
    }
  }

  if (records.length === 0) {
    return {
      found: false,
      queriedBinomial,
      wasSpellingCorrected: false,
      isExactMatch: false,
      hasSynonymUpdate: false,
      hasAuthorDiscrepancy: false,
      hasNameDiscrepancy: false,
      hasFamilyDiscrepancy: false,
      summaryMessage: `Táxon "${queriedBinomial}" não encontrado na base do Flora e Funga do Brasil (JBRJ). Verifique a grafia ou se é uma espécie exótica não naturalizada.`,
      checkedAt: new Date().toISOString(),
    };
  }

  // Prefer NOME_ACEITO if multiple homonyms exist, otherwise take the first record
  const primaryRecord =
    records.find((r) => r?.taxon?.taxonomicstatus === 'NOME_ACEITO') || records[0];
  const taxon = primaryRecord.taxon || {};
  const profile = primaryRecord.specie_profile || {};
  const vernaculars = Array.isArray(primaryRecord.vernacular_name)
    ? primaryRecord.vernacular_name
        .filter((v: any) => v?.vernacularname)
        .map((v: any) => String(v.vernacularname))
    : [];

  const matchedGenus = String(taxon.genus || rawGenus).trim();
  const matchedSpecies = String(taxon.specificepithet || rawSpecies).trim();
  const matchedAuthor = String(taxon.scientificnameauthorship || '').trim();
  const matchedFamily = String(taxon.family || '').trim().toUpperCase();
  const taxonomicStatus = String(taxon.taxonomicstatus || '').trim();
  const nomenclaturalStatus = String(taxon.nomenclaturalstatus || '').trim();
  const taxonId = taxon.taxonid;

  let acceptedGenus = matchedGenus;
  let acceptedSpecies = matchedSpecies;
  let acceptedAuthor = matchedAuthor;
  let acceptedFamily = matchedFamily;
  let acceptedTaxonId = taxonId;
  let acceptedScientificName = `${matchedGenus} ${matchedSpecies}`.trim();

  const isSynonym = taxonomicStatus === 'SINONIMO' && Boolean(taxon.acceptednameusage);

  if (isSynonym && taxon.acceptednameusage) {
    const parsedAccepted = parseAcceptedNameUsageString(String(taxon.acceptednameusage));
    acceptedGenus = parsedAccepted.genus;
    acceptedSpecies = parsedAccepted.species;
    acceptedAuthor = parsedAccepted.author;
    acceptedScientificName = parsedAccepted.binomial;
    if (taxon.acceptednameusageid) {
      acceptedTaxonId = Number(taxon.acceptednameusageid);
    }

    // Fetch the accepted taxon profile from JBRJ to guarantee exact authorship & family
    if (parsedAccepted.binomial) {
      const acceptedRecords = await fetchJbrjTaxon(parsedAccepted.binomial);
      const accRec =
        acceptedRecords.find((r) => r?.taxon?.taxonomicstatus === 'NOME_ACEITO') ||
        acceptedRecords[0];
      if (accRec?.taxon) {
        acceptedGenus = String(accRec.taxon.genus || acceptedGenus).trim();
        acceptedSpecies = String(accRec.taxon.specificepithet || acceptedSpecies).trim();
        acceptedAuthor = String(accRec.taxon.scientificnameauthorship || acceptedAuthor).trim();
        acceptedFamily = String(accRec.taxon.family || acceptedFamily).trim().toUpperCase();
        acceptedTaxonId = accRec.taxon.taxonid || acceptedTaxonId;
        acceptedScientificName = `${acceptedGenus} ${acceptedSpecies}`.trim();
      }
    }
  }

  // Compare against the specimen's current values
  const inputFamily = (input.family || '').trim().toUpperCase();
  const inputAuthor = (input.author || '').trim();

  const hasNameDiscrepancy =
    wasSpellingCorrected ||
    isSynonym ||
    rawGenus.toLowerCase() !== acceptedGenus.toLowerCase() ||
    rawSpecies.toLowerCase() !== acceptedSpecies.toLowerCase();

  const hasAuthorDiscrepancy =
    inputAuthor.replace(/\s+/g, '') !== acceptedAuthor.replace(/\s+/g, '');

  const hasFamilyDiscrepancy =
    Boolean(acceptedFamily) && inputFamily !== acceptedFamily;

  const isExactMatch =
    !hasNameDiscrepancy && !hasAuthorDiscrepancy && !hasFamilyDiscrepancy;

  let summaryMessage = '';
  if (isExactMatch) {
    summaryMessage = `Nome aceito e autor confirmados no Flora e Funga do Brasil (${acceptedGenus} ${acceptedSpecies} ${acceptedAuthor}).`;
  } else if (isSynonym) {
    summaryMessage = `"${matchedGenus} ${matchedSpecies}" consta como SINÔNIMO no Flora e Funga do Brasil. Nome aceito atual: ${acceptedGenus} ${acceptedSpecies} ${acceptedAuthor}.`;
  } else if (wasSpellingCorrected) {
    summaryMessage = `Grafia corrigida de "${queriedBinomial}" para "${acceptedGenus} ${acceptedSpecies} ${acceptedAuthor}" segundo o Flora e Funga do Brasil.`;
  } else if (hasAuthorDiscrepancy || hasFamilyDiscrepancy) {
    summaryMessage = `Binômio aceito, mas há divergência de autor ou família em relação ao Flora e Funga do Brasil (${acceptedAuthor} — ${acceptedFamily}).`;
  } else {
    summaryMessage = `Conferido no Flora e Funga do Brasil: ${acceptedGenus} ${acceptedSpecies} ${acceptedAuthor}.`;
  }

  const refloraUrl = acceptedTaxonId
    ? `https://floradobrasil.jbrj.gov.br/FB${acceptedTaxonId}`
    : taxon.references || `https://floradobrasil.jbrj.gov.br/FB${taxonId}`;

  return {
    found: true,
    queriedBinomial,
    wasSpellingCorrected,
    taxonId,
    taxonomicStatus,
    nomenclaturalStatus,
    matchedScientificName: `${matchedGenus} ${matchedSpecies}`.trim(),
    matchedFamily,
    matchedGenus,
    matchedSpecies,
    matchedAuthor,
    acceptedScientificName,
    acceptedFamily,
    acceptedGenus,
    acceptedSpecies,
    acceptedAuthor,
    acceptedTaxonId,
    refloraUrl,
    lifeForm: Array.isArray(profile.lifeForm) ? profile.lifeForm : [],
    habitat: Array.isArray(profile.habitat) ? profile.habitat : [],
    vegetationType: Array.isArray(profile.vegetationType) ? profile.vegetationType : [],
    vernacularNames: Array.from(new Set(vernaculars)).slice(0, 6),
    isExactMatch,
    hasSynonymUpdate: isSynonym,
    hasAuthorDiscrepancy,
    hasNameDiscrepancy,
    hasFamilyDiscrepancy,
    summaryMessage,
    checkedAt: new Date().toISOString(),
  };
}

// API Route: Official Flora e Funga do Brasil Single Taxon Verification
app.post('/api/flora-brasil/verify-taxon', async (req, res) => {
  try {
    const { genus, species, scientificName, author, family } = req.body || {};
    const result = await verifyTaxonInFloraBrasil({
      genus,
      species,
      scientificName,
      author,
      family,
    });
    return res.json({ success: true, result });
  } catch (error: any) {
    console.error('Error verifying taxon in Flora e Funga do Brasil:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Erro ao consultar a API do Flora e Funga do Brasil',
    });
  }
});

// API Route: Official Flora e Funga do Brasil Batch Verification
app.post('/api/flora-brasil/verify-batch', async (req, res) => {
  try {
    const { specimens } = req.body || {};
    if (!Array.isArray(specimens)) {
      return res.status(400).json({ error: 'Lista de espécimes inválida' });
    }

    const resultsById: Record<string, any> = {};
    // Process in small batches of 4 to respect JBRJ API rate limits
    const chunkSize = 4;
    for (let i = 0; i < specimens.length; i += chunkSize) {
      const chunk = specimens.slice(i, i + chunkSize);
      await Promise.all(
        chunk.map(async (spec: any) => {
          const check = await verifyTaxonInFloraBrasil({
            genus: spec.GÊNERO,
            species: spec.ESPÉCIE,
            scientificName: spec.scientificName,
            author: spec.AUTHOR || spec.scientificNameAuthorship,
            family: spec.FAMÍLIA || spec.family,
          });
          resultsById[spec.id] = check;
        })
      );
    }

    return res.json({ success: true, resultsById });
  } catch (error: any) {
    console.error('Error in batch Flora e Funga do Brasil verification:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Erro na verificação em lote no Flora e Funga do Brasil',
    });
  }
});

// API Route: AI Botanical Specimen Audit & Error Correction (Grounded with Flora e Funga do Brasil API)
app.post('/api/gemini/audit-specimen', async (req, res) => {
  const specimen = req.body?.specimen || {};

  // First, query the official Flora e Funga do Brasil API
  const floraCheck = await verifyTaxonInFloraBrasil({
    genus: specimen.GÊNERO,
    species: specimen.ESPÉCIE,
    scientificName: specimen.scientificName,
    author: specimen.AUTHOR || specimen.scientificNameAuthorship,
    family: specimen.FAMÍLIA || specimen.family,
  });

  try {
    if (!req.body?.specimen) {
      return res.status(400).json({ error: 'Specimen data is required' });
    }

    const prompt = `Você é um eminente curador de herbário e taxonomista botânico sênior, especialista no Código Internacional de Nomenclatura Botânica (ICN), no sistema APG IV e na Flora e Funga do Brasil (JBRJ / Reflora).

Resultado oficial em tempo real da API Flora e Funga do Brasil (servicos.jbrj.gov.br/v2/flora) para este espécime:
${JSON.stringify(floraCheck, null, 2)}

O banco de dados do herbário utiliza estritamente o seguinte esquema de colunas:
[TOMBO, FAMÍLIA, GÊNERO, CF, ESPÉCIE, AUTHOR, PAÍS, ESTADO, CIDADE, CAMPO ESPECIFICADO, UC, LATITUDE, LONGITUDE, lat_grau, lat_min, lat_seg, ns, long_grau, long_min, long_seg, ew, ALTITUDE, UN, DESCRIÇÃO LOCALIDADE, FLORES, FRUTOS, ALTURA, UN ALT, COLETOR, Nº COLETA, DIA, MÊS, ANO, DETERMINAÇÃO, DIA_DET, MÊS_DET, ANO_DET, COLEÇÃO ORIGEM, COLEÇÃO DESTINO, QTDE DUPLICATA, OBSERVAÇÃO LOCALIDADE, projeto, HABITAT, HÁBITO, OBS, RESPONSÁVEL, DATA]

Sua tarefa é AUDITAR criticamente os dados deste espécime botânico de excicata para identificar:
1. Nomenclatura Taxonômica (utilize prioritariamente os dados oficiais retornados pela API Flora e Funga do Brasil acima):
   - GÊNERO e ESPÉCIE (grafia correta, sinonímias desatualizadas, validade do CF como "cf." ou "aff.").
   - FAMÍLIA (deve estar em MAIÚSCULAS com sufixo -ACEAE segundo APG IV e Flora do Brasil).
   - AUTHOR (autoria exata registrada no Flora e Funga do Brasil / IPNI).
2. Consistência Cartográfica e Geográfica:
   - Coordenadas decimais LATITUDE e LONGITUDE versus os campos em graus (lat_grau, lat_min, lat_seg, ns, long_grau, long_min, long_seg, ew).
   - Coordenadas invertidas (latitude trocada com longitude).
   - Sinal negativo ausente na LONGITUDE (no Brasil/América do Sul as longitudes são Oeste/W e devem ser negativas na forma decimal, e o campo ew deve ser 'W' ou 'O', nunca 'E').
   - Inconsistência entre CIDADE, ESTADO e UC.
   - ALTITUDE plausível.
3. Coerência Morfológica e Biológica:
   - HÁBITO e ALTURA + UN ALT coerentes com o táxon e forma de vida do Flora do Brasil.

Dados do espécime a ser auditado:
${JSON.stringify(specimen, null, 2)}

Retorne o resultado estritamente no formato JSON estruturado conforme o esquema solicitado.`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
      config: {
        systemInstruction:
          'Você é um perito em curadoria e taxonomia de herbário botânico. Utilize os dados da API Flora e Funga do Brasil fornecidos no prompt para validar família, gênero, espécie e autor, além de auditar geografia e biologia.',
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            hasErrors: { type: Type.BOOLEAN },
            criticalCount: { type: Type.INTEGER },
            warningCount: { type: Type.INTEGER },
            infoCount: { type: Type.INTEGER },
            summary: { type: Type.STRING },
            issues: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  id: { type: Type.STRING },
                  field: { type: Type.STRING },
                  fieldLabel: { type: Type.STRING },
                  severity: { type: Type.STRING },
                  category: { type: Type.STRING },
                  originalValue: { type: Type.STRING },
                  suggestedValue: { type: Type.STRING },
                  reason: { type: Type.STRING },
                },
                required: [
                  'id',
                  'field',
                  'fieldLabel',
                  'severity',
                  'category',
                  'originalValue',
                  'suggestedValue',
                  'reason',
                ],
              },
            },
            suggestedRecord: {
              type: Type.OBJECT,
              properties: {
                FAMÍLIA: { type: Type.STRING },
                GÊNERO: { type: Type.STRING },
                CF: { type: Type.STRING },
                ESPÉCIE: { type: Type.STRING },
                AUTHOR: { type: Type.STRING },
                PAÍS: { type: Type.STRING },
                ESTADO: { type: Type.STRING },
                CIDADE: { type: Type.STRING },
                'CAMPO ESPECIFICADO': { type: Type.STRING },
                UC: { type: Type.STRING },
                LATITUDE: { type: Type.STRING },
                LONGITUDE: { type: Type.STRING },
                ALTITUDE: { type: Type.STRING },
                HABITAT: { type: Type.STRING },
                HÁBITO: { type: Type.STRING },
              },
            },
          },
          required: ['hasErrors', 'criticalCount', 'warningCount', 'infoCount', 'summary', 'issues'],
        },
      },
    });

    const resultJson = JSON.parse(response.text || '{}');
    resultJson.auditedAt = new Date().toISOString();
    return res.json({ success: true, audit: resultJson, floraBrasilResult: floraCheck });
  } catch (error: any) {
    console.error('Error during AI specimen audit, using Flora do Brasil + heuristic fallback:', error?.message);

    const issues: any[] = [];
    const suggestedRecord: any = { ...specimen };

    if (floraCheck.found) {
      if (floraCheck.hasFamilyDiscrepancy && floraCheck.acceptedFamily) {
        issues.push({
          id: 'FLORA-BR-FAM',
          field: 'FAMÍLIA',
          fieldLabel: 'Família Botânica (Flora do Brasil)',
          severity: 'critical',
          category: 'taxonomy',
          originalValue: String(specimen.FAMÍLIA || specimen.family || ''),
          suggestedValue: floraCheck.acceptedFamily,
          reason: `Família oficial registrada na Flora e Funga do Brasil (JBRJ): ${floraCheck.acceptedFamily}.`,
        });
        suggestedRecord.FAMÍLIA = floraCheck.acceptedFamily;
      }

      if (
        floraCheck.acceptedGenus &&
        String(specimen.GÊNERO || '').trim() !== floraCheck.acceptedGenus
      ) {
        issues.push({
          id: 'FLORA-BR-GEN',
          field: 'GÊNERO',
          fieldLabel: 'Gênero (Flora do Brasil)',
          severity: 'critical',
          category: 'taxonomy',
          originalValue: String(specimen.GÊNERO || ''),
          suggestedValue: floraCheck.acceptedGenus,
          reason: floraCheck.hasSynonymUpdate
            ? `Sinônimo atualizado para o gênero aceito na Flora e Funga do Brasil: ${floraCheck.acceptedGenus}.`
            : `Grafia oficial do gênero na Flora e Funga do Brasil: ${floraCheck.acceptedGenus}.`,
        });
        suggestedRecord.GÊNERO = floraCheck.acceptedGenus;
      }

      if (
        floraCheck.acceptedSpecies &&
        String(specimen.ESPÉCIE || '').trim() !== floraCheck.acceptedSpecies
      ) {
        issues.push({
          id: 'FLORA-BR-SP',
          field: 'ESPÉCIE',
          fieldLabel: 'Epíteto Específico (Flora do Brasil)',
          severity: 'critical',
          category: 'taxonomy',
          originalValue: String(specimen.ESPÉCIE || ''),
          suggestedValue: floraCheck.acceptedSpecies,
          reason: floraCheck.hasSynonymUpdate
            ? `Epíteto correspondente ao nome aceito na Flora e Funga do Brasil: ${floraCheck.acceptedScientificName}.`
            : `Grafia oficial do epíteto na Flora e Funga do Brasil: ${floraCheck.acceptedSpecies}.`,
        });
        suggestedRecord.ESPÉCIE = floraCheck.acceptedSpecies;
      }

      if (floraCheck.hasAuthorDiscrepancy && floraCheck.acceptedAuthor) {
        issues.push({
          id: 'FLORA-BR-AUT',
          field: 'AUTHOR',
          fieldLabel: 'Autor do Táxon (Flora do Brasil)',
          severity: 'warning',
          category: 'taxonomy',
          originalValue: String(specimen.AUTHOR || specimen.scientificNameAuthorship || ''),
          suggestedValue: floraCheck.acceptedAuthor,
          reason: `Autoria padronizada registrada na Flora e Funga do Brasil (JBRJ) para ${floraCheck.acceptedScientificName}: ${floraCheck.acceptedAuthor}.`,
        });
        suggestedRecord.AUTHOR = floraCheck.acceptedAuthor;
      }
    }

    const lat = Number(specimen.LATITUDE);
    const lon = Number(specimen.LONGITUDE);
    if (!isNaN(lat) && !isNaN(lon)) {
      if (lat < -34 && lon > -34 && lon < 5) {
        issues.push({
          id: 'ISSUE-HEUR-03',
          field: 'LATITUDE',
          fieldLabel: 'Latitude Decimal',
          severity: 'critical',
          category: 'geography',
          originalValue: String(lat),
          suggestedValue: String(lon),
          reason: 'Coordenada invertida com a Longitude para localidades no Brasil.',
        });
        issues.push({
          id: 'ISSUE-HEUR-04',
          field: 'LONGITUDE',
          fieldLabel: 'Longitude Decimal',
          severity: 'critical',
          category: 'geography',
          originalValue: String(lon),
          suggestedValue: String(lat),
          reason: 'Coordenada invertida com a Latitude para localidades no Brasil.',
        });
        suggestedRecord.LATITUDE = lon;
        suggestedRecord.LONGITUDE = lat;
      } else if (lon > 0 && String(specimen.PAÍS || '').toLowerCase().includes('brasil')) {
        issues.push({
          id: 'ISSUE-HEUR-05',
          field: 'LONGITUDE',
          fieldLabel: 'Longitude Decimal',
          severity: 'critical',
          category: 'geography',
          originalValue: String(lon),
          suggestedValue: String(-Math.abs(lon)),
          reason: 'No Brasil, todas as longitudes situam-se no hemisfério Ocidental (W) e devem ser negativas.',
        });
        suggestedRecord.LONGITUDE = -Math.abs(lon);
      }
    }

    return res.json({
      success: true,
      floraBrasilResult: floraCheck,
      audit: {
        hasErrors: issues.length > 0,
        criticalCount: issues.filter((i) => i.severity === 'critical').length,
        warningCount: issues.filter((i) => i.severity === 'warning').length,
        infoCount: 0,
        summary: floraCheck.summaryMessage,
        issues,
        suggestedRecord,
        auditedAt: new Date().toISOString(),
      },
    });
  }
});

// API Route: GBIF External Database Query Proxy
app.post('/api/external/query-gbif', async (req, res) => {
  try {
    const { scientificName, country, limit = 10 } = req.body;
    const params = new URLSearchParams();
    if (scientificName) params.append('scientificName', scientificName);
    if (country) params.append('country', country);
    params.append('hasCoordinate', 'true');
    params.append('limit', String(limit));

    const gbifUrl = `https://api.gbif.org/v1/occurrence/search?${params.toString()}`;
    const gbifRes = await fetch(gbifUrl);
    if (!gbifRes.ok) {
      throw new Error(`GBIF API responded with status ${gbifRes.status}`);
    }
    const data = await gbifRes.json();
    return res.json({ success: true, count: data.count, results: data.results || [] });
  } catch (error: any) {
    console.error('Error querying GBIF:', error);
    return res.status(500).json({ error: error.message || 'Falha ao consultar base GBIF' });
  }
});

// API Route: Google Sheets Spreadsheet Proxy
app.post('/api/external/fetch-google-sheet', async (req, res) => {
  try {
    const { url } = req.body;
    if (!url || typeof url !== 'string') {
      return res.status(400).json({ error: 'URL do Google Sheets é obrigatória' });
    }

    let exportUrl = url.trim();

    if (!exportUrl.includes('/export?') && !exportUrl.includes('/pub?')) {
      const match = exportUrl.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
      if (!match) {
        return res.status(400).json({
          error: 'Link do Google Sheets inválido. Certifique-se de colar o link completo da planilha.',
        });
      }
      const sheetId = match[1];
      const gidMatch = exportUrl.match(/[#&?]gid=([0-9]+)/);
      const gid = gidMatch ? gidMatch[1] : '0';
      exportUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv&gid=${gid}`;
    }

    const sheetRes = await fetch(exportUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko)',
      },
      redirect: 'follow',
    });

    if (!sheetRes.ok) {
      if (sheetRes.status === 401 || sheetRes.status === 403) {
        return res.status(403).json({
          error: 'Acesso negado à planilha. Por favor, certifique-se de que a planilha está compartilhada como "Qualquer pessoa com o link pode ler/ver".',
        });
      }
      throw new Error(`Google Sheets retornou status HTTP ${sheetRes.status}`);
    }

    const csvText = await sheetRes.text();
    if (csvText.trim().startsWith('<!DOCTYPE html') || csvText.trim().startsWith('<html')) {
      return res.status(400).json({
        error: 'A planilha retornou uma página de login do Google. Por favor, verifique se a planilha está com o compartilhamento público ativado ("Qualquer pessoa com o link pode ver").',
      });
    }

    return res.json({ success: true, csvText });
  } catch (error: any) {
    console.error('Error fetching Google Sheet:', error);
    return res.status(500).json({ error: error.message || 'Falha ao buscar planilha do Google Sheets' });
  }
});

// Setup Vite middleware in dev or static files in production
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, () => {
    console.log(`HerbariumLabel Studio server running on http://localhost:${PORT}`);
  });
}

startServer();
