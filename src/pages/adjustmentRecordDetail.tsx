import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { servicesAPI } from '../config/api';
import {
  parseIncphoCountOutput,
  parseScbpmwOutput,
  buildScbpmwContextIdFromCntNo,
  buildIncphieContextIdFromCntNo,
  parseIncphieOutput,
  parseInctgpOutput,
  parseInbiajOutput,
  parseIncphyOutput,
  getLgnIdFromUrl,
} from '../utils/stratixInfoApi';
import { inchesToStratixScbpmwFeetLgthStr } from '../utils/lengthUtils';
import { mapInventoryQualityToCode } from '../utils/inventoryQualityCode';
import { useSnackbar } from 'notistack';
import {
  Box,
  Paper,
  Typography,
  Breadcrumbs,
  Link as MLink,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  TableContainer,
  Chip,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  CircularProgress,
  Tooltip,
  IconButton,
  Stack,
  alpha,
  useTheme,
  Divider,
} from '@mui/material';
import ReplayIcon from '@mui/icons-material/Replay';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import CancelOutlinedIcon from '@mui/icons-material/CancelOutlined';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import Inventory2OutlinedIcon from '@mui/icons-material/Inventory2Outlined';
import PersonOutlineIcon from '@mui/icons-material/PersonOutline';
import CalendarTodayOutlinedIcon from '@mui/icons-material/CalendarTodayOutlined';
import FingerprintIcon from '@mui/icons-material/Fingerprint';

interface ApprovalHeader {
  aprvl_id: number;
  location_id: number;
  adj_name: string;
  request_type?: 'STANDARD' | 'NEW' | 'MIXED';
  status: string;
  approval_status: string;
  created_by?: string;
  created_at?: string;
  updated_at?: string;
}

type ApprovalDetailPageProps = {
  requestTypeView?: 'STANDARD' | 'NEW';
  backPath?: string;
  pageTitle?: string;
};

interface ApprovalItem {
  item_control_no?: string;
  system_tag_no?: string;
  form: string;
  grade: string;
  size: string;
  finish: string;
  ext_finish?: string;
  width?: number;
  length?: number;
  location?: string;
  mill?: string;
  heat?: string;
  quality_standards?: string;
  type?: string;
  system_qty: number;
  counted_qty: number;
  variance_qty: number;
  adj_qty: number;
  cost: number;
  amount: number;
  cost_uom?: string;
  /** After load, reservation rows only (physical count meta lifted to section_desc / count_tag_no). */
  adj_res_data?: Array<{ res_ref_no: string; res_ord_no: string; res_qty: number; res_wgt: number }>;
  adj_typ?: string;
  is_reserved?: number;
  is_adjusted?: number;
  adjust_status?: string;
  intchg_no?: number;
  msg_err_msg_typ?: string | null;
  msg_msg_var?: string | null;
  /** From reconciliation via adj_res_data.physicalCount (Not In System / NEW); not a DB column. */
  section_desc?: string;
  /** Physical count tag from reconciliation; from adj_res_data.physicalCount; not a DB column. */
  count_tag_no?: string;
}

type PhysicalCountMeta = { section_desc?: string; count_tag_no?: string };
type AdjResFromApi =
  | Array<{ res_ref_no: string; res_ord_no: string; res_qty: number; res_wgt: number }>
  | { reservations?: Array<{ res_ref_no: string; res_ord_no: string; res_qty: number; res_wgt: number }>; physicalCount?: PhysicalCountMeta }
  | null
  | undefined;

/** Parse JSONB adj_res_data: lift physicalCount for Stratix tagNo; keep reservation array only on the item. */
const normalizeApprovalItemFromApi = (
  raw: ApprovalItem & { adj_res_data?: string | AdjResFromApi }
): ApprovalItem => {
  const item = { ...raw };
  let adj: AdjResFromApi = item.adj_res_data as AdjResFromApi;
  if (typeof adj === 'string') {
    try {
      adj = JSON.parse(adj) as AdjResFromApi;
    } catch {
      adj = undefined;
    }
  }
  if (adj && typeof adj === 'object' && !Array.isArray(adj)) {
    const o = adj as {
      reservations?: Array<{ res_ref_no: string; res_ord_no: string; res_qty: number; res_wgt: number }>;
      physicalCount?: PhysicalCountMeta;
    };
    if (o.physicalCount) {
      item.section_desc = o.physicalCount.section_desc || item.section_desc;
      item.count_tag_no = o.physicalCount.count_tag_no || item.count_tag_no;
    }
    item.adj_res_data =
      Array.isArray(o.reservations) && o.reservations.length > 0 ? o.reservations : undefined;
  } else if (Array.isArray(adj)) {
    item.adj_res_data = adj;
  } else {
    item.adj_res_data = undefined;
  }
  return item as ApprovalItem;
};

/** Labels and explanations for Lines summary (matches adj_typ on each line). */
const ADJUSTMENT_TYPE_DETAILS: Record<string, { shortLabel: string; description: string }> = {
  QTY: {
    shortLabel: 'Quantity',
    description:
      'Adjusts inventory quantity to match the physical count (posts the variance between system and counted qty).',
  },
  AMT: {
    shortLabel: 'Amount',
    description:
      'Adjusts dollar value / extended amount without changing quantity (cost or value correction).',
  },
  NEW: {
    shortLabel: 'New',
    description:
      'Adds inventory for items not previously on the system (e.g. orphaned / not-in-system lines), including quantity and value.',
  },
  LOC: {
    shortLabel: 'Location',
    description:
      'Moves inventory to a different warehouse location without changing quantity or amount.',
  },
  TYP: {
    shortLabel: 'Quality Type',
    description:
      'Changes the inventory quality type (e.g. Master, Drop, Finished) without changing quantity or amount.',
  },
};

