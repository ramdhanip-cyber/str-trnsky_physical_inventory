import axios, { AxiosRequestConfig } from 'axios';

// Prefer the Invex env from the current page path (e.g. /devsss-T02/... → .../devsss-T02/stratix-info).
// Fall back to the known-working Stratix path when not launched under auxinvex.
const DEFAULT_STRATIX_INFO_BASE_URL = 'https://auxinvex.sss-steel.com/devsss-T02/stratix-info';

export const getStratixInfoBaseUrl = () => {
  if (typeof window === 'undefined') return DEFAULT_STRATIX_INFO_BASE_URL;

  try {
    const { origin, hostname, pathname } = window.location;
    if (!/auxinvex\.sss-steel\.com$/i.test(hostname)) {
      return DEFAULT_STRATIX_INFO_BASE_URL;
    }

    const match = pathname.match(/^\/([A-Za-z0-9._-]+)\//);
    if (match?.[1]) {
      return `${origin}/${match[1]}/stratix-info`;
    }
  } catch {
    // ignore and use default
  }

  return DEFAULT_STRATIX_INFO_BASE_URL;
};

/** @deprecated Use getStratixInfoBaseUrl() so env follows the deployed Invex path. */
export const STRATIX_INFO_BASE_URL = DEFAULT_STRATIX_INFO_BASE_URL;
const DEFAULT_LOGIN_ID = '';
const REQUEST_INPUT_TYPE = 'application/json; charset=utf-8';
const DEFAULT_INVERA_SESSION =
  '';

const HEADER_REQUEST_ID = 'invera-request-id';
const HEADER_USERNAME = 'invera-username';
const HEADER_CLIENT_PROGRAM_NAME = 'invera-client-program-name';
const HEADER_CLIENT_TYPE = 'invera-client-type';
const HEADER_CLIENT_PLATFORM = 'invera-client-platform';
const HEADER_CONTEXT_ID = 'invera-context-id';
const HEADER_SERVICE_NAME = 'invera-service-name';
const HEADER_SERVICE_ROUTING = 'invera-service-route';
const HEADER_SCREEN_ID = 'invera-screen-id';
const HEADER_CHARSET = 'invera-charset';
const HEADER_SESSION = 'invera-session';
const CONTENT_TYPE = 'content-type';

type BuildStratixInfoUrlParams = {
  serviceName: string; // e.g. "incpho"
  prsMd: string | number; // process mode, e.g. "1"
  pgmNm: string; // program name, e.g. "PHY"
  contextId?: string; // e.g. "XX000000null"
  userId?: string; // from lgnId in URL
  companyId?: string; // e.g. "SSS"
  locale?: string; // e.g. "en_USA"
  timestamp?: number | string; // e.g. Date.now()
  trailingServiceName?: string; // e.g. "INCPHO-1"; auto-derived when omitted
};

export type StratixInfoRequestParams = BuildStratixInfoUrlParams & {
  payload?: unknown; // POST body; empty object when omitted
  authQueryParam?: string; // raw "auth" value from URL, optional override
  requestConfig?: AxiosRequestConfig;
};

const normalizePathPart = (value: string) => String(value || '').trim().replace(/^\/+|\/+$/g, '');
const toSafeString = (value: unknown) => String(value ?? '');

const getDefaultUserId = () => {
  if (typeof window === 'undefined') return DEFAULT_LOGIN_ID;
  const params = new URLSearchParams(window.location.search || '');
  return params.get('lgnId') || sessionStorage.getItem('stratix.lgnId') || DEFAULT_LOGIN_ID;
};

export const getLgnIdFromUrl = (search?: string) => {
  const searchValue = typeof search === 'string'
    ? search
    : (typeof window !== 'undefined' ? window.location.search || '' : '');
  const params = new URLSearchParams(searchValue);
  return params.get('lgnId') || (typeof window !== 'undefined' ? sessionStorage.getItem('stratix.lgnId') || '' : '');
};

export const buildStratixInfoUrl = ({
  serviceName,
  prsMd,
  pgmNm,
  contextId = 'XX000000null',
  userId,
  companyId = 'SSS',
  locale = 'en_USA',
  timestamp = Date.now(),
  trailingServiceName
}: BuildStratixInfoUrlParams) => {
  const cleanedServiceName = normalizePathPart(serviceName);
  const cleanedPrsMd = normalizePathPart(String(prsMd));
  const cleanedPgmNm = normalizePathPart(pgmNm);
  const cleanedContextId = normalizePathPart(contextId);
  const resolvedUserId = normalizePathPart(userId || getDefaultUserId());
  const cleanedCompanyId = normalizePathPart(companyId);
  const cleanedLocale = normalizePathPart(locale);
  const cleanedTimestamp = normalizePathPart(String(timestamp));
  const resolvedTrailingServiceName = normalizePathPart(
    trailingServiceName || `${cleanedServiceName.toUpperCase()}-${cleanedPrsMd}`
  );

  if (!cleanedServiceName) throw new Error('serviceName is required');
  if (!cleanedPrsMd) throw new Error('prsMd is required');
  if (!cleanedPgmNm) throw new Error('pgmNm is required');
  if (!resolvedUserId) throw new Error('userId is required (or provide lgnId in URL query)');

  return [
    getStratixInfoBaseUrl(),
    cleanedServiceName,
    cleanedPrsMd,
    cleanedPgmNm,
    cleanedContextId,
    resolvedUserId,
    cleanedCompanyId,
    cleanedLocale,
    cleanedTimestamp,
    resolvedTrailingServiceName
  ].join('/');
};

type ParsedInveraAuth = {
  userId?: string;
  sessionToken?: string;
};

function splitAuthDetails(decoded: string) {
  const colonIdx = decoded.indexOf(':');
  if (colonIdx < 0) {
    return { sessionToken: '', parts: [] as string[] };
  }

  const sessionToken = decoded.slice(0, colonIdx).trim();
  const details = decoded.slice(colonIdx + 1);
  const parts = details
    .split(/[\^\x04]+/)
    .map((part) => part.replace(/\x04/g, '').replace(/\0/g, '').trim())
    .filter((part) => part.length > 0);

  return { sessionToken, parts };
}

/** Known Invera client/program prefixes in the session caret block */
const STANDALONE_PREFIXES = /^(?:TUXRUN|WMX)$/i;

function resolveLoginIdFromParts(parts: string[], expectedLgnId?: string) {
  const expected = String(expectedLgnId || '').trim().toLowerCase();

  if (parts.length >= 2 && STANDALONE_PREFIXES.test(parts[0])) {
    const candidate = parts[1];
    if (candidate && (!expected || candidate.toLowerCase() === expected)) {
      return candidate;
    }
  }

  if (expected) {
    for (const part of parts) {
      if (part.toLowerCase() === expected) return part;
      const extracted = part.replace(/^(?:WMXz|WMX|TUXRUN)/i, '').trim();
      if (extracted && extracted.toLowerCase() === expected) return extracted;
    }
  }

  for (const part of parts) {
    const extracted = part.replace(/^(?:WMXz|WMX|TUXRUN)/i, '').trim();
    if (extracted) return extracted;
  }

  return '';
}

const parseInveraAuthFromUrl = (authQueryParam?: string): ParsedInveraAuth => {
  try {
    if (typeof window === 'undefined') return {};
    const params = new URLSearchParams(window.location.search || '');
    const rawAuth =
      authQueryParam ||
      params.get('auth') ||
      sessionStorage.getItem('stratix.auth') ||
      localStorage.getItem('serviceToken') ||
      '';
    if (!rawAuth) return {};

    const encoded = rawAuth.startsWith('data:text/plain;base64,')
      ? rawAuth.replace('data:text/plain;base64,', '')
      : rawAuth;
    const decoded = atob(encoded).replace(/\x04/g, '').replace(/\0/g, '').trim();
    const lgnId = params.get('lgnId') || sessionStorage.getItem('stratix.lgnId') || '';
    const { sessionToken, parts } = splitAuthDetails(decoded);
    const fallbackUserId = resolveLoginIdFromParts(parts, lgnId);

    return {
      sessionToken: sessionToken || undefined,
      userId: fallbackUserId || undefined,
    };
  } catch (error) {
    console.warn('Unable to parse Invera auth payload from URL:', error);
    return {};
  }
};

const getAuthParamFromUrl = () => {
  if (typeof window === 'undefined') return '';
  const params = new URLSearchParams(window.location.search || '');
  return params.get('auth') || '';
};

const getPersistedStratixAuth = () => {
  if (typeof window === 'undefined') return '';
  return (
    sessionStorage.getItem('stratix.auth') ||
    localStorage.getItem('serviceToken') ||
    ''
  );
};

const resolveContextId = (contextId: string | undefined, requestId: string | number) => {
  const raw = normalizePathPart(toSafeString(contextId));
  if (raw && raw !== 'XX000000null') return raw;
  // Prefer XX-style context used by successful SCBPMW/STV calls.
  const rid = toSafeString(requestId).replace(/\D/g, '');
  const numeric = rid.slice(-14) || '0';
  return `XX${numeric.padStart(14, '0')}`;
};

const resolveInveraSessionHeader = () => {
  // Prefer live auth= from URL, then sessionStorage stratix.auth (persisted at launch),
  // then localStorage serviceToken as a legacy fallback.
  const rawAuth = (getAuthParamFromUrl() || getPersistedStratixAuth()).trim();
  if (rawAuth) {
    try {
      return /%[0-9A-Fa-f]{2}/.test(rawAuth)
        ? decodeURIComponent(rawAuth).trim()
        : rawAuth;
    } catch {
      return rawAuth;
    }
  }
  // Strip optional "; GLog=..." only — do not split on ";" inside data:text/plain;base64,...
  const raw = DEFAULT_INVERA_SESSION.trim();
  const glogIdx = raw.indexOf('; GLog=');
  const tokenPart = glogIdx >= 0 ? raw.slice(0, glogIdx) : raw;
  try {
    const decoded = /%[0-9A-Fa-f]{2}/.test(tokenPart)
      ? decodeURIComponent(tokenPart)
      : tokenPart;
    return decoded.trim();
  } catch {
    return tokenPart.trim();
  }
};

export const callStratixInfoService = async ({
  serviceName,
  prsMd,
  pgmNm,
  contextId = 'XX000000null',
  userId,
  companyId = 'SSS',
  locale = 'en_USA',
  timestamp,
  trailingServiceName,
  payload,
  authQueryParam,
  requestConfig
}: StratixInfoRequestParams) => {
  const parsedAuth = parseInveraAuthFromUrl(authQueryParam);
  const resolvedUserId = userId || getDefaultUserId() || parsedAuth.userId || DEFAULT_LOGIN_ID || '';
  const requestId = timestamp || Date.now();
  const resolvedContextId = resolveContextId(contextId, requestId);
  const resolvedSession = resolveInveraSessionHeader();
  const url = buildStratixInfoUrl({
    serviceName,
    prsMd,
    pgmNm,
    contextId: resolvedContextId,
    userId: resolvedUserId,
    companyId,
    locale,
    timestamp: requestId,
    trailingServiceName
  });

  const headers = {
    [CONTENT_TYPE]: REQUEST_INPUT_TYPE,
    [HEADER_CHARSET]: 'ISO-8859-15',
    [HEADER_CLIENT_PLATFORM]: 'Windows',
    [HEADER_CLIENT_PROGRAM_NAME]: 'phy',
    [HEADER_CLIENT_TYPE]: 'desktop',
    [HEADER_CONTEXT_ID]: resolvedContextId,
    [HEADER_SCREEN_ID]: 'IN.6300.05',
    [HEADER_REQUEST_ID]: requestId,
    [HEADER_SERVICE_NAME]: serviceName,
    [HEADER_SERVICE_ROUTING]: 'PR',
    [HEADER_USERNAME]: resolvedUserId || parsedAuth.userId || '',
    [HEADER_SESSION]: resolvedSession,
    ...(requestConfig?.headers || {}),
  };

  return axios.post(url, JSON.stringify(payload ?? {}), {
    ...(requestConfig || {}),
    method: 'POST',
    headers,
  });
};

/** Parse INCPHO create response: { output: { rtnSts, cntPfx, cntNo } } */
export type IncphoCountOutput = {
  rtnSts?: number;
  cntPfx?: string;
  cntNo?: number;
};

export const parseIncphoCountOutput = (data: unknown): IncphoCountOutput | null => {
  if (!data || typeof data !== 'object') return null;
  const root = data as Record<string, unknown>;
  const output = (root.output ?? root) as Record<string, unknown> | null;
  if (!output || typeof output !== 'object') return null;
  const cntNoRaw = output.cntNo;
  const rtnStsRaw = output.rtnSts;
  return {
    rtnSts: rtnStsRaw === undefined || rtnStsRaw === null ? undefined : Number(rtnStsRaw),
    cntPfx: output.cntPfx != null ? String(output.cntPfx) : undefined,
    cntNo:
      cntNoRaw === undefined || cntNoRaw === null || Number.isNaN(Number(cntNoRaw))
        ? undefined
        : Number(cntNoRaw),
  };
};

/** URL segment after INCPHO: e.g. cntNo 4477636 → XX0000004477636 */
export const buildScbpmwContextIdFromCntNo = (cntNo: number) => {
  const n = Math.floor(Number(cntNo));
  if (!Number.isFinite(n)) return 'XX00000000000000';
  return `XX${String(n).padStart(14, '0')}`;
};

/** URL context segment from item control number, e.g. 5255156 → XX0000005255156 */
export const buildScbpmwContextIdFromItemControlNo = (itemControlNo?: string | null) => {
  const digits = String(itemControlNo || '').replace(/\D/g, '');
  if (!digits) return undefined;
  const n = parseInt(digits, 10);
  if (!Number.isFinite(n) || n <= 0) return undefined;
  return buildScbpmwContextIdFromCntNo(n);
};

export type ScbpmwStvWeightInput = {
  form?: string;
  grade?: string;
  size?: string;
  width?: number | string | null;
  length?: number | string | null;
  variance?: number | null;
  adj_qty?: number | null;
  checker_qty?: number | null;
  prd_itm_ctl_no?: string | null;
};

/** SCBPMW-1 payload for STV weight lookup (adjustment cost dialog). */
export const buildScbpmwStvWeightPayload = (item: ScbpmwStvWeightInput) => {
  const widthNum = Number(item.width);
  const widthStr = String(item.width ?? '').trim();
  const hasWidth =
    widthStr !== '' && widthStr !== '0' && !Number.isNaN(widthNum) && widthNum !== 0;

  const lenStr = String(item.length ?? '').trim();
  const lgthStr = lenStr === '' ? '0' : lenStr;

  const pcsCandidates = [
    item.variance,
    item.adj_qty,
    item.checker_qty,
  ];
  let pcs = 0;
  for (const candidate of pcsCandidates) {
    const n = Math.abs(Math.round(Number(candidate ?? 0)));
    if (n > 0) {
      pcs = n;
      break;
    }
  }
  if (pcs <= 0) {
    pcs = Math.max(1, Math.round(Number(item.checker_qty ?? 0)) || 1);
  }

  const payload: Record<string, string | number> = {
    aplnId: 'stv',
    calcMthd: 'T',
    coilLgthTyp: 'T',
    dimDsgn: 'F',
    frm: String(item.form || '').trim(),
    grd: String(item.grade || '').trim(),
    lgthStr,
    msrTyp: 'T',
    octgEntMd: '1',
    pcs,
    pcsTyp: 'A',
    prsMd: '1',
    refPfx: 'IN',
    size: String(item.size || '').trim(),
    trsWgtUm: 'LBS',
    wgtTyp: 'T',
  };

  if (hasWidth) {
    payload.wdthStr = String(widthNum);
  } else {
    payload.lgthDispFmt = 1;
  }

  return payload;
};

/** Fetch weight (wgtStr) via SCBPMW-1 / STV for adjustment cost dialog. */
export const fetchScbpmwStvWeight = async (item: ScbpmwStvWeightInput) => {
  const contextId = buildScbpmwContextIdFromItemControlNo(item.prd_itm_ctl_no);

  const response = await callStratixInfoService({
    serviceName: 'scbpmw',
    prsMd: '1',
    pgmNm: 'STV',
    contextId,
    trailingServiceName: 'SCBPMW-1',
    payload: buildScbpmwStvWeightPayload(item),
  });

  const output = parseScbpmwOutput(response.data);
  if (!output || output.rtnSts !== 0) {
    throw new Error(`SCBPMW returned status ${output?.rtnSts ?? 'unknown'}`);
  }

  const wgtStr = String(output.wgtStr ?? '').trim();
  if (!wgtStr) {
    throw new Error('SCBPMW did not return wgtStr');
  }

  // Stratix returns thousands separators, e.g. "5,168.00". parseFloat("5,168.00") → 5.
  const weight = parseFloat(wgtStr.replace(/,/g, ''));
  if (Number.isNaN(weight) || weight <= 0) {
    throw new Error(`Invalid wgtStr: ${wgtStr}`);
  }

  return weight;
};

/** Parse SCBPMW response output for measure/weight strings */
export type ScbpmwOutput = {
  rtnSts?: number;
  msrStr?: string;
  wgtStr?: string;
};

export const parseScbpmwOutput = (data: unknown): ScbpmwOutput | null => {
  if (!data || typeof data !== 'object') return null;
  const root = data as Record<string, unknown>;
  const output = (root.output ?? root) as Record<string, unknown> | null;
  if (!output || typeof output !== 'object') return null;
  return {
    rtnSts: output.rtnSts != null && output.rtnSts !== '' ? Number(output.rtnSts) : undefined,
    msrStr: output.msrStr != null ? String(output.msrStr) : undefined,
    wgtStr: output.wgtStr != null ? String(output.wgtStr) : undefined,
  };
};

/** INCTGP-1: tag assignment before INCPIE */
export type InctgpOutput = {
  rtnSts?: number;
  extlTagErr?: number;
  tagNo?: string;
};

export const parseInctgpOutput = (data: unknown): InctgpOutput | null => {
  if (!data || typeof data !== 'object') return null;
  const root = data as Record<string, unknown>;
  const output = (root.output ?? root) as Record<string, unknown> | null;
  if (!output || typeof output !== 'object') return null;
  const num = (v: unknown) =>
    v === undefined || v === null || v === '' ? undefined : Number(v);
  return {
    rtnSts: num(output.rtnSts),
    extlTagErr: num(output.extlTagErr),
    tagNo: output.tagNo != null ? String(output.tagNo) : undefined,
  };
};

/** INCPIE URL context segment, e.g. IN6300204477633 */
export const buildIncphieContextIdFromCntNo = (cntNo: number) => {
  const n = Math.floor(Number(cntNo));
  if (!Number.isFinite(n)) return 'IN63000000000000';
  return `IN6300${String(n).padStart(10, '0')}`;
};

export type IncphieOutput = {
  rtnSts?: number;
  itmCtlNo?: number;
  mrgCtlNo?: number;
  refItm?: number;
  refNo?: number;
  refPfx?: string;
  refSbitm?: number;
  refSeqNo?: number;
};

export const parseIncphieOutput = (data: unknown): IncphieOutput | null => {
  if (!data || typeof data !== 'object') return null;
  const root = data as Record<string, unknown>;
  const output = (root.output ?? root) as Record<string, unknown> | null;
  if (!output || typeof output !== 'object') return null;
  const num = (v: unknown) =>
    v === undefined || v === null || v === '' ? undefined : Number(v);
  return {
    rtnSts: num(output.rtnSts),
    itmCtlNo: num(output.itmCtlNo),
    mrgCtlNo: num(output.mrgCtlNo),
    refItm: num(output.refItm),
    refNo: num(output.refNo),
    refPfx: output.refPfx != null ? String(output.refPfx) : undefined,
    refSbitm: num(output.refSbitm),
    refSeqNo: num(output.refSeqNo),
  };
};

/** INBIAJ-6 material cost / value prep */
export type InbiajOutput = {
  rtnSts?: number;
  trsMatVal?: number;
};

export const parseInbiajOutput = (data: unknown): InbiajOutput | null => {
  if (!data || typeof data !== 'object') return null;
  const root = data as Record<string, unknown>;
  const output = (root.output ?? root) as Record<string, unknown> | null;
  if (!output || typeof output !== 'object') return null;
  const num = (v: unknown) =>
    v === undefined || v === null || v === '' ? undefined : Number(v);
  return {
    rtnSts: num(output.rtnSts),
    trsMatVal: num(output.trsMatVal),
  };
};

/** INCPHY-8 post cost to count */
export type IncphyOutput = {
  rtnSts?: number;
};

export const parseIncphyOutput = (data: unknown): IncphyOutput | null => {
  if (!data || typeof data !== 'object') return null;
  const root = data as Record<string, unknown>;
  const output = (root.output ?? root) as Record<string, unknown> | null;
  if (!output || typeof output !== 'object') return null;
  const num = (v: unknown) =>
    v === undefined || v === null || v === '' ? undefined : Number(v);
  return {
    rtnSts: num(output.rtnSts),
  };
};
