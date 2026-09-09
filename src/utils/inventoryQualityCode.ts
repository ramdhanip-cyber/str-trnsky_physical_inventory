/**
 * Maps inventory quality description (UI / remarks text) to Stratix single-character codes for invtQlty.
 * Examples: "Conforms to Std" → '-', "Finished" → 'F'
 */
export function mapInventoryQualityToCode(quality: string | undefined | null): string {
  const raw = String(quality ?? '').trim();
  if (!raw) return '-';

  // Single-character codes already stored (e.g. F, X, -)
  if (raw.length === 1 && /^[A-Z0-9\-]$/i.test(raw)) {
    return raw === '-' ? '-' : raw.toUpperCase();
  }

  const qualityLower = raw.toLowerCase();

  const qualityMap: Record<string, string> = {
    'conforms to std': '-',
    'conforms to standard': '-',
    'conforms to std.': '-',
    'conforms to standard.': '-',
    'conforms': '-',
    'standard': '-',
    'std': '-',
    'std.': '-',
    'standard.': '-',
    finished: 'F',
    'finished.': 'F',
    secondary: 'X',
    'mill claim': 'M',
    reject: 'R',
    rejected: 'R',
    scrap: 'S',
    'price protected': 'P',
    'price protection': 'P',
    protected: 'P',
  };

  if (qualityMap[qualityLower]) {
    return qualityMap[qualityLower];
  }

  for (const [key, code] of Object.entries(qualityMap)) {
    if (qualityLower.includes(key) || key.includes(qualityLower)) {
      return code;
    }
  }

  // Title-case exact keys used in adjustment / API
  const exactMap: Record<string, string> = {
    'Conforms to Std': '-',
    Secondary: 'X',
    'Mill Claim': 'M',
    Reject: 'R',
    Scrap: 'S',
    'Price Protected': 'P',
    Finished: 'F',
  };
  if (exactMap[raw]) {
    return exactMap[raw];
  }

  return '-';
}