const ADJ_TYPE_DISPLAY_ORDER = ['QTY', 'AMT', 'NEW', 'LOC', 'TYP'] as const;
const normalizeAdjType = (adjType?: string) => String(adjType || 'QTY').trim().toUpperCase();
const formatDateYYYYMMDD = (date = new Date()) => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}${m}${d}`;
};
const parseAdjNameMeta = (adjName?: string) => {
  const raw = String(adjName || '').trim();
  if (!raw) return { branch: '', warehouse: '', locationName: '' };
  const parts = raw.split('_');
  const branch = parts[0] || '';
  const warehouse = parts[1] || '';
  // Pattern used in app: {branch}_{warehouse}_{location_desc}_{yyyy-mm-dd}
  // Location name may itself contain underscores, so take everything between warehouse and date.
  const locationName = parts.length > 3 ? parts.slice(2, -1).join('_') : (parts[2] || '');
  return { branch, warehouse, locationName };
};

const extractLocationDescFromResponse = (payload: unknown): string => {
  if (!payload || typeof payload !== 'object') return '';
  const root = payload as Record<string, unknown>;
  const candidateData = root.data && typeof root.data === 'object' ? (root.data as Record<string, unknown>) : root;
  const raw = candidateData.location_desc ?? candidateData.locationDesc;
  return raw != null ? String(raw).trim() : '';
};

/** Payload for SCBPMW-1 per NEW line (adds line to physical count). */
const buildScbpmwPayloadForNewItem = (item: ApprovalItem) => {
  const widthNum = Number(item.width);
  const widthStr = String(item.width ?? '').trim();
  const hasWidth =
    widthStr !== '' && widthStr !== '0' && !Number.isNaN(widthNum) && widthNum !== 0;

  const lenStr = String(item.length ?? '').trim();
  const lgthStr =
    lenStr === '' ? "0'" : inchesToStratixScbpmwFeetLgthStr(item.length);

  const pcsRaw = item.adj_qty ?? item.variance_qty ?? item.counted_qty ?? 0;
  const pcs = Math.round(Number(pcsRaw)) || 0;

  const base: Record<string, string | number> = {
    aplnId: 'phy',
    calcMthd: 'T',
    coilLgthTyp: 'T',
    dimDsgn: 'F',
    entMsr: 'E',
    fnsh: String(item.finish || '').trim(),
    frm: String(item.form || '').trim(),
    grd: String(item.grade || '').trim(),
    lgthStr,
    msrTyp: 'T',
    pcs,
    pcsTyp: 'A',
    prsMd: '1',
    refPfx: 'PH',
    size: String(item.size || '').trim(),
    wgtTyp: 'T',
  };
  if (hasWidth) {
    base.wdthStr = `${widthNum}"`;
  }
  return base;
};

/** INCTGP-1 before INCPIE: assigns tag on the physical count transaction. */
const buildInctgpPayloadForNewItem = (
  item: ApprovalItem,
  incpho: { cntPfx: string; cntNo: number }
) => ({
  fnsh: String(item.finish || '').trim(),
  frm: String(item.form || '').trim(),
  grd: String(item.grade || '').trim(),
  prsMd: '1',
  refPfx: incpho.cntPfx,
  size: String(item.size || '').trim(),
  trsNo: incpho.cntNo,
  trsPfx: incpho.cntPfx,
});

/** INCPIE-1 payload after SCBPMW + INCTGP (uses tagNo from INCTGP when present). */
const buildIncphiePayloadForNewItem = (
  item: ApprovalItem,
  meta: { branch: string; warehouse: string; locationName: string; locationDesc?: string },
  incpho: { cntPfx: string; cntNo: number },
  scb: { msrStr?: string; wgtStr?: string; inctgpTagNo?: string }
) => {
  const widthNum = Number(item.width);
  const widthStr = String(item.width ?? '').trim();
  const hasWidth =
    widthStr !== '' && widthStr !== '0' && !Number.isNaN(widthNum) && widthNum !== 0;

  const lenStr = String(item.length ?? '').trim();
  const lgthStr =
    lenStr === '' ? "0'" : inchesToStratixScbpmwFeetLgthStr(item.length);
  const wdthStr = hasWidth ? `${widthNum}"` : '0"';
  const trsPcs1 =
    Math.round(Number(item.adj_qty ?? item.variance_qty ?? item.counted_qty ?? 0)) || 0;

  const isPlaceholderSegment = (s: string) => {
    const t = s.trim();
    return !t || t === '-' || t === '—' || t === 'N/A';
  };
  const seg = (s: string | undefined) => {
    const t = String(s ?? '').trim();
    return isPlaceholderSegment(t) ? '' : t;
  };
  const sectionPart =
    seg(item.section_desc) || seg(item.location) || 'SECTION';
  const countTagPart = seg(item.count_tag_no) || seg(item.system_tag_no);
  const fallbackTagNo = countTagPart ? `${sectionPart}-${countTagPart}` : sectionPart;
  const tagNo = seg(scb.inctgpTagNo) || fallbackTagNo;

  const locationDesc = seg(meta.locationDesc) || seg(meta.locationName) || seg(item.location) || '—';
  const sectionDescForRmk = seg(item.section_desc) || seg(item.location) || '—';
  const tagIdForRmk = seg(item.count_tag_no) || seg(item.system_tag_no) || '—';
  const rcnlRmk = `${locationDesc} | ${sectionDescForRmk} | Tag No: ${tagIdForRmk}`;

  return {
    altEntMsr: 'E',
    bgtFor: 'K',
    brh: meta.branch,
    clgthTyp1: 'T',
    clgthTyp2: 'T',
    dimDsgn: 'F',
    efEvar: String(item.ext_finish || '').trim(),
    entMsr: 'E',
    fnsh: String(item.finish || '').trim(),
    frm: String(item.form || '').trim(),
    gaSizeStr: '',
    gaTyp: '',
    grd: String(item.grade || '').trim(),
    heat: String(item.heat || '').trim(),
    invtQlty: mapInventoryQualityToCode(item.quality_standards),
    invtTyp: String(item.type || '').trim(),
    lgthStr,
    loc: String(item.location || '').trim(),
    mill: String(item.mill || '').trim(),
    ownrBrh: meta.branch,
    prsMd: '1',
    rcnl: 1,
    rcnlRmk,
    refNo: incpho.cntNo,
    refPfx: incpho.cntPfx,
    size: String(item.size || '').trim(),
    tagNo,
    trsMsrStr1: String(scb.msrStr ?? ''),
    trsMsrTyp1: 'T',
    trsMsrTyp2: 'T',
    trsPcs1,
    trsPcsTyp1: 'A',
    trsPcsTyp2: 'T',
    trsWgtStr1: String(scb.wgtStr ?? ''),
    trsWgtTyp1: 'T',
    trsWgtTyp2: 'T',
    wdthStr,
    whs: meta.warehouse,
  };
};

/** INBIAJ-6 after INCPIE (material cost; uses SCBPMW msr/wgt strings). */
const buildInbiajPayloadForNewItem = (
  item: ApprovalItem,
  meta: { branch: string },
  scb: { msrStr?: string; wgtStr?: string }
) => {
  const lenStr = String(item.length ?? '').trim();
  const lgthStr =
    lenStr === '' ? "0'" : inchesToStratixScbpmwFeetLgthStr(item.length);
  const msr = String(scb.msrStr ?? '').trim();
  const wgt = String(scb.wgtStr ?? '').trim();
  const ohdPcs =
    Math.round(Number(item.adj_qty ?? item.variance_qty ?? item.counted_qty ?? 0)) || 0;
  const cst = Number(item.cost);
  const trsMatCst = Number.isFinite(cst) ? cst : 0;

  return {
    aplnId: 'stv',
    brh: meta.branch,
    cry: 'USD',
    dimDsgn: 'F',
    entMsr: 'E',
    frm: String(item.form || '').trim(),
    grd: String(item.grade || '').trim(),
    lgthStr,
    octgEntMd: '1',
    ohdMsrStr: msr ? `${msr}'` : "0'",
    ohdMsrTyp: 'T',
    ohdPcs,
    ohdPcsTyp: 'A',
    ohdWgtStr: wgt,
    ohdWgtTyp: 'T',
    prsMd: '6',
    refPfx: 'AJ',
    size: String(item.size || '').trim(),
    trsMatCst,
    trsMatCstUm: 'CWT',
  };
};

