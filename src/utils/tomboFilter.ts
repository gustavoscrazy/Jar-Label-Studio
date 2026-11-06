import { Specimen } from '../types/botanical';

export interface TomboRange {
  type: 'range';
  raw: string;
  start: string;
  end: string;
  startNum?: number;
  endNum?: number;
}

export interface TomboSingle {
  type: 'single';
  raw: string;
  value: string;
  num?: number;
}

export type TomboClause = TomboRange | TomboSingle;

/**
 * Extracts pure consecutive digits and converts to integer.
 * e.g. "HBR-048291" -> 48291, "48291" -> 48291
 */
export function extractDigitsAsNumber(str: string): number | null {
  const match = str.match(/\d+/g);
  if (!match) return null;
  // Use the longest or last sequence of digits (usually the tombo number)
  const lastDigits = match[match.length - 1];
  const num = parseInt(lastDigits, 10);
  return isNaN(num) ? null : num;
}

/**
 * Normalizes string for loose matching (lowercase, no extra spaces or punctuation)
 */
export function normalizeTombo(str: string): string {
  return str.toLowerCase().replace(/[\s\-_.:/]/g, '');
}

/**
 * Parses user input containing individual tombos or ranges separated by ';'
 * Examples:
 *  - "048291; 048293; 048295"
 *  - "048291 - 048294; 048298; 048300 - 048305"
 *  - "HBR-048291 - HBR-048293; HBR-048295"
 *  - "48291 a 48293; 48295"
 */
export function parseTomboQuery(query: string): TomboClause[] {
  if (!query || !query.trim()) return [];

  const rawClauses = query
    .split(';')
    .map((c) => c.trim())
    .filter(Boolean);

  const clauses: TomboClause[] = [];

  for (const raw of rawClauses) {
    // 1. Check for range separators with spaces or words: " - ", " – ", " — ", " .. ", " a ", " até "
    const wordRangeMatch = raw.match(
      /^(.*?)\s+(?:-|–|—|\.\.|\ba\b|\baté\b)\s+(.*?)$/i
    );

    // 2. Check for numeric range without spaces: e.g. "48291-48294" or "048291..048294"
    const numericRangeMatch = !wordRangeMatch
      ? raw.match(/^([A-Za-z0-9_-]+?)(?:\.\.|-)([A-Za-z0-9_-]+)$/)
      : null;

    // Verify if it's really a range (both sides should either be numbers or tombo codes, not a simple prefixed "HBR-048291")
    let rangeMatch = wordRangeMatch;
    if (!rangeMatch && numericRangeMatch) {
      const p1 = numericRangeMatch[1];
      const p2 = numericRangeMatch[2];
      // If p1 has digits and p2 has digits, it's a range (e.g. 48291-48294 or HBR-48291-HBR-48294)
      if (/\d/.test(p1) && /\d/.test(p2)) {
        rangeMatch = numericRangeMatch;
      }
    }

    if (rangeMatch) {
      const start = rangeMatch[1].trim();
      const end = rangeMatch[2].trim();
      const startNum = extractDigitsAsNumber(start);
      const endNum = extractDigitsAsNumber(end);

      clauses.push({
        type: 'range',
        raw,
        start,
        end,
        startNum: startNum ?? undefined,
        endNum: endNum ?? undefined,
      });
    } else {
      const num = extractDigitsAsNumber(raw);
      clauses.push({
        type: 'single',
        raw,
        value: raw,
        num: num ?? undefined,
      });
    }
  }

  return clauses;
}

/**
 * Checks if a specimen matches a single tombo clause (single or range)
 */
export function matchesTomboClause(specimen: Specimen, clause: TomboClause): boolean {
  const specTomboRaw = (specimen.TOMBO || specimen.catalogNumber || '').trim();
  if (!specTomboRaw) return false;

  const specNorm = normalizeTombo(specTomboRaw);
  const specNum = extractDigitsAsNumber(specTomboRaw);

  if (clause.type === 'single') {
    const clauseNorm = normalizeTombo(clause.value);

    // Exact string match (ignoring case, spaces and hyphens)
    if (specNorm === clauseNorm) return true;

    // Numeric match: if both have extractable numbers and they match
    if (clause.num !== undefined && specNum !== null && clause.num === specNum) {
      return true;
    }

    // Direct substring if user typed part of tombo
    if (clauseNorm.length >= 3 && specNorm.includes(clauseNorm)) {
      return true;
    }

    return false;
  }

  // RANGE MATCH
  if (clause.type === 'range') {
    // 1. Numeric Range: if both start and end have valid numbers
    if (clause.startNum !== undefined && clause.endNum !== undefined && specNum !== null) {
      const min = Math.min(clause.startNum, clause.endNum);
      const max = Math.max(clause.startNum, clause.endNum);

      if (specNum >= min && specNum <= max) {
        return true;
      }
    }

    // 2. String comparison fallback
    const startNorm = normalizeTombo(clause.start);
    const endNorm = normalizeTombo(clause.end);
    if (startNorm && endNorm) {
      const minStr = startNorm.localeCompare(endNorm) <= 0 ? startNorm : endNorm;
      const maxStr = startNorm.localeCompare(endNorm) <= 0 ? endNorm : startNorm;
      if (specNorm.localeCompare(minStr) >= 0 && specNorm.localeCompare(maxStr) <= 0) {
        return true;
      }
    }

    return false;
  }

  return false;
}

/**
 * Evaluates whether a specimen matches the semicolon-separated query
 */
export function isSpecimenMatchingTomboQuery(specimen: Specimen, query: string): boolean {
  const clauses = parseTomboQuery(query);
  if (clauses.length === 0) return true; // Empty query means no filter

  // OR relationship: specimen matches if it matches ANY clause
  return clauses.some((clause) => matchesTomboClause(specimen, clause));
}

/**
 * Filters a list of specimens by tombo query string
 */
export function filterSpecimensByTomboQuery(specimens: Specimen[], query: string): Specimen[] {
  if (!query || !query.trim()) return specimens;
  const clauses = parseTomboQuery(query);
  if (clauses.length === 0) return specimens;

  return specimens.filter((s) => clauses.some((c) => matchesTomboClause(s, c)));
}

/**
 * Returns detailed analysis of the tombo query:
 * - matched specimens
 * - total count
 * - parsed clauses
 */
export function getTomboFilterResult(specimens: Specimen[], query: string) {
  const clauses = parseTomboQuery(query);
  const isQueryActive = clauses.length > 0;
  const matched = isQueryActive
    ? specimens.filter((s) => clauses.some((c) => matchesTomboClause(s, c)))
    : specimens;

  const matchedIds = new Set(matched.map((s) => s.id));

  return {
    isQueryActive,
    clauses,
    matchedCount: matched.length,
    totalCount: specimens.length,
    matchedSpecimens: matched,
    matchedIds,
  };
}
