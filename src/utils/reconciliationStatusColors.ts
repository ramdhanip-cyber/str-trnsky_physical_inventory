/** Pastel palette for reconciliation status UI (chips, rows, filters, variance). */
export type ReconStatusKey = 'Match' | 'Undercount' | 'Overcount' | 'Orphaned';

export type ReconStatusPastel = {
  main: string;
  soft: string;
  softer: string;
  hover: string;
  chipBg: string;
  chipText: string;
};

export const RECON_STATUS_PASTEL: Record<ReconStatusKey, ReconStatusPastel> = {
  Match: {
    main: '#66BB6A',
    soft: 'rgba(102, 187, 106, 0.14)',
    softer: 'rgba(102, 187, 106, 0.07)',
    hover: 'rgba(102, 187, 106, 0.2)',
    chipBg: '#C8E6C9',
    chipText: '#2E7D32',
  },
  Undercount: {
    main: '#64B5F6',
    soft: 'rgba(100, 181, 246, 0.16)',
    softer: 'rgba(100, 181, 246, 0.08)',
    hover: 'rgba(100, 181, 246, 0.22)',
    chipBg: '#BBDEFB',
    chipText: '#1565C0',
  },
  Overcount: {
    main: '#FFB74D',
    soft: 'rgba(255, 183, 77, 0.16)',
    softer: 'rgba(255, 183, 77, 0.08)',
    hover: 'rgba(255, 183, 77, 0.22)',
    chipBg: '#FFE0B2',
    chipText: '#E65100',
  },
  Orphaned: {
    main: '#EF9A9A',
    soft: 'rgba(239, 154, 154, 0.16)',
    softer: 'rgba(239, 154, 154, 0.08)',
    hover: 'rgba(239, 154, 154, 0.22)',
    chipBg: '#FFCDD2',
    chipText: '#C62828',
  },
};

export const getReconStatusPastel = (status?: string | null): ReconStatusPastel | null => {
  if (!status) return null;
  if (status in RECON_STATUS_PASTEL) {
    return RECON_STATUS_PASTEL[status as ReconStatusKey];
  }
  return null;
};

export const getReconRowBackground = (status?: string | null, tone: 'base' | 'odd' | 'hover' = 'base'): string => {
  const pastel = getReconStatusPastel(status);
  if (!pastel) {
    if (tone === 'hover') return 'rgba(0, 0, 0, 0.04)';
    if (tone === 'odd') return 'rgba(15, 23, 42, 0.015)';
    return 'transparent';
  }
  if (tone === 'hover') return pastel.hover;
  if (tone === 'odd') return pastel.softer;
  return pastel.soft;
};

export const getReconVarianceColor = (status?: string | null, variance = 0): string => {
  const pastel = getReconStatusPastel(status);
  if (pastel) return pastel.main;
  if (variance === 0) return RECON_STATUS_PASTEL.Match.main;
  if (variance > 0) return RECON_STATUS_PASTEL.Overcount.main;
  return RECON_STATUS_PASTEL.Undercount.main;
};

export const getReconStatusChipSx = (status?: string | null) => {
  const pastel = getReconStatusPastel(status);
  if (!pastel) {
    return {
      fontWeight: 600,
      bgcolor: 'transparent',
      color: 'text.primary',
      border: '1px solid',
      borderColor: 'divider',
    };
  }
  return {
    fontWeight: 600,
    bgcolor: pastel.chipBg,
    color: pastel.chipText,
    border: '1px solid',
    borderColor: pastel.main,
  };
};
