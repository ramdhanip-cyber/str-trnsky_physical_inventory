/**
 * Parse length input in "X' Y''" (feet and inches) format and convert to total feet.
 * e.g. "5' 12''" -> 5 + 12/12 = 6 ft
 */

export interface ParsedLength {
  /** Total length in feet (e.g. 6) */
  totalFeet: number;
  /** Total length in inches (e.g. 72), for storage */
  totalInches: number;
  /** Normalized display string (e.g. "5' 12''") */
  displayText: string;
  /** True when input had both feet and inches parts */
  hasFeetAndInches: boolean;
}

/**
 * Parses length string like "5' 12''", "5' 12\"", "5 ft 12 in", or plain number.
 * Returns null if input is empty or not parseable.
 */
export function parseLengthFeetAndInches(input: string): ParsedLength | null {
  const trimmed = (input || '').trim();
  if (!trimmed) return null;

  // Match: optional number + optional ' or "ft", optional spaces, optional number + optional '' or " or "in"
  // Patterns: 5' 12'', 5' 12", 5 ft 12 in, 5 12
  const feetInchesMatch = trimmed.match(
    /^\s*(\d+(?:\.\d+)?)\s*(?:'|ft\.?|feet?)?\s*(?:(\d+(?:\.\d+)?)\s*(?:''|"|in\.?|inches?)?)?\s*$/i
  );
  if (feetInchesMatch) {
    const feetPart = parseFloat(feetInchesMatch[1]);
    const inchesPart = feetInchesMatch[2] != null ? parseFloat(feetInchesMatch[2]) : 0;
    if (isNaN(feetPart)) return null;
    const totalFeet = feetPart + inchesPart / 12;
    const totalInches = totalFeet * 12;
    // Normalize display: use X' Y'' when we have inches part
    const hasInchesPart = feetInchesMatch[2] != null && feetInchesMatch[2].trim() !== '';
    const displayText = hasInchesPart
      ? `${feetPart}' ${inchesPart}''`
      : trimmed;
    return {
      totalFeet,
      totalInches,
      displayText,
      hasFeetAndInches: hasInchesPart,
    };
  }

  // Plain number: treat as single value (feet or inches - caller decides)
  const num = parseFloat(trimmed);
  if (!isNaN(num)) {
    return {
      totalFeet: num,
      totalInches: num * 12,
      displayText: trimmed,
      hasFeetAndInches: false,
    };
  }

  return null;
}

/**
 * Parse input and return total inches for storage when input is "X' Y''" format.
 * If not in that format, returns null (caller should use existing conversion).
 */
export function parseLengthToInches(input: string): number | null {
  const parsed = parseLengthFeetAndInches(input);
  if (!parsed) return null;
  return parsed.totalInches;
}

/**
 * Get the bracket suffix for display when we have feet+inches input.
 * e.g. "5' 12''" -> " (6 ft)"
 * Returns empty string when no conversion to show.
 */
export function getLengthBracketSuffix(input: string): string {
  const parsed = parseLengthFeetAndInches(input);
  if (!parsed || !parsed.hasFeetAndInches) return '';
  const ft = Math.round(parsed.totalFeet * 100) / 100;
  return ` (${ft} ft)`;
}

/**
 * Convert total inches to feet and inches for two-field input display.
 */
export function inchesToFeetAndInches(totalInches: number): { feet: number; inches: number } {
  const feet = Math.floor(totalInches / 12);
  const inches = Math.round((totalInches - feet * 12) * 10000) / 10000;
  return { feet, inches };
}

/**
 * Stratix SCBPMW-1 expects length as feet with a single-quote suffix (e.g. "20'" for 240 inches).
 * `lengthInches` is the stored numeric length in inches.
 */
export function inchesToStratixScbpmwFeetLgthStr(lengthInches: unknown): string {
  const n = Number(lengthInches);
  if (!Number.isFinite(n) || n <= 0) return "0'";
  const feet = n / 12;
  if (Math.abs(feet - Math.round(feet)) < 1e-6) {
    return `${Math.round(feet)}'`;
  }
  const rounded = Math.round(feet * 10000) / 10000;
  return `${parseFloat(rounded.toFixed(4))}'`;
}