/** INCPHY-8 after INBIAJ (count value from trsMatVal). */
const buildIncphyPayloadForNewItem = (
  item: ApprovalItem,
  incpho: { cntPfx: string; cntNo: number },
  cntSeqNo: number,
  trsMatVal: number
) => {
  const cst = Number(item.cost);
  const cntCst = Number.isFinite(cst) ? cst : 0;
  return {
    cntCst,
    cntCstUm: 'CWT',
    cntNo: incpho.cntNo,
    cntPfx: incpho.cntPfx,
    cntSeqNo,
    cntVal: trsMatVal,
    prsMd: '8',
  };
};

const ApprovalRecordDetailPageView: React.FC<ApprovalDetailPageProps> = ({
  requestTypeView = 'STANDARD',
  backPath = '/adjustment-records',
  pageTitle = 'Adjustment Approval Detail',
}) => {
  const { aprvl_id } = useParams();
  const navigate = useNavigate();
  const theme = useTheme();
  const { enqueueSnackbar } = useSnackbar();
  const [header, setHeader] = useState<ApprovalHeader | null>(null);
  const [items, setItems] = useState<ApprovalItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [resolvedLocationDesc, setResolvedLocationDesc] = useState('');
  const [approveDialogOpen, setApproveDialogOpen] = useState(false);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [rowProcessing, setRowProcessing] = useState<Record<number, boolean>>({});

  const loadDetails = useCallback(async () => {
    if (!aprvl_id) return;
    setLoading(true);
    try {
      const resp = await servicesAPI.getApprovalRecordDetails(Number(aprvl_id));
      console.log('Approval details response:', resp.data);
      if (resp.data?.success) {
        const headerData = resp.data.data?.header || null;
        const itemsData = resp.data.data?.items || [];
        console.log('Header data:', headerData);
        console.log('Items data:', itemsData);

        const parsedItems = itemsData.map((row: ApprovalItem & { adj_res_data?: string | AdjResFromApi }) =>
          normalizeApprovalItemFromApi(row)
        );

        let fetchedLocationDesc = '';
        if (headerData?.location_id != null) {
          try {
            const locResp = await servicesAPI.getLocation(String(headerData.location_id));
            fetchedLocationDesc = extractLocationDescFromResponse(locResp.data);
          } catch (locErr) {
            console.warn('Unable to fetch location_desc for approval header:', locErr);
          }
        }

        const headerRequestType = String(headerData?.request_type || 'STANDARD').toUpperCase();
        if (headerRequestType === 'NEW' && requestTypeView !== 'NEW') {
          navigate(`/new-adjustment-records/${aprvl_id}`, { replace: true });
          return;
        }
        if (headerRequestType !== 'NEW' && requestTypeView === 'NEW') {
          navigate(`/adjustment-records/${aprvl_id}`, { replace: true });
          return;
        }

        setHeader(headerData);
        setItems(parsedItems);
        setResolvedLocationDesc(fetchedLocationDesc);
        setRowProcessing({});
      } else {
        console.error('API response not successful:', resp.data);
        enqueueSnackbar(resp.data?.error || 'Failed to load approval details', { variant: 'error' });
      }
    } catch (error) {
      console.error('Error loading approval details:', error);
      enqueueSnackbar('Failed to load approval details', { variant: 'error' });
    } finally {
      setLoading(false);
    }
  }, [aprvl_id, enqueueSnackbar, navigate, requestTypeView]);

  useEffect(() => {
    loadDetails();
  }, [loadDetails]);

  const handleApprove = async () => {
    setApproveDialogOpen(false);
    if (!aprvl_id) return;

    try {
      setProcessing(true);
      const newItems = items.filter((item) => normalizeAdjType(item.adj_typ) === 'NEW');
      const standardItems = items.filter((item) => normalizeAdjType(item.adj_typ) !== 'NEW');
      const hasNewAdjustmentType = newItems.length > 0;

      let processedItems: Array<{ item_control_no?: string; system_tag_no?: string; adj_typ?: string; intchg_no: number }> = [];
      let statusReasonMap: Record<number, { msg_err_msg_typ?: string | null; msg_msg_var?: string | null }> = {};

      // QTY/AMT continue through existing adjustment processing flow.
      if (standardItems.length > 0) {
        const lgnId = getLgnIdFromUrl().trim();
        if (!lgnId) {
          throw new Error('Login ID (lgnId) is required. Launch from Invex or include lgnId in the URL.');
        }

        enqueueSnackbar('Processing QTY/AMT items into system tables...', { variant: 'info' });
        const processData = {
          aprvl_id: Number(aprvl_id),
          lgnId,
          items: standardItems.map((item) => ({
            item_control_no: item.item_control_no || undefined,
            system_tag_no: item.system_tag_no || undefined,
            variance_qty: item.variance_qty || 0,
            adj_typ: normalizeAdjType(item.adj_typ),
            amount: item.amount || 0,
          })),
        };

        const processResponse = await servicesAPI.processAdjustmentItems(processData);
        if (!processResponse.data.success) {
          throw new Error(processResponse.data.error || 'Failed to process QTY/AMT items into system tables');
        }

        processedItems = processResponse.data.data.processed_items || [];
        statusReasonMap = processResponse.data.data.status_reason_map || {};
      }

      // NEW: one INCPHO, then per NEW line: SCBPMW → INCTGP → INCPIE → INBIAJ → INCPHY (sequential per line).
      let phCountSummary = '';
      let scbpmwSummary = '';
      let inctgpSummary = '';
      let incphieSummary = '';
      let inbiajSummary = '';
      let incphySummary = '';
      if (hasNewAdjustmentType) {
        enqueueSnackbar('Creating physical count (INCPHO-1) for all NEW lines...', { variant: 'info' });
        const headerMeta = parseAdjNameMeta(header?.adj_name);
        const cntDt = formatDateYYYYMMDD();
        const cntRmkFromLines =
          newItems.map((it) => String(it.location || '').trim()).find(Boolean) || '';
        const requestPayload = {
          bgtForFlg: 1,
          bgtForSel: 'E',
          cntDt,
          cntOwnr: 'O',
          cntPfx: 'PH',
          cntRmk: headerMeta.locationName || cntRmkFromLines || '-',
          cntRsn: 'NEW',
          cntTyp: 'N',
          cntTypFlg: 1,
          ownrFlg: 1,
          prsMd: '1',
          rsnFlg: 1,
          whs: headerMeta.warehouse || '-',
        };

        const incphoResponse = await servicesAPI.callStratixInfoService({
          serviceName: 'incpho',
          prsMd: '1',
          pgmNm: 'PHY',
          companyId: 'SSS',
          locale: 'en_USA',
          trailingServiceName: 'INCPHO-1',
          payload: requestPayload,
        });

        const incphoParsed = parseIncphoCountOutput(incphoResponse.data);
        if (incphoParsed?.cntPfx != null && incphoParsed.cntNo != null) {
          phCountSummary = ` Physical count: ${incphoParsed.cntPfx} ${incphoParsed.cntNo}.`;
          if (incphoParsed.rtnSts !== undefined && incphoParsed.rtnSts !== 0) {
            console.warn('INCPHO rtnSts non-zero:', incphoParsed);
          }

          const scbContextId = buildScbpmwContextIdFromCntNo(incphoParsed.cntNo);
          const incphieContextId = buildIncphieContextIdFromCntNo(incphoParsed.cntNo);
          const incphoRef = {
            cntPfx: incphoParsed.cntPfx,
            cntNo: incphoParsed.cntNo,
          };
          enqueueSnackbar(
            `Adding ${newItems.length} NEW line(s) (SCBPMW → INCTGP → INCPIE → INBIAJ → INCPHY per line)...`,
            { variant: 'info' }
          );
          const scbParts: string[] = [];
          const inctgpParts: string[] = [];
          const incParts: string[] = [];
          const inbiajParts: string[] = [];
          const incphyParts: string[] = [];
          for (let i = 0; i < newItems.length; i++) {
            const line = newItems[i];
            const baseTs = Date.now() + i * 1000;
            const scbPayload = buildScbpmwPayloadForNewItem(line);
            const scbResp = await servicesAPI.callStratixInfoService({
              serviceName: 'scbpmw',
              prsMd: '1',
              pgmNm: 'PHY',
              contextId: scbContextId,
              companyId: 'SSS',
              locale: 'en_USA',
              trailingServiceName: 'SCBPMW-1',
              timestamp: baseTs,
              payload: scbPayload,
            });
            const scbOut = parseScbpmwOutput(scbResp.data);
            const msr = scbOut?.msrStr ?? '—';
            const wgt = scbOut?.wgtStr ?? '—';
            scbParts.push(`#${i + 1} msrStr=${msr} wgtStr=${wgt}`);
            if (scbOut?.rtnSts !== undefined && scbOut.rtnSts !== 0) {
              console.warn('SCBPMW rtnSts non-zero:', scbOut, line);
            }

            const inctgpPayload = buildInctgpPayloadForNewItem(line, incphoRef);
            const inctgpResp = await servicesAPI.callStratixInfoService({
              serviceName: 'inctgp',
              prsMd: '1',
              pgmNm: 'PHY',
              contextId: scbContextId,
              companyId: 'SSS',
              locale: 'en_USA',
              trailingServiceName: 'INCTGP-1',
              timestamp: baseTs + 1,
              payload: inctgpPayload,
            });
            const inctgpOut = parseInctgpOutput(inctgpResp.data);
            const inctgpTagNo = inctgpOut?.tagNo?.trim();
            inctgpParts.push(
              `#${i + 1} tagNo=${inctgpTagNo ?? '—'} extlTagErr=${inctgpOut?.extlTagErr ?? '—'}`
            );
            if (inctgpOut?.rtnSts !== undefined && inctgpOut.rtnSts !== 0) {
              console.warn('INCTGP rtnSts non-zero:', inctgpOut, line);
            }
            if (inctgpOut?.extlTagErr !== undefined && inctgpOut.extlTagErr !== 0) {
              console.warn('INCTGP extlTagErr non-zero:', inctgpOut, line);
            }
            if (!inctgpTagNo) {
              console.warn('INCTGP response missing output.tagNo; INCPIE will use fallback tag string.', line);
            }

            const incPayload = buildIncphiePayloadForNewItem(
              line,
              { ...headerMeta, locationDesc: resolvedLocationDesc },
              incphoRef,
              {
                msrStr: scbOut?.msrStr,
                wgtStr: scbOut?.wgtStr,
                inctgpTagNo,
              }
            );
            const incResp = await servicesAPI.callStratixInfoService({
              serviceName: 'incpie',
              prsMd: '1',
              pgmNm: 'PHY',
              contextId: incphieContextId,
              companyId: 'SSS',
              locale: 'en_USA',
              trailingServiceName: 'INCPIE-1',
              timestamp: baseTs + 2,
              payload: incPayload,
            });
            const incOut = parseIncphieOutput(incResp.data);
            const itm = incOut?.itmCtlNo ?? '—';
            const sbitm = incOut?.refSbitm ?? '—';
            const seq = incOut?.refSeqNo ?? '—';
            incParts.push(`#${i + 1} itmCtlNo=${itm} refSbitm=${sbitm} refSeqNo=${seq}`);
            if (incOut?.rtnSts !== undefined && incOut.rtnSts !== 0) {
              console.warn('INCPIE rtnSts non-zero:', incOut, line);
            }

            const inbiajPayload = buildInbiajPayloadForNewItem(
              line,
              { branch: headerMeta.branch },
              { msrStr: scbOut?.msrStr, wgtStr: scbOut?.wgtStr }
            );
            const inbiajResp = await servicesAPI.callStratixInfoService({
              serviceName: 'inbiaj',
              prsMd: '6',
              pgmNm: 'PHY',
              contextId: incphieContextId,
              companyId: 'SSS',
              locale: 'en_USA',
              trailingServiceName: 'INBIAJ-6',
              timestamp: baseTs + 3,
              payload: inbiajPayload,
            });
            const inbiajOut = parseInbiajOutput(inbiajResp.data);
            const trsMatVal = inbiajOut?.trsMatVal;
            inbiajParts.push(
              `#${i + 1} trsMatVal=${trsMatVal ?? '—'}`
            );
            if (inbiajOut?.rtnSts !== undefined && inbiajOut.rtnSts !== 0) {
              console.warn('INBIAJ rtnSts non-zero:', inbiajOut, line);
            }

            const refSeqNo = incOut?.refSeqNo;
            if (
              trsMatVal !== undefined &&
              trsMatVal !== null &&
              !Number.isNaN(Number(trsMatVal)) &&
              refSeqNo !== undefined &&
              refSeqNo !== null &&
              !Number.isNaN(Number(refSeqNo))
            ) {
              const incphyPayload = buildIncphyPayloadForNewItem(
                line,
                incphoRef,
                Number(refSeqNo),
                Number(trsMatVal)
              );
              const incphyResp = await servicesAPI.callStratixInfoService({
                serviceName: 'incphy',
                prsMd: '8',
                pgmNm: 'PHY',
                contextId: incphieContextId,
                companyId: 'SSS',
                locale: 'en_USA',
                trailingServiceName: 'INCPHY-8',
                timestamp: baseTs + 4,
                payload: incphyPayload,
              });
              const incphyOut = parseIncphyOutput(incphyResp.data);
              incphyParts.push(`#${i + 1} ok`);
              if (incphyOut?.rtnSts !== undefined && incphyOut.rtnSts !== 0) {
                console.warn('INCPHY rtnSts non-zero:', incphyOut, line);
              }
            } else {
              console.warn(
                'Skipping INCPHY-8: need trsMatVal from INBIAJ and refSeqNo from INCPIE.',
                { trsMatVal, refSeqNo, line }
              );
            }
          }
          scbpmwSummary = ` SCBPMW: ${scbParts.join('; ')}.`;
          inctgpSummary = ` INCTGP: ${inctgpParts.join('; ')}.`;
          incphieSummary = ` INCPIE: ${incParts.join('; ')}.`;
          inbiajSummary = ` INBIAJ: ${inbiajParts.join('; ')}.`;
          incphySummary = incphyParts.length ? ` INCPHY: ${incphyParts.join('; ')}.` : '';
        } else {
          console.warn('INCPHO response missing output.cntPfx/cntNo:', incphoResponse.data);
          phCountSummary = ' Physical count created; could not read cntPfx/cntNo — skipped SCBPMW lines.';
        }
      }

      const controlNumbers = processedItems.map((item) => item.intchg_no).join(', ');

      enqueueSnackbar('Updating approval status...', { variant: 'info' });
      const approveResp = await servicesAPI.approveAdjustment({ aprvl_id: Number(aprvl_id) });

      if (!approveResp.data.success) {
        throw new Error(approveResp.data.error || 'Failed to update approval status');
      }

      enqueueSnackbar(
        `Successfully approved. Processed ${standardItems.length} QTY/AMT item(s) and ${newItems.length} NEW line(s).${phCountSummary}${scbpmwSummary}${inctgpSummary}${incphieSummary}${inbiajSummary}${incphySummary}${controlNumbers ? ` XI: ${controlNumbers}` : ''}`,
        { variant: 'success', autoHideDuration: 10000 }
      );

      setItems((prevItems) =>
        prevItems.map((item) => {
          const processedItem = processedItems.find(
            (p: { item_control_no?: string; system_tag_no?: string; adj_typ?: string; intchg_no: number }) => {
              const pControlNo = p.item_control_no && p.item_control_no !== 'N/A' ? p.item_control_no : null;
              const pTagNo = p.system_tag_no && p.system_tag_no !== 'N/A' ? p.system_tag_no : null;
              const itemControlNo = item.item_control_no || null;
              const itemTagNo = item.system_tag_no || null;
              const matchControlNo = pControlNo && itemControlNo && pControlNo === itemControlNo;
              const matchTagNo = pTagNo && itemTagNo && pTagNo === itemTagNo;
              const pAdjTyp = normalizeAdjType(p.adj_typ);
              const itemAdjTyp = normalizeAdjType(item.adj_typ);
              const matchAdjTyp = pAdjTyp === itemAdjTyp;
              return (matchControlNo || matchTagNo) && matchAdjTyp;
            }
          );

          if (processedItem && processedItem.intchg_no) {
            const intchgNo = processedItem.intchg_no;
            const statusReason = statusReasonMap[intchgNo] || processedItem;

            return {
              ...item,
              intchg_no: intchgNo,
              msg_err_msg_typ: statusReason.msg_err_msg_typ || null,
              msg_msg_var: statusReason.msg_msg_var || null,
            };
          }
          return item;
        })
      );

      if (header) {
        setHeader({
          ...header,
          status: 'Adjusting Items',
          approval_status: 'Approved',
        });
      }
    } catch (error: unknown) {
      console.error('Error approving adjustment:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      enqueueSnackbar(`Failed to approve adjustment: ${errorMessage}`, { variant: 'error' });
    } finally {
      setProcessing(false);
    }
  };

  const handleReject = async () => {
    setRejectDialogOpen(false);
    if (!aprvl_id) return;

    try {
      setProcessing(true);
      enqueueSnackbar('Rejecting adjustment...', { variant: 'info' });

      const resp = await servicesAPI.rejectAdjustment({ aprvl_id: Number(aprvl_id) });

      if (resp.data.success) {
        enqueueSnackbar('Adjustment rejected successfully', { variant: 'success' });
        await loadDetails();
      } else {
        throw new Error(resp.data.error || 'Failed to reject adjustment');
      }
    } catch (error: unknown) {
      console.error('Error rejecting adjustment:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      enqueueSnackbar(`Failed to reject adjustment: ${errorMessage}`, { variant: 'error' });
    } finally {
      setProcessing(false);
    }
  };

  const getMessageStatusColor = (status?: string | null) => {
    switch ((status || '').toUpperCase()) {
      case 'E':
        return 'error';
      case 'W':
        return 'warning';
      case 'I':
        return 'info';
      case 'S':
        return 'success';
      default:
        return 'default';
    }
  };

  const getMessageStatusLabel = (status?: string | null) => {
    switch ((status || '').toUpperCase()) {
      case 'E':
        return 'Error';
      case 'W':
        return 'Warning';
      case 'I':
        return 'Info';
      case 'S':
        return 'Success';
      default:
        return status || '-';
    }
  };

  const getAdjustmentTypeColor = (adjType?: string) => {
    switch ((adjType || '').toUpperCase()) {
      case 'QTY':
        return 'primary';
      case 'AMT':
        return 'secondary';
      case 'NEW':
        return 'success';
      case 'LOC':
        return 'info';
      case 'TYP':
        return 'warning';
      default:
        return 'default';
    }
  };

  const getAdjustmentTypeLabel = (adjType?: string) => {
    switch ((adjType || '').toUpperCase()) {
      case 'QTY':
        return 'Quantity';
      case 'AMT':
        return 'Amount';
      case 'NEW':
        return 'New';
      case 'LOC':
        return 'Location';
      case 'TYP':
        return 'Quality Type';
      default:
        return adjType || 'QTY';
    }
  };

  const handleReprocessItem = async (item: ApprovalItem, index: number) => {
    if (!aprvl_id) return;
    if (rowProcessing[index]) return;

    setRowProcessing((prev) => ({ ...prev, [index]: true }));
    try {
      enqueueSnackbar('Reprocessing adjustment for selected item...', { variant: 'info' });

      const lgnId = getLgnIdFromUrl().trim();
      if (!lgnId) {
        throw new Error('Login ID (lgnId) is required. Launch from Invex or include lgnId in the URL.');
      }

      const payload = {
        aprvl_id: Number(aprvl_id),
        lgnId,
        items: [
          {
            item_control_no: item.item_control_no || undefined,
            system_tag_no: item.system_tag_no || undefined,
            variance_qty: item.variance_qty || 0,
            adj_typ: normalizeAdjType(item.adj_typ),
            amount: item.amount || 0,
          },
        ],
      };

      const response = await servicesAPI.processAdjustmentItems(payload);
      if (!response.data?.success) {
        throw new Error(response.data?.error || 'Failed to regenerate adjustment');
      }

      const processedItems = response.data.data.processed_items || [];
      const statusReasonMap = response.data.data.status_reason_map || {};
      const processedItem = processedItems[0];

      if (processedItem) {
        const intchgNo = processedItem.intchg_no;
        const statusReason = statusReasonMap[intchgNo] || processedItem;

        setItems((prevItems) =>
          prevItems.map((it, idx) => {
            if (idx === index) {
              return {
                ...it,
                intchg_no: intchgNo,
                msg_err_msg_typ: statusReason.msg_err_msg_typ || null,
                msg_msg_var: statusReason.msg_msg_var || null,
              };
            }
            return it;
          })
        );
      }

      enqueueSnackbar('Item adjustment regenerated successfully.', { variant: 'success' });
    } catch (error) {
      console.error('Error reprocessing item:', error);
      const message = error instanceof Error ? error.message : 'Unknown error';
      enqueueSnackbar(`Failed to regenerate adjustment: ${message}`, { variant: 'error' });
    } finally {
      setRowProcessing((prev) => {
        const updated = { ...prev };
        delete updated[index];
        return updated;
      });
    }
  };

  const canApprove = header?.approval_status === 'Under Approval' && header?.status === 'In Progress';
  const canReject = header?.approval_status === 'Under Approval' && header?.status === 'In Progress';

  const lineTotals = useMemo(() => {
    const amt = items.reduce((s, it) => s + (Number(it.amount) || 0), 0);
    const qtyVar = items.reduce((s, it) => s + (Number(it.variance_qty) || 0), 0);
    const typeCounts: Record<string, number> = {};
    items.forEach((it) => {
      const key = normalizeAdjType(it.adj_typ);
      typeCounts[key] = (typeCounts[key] || 0) + 1;
    });
    const knownOrdered = ADJ_TYPE_DISPLAY_ORDER.filter((c) => typeCounts[c]);
    const otherKeys = Object.keys(typeCounts)
      .filter((c) => !ADJ_TYPE_DISPLAY_ORDER.includes(c as (typeof ADJ_TYPE_DISPLAY_ORDER)[number]))
      .sort();
    const orderedCodes = [...knownOrdered, ...otherKeys];
    const typeBreakdown = orderedCodes.map((code) => {
      const meta = ADJUSTMENT_TYPE_DETAILS[code];
      return {
        code,
        count: typeCounts[code],
        shortLabel: meta?.shortLabel ?? code,
        description:
          meta?.description ??
          `This approval includes ${typeCounts[code]} line(s) with adjustment type “${code}”.`,
      };
    });
    return { amt, qtyVar, count: items.length, typeCounts, typeBreakdown };
  }, [items]);

  const pageBg = useMemo(
    () =>
      theme.palette.mode === 'dark'
        ? `linear-gradient(180deg, ${alpha(theme.palette.primary.dark, 0.14)} 0%, transparent 380px)`
        : `linear-gradient(180deg, ${alpha(theme.palette.primary.main, 0.07)} 0%, transparent 400px)`,
    [theme]
  );

  if (loading) {
    return (
      <Box
        sx={{
          minHeight: 400,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: pageBg,
          borderRadius: 3,
        }}
      >
        <Stack alignItems="center" spacing={2}>
          <CircularProgress size={40} />
          <Typography variant="body2" color="text.secondary">
            Loading adjustment record…
          </Typography>
        </Stack>
      </Box>
    );
  }

  if (!header && !loading) {
    return (
      <Box sx={{ pb: 4, background: pageBg, minHeight: '60vh', borderRadius: 3 }}>
        <Breadcrumbs sx={{ mb: 2 }} separator="›">
          <MLink underline="hover" color="inherit" onClick={() => navigate('/dashboard')} sx={{ cursor: 'pointer', fontWeight: 500 }}>
            Dashboard
          </MLink>
          <MLink underline="hover" color="inherit" onClick={() => navigate(backPath)} sx={{ cursor: 'pointer', fontWeight: 500 }}>
            {requestTypeView === 'NEW' ? 'New item approval records' : 'Adjustment records'}
          </MLink>
          <Typography color="text.primary" fontWeight={600}>
            #{aprvl_id}
          </Typography>
        </Breadcrumbs>
        <Paper
          elevation={0}
          sx={{
            p: 6,
            textAlign: 'center',
            borderRadius: 3,
            border: 1,
            borderColor: 'divider',
            maxWidth: 480,
            mx: 'auto',
          }}
        >
          <Typography variant="h6" fontWeight={800} gutterBottom>
            Record not found
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            This approval may have been removed or the link is invalid.
          </Typography>
          <Button variant="contained" startIcon={<ArrowBackIcon />} onClick={() => navigate(backPath)} sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 700 }}>
            Back to list
          </Button>
        </Paper>
      </Box>
    );
  }

  return (
    <Box sx={{ pb: 4, background: pageBg }}>
      <Breadcrumbs sx={{ mb: 2 }} separator="›">
        <MLink underline="hover" color="inherit" onClick={() => navigate('/dashboard')} sx={{ cursor: 'pointer', fontWeight: 500 }}>
          Dashboard
        </MLink>
        <MLink underline="hover" color="inherit" onClick={() => navigate(backPath)} sx={{ cursor: 'pointer', fontWeight: 500 }}>
          {requestTypeView === 'NEW' ? 'New item approval records' : 'Adjustment records'}
        </MLink>
        <Typography color="text.primary" fontWeight={600}>
          #{aprvl_id}
        </Typography>
      </Breadcrumbs>

      <Box
        sx={{
          mb: 3,
          background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, #1E5A8A 100%)`,
          borderRadius: 4,
          px: { xs: 2, sm: 3 },
          py: { xs: 2.25, sm: 2.75 },
          color: 'white',
          position: 'relative',
          overflow: 'hidden',
          boxShadow: '0 14px 36px rgba(12,44,72,0.28)',
        }}
      >
        <Box sx={{ position: 'absolute', top: -30, right: -10, width: 180, height: 180, borderRadius: '50%', background: 'rgba(255,255,255,0.07)' }} />
        <Box sx={{ position: 'absolute', bottom: -55, left: '22%', width: 220, height: 220, borderRadius: '50%', background: 'rgba(255,255,255,0.05)' }} />

        <Stack
          direction={{ xs: 'column', lg: 'row' }}
          spacing={2}
          justifyContent="space-between"
          alignItems={{ xs: 'stretch', lg: 'flex-start' }}
          sx={{ position: 'relative' }}
        >
          <Stack direction="row" spacing={2} alignItems="flex-start">
            <IconButton
              onClick={() => navigate(backPath)}
              sx={{
                mt: 0.25,
                bgcolor: 'rgba(255,255,255,0.14)',
                color: 'white',
                border: '1px solid rgba(255,255,255,0.18)',
                '&:hover': { bgcolor: 'rgba(255,255,255,0.22)' },
              }}
              size="small"
            >
              <ArrowBackIcon fontSize="small" />
            </IconButton>
            <Box>
              <Stack direction="row" alignItems="center" spacing={1} flexWrap="wrap" useFlexGap>
                <Typography
                  variant="h4"
                  sx={{
                    fontWeight: 800,
                    letterSpacing: '-0.02em',
                    color: 'white',
                  }}
                >
                  {pageTitle} #{aprvl_id}
                </Typography>
                <Chip
                  size="small"
                  label={header?.status || '—'}
                  sx={{ fontWeight: 700, bgcolor: 'rgba(255,255,255,0.18)', color: 'white', border: '1px solid rgba(255,255,255,0.15)' }}
                />
                <Chip
                  size="small"
                  label={header?.approval_status || '—'}
                  sx={{ fontWeight: 700, bgcolor: 'rgba(255,255,255,0.12)', color: 'white', border: '1px solid rgba(255,255,255,0.18)' }}
                />
              </Stack>
              <Typography variant="body2" sx={{ mt: 0.75, maxWidth: 760, color: 'rgba(255,255,255,0.82)' }}>
                {header?.adj_name}
              </Typography>
            </Box>
          </Stack>

          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.25} sx={{ minWidth: { sm: 280 } }}>
            {canApprove && (
              <Button
                variant="contained"
                fullWidth
                startIcon={<CheckCircleOutlineIcon />}
                onClick={() => setApproveDialogOpen(true)}
                disabled={processing}
                sx={{
                  borderRadius: 2.5,
                  textTransform: 'none',
                  fontWeight: 700,
                  py: 1.2,
                  boxShadow: 'none',
                  bgcolor: '#1f8b4c',
                  color: 'white',
                  '&:hover': { bgcolor: '#18703d', boxShadow: 'none' },
                }}
              >
                Approve
              </Button>
            )}
            {canReject && (
              <Button
                variant="outlined"
                fullWidth
                startIcon={<CancelOutlinedIcon />}
                onClick={() => setRejectDialogOpen(true)}
                disabled={processing}
                sx={{
                  borderRadius: 2.5,
                  textTransform: 'none',
                  fontWeight: 700,
                  py: 1.2,
                  color: 'white',
                  borderColor: 'rgba(255,255,255,0.35)',
                  bgcolor: 'rgba(255,255,255,0.06)',
                  '&:hover': { borderColor: 'rgba(255,255,255,0.5)', bgcolor: 'rgba(255,255,255,0.12)' },
                }}
              >
                Reject
              </Button>
            )}
          </Stack>
        </Stack>
      </Box>

      <Paper
        elevation={0}
        sx={{
          mb: 2.5,
          borderRadius: 3,
          border: 1,
          borderColor: 'divider',
          overflow: 'hidden',
          background: alpha(theme.palette.background.paper, 0.95),
          backdropFilter: 'blur(10px)',
        }}
      >
        <Stack direction={{ xs: 'column', xl: 'row' }} spacing={0}>
          <Box sx={{ flex: 1, p: { xs: 2, sm: 2.5 } }}>
            <Stack direction="row" alignItems="center" spacing={1.25} sx={{ mb: 1.5 }}>
              <FingerprintIcon fontSize="small" color="action" />
              <Typography variant="overline" color="text.secondary" fontWeight={700}>
                Approval Summary
              </Typography>
            </Stack>

            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ mb: 1.75 }}>
              <Chip size="small" label={`Location ${header?.location_id ?? '—'}`} sx={{ fontWeight: 700 }} />
              <Chip size="small" icon={<PersonOutlineIcon />} label={header?.created_by || '—'} variant="outlined" />
              <Chip
                size="small"
                icon={<CalendarTodayOutlinedIcon />}
                label={header?.created_at ? new Date(header.created_at).toLocaleString() : '—'}
                variant="outlined"
              />
              <Chip
                size="small"
                label={`Updated ${header?.updated_at ? new Date(header.updated_at).toLocaleString() : '—'}`}
                variant="outlined"
              />
            </Stack>

            <Stack direction="row" spacing={1.5} flexWrap="wrap" useFlexGap>
              <Paper elevation={0} sx={{ px: 1.5, py: 1.25, borderRadius: 2.5, border: 1, borderColor: 'divider', minWidth: 120 }}>
                <Typography variant="caption" color="text.secondary">Lines</Typography>
                <Typography variant="h6" fontWeight={800}>{lineTotals.count}</Typography>
              </Paper>
              <Paper elevation={0} sx={{ px: 1.5, py: 1.25, borderRadius: 2.5, border: 1, borderColor: 'divider', minWidth: 140 }}>
                <Typography variant="caption" color="text.secondary">Net variance qty</Typography>
                <Typography variant="h6" fontWeight={800}>{lineTotals.qtyVar}</Typography>
              </Paper>
              <Paper
                elevation={0}
                sx={{
                  px: 1.5,
                  py: 1.25,
                  borderRadius: 2.5,
                  border: 1,
                  borderColor: alpha(theme.palette.primary.main, 0.22),
                  bgcolor: alpha(theme.palette.primary.main, 0.05),
                  minWidth: 160,
                }}
              >
                <Typography variant="caption" color="text.secondary">Total amount</Typography>
                <Typography variant="h6" fontWeight={800} color="primary.main">
                  ${lineTotals.amt.toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </Typography>
              </Paper>
            </Stack>
          </Box>

          <Divider orientation="vertical" flexItem sx={{ display: { xs: 'none', xl: 'block' } }} />
          <Divider sx={{ display: { xs: 'block', xl: 'none' } }} />

          <Box
            sx={{
              width: { xs: '100%', xl: 360 },
              p: { xs: 2, sm: 2.5 },
              background: `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.05)} 0%, ${alpha(theme.palette.background.paper, 0.98)} 100%)`,
            }}
          >
            <Stack direction="row" alignItems="center" spacing={1.25} sx={{ mb: 1.5 }}>
              <Inventory2OutlinedIcon fontSize="small" color="primary" />
              <Typography variant="overline" color="text.secondary" fontWeight={700}>
                Adjustment Types
              </Typography>
            </Stack>

            {lineTotals.typeBreakdown.length === 0 ? (
              <Typography variant="body2" color="text.secondary">
                No line items.
              </Typography>
            ) : (
              <>
                <Stack direction="row" flexWrap="wrap" useFlexGap spacing={1} sx={{ mb: 1.25 }}>
                  {lineTotals.typeBreakdown.map((row) => (
                    <Chip
                      key={row.code}
                      size="small"
                      label={`${row.shortLabel} (${row.code}) ×${row.count}`}
                      color={getAdjustmentTypeColor(row.code)}
                      variant={row.code === 'AMT' ? 'outlined' : 'filled'}
                      sx={{ fontWeight: 700 }}
                    />
                  ))}
                </Stack>
                <Typography variant="caption" color="text.secondary" sx={{ lineHeight: 1.5, display: 'block' }}>
                  Review the line-item table below for full quantities, amounts, reservations, and interchange results.
                </Typography>
              </>
            )}
          </Box>
        </Stack>
      </Paper>

      <Paper
        elevation={0}
        sx={{
          borderRadius: 3,
          border: 1,
          borderColor: 'divider',
          overflow: 'hidden',
          background: alpha(theme.palette.background.paper, 0.95),
          backdropFilter: 'blur(12px)',
          boxShadow: '0 14px 36px rgba(12,44,72,0.08)',
        }}
      >
        <Box sx={{ px: { xs: 2, sm: 3 }, py: 1.75, borderBottom: 1, borderColor: 'divider', bgcolor: alpha(theme.palette.primary.main, 0.03) }}>
          <Typography variant="subtitle1" fontWeight={800} sx={{ color: theme.palette.primary.main }}>
            Line items
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Quantities, amounts, reservations, and system interchange status per line.
          </Typography>
        </Box>
        <TableContainer sx={{ maxHeight: { xs: 'none', lg: 'calc(100vh - 290px)' } }}>
          <Table stickyHeader size="small" sx={{ '& .MuiTableCell-head': { fontWeight: 700, bgcolor: alpha(theme.palette.primary.main, 0.06), whiteSpace: 'nowrap' } }}>
            <TableHead>
              <TableRow>
                <TableCell>Tag</TableCell>
                <TableCell>Control No</TableCell>
                <TableCell>Form</TableCell>
                <TableCell>Grade</TableCell>
                <TableCell>Size</TableCell>
                <TableCell>Finish</TableCell>
                <TableCell align="right">System Qty</TableCell>
                <TableCell align="right">Counted Qty</TableCell>
                <TableCell align="right">Variance</TableCell>
                <TableCell align="right">Adj Qty</TableCell>
                <TableCell>Type</TableCell>
                <TableCell align="right">Amount</TableCell>
                <TableCell>UM</TableCell>
                <TableCell>Reservations</TableCell>
                <TableCell>Reserved</TableCell>
                <TableCell align="right">Intchg No</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Reason</TableCell>
                <TableCell align="center">Action</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {items.map((it, idx) => {
                const resText =
                  it.adj_res_data && it.adj_res_data.length > 0
                    ? it.adj_res_data.map((r) => `${r.res_ref_no} (${r.res_ord_no}) x${r.res_qty}/${r.res_wgt}`).join(', ')
                    : '—';
                return (
                  <TableRow
                    key={idx}
                    hover
                    sx={{
                      '&:nth-of-type(even)': { bgcolor: alpha(theme.palette.action.hover, 0.35) },
                    }}
                  >
                    <TableCell sx={{ fontWeight: 600 }}>{it.system_tag_no || '—'}</TableCell>
                    <TableCell>{it.item_control_no || '—'}</TableCell>
                    <TableCell>{it.form}</TableCell>
                    <TableCell>{it.grade}</TableCell>
                    <TableCell>{it.size}</TableCell>
                    <TableCell>{it.finish}</TableCell>
                    <TableCell align="right">{it.system_qty}</TableCell>
                    <TableCell align="right">{it.counted_qty}</TableCell>
                    <TableCell align="right">{it.variance_qty}</TableCell>
                    <TableCell align="right">{it.adj_qty}</TableCell>
                    <TableCell>
                      <Chip label={getAdjustmentTypeLabel(it.adj_typ)} color={getAdjustmentTypeColor(it.adj_typ)} size="small" sx={{ fontWeight: 700 }} />
                    </TableCell>
                    <TableCell align="right" sx={{ fontWeight: 600 }}>
                      {(it.amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </TableCell>
                    <TableCell>{it.cost_uom || '—'}</TableCell>
                    <TableCell sx={{ maxWidth: 200 }}>
                      <Typography variant="caption" sx={{ display: 'block', lineHeight: 1.4 }}>
                        {resText}
                      </Typography>
                    </TableCell>
                    <TableCell>{it.is_reserved ? 'Yes' : 'No'}</TableCell>
                    <TableCell align="right">
                      {it.intchg_no && it.intchg_no > 0 ? (
                        <Typography sx={{ fontWeight: 800, color: 'primary.main', fontFamily: 'ui-monospace, monospace' }}>{it.intchg_no}</Typography>
                      ) : (
                        <Typography sx={{ color: 'text.secondary' }}>—</Typography>
                      )}
                    </TableCell>
                    <TableCell>
                      {it.msg_err_msg_typ ? (
                        <Chip label={getMessageStatusLabel(it.msg_err_msg_typ)} color={getMessageStatusColor(it.msg_err_msg_typ)} size="small" />
                      ) : (
                        <Typography sx={{ color: 'text.secondary' }}>—</Typography>
                      )}
                    </TableCell>
                    <TableCell sx={{ maxWidth: 260 }}>
                      <Typography variant="body2" sx={{ whiteSpace: 'pre-line', fontSize: '0.8rem' }}>
                        {it.msg_msg_var || '—'}
                      </Typography>
                    </TableCell>
                    <TableCell align="center">
                      <Tooltip title={it.msg_err_msg_typ === 'E' ? 'Regenerate adjustment for this item' : 'Available when status is Error'}>
                        <span style={{ display: 'inline-flex' }}>
                          <IconButton
                            size="small"
                            color="primary"
                            disabled={it.msg_err_msg_typ !== 'E' || !!rowProcessing[idx] || processing}
                            onClick={() => handleReprocessItem(it, idx)}
                            sx={{ bgcolor: alpha(theme.palette.primary.main, 0.08), '&:hover': { bgcolor: alpha(theme.palette.primary.main, 0.16) } }}
                          >
                            {rowProcessing[idx] ? <CircularProgress size={18} /> : <ReplayIcon fontSize="small" />}
                          </IconButton>
                        </span>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                );
              })}
              {items.length === 0 && (
                <TableRow>
                  <TableCell colSpan={19}>
                    <Box sx={{ py: 6, textAlign: 'center' }}>
                      <Typography color="text.secondary">No line items for this record.</Typography>
                    </Box>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      <Dialog
        open={approveDialogOpen}
        onClose={() => setApproveDialogOpen(false)}
        aria-labelledby="approve-dialog-title"
        PaperProps={{ sx: { borderRadius: 3, maxWidth: 440 } }}
      >
        <DialogTitle id="approve-dialog-title" sx={{ fontWeight: 800, pb: 0 }}>
          Approve adjustment
        </DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ color: 'text.secondary', mt: 1 }}>
            This will post all lines to the system tables and mark the approval as processed. Continue?
          </DialogContentText>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2, gap: 1 }}>
          <Button onClick={() => setApproveDialogOpen(false)} color="inherit" sx={{ textTransform: 'none', fontWeight: 600 }}>
            Cancel
          </Button>
          <Button onClick={handleApprove} color="success" variant="contained" autoFocus sx={{ textTransform: 'none', fontWeight: 700, borderRadius: 2 }}>
            Yes, approve
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={rejectDialogOpen}
        onClose={() => setRejectDialogOpen(false)}
        aria-labelledby="reject-dialog-title"
        PaperProps={{ sx: { borderRadius: 3, maxWidth: 440 } }}
      >
        <DialogTitle id="reject-dialog-title" sx={{ fontWeight: 800, pb: 0 }}>
          Reject adjustment
        </DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ color: 'text.secondary', mt: 1 }}>
            Rejection cannot be undone. Are you sure you want to reject this approval?
          </DialogContentText>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2, gap: 1 }}>
          <Button onClick={() => setRejectDialogOpen(false)} color="inherit" sx={{ textTransform: 'none', fontWeight: 600 }}>
            Cancel
          </Button>
          <Button onClick={handleReject} color="error" variant="contained" autoFocus sx={{ textTransform: 'none', fontWeight: 700, borderRadius: 2 }}>
            Yes, reject
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

const AdjustmentRecordDetailPage: React.FC = () => (
  <ApprovalRecordDetailPageView
    requestTypeView="STANDARD"
    backPath="/adjustment-records"
    pageTitle="Adjustment"
  />
);

export const NewAdjustmentRecordDetailPage: React.FC = () => (
  <ApprovalRecordDetailPageView
    requestTypeView="NEW"
    backPath="/new-adjustment-records"
    pageTitle="New Item Approval"
  />
);

export default AdjustmentRecordDetailPage;
