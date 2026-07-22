import React, { useEffect, useMemo, useState } from 'react';
import {
  Box,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  CircularProgress,
  Breadcrumbs,
  Link as MuiLink,
  Divider,
  Grid,
  Stack,
  TextField,
  InputAdornment,
  Tooltip,
  Button,
  Chip,
  Checkbox,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  useTheme,
  IconButton
} from '@mui/material';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { useSnackbar } from 'notistack';
import type { ReconciliationData, ReconciliationItem, ReconciliationSummary } from '../types/reconciliation';
import SearchIcon from '@mui/icons-material/Search';
import DownloadIcon from '@mui/icons-material/Download';
import CloseIcon from '@mui/icons-material/Close';
import { servicesAPI } from '../config/api';

const formatNumber = (value: number | string | undefined | null, options?: Intl.NumberFormatOptions) => {
  if (value === null || value === undefined || value === '') {
    return '-';
  }
  const numeric = typeof value === 'number' ? value : Number(value);
  if (Number.isNaN(numeric)) {
    return String(value);
  }
  return numeric.toLocaleString(undefined, options);
};

const formatValue = (value: unknown) => {
  if (value === null || value === undefined || value === '') {
    return '-';
  }
  return String(value);
};

// Convert length from inches to feet for display (value only, no unit suffix)
const formatLengthInFeet = (value: number | string | undefined | null): string => {
  if (value === null || value === undefined || value === '') {
    return '-';
  }
  const numeric = typeof value === 'number' ? value : Number(value);
  if (Number.isNaN(numeric)) {
    return String(value);
  }
  const feet = numeric / 12;
  return feet.toFixed(2);
};

// Strip 'ft' suffix from length (e.g. from API) so stored/displayed value has no unit
const stripLengthFt = (value: string | number | undefined | null): string | number | undefined | null => {
  if (value === null || value === undefined) return value;
  if (typeof value === 'number') return value;
  const s = String(value).trim().replace(/\s*ft\s*$/i, '').trim();
  return s === '' ? value : s;
};

const getDisplayStatus = (status: string) => (status === 'Orphaned' ? 'Found' : status);

// Interface for comparison results
interface ComparisonResult {
  systemItem: ReconciliationItem;
  countedItem?: {
    form: string;
    grade: string;
    size: string;
    finish: string;
    ext_finish: string;
    width: string | number;
    length: string | number;
    location: string;
    mill: string;
    heat: string;
    type: string;
    remarks: string;
    quantity: number;
    sys_tag_no?: string;
    sys_tag_id?: string;
  };
  systemQuantity: number;
  countedQuantity: number;
  variance: number;
  status: 'Match' | 'Undercount' | 'Overcount' | 'Orphaned';
  isMatched: boolean;
  sections?: Array<{ section_id: number; section_desc: string; quantity: number; transaction_ids: number[] }>;
}

interface RecheckItem {
  id: number;
  form?: string;
  grade?: string;
  size?: string;
  finish?: string;
  ext_finish?: string;
  width?: string | number;
  length?: string | number;
  mill?: string;
  heat?: string;
  system_qty?: number;
  counted_qty?: number;
  checker_qty?: number;
  weight?: number;
  status?: string;
  recheck_reason?: string;
  recheck_notes?: string;
  tag_id?: string;
  prd_tag_no?: string;
  tag_no?: string;
}

const ReconciliationCheckerPage: React.FC = () => {
  const { location_id } = useParams<{ location_id: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const { enqueueSnackbar } = useSnackbar();
  const theme = useTheme();

  const [loading, setLoading] = useState(true);
  const [systemItems, setSystemItems] = useState<ReconciliationItem[]>([]);
  const [summary, setSummary] = useState<ReconciliationSummary | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [comparing, setComparing] = useState(false);
  const [comparisonResults, setComparisonResults] = useState<ComparisonResult[]>([]);
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [markedItems, setMarkedItems] = useState<Set<string>>(new Set());
  const [recheckItems, setRecheckItems] = useState<RecheckItem[]>([]);
  const [isExporting, setIsExporting] = useState(false);
  // Filter states (kept for internal filtering logic, but UI removed)
  const [filterForm, setFilterForm] = useState<string | null>(null);
  const [filterGrade, setFilterGrade] = useState<string | null>(null);
  const [filterSize, setFilterSize] = useState<string | null>(null);
  const [filterFinish, setFilterFinish] = useState<string | null>(null);
  const [filterExtFinish, setFilterExtFinish] = useState<string | null>(null);
  const [filterLocation, setFilterLocation] = useState<string | null>(null);
  const [filterMill, setFilterMill] = useState<string | null>(null);
  const [filterHeat, setFilterHeat] = useState<string | null>(null);
  const [filterInvType, setFilterInvType] = useState<string | null>(null);
  const [filterInvQuality, setFilterInvQuality] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<string | null>(null);
  const [filterBranch, setFilterBranch] = useState<string | null>(null);
  const [filterWarehouse, setFilterWarehouse] = useState<string | null>(null);
  const [filterTagNumber, setFilterTagNumber] = useState<string | null>(null);
  const effectiveCompareFields = useMemo(() => {
    const raw = (summary as ReconciliationSummary & { compare_fields?: unknown })?.compare_fields;
    if (Array.isArray(raw)) {
      return raw.map((f) => String(f).toLowerCase().trim()).filter(Boolean);
    }
    return ['sys_tag_no', 'location', 'mill', 'heat', 'type', 'quality'];
  }, [summary]);

  useEffect(() => {
    const stateData = location.state?.reconciliationData as ReconciliationData | undefined;

    if (!stateData) {
      setLoading(false);
      enqueueSnackbar('No reconciliation data found. Please start from Checker Review.', { variant: 'warning' });
      return;
    }

    const items = (stateData.items ?? []).map((item: ReconciliationItem) => ({
      ...item,
      length: stripLengthFt(item.length) ?? item.length
    }));
    setSystemItems(items);
    setSummary(stateData.summary ?? null);
    setLoading(false);
  }, [location.state, enqueueSnackbar]);

  // Fetch marked items for checking
  const fetchMarkedItems = async () => {
    if (!location_id) return;
    
    try {
      const response = await servicesAPI.getMarkedItemsForChecking(location_id);
      if (response.data.success) {
        const markedSet = new Set<string>();
        response.data.items.forEach((item: any) => {
          // Create a key similar to comparison key (marked items are counter-style, length already in feet)
          const key = createComparisonKey({
            prd_tag_no: item.transaction_id ? String(item.transaction_id) : '',
            form: item.form,
            grade: item.grade,
            size: item.size,
            finish: item.finish,
            ext_finish: item.ext_finish,
            width: item.width,
            length: item.length,
            location: item.location,
            mill: item.mill,
            heat: item.heat,
            inv_type: item.type,
            inv_quality: item.quality
          }, true);
          markedSet.add(key);
        });
        setMarkedItems(markedSet);
      }
    } catch (error) {
      console.error('Error fetching marked items:', error);
    }
  };

  const loadRecheckItems = async () => {
    if (!location_id) return;

    try {
      const response = await servicesAPI.getRecheckItems(location_id);
      if (response.data.success) {
        setRecheckItems(response.data.items ?? []);
      }
    } catch (error) {
      console.error('Error loading recheck items:', error);
    }
  };

  const handleRemoveFromRecheck = async (item: RecheckItem) => {
    if (!item?.id) return;

    try {
      const response = await servicesAPI.removeFromRecheck(String(item.id));
      if (response.data.success) {
        enqueueSnackbar('Item removed from recheck successfully', { variant: 'success' });
        await loadRecheckItems();
      } else {
        enqueueSnackbar('Failed to remove item from recheck', { variant: 'error' });
      }
    } catch (error) {
      console.error('Error removing item from recheck:', error);
      enqueueSnackbar('Failed to remove item from recheck', { variant: 'error' });
    }
  };

  const handleExportRecheckItems = async () => {
    if (!recheckItems.length) {
      enqueueSnackbar('No recheck items to export', { variant: 'warning' });
      return;
    }

    setIsExporting(true);
    try {
      const ExcelJS = (await import('exceljs')).default;
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('Recheck Items');

      worksheet.addRow([
        'Tag Number',
        'Form',
        'Size',
        'Grade',
        'System Qty',
        'Checker Qty',
        'Status',
        'Reason',
        'Notes',
      ]);

      recheckItems.forEach((item) => {
        worksheet.addRow([
          item.prd_tag_no || item.tag_no || item.tag_id || '-',
          item.form || '-',
          item.size || '-',
          item.grade || '-',
          item.system_qty ?? '-',
          item.checker_qty ?? item.counted_qty ?? '-',
          item.status || '-',
          item.recheck_reason || '-',
          item.recheck_notes || '-',
        ]);
      });

      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `Recheck_Items_${location_id}_${new Date().toISOString().slice(0, 10)}.xlsx`;
      link.click();
      window.URL.revokeObjectURL(url);

      enqueueSnackbar(`Recheck items exported successfully! ${recheckItems.length} items`, {
        variant: 'success',
      });
    } catch (error) {
      console.error('Export recheck items error:', error);
      enqueueSnackbar('Failed to export recheck items', { variant: 'error' });
    } finally {
      setIsExporting(false);
    }
  };

  // Quality mapping from reconciliation controller
  const qualityMap: { [key: string]: string } = {
    '-': 'Prime',
    'C': 'Claim',
    'R': 'Reject',
    'S': 'Scrap',
    'Y': 'Secondary',
    'P': 'Processing',
    'X': 'Special Buy',
    'Z': 'Write Down',
    'B': 'Buyout',
    'G': 'BERG Pipe',
    'U': 'Used',
    'J': 'ReJect',
    'M': 'Mill Claim',
    'E': 'Price Protct Ex',
    'A': 'Pre-Bill Collec',
    'T': 'Solar 0 Value',
    'N': 'NZ Write Down',
    'O': 'Over-roll NZ'
  };

  // Normalize quality value using qualityMap
  const normalizeQuality = (value: unknown): string => {
    // Handle empty, null, undefined, and dash values - all should normalize to 'prime'
    if (value === null || value === undefined || value === '' || value === '-') {
      return 'prime'; // Default to prime for empty values (matching backend)
    }
    const strValue = String(value).trim();
    
    // If after trimming it's empty or dash, return 'prime'
    if (strValue === '' || strValue === '-') {
      return 'prime';
    }
    
    // Check if it's a quality code that maps to a description (case-sensitive for codes)
    if (qualityMap[strValue]) {
      return qualityMap[strValue].toLowerCase();
    }
    
    // Check if it's a quality description that matches any value in qualityMap (case-insensitive)
    const lowerValue = strValue.toLowerCase();
    for (const description of Object.values(qualityMap)) {
      if (description.toLowerCase() === lowerValue) {
        return lowerValue; // Return normalized description
      }
    }
    
    // If it's not in the map, return lowercase version
    return lowerValue;
  };

  // Normalize value for comparison (handle null, undefined, empty strings, dash, and numeric precision)
  const normalizeValue = (value: unknown): string => {
    // Handle empty, null, undefined, and dash values - all should normalize to empty string
    if (value === null || value === undefined || value === '' || value === '-') {
      return '';
    }
    // Handle numeric values - normalize to string with consistent precision
    if (typeof value === 'number') {
      // Convert to number and back to string to handle 0.0000 vs 0
      const num = Number(value);
      return num === 0 ? '0' : num.toFixed(4);
    }
    // Normalize string values:
    // - Treat as numeric only when the whole string is numeric (e.g. "12", "12.3400").
    // - If it's alphanumeric (e.g. "10B", "10TT"), keep it as a string so locations don't collapse.
    const strValue = String(value).trim();
    // If after trimming it's empty or dash, return empty string
    if (strValue === '' || strValue === '-') {
      return '';
    }
    const numericLikeRegex = /^-?\d+(\.\d+)?$/;
    if (numericLikeRegex.test(strValue)) {
      const numValue = parseFloat(strValue);
      return numValue === 0 ? '0' : numValue.toFixed(4);
    }

    return strValue.toLowerCase();
  };

  // Length for comparison key: system length is in inches (convert to feet); counter/counted length is already in feet (no conversion).
  const lengthForComparisonKey = (value: string | number | undefined | null, alreadyInFeet: boolean): string => {
    if (value === null || value === undefined || value === '') return '';
    const num = typeof value === 'number' ? value : parseFloat(String(value));
    if (Number.isNaN(num)) return String(value).trim();
    const inFeet = alreadyInFeet ? num : num / 12;
    return inFeet === 0 ? '0' : inFeet.toFixed(4);
  };

  // Create comparison key from item fields. Pass alreadyInFeet=true for checker/counted items (length already in feet).
  const createComparisonKey = (item: {
    form?: string;
    grade?: string;
    size?: string;
    finish?: string;
    ext_finish?: string;
    extendedFinish?: string;
    width?: string | number;
    length?: string | number;
    location?: string;
    mill?: string;
    heat?: string;
    inv_type?: string;
    inv_quality?: string;
    type?: string;
    remarks?: string;
    tag_no?: string;
    prd_tag_no?: string;
    sys_tag_no?: string;
    sys_tag_id?: string;
  }, alreadyInFeet = false): string => {
    const tagId = item.tag_no || item.prd_tag_no || item.sys_tag_no || item.sys_tag_id || '';
    const quality = item.inv_quality || item.remarks || '';
    const baseFields = [
      normalizeValue(item.form),
      normalizeValue(item.grade),
      normalizeValue(item.size),
      normalizeValue(item.finish),
      normalizeValue(item.ext_finish || item.extendedFinish),
      normalizeValue(item.width),
      lengthForComparisonKey(item.length, alreadyInFeet)
    ];
    const optionalFields = [
      ...(effectiveCompareFields.includes('sys_tag_no') ? [normalizeValue(tagId)] : []),
      ...(effectiveCompareFields.includes('location') ? [normalizeValue(item.location)] : []),
      ...(effectiveCompareFields.includes('mill') ? [normalizeValue(item.mill)] : []),
      ...(effectiveCompareFields.includes('heat') ? [normalizeValue(item.heat)] : []),
      ...(effectiveCompareFields.includes('type') ? [normalizeValue(item.inv_type || item.type)] : []),
      ...(effectiveCompareFields.includes('quality') ? [normalizeQuality(quality)] : [])
    ];
    const fields = [...baseFields, ...optionalFields];
    return fields.join('|');
  };

  // Auto-run comparison when system items are loaded
  useEffect(() => {
    if (systemItems.length > 0 && location_id && !comparing) {
      performComparison();
      fetchMarkedItems();
      loadRecheckItems();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [systemItems.length, location_id]);

  // Create a map of comparison results by system item key for quick lookup
  const comparisonMap = useMemo(() => {
    const map = new Map<string, ComparisonResult>();
    comparisonResults.forEach(result => {
      const systemKey = createComparisonKey({
        prd_tag_no: result.systemItem?.prd_tag_no || result.systemItem?.tag_no,
        form: result.systemItem?.form,
        grade: result.systemItem?.grade,
        size: result.systemItem?.size,
        finish: result.systemItem?.finish,
        ext_finish: result.systemItem?.ext_finish,
        width: result.systemItem?.width,
        length: result.systemItem?.length,
        location: result.systemItem?.location,
        mill: result.systemItem?.mill,
        heat: result.systemItem?.heat,
        inv_type: result.systemItem?.inv_type,
        inv_quality: result.systemItem?.inv_quality
      });
      map.set(systemKey, result);
    });
    return map;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [comparisonResults]);

  // Get unique values for filter dropdowns
  const uniqueValues = useMemo(() => {
    const forms = new Set<string>();
    const grades = new Set<string>();
    const sizes = new Set<string>();
    const finishes = new Set<string>();
    const extFinishes = new Set<string>();
    const locations = new Set<string>();
    const mills = new Set<string>();
    const heats = new Set<string>();
    const invTypes = new Set<string>();
    const invQualities = new Set<string>();
    const branches = new Set<string>();
    const warehouses = new Set<string>();
    const statuses = new Set<string>();

    // Add values from system items
    systemItems.forEach(item => {
      if (item.form) forms.add(item.form);
      if (item.grade) grades.add(item.grade);
      if (item.size) sizes.add(item.size);
      if (item.finish) finishes.add(item.finish);
      if (item.ext_finish) extFinishes.add(item.ext_finish);
      if (item.location) locations.add(item.location);
      if (item.mill) mills.add(item.mill);
      if (item.heat) heats.add(item.heat);
      if (item.inv_type) invTypes.add(item.inv_type);
      if (item.inv_quality) invQualities.add(item.inv_quality);
      if (item.branch) branches.add(item.branch);
      if (item.warehouse) warehouses.add(item.warehouse);
      
      // Get status from comparison results
      const itemKey = createComparisonKey({
        prd_tag_no: item.prd_tag_no || item.tag_no,
        form: item.form,
        grade: item.grade,
        size: item.size,
        finish: item.finish,
        ext_finish: item.ext_finish,
        width: item.width,
        length: item.length,
        location: item.location,
        mill: item.mill,
        heat: item.heat,
        inv_type: item.inv_type,
        inv_quality: item.inv_quality
      });
      const comparison = comparisonMap.get(itemKey);
      if (comparison?.status) {
        statuses.add(comparison.status);
      }
    });
    
    // Add values from orphaned items (items that don't exist in system)
    comparisonResults
      .filter(result => result.status === 'Orphaned')
      .forEach(result => {
        const item = result.systemItem;
        if (item.form) forms.add(item.form);
        if (item.grade) grades.add(item.grade);
        if (item.size) sizes.add(item.size);
        if (item.finish) finishes.add(item.finish);
        if (item.ext_finish) extFinishes.add(item.ext_finish);
        if (item.location) locations.add(item.location);
        if (item.mill) mills.add(item.mill);
        if (item.heat) heats.add(item.heat);
        if (item.inv_type) invTypes.add(item.inv_type);
        if (item.inv_quality) invQualities.add(item.inv_quality);
        statuses.add('Orphaned');
      });

    return {
      forms: Array.from(forms).sort(),
      grades: Array.from(grades).sort(),
      sizes: Array.from(sizes).sort(),
      finishes: Array.from(finishes).sort(),
      extFinishes: Array.from(extFinishes).sort(),
      locations: Array.from(locations).sort(),
      mills: Array.from(mills).sort(),
      heats: Array.from(heats).sort(),
      invTypes: Array.from(invTypes).sort(),
      invQualities: Array.from(invQualities).sort(),
      branches: Array.from(branches).sort(),
      warehouses: Array.from(warehouses).sort(),
      statuses: Array.from(statuses).sort()
    };
  }, [systemItems, comparisonMap, comparisonResults]);

  const filteredItems = useMemo(() => {
    // Start with empty array to ensure we always return a new array
    let filtered: ReconciliationItem[] = [];
    
    // Get orphaned items from comparison results and convert them to ReconciliationItem format
    const orphanedItems: ReconciliationItem[] = comparisonResults
      .filter(result => result.status === 'Orphaned')
      .map(result => ({
        ...result.systemItem,
        total_qty: 0, // Orphaned items have no system quantity
        prd_ohd_mat_val: 0,
        prd_ohd_mat_cst: 0,
        branch: '-',
        warehouse: '-',
        _isOrphaned: true // Mark as orphaned for filtering
      }));
    
    // Combine system items with orphaned items
    filtered = [...systemItems, ...orphanedItems];
    
    // Apply search term filter
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      filtered = filtered.filter(item => {
        const tagNo = (item.prd_tag_no || item.tag_no || '').toString().toLowerCase();
        const form = (item.form || '').toLowerCase();
        const grade = (item.grade || '').toLowerCase();
        const mill = (item.mill || '').toLowerCase();
        const heat = (item.heat || '').toLowerCase();
        const location = (item.location || '').toLowerCase();
        
        return tagNo.includes(searchLower) ||
               form.includes(searchLower) ||
               grade.includes(searchLower) ||
               mill.includes(searchLower) ||
               heat.includes(searchLower) ||
               location.includes(searchLower);
      });
    }
    
    // Apply column filters - EXACT MATCH ONLY (case-sensitive)
    if (filterTagNumber) {
      const tagFilter = String(filterTagNumber).trim();
      filtered = filtered.filter(item => {
        const itemTag = String(item.prd_tag_no || item.tag_no || '').trim();
        return itemTag === tagFilter;
      });
    }
    if (filterForm) {
      filtered = filtered.filter(item => String(item.form || '').trim() === String(filterForm).trim());
    }
    if (filterGrade) {
      filtered = filtered.filter(item => String(item.grade || '').trim() === String(filterGrade).trim());
    }
    if (filterSize) {
      filtered = filtered.filter(item => String(item.size || '').trim() === String(filterSize).trim());
    }
    if (filterFinish) {
      filtered = filtered.filter(item => String(item.finish || '').trim() === String(filterFinish).trim());
    }
    if (filterExtFinish) {
      filtered = filtered.filter(item => String(item.ext_finish || '').trim() === String(filterExtFinish).trim());
    }
    if (filterLocation) {
      filtered = filtered.filter(item => String(item.location || '').trim() === String(filterLocation).trim());
    }
    if (filterMill) {
      filtered = filtered.filter(item => String(item.mill || '').trim() === String(filterMill).trim());
    }
    if (filterHeat) {
      filtered = filtered.filter(item => String(item.heat || '').trim() === String(filterHeat).trim());
    }
    if (filterInvType) {
      filtered = filtered.filter(item => String(item.inv_type || '').trim() === String(filterInvType).trim());
    }
    if (filterInvQuality) {
      filtered = filtered.filter(item => String(item.inv_quality || '').trim() === String(filterInvQuality).trim());
    }
    if (filterBranch) {
      filtered = filtered.filter(item => String(item.branch || '').trim() === String(filterBranch).trim());
    }
    if (filterWarehouse) {
      filtered = filtered.filter(item => String(item.warehouse || '').trim() === String(filterWarehouse).trim());
    }
    if (filterStatus && filterStatus.trim() !== '') {
      const statusToFilter = filterStatus.trim();
      filtered = filtered.filter(item => {
        // Check if this is an orphaned item
        const isOrphaned = (item as any)._isOrphaned === true;
        
        if (isOrphaned) {
          // For orphaned items, status is always 'Orphaned'
          // Only include if filtering for 'Orphaned'
          return statusToFilter === 'Orphaned';
        }
        
        // For regular system items, get status from comparisonMap
        // If filtering for 'Orphaned', exclude all non-orphaned items
        if (statusToFilter === 'Orphaned') {
          return false; // Exclude all system items when filtering for orphaned
        }
        
        const itemKey = createComparisonKey({
          prd_tag_no: item.prd_tag_no || item.tag_no,
          form: item.form,
          grade: item.grade,
          size: item.size,
          finish: item.finish,
          ext_finish: item.ext_finish,
          width: item.width,
          length: item.length,
          location: item.location,
          mill: item.mill,
          heat: item.heat,
          inv_type: item.inv_type,
          inv_quality: item.inv_quality
        });
        const comparison = comparisonMap.get(itemKey);
        // Only include items that have a comparison AND the status matches exactly
        if (!comparison || !comparison.status) {
          return false; // Exclude items without comparison or status
        }
        // Strict equality check - status must match exactly
        const itemStatus = String(comparison.status).trim();
        return itemStatus === statusToFilter;
      });
    }
    
    // Return a new array reference to ensure React detects the change
    return [...filtered];
  }, [
    systemItems,
    comparisonResults,
    searchTerm,
    filterForm,
    filterGrade,
    filterSize,
    filterFinish,
    filterExtFinish,
    filterLocation,
    filterMill,
    filterHeat,
    filterInvType,
    filterInvQuality,
    filterBranch,
    filterWarehouse,
    filterStatus,
    filterTagNumber,
    comparisonMap
  ]);

  const totalSystemQuantity = useMemo(
    () => filteredItems.reduce((sum, item) => sum + (item.total_qty || 0), 0),
    [filteredItems]
  );

  // Fetch and compare transactions
  const performComparison = async () => {
    if (!location_id) {
      enqueueSnackbar('Location ID is required', { variant: 'error' });
      return;
    }

    setComparing(true);
    try {
      // First, get all sections for this location
      const sectionsResponse = await servicesAPI.getSections(location_id);
      const sections = sectionsResponse.data || [];

      if (sections.length === 0) {
        enqueueSnackbar('No sections found for this location', { variant: 'warning' });
        setComparing(false);
        return;
      }

      // Create a map of section_id to section_desc for quick lookup
      const sectionMap = new Map<number, string>();
      sections.forEach((section: any) => {
        sectionMap.set(section.section_id, section.section_desc || `Section ${section.section_id}`);
      });

      // Fetch CHECKER transactions for all sections in this location
      // NOTE: This uses getReviewTransactionsForChecker which filters by role='Checker'
      const allTransactions: any[] = [];
      
      for (const section of sections) {
        try {
          // Fetch only checker transactions (not counter transactions)
          const transactionsResponse = await servicesAPI.getReviewTransactionsForChecker(
            location_id,
            section.section_id.toString()
          );
          
          if (transactionsResponse.data && Array.isArray(transactionsResponse.data)) {
            // Add section_id and section_desc to each transaction
            const transactionsWithSection = transactionsResponse.data.map((transaction: any) => ({
              ...transaction,
              section_id: section.section_id,
              section_desc: section.section_desc || `Section ${section.section_id}`,
              qty: transaction.qty || transaction.quantity || 0
            }));
            allTransactions.push(...transactionsWithSection);
          }
        } catch (error) {
          console.error(`Error fetching transactions for section ${section.section_id}:`, error);
          // Continue with other sections even if one fails
        }
      }

      const checkedTransactions = allTransactions; // Renamed for clarity - these are checker transactions

      console.log(`Fetched ${checkedTransactions.length} checker transactions for comparison`);

      // Group checked (checker) transactions by comparison key and sum quantities, tracking sections and transaction IDs
      const countedMap = new Map<string, { 
        item: any; 
        totalQuantity: number;
        sections: Map<number, { section_id: number; section_desc: string; quantity: number; transaction_ids: number[] }>;
      }>();

      checkedTransactions.forEach((transaction: any) => {
        const key = createComparisonKey({
          sys_tag_no: transaction.sys_tag_no || transaction.sys_tag_id,
          form: transaction.form,
          grade: transaction.grade,
          size: transaction.size,
          finish: transaction.finish,
          ext_finish: transaction.ext_finish || transaction.extendedFinish,
          width: transaction.width,
          length: transaction.length,
          location: transaction.location,
          mill: transaction.mill,
          heat: transaction.heat,
          type: transaction.type,
          remarks: transaction.remarks
        }, true); // counted/checker length is already in feet

        const quantity = transaction.qty || transaction.quantity || 0;
        const sectionId = transaction.section_id;
        const sectionDesc = transaction.section_desc || sectionMap.get(sectionId) || `Section ${sectionId}`;
        const transactionId = transaction.transaction_id || transaction.id || null;

        if (countedMap.has(key)) {
          const existing = countedMap.get(key)!;
          existing.totalQuantity += quantity;
          
          // Update or add section quantity
          if (existing.sections.has(sectionId)) {
            const sectionData = existing.sections.get(sectionId)!;
            sectionData.quantity += quantity;
            if (transactionId && !sectionData.transaction_ids.includes(transactionId)) {
              sectionData.transaction_ids.push(transactionId);
            }
          } else {
            existing.sections.set(sectionId, {
              section_id: sectionId,
              section_desc: sectionDesc,
              quantity: quantity,
              transaction_ids: transactionId ? [transactionId] : []
            });
          }
        } else {
          const sectionsMap = new Map<number, { section_id: number; section_desc: string; quantity: number; transaction_ids: number[] }>();
          sectionsMap.set(sectionId, {
            section_id: sectionId,
            section_desc: sectionDesc,
            quantity: quantity,
            transaction_ids: transactionId ? [transactionId] : []
          });
          countedMap.set(key, {
            item: transaction,
            totalQuantity: quantity,
            sections: sectionsMap
          });
        }
      });

      // Compare system items with checked (checker) items
      const results: ComparisonResult[] = [];
      const matchedCountedKeys = new Set<string>();

      // Process system items
      systemItems.forEach((systemItem) => {
        const systemKey = createComparisonKey({
          prd_tag_no: systemItem.prd_tag_no || systemItem.tag_no,
          form: systemItem.form,
          grade: systemItem.grade,
          size: systemItem.size,
          finish: systemItem.finish,
          ext_finish: systemItem.ext_finish,
          width: systemItem.width,
          length: systemItem.length,
          location: systemItem.location,
          mill: systemItem.mill,
          heat: systemItem.heat,
          inv_type: systemItem.inv_type,
          inv_quality: systemItem.inv_quality
        });

        const systemQty = systemItem.total_qty || 0;
        const countedData = countedMap.get(systemKey);

        if (countedData) {
          // Match found
          matchedCountedKeys.add(systemKey);
          const countedQty = countedData.totalQuantity;
          const variance = countedQty - systemQty;

          let status: 'Match' | 'Undercount' | 'Overcount' = 'Match';
          if (variance < 0) {
            status = 'Undercount';
          } else if (variance > 0) {
            status = 'Overcount';
          }

          // Convert sections Map to Array
          const sectionsArray = Array.from(countedData.sections.values());

          results.push({
            systemItem,
            countedItem: {
              form: countedData.item.form,
              grade: countedData.item.grade,
              size: countedData.item.size,
              finish: countedData.item.finish,
              ext_finish: countedData.item.ext_finish || countedData.item.extendedFinish,
              width: countedData.item.width,
              length: countedData.item.length,
              location: countedData.item.location,
              mill: countedData.item.mill,
              heat: countedData.item.heat,
              type: countedData.item.type,
              remarks: countedData.item.remarks,
              quantity: countedQty,
              sys_tag_no: countedData.item.sys_tag_no || countedData.item.sys_tag_id,
              sys_tag_id: countedData.item.sys_tag_id
            },
            systemQuantity: systemQty,
            countedQuantity: countedQty,
            variance,
            status,
            isMatched: true,
            sections: sectionsArray
          });
        } else {
          // System item not found in counted - considered as Undercount
          results.push({
            systemItem,
            systemQuantity: systemQty,
            countedQuantity: 0,
            variance: -systemQty,
            status: 'Undercount',
            isMatched: false
          });
        }
      });

      // Add checked (checker) items that don't match any system item (Orphaned from checked perspective)
      countedMap.forEach((countedData, key) => {
        if (!matchedCountedKeys.has(key)) {
          // Convert sections Map to Array
          const sectionsArray = Array.from(countedData.sections.values());

          results.push({
            systemItem: {
              prd_tag_no: countedData.item.sys_tag_no || countedData.item.sys_tag_id,
              tag_no: countedData.item.sys_tag_no || countedData.item.sys_tag_id,
              form: countedData.item.form,
              grade: countedData.item.grade,
              size: countedData.item.size,
              finish: countedData.item.finish,
              ext_finish: countedData.item.ext_finish || countedData.item.extendedFinish,
              width: countedData.item.width,
              length: countedData.item.length,
              location: countedData.item.location,
              mill: countedData.item.mill,
              heat: countedData.item.heat,
              inv_type: countedData.item.type,
              inv_quality: countedData.item.remarks
            } as ReconciliationItem,
            countedItem: {
              form: countedData.item.form,
              grade: countedData.item.grade,
              size: countedData.item.size,
              finish: countedData.item.finish,
              ext_finish: countedData.item.ext_finish || countedData.item.extendedFinish,
              width: countedData.item.width,
              length: countedData.item.length,
              location: countedData.item.location,
              mill: countedData.item.mill,
              heat: countedData.item.heat,
              type: countedData.item.type,
              remarks: countedData.item.remarks,
              quantity: countedData.totalQuantity,
              sys_tag_no: countedData.item.sys_tag_no || countedData.item.sys_tag_id,
              sys_tag_id: countedData.item.sys_tag_id
            },
            systemQuantity: 0,
            countedQuantity: countedData.totalQuantity,
            variance: countedData.totalQuantity,
            status: 'Orphaned',
            isMatched: false,
            sections: sectionsArray
          });
        }
      });

      setComparisonResults(results);
    } catch (error) {
      console.error('Error performing comparison:', error);
      enqueueSnackbar('Failed to fetch checked transactions', { variant: 'error' });
    } finally {
      setComparing(false);
    }
  };

  const handleBack = () => {
    navigate(-1);
  };

  // Handle checkbox selection
  const handleSelectItem = (itemKey: string) => {
    setSelectedItems(prev => {
      const newSet = new Set(prev);
      if (newSet.has(itemKey)) {
        newSet.delete(itemKey);
      } else {
        newSet.add(itemKey);
      }
      return newSet;
    });
  };

  // Handle marking items for checking
  const handleMarkForChecking = async () => {
    if (selectedItems.size === 0) {
      enqueueSnackbar('Please select at least one item to mark for checking', { variant: 'warning' });
      return;
    }

    if (!location_id) {
      enqueueSnackbar('Location ID is required', { variant: 'error' });
      return;
    }

    try {
      // Collect selected items data
      const itemsToMark = Array.from(selectedItems).map(itemKey => {
        const comparison = comparisonMap.get(itemKey);
        if (!comparison) return null;

        const systemItem = comparison.systemItem;
        // Get first section and transaction_id if available
        const firstSection = comparison.sections && comparison.sections.length > 0 ? comparison.sections[0] : null;
        const transactionId = firstSection?.transaction_ids && firstSection.transaction_ids.length > 0 
          ? firstSection.transaction_ids[0] 
          : null;
        const sectionId = firstSection?.section_id || null;
        
        return {
          form: systemItem.form || '',
          grade: systemItem.grade || '',
          size: systemItem.size || '',
          finish: systemItem.finish || '',
          ext_finish: systemItem.ext_finish || '',
          width: systemItem.width || 0,
          length: systemItem.length || 0,
          system_qty: comparison.systemQuantity || 0,
          counted_qty: comparison.countedQuantity || 0,
          variance: comparison.variance || 0,
          status: comparison.status,
          location: systemItem.location || '',
          mill: systemItem.mill || '',
          heat: systemItem.heat || '',
          type: systemItem.inv_type || '',
          quality: systemItem.inv_quality || '',
          tag_id: systemItem.prd_tag_no || systemItem.tag_no || null,
          transaction_id: transactionId,
          section_id: sectionId
        };
      }).filter(item => item !== null);

      if (itemsToMark.length === 0) {
        enqueueSnackbar('No valid items to mark', { variant: 'warning' });
        return;
      }

      const response = await servicesAPI.markItemsForRecheck({
        location_id,
        items: itemsToMark,
        recheck_reason: 'Marked for checking from reconciliation checker page'
      });

      if (response.data.success) {
        // Show appropriate message based on results
        const { newlyMarked, alreadyMarked } = response.data;
        
        if (newlyMarked > 0 && alreadyMarked > 0) {
          enqueueSnackbar(
            `${newlyMarked} items marked for checking. ${alreadyMarked} items were already marked and skipped.`,
            { variant: 'warning', autoHideDuration: 5000 }
          );
        } else if (newlyMarked > 0) {
          enqueueSnackbar(
            response.data.message || `${newlyMarked} items marked for checking successfully`,
            { variant: 'success' }
          );
        } else if (alreadyMarked > 0) {
          enqueueSnackbar(
            response.data.message || `All ${alreadyMarked} items were already marked for checking.`,
            { variant: 'info', autoHideDuration: 5000 }
          );
        } else {
          enqueueSnackbar(
            response.data.message || 'No items were processed.',
            { variant: 'warning' }
          );
        }
        
        setSelectedItems(new Set()); // Clear selection
        await fetchMarkedItems();
        await loadRecheckItems();
      } else {
        enqueueSnackbar(response.data.message || 'Failed to mark items for checking', { variant: 'error' });
      }
    } catch (error) {
      console.error('Error marking items for checking:', error);
      enqueueSnackbar('Failed to mark items for checking', { variant: 'error' });
    }
  };

  // Check if an item is marked for checking
  const isItemMarked = (item: ReconciliationItem): boolean => {
    const key = createComparisonKey({
      prd_tag_no: item.prd_tag_no || item.tag_no,
      form: item.form,
      grade: item.grade,
      size: item.size,
      finish: item.finish,
      ext_finish: item.ext_finish,
      width: item.width,
      length: item.length,
      location: item.location,
      mill: item.mill,
      heat: item.heat,
      inv_type: item.inv_type,
      inv_quality: item.inv_quality
    });
    return markedItems.has(key);
  };

  // Export comparison results to Excel (formatted like the sample)
  const handleExport = async () => {
    if (comparisonResults.length === 0) {
      enqueueSnackbar('No comparison data to export', { variant: 'warning' });
      return;
    }

    setIsExporting(true);
    try {
      // Dynamically import ExcelJS
      const ExcelJS = (await import('exceljs')).default;
      
      // Use ExcelJS for proper styling support
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('Comparison');

      // Sort by Form and Size
      const sortedResults = [...comparisonResults].sort((a, b) => {
        const formA = (a.systemItem.form || '').toString();
        const formB = (b.systemItem.form || '').toString();
        const formCompare = formA.localeCompare(formB);
        
        if (formCompare !== 0) return formCompare;
        
        // If forms are equal, sort by Size
        const sizeA = (a.systemItem.size || '').toString();
        const sizeB = (b.systemItem.size || '').toString();
        return sizeA.localeCompare(sizeB);
      });

      // Build header
      const header = [
        'Form',
        'Size',
        'Grade',
        'Finish',
        'Extended Finish',
        'Width',
        'Length (ft)',
        'Location',
        'Weight',
        'Inventory Type',
        'Quality Standard',
        'Quality Standards Code',
        'Branch',
        'Warehouse',
        'System Qty',
        'Checker Qty',
        'Section Breakdown',
        'Tag ID',
        'Variance',
        'Status',
        'Total Amount',
        'Unit Cost'
      ];

      // Rows
      const rows = sortedResults.map(result => {
        const item = result.systemItem;
        const qualityDesc = normalizeQuality(item.inv_quality);
        const qualityCode = item.inv_quality || '-';
        const sections = result.sections?.map(s => `${s.section_desc}: ${s.quantity}`).join(' | ') || '-';

        return [
          item.form || '-',
          item.size || '-',
          item.grade || '-',
          item.finish || '-',
          item.ext_finish || '-',
          item.width ?? '',
          item.length ? (typeof item.length === 'number' ? (item.length / 12).toFixed(2) : (Number(item.length) / 12).toFixed(2)) : '',
          item.location || '-',
          item.weight ?? 0,
          item.inv_type || '-',
          qualityDesc || '-',
          qualityCode,
          item.branch || '-',
          item.warehouse || '-',
          result.systemQuantity,
          result.countedQuantity,
          sections,
          item.prd_tag_no || item.tag_no || '-',
          result.variance,
          result.status,
          item.prd_ohd_mat_val ?? 0,
          item.prd_ohd_mat_cst ?? 0
        ];
      });

      // Totals row
      const totalSystemQty = sortedResults.reduce((sum, r) => sum + r.systemQuantity, 0);
      const totalCheckerQty = sortedResults.reduce((sum, r) => sum + r.countedQuantity, 0);
      const totalVariance = sortedResults.reduce((sum, r) => sum + r.variance, 0);
      const totalAmount = sortedResults.reduce((sum, r) => sum + (r.systemItem.prd_ohd_mat_val || 0), 0);

      const totalRow: (string | number)[] = [
        'TOTAL',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        totalSystemQty,
        totalCheckerQty,
        '',
        '',
        totalVariance,
        '',
        totalAmount,
        ''
      ];

      // Set column widths
      worksheet.columns = [
        { width: 10 }, // Form
        { width: 10 }, // Size
        { width: 12 }, // Grade
        { width: 12 }, // Finish
        { width: 16 }, // Extended Finish
        { width: 10 }, // Width
        { width: 10 }, // Length
        { width: 12 }, // Location
        { width: 12 }, // Weight
        { width: 14 }, // Inventory Type
        { width: 18 }, // Quality Standard
        { width: 18 }, // Quality Standards Code
        { width: 10 }, // Branch
        { width: 12 }, // Warehouse
        { width: 12 }, // System Qty
        { width: 12 }, // Checker Qty
        { width: 28 }, // Section Breakdown
        { width: 14 }, // Tag ID
        { width: 12 }, // Variance
        { width: 12 }, // Status
        { width: 14 }, // Total Amount
        { width: 12 }  // Unit Cost
      ];

      // Add header row
      const headerRow = worksheet.addRow(header);
      headerRow.font = { bold: true, size: 11, color: { argb: 'FFFFFFFF' } };
      headerRow.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF1F4E78' }
      };
      headerRow.alignment = { horizontal: 'center', vertical: 'middle' };
      headerRow.eachCell((cell) => {
        cell.border = {
          top: { style: 'thin', color: { argb: 'FF000000' } },
          bottom: { style: 'thin', color: { argb: 'FF000000' } },
          left: { style: 'thin', color: { argb: 'FF000000' } },
          right: { style: 'thin', color: { argb: 'FF000000' } }
        };
      });

      // Add data rows
      const statusColIndex = 20; // Status column (1-indexed: T = 20)
      const varianceColIndex = 19; // Variance column (1-indexed: S = 19)
      
      rows.forEach((rowData, rowIndex) => {
        const result = sortedResults[rowIndex];
        const row = worksheet.addRow(rowData);
        
        // Base styling for all cells
        row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
          cell.border = {
            top: { style: 'thin', color: { argb: 'FFCCCCCC' } },
            bottom: { style: 'thin', color: { argb: 'FFCCCCCC' } },
            left: { style: 'thin', color: { argb: 'FFCCCCCC' } },
            right: { style: 'thin', color: { argb: 'FFCCCCCC' } }
          };
          
          // Right align numeric columns (System Qty onwards)
          if (colNumber >= 15) {
            cell.alignment = { horizontal: 'right', vertical: 'middle' };
          } else {
            cell.alignment = { horizontal: 'left', vertical: 'middle' };
          }
          
          // Alternating row background
          if (rowIndex % 2 === 1 && colNumber !== statusColIndex && colNumber !== varianceColIndex) {
            cell.fill = {
              type: 'pattern',
              pattern: 'solid',
              fgColor: { argb: 'FFF2F2F2' }
            };
          }
        });

        // Style Status column based on status
        const statusCell = row.getCell(statusColIndex);
        const status = result.status;
        
        if (status === 'Match') {
          statusCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFC6EFCE' } };
          statusCell.font = { color: { argb: 'FF006100' }, bold: true, size: 10 };
        } else if (status === 'Undercount') {
          statusCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFC7CE' } };
          statusCell.font = { color: { argb: 'FF9C0006' }, bold: true, size: 10 };
        } else if (status === 'Overcount') {
          statusCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFEB9C' } };
          statusCell.font = { color: { argb: 'FF9C6500' }, bold: true, size: 10 };
        } else if (status === 'Orphaned') {
          statusCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFEB9C' } };
          statusCell.font = { color: { argb: 'FF9C6500' }, bold: true, size: 10 };
        }
        statusCell.alignment = { horizontal: 'center', vertical: 'middle' };

        // Style Variance column based on status (only if not zero)
        if (result.variance !== 0) {
          const varianceCell = row.getCell(varianceColIndex);
          if (status === 'Match') {
            varianceCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFC6EFCE' } };
            varianceCell.font = { color: { argb: 'FF006100' }, bold: true, size: 10 };
          } else if (status === 'Undercount') {
            varianceCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFC7CE' } };
            varianceCell.font = { color: { argb: 'FF9C0006' }, bold: true, size: 10 };
          } else if (status === 'Overcount') {
            varianceCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFEB9C' } };
            varianceCell.font = { color: { argb: 'FF9C6500' }, bold: true, size: 10 };
          } else if (status === 'Orphaned') {
            varianceCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFEB9C' } };
            varianceCell.font = { color: { argb: 'FF9C6500' }, bold: true, size: 10 };
          }
        }
      });

      // Add empty row
      worksheet.addRow([]);

      // Add TOTAL row
      const totalRowObj = worksheet.addRow(totalRow);
      totalRowObj.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFD9E1F2' }
      };
      totalRowObj.font = { bold: true, size: 11 };
      totalRowObj.eachCell((cell, colNumber) => {
        cell.border = {
          top: { style: 'thin', color: { argb: 'FF000000' } },
          bottom: { style: 'thin', color: { argb: 'FF000000' } },
          left: { style: 'thin', color: { argb: 'FF000000' } },
          right: { style: 'thin', color: { argb: 'FF000000' } }
        };
        if (colNumber >= 15) {
          cell.alignment = { horizontal: 'right', vertical: 'middle' };
        }
      });

      // Add autofilter
      worksheet.autoFilter = {
        from: { row: 1, column: 1 },
        to: { row: rows.length + 2, column: header.length }
      };

      // Freeze header row
      worksheet.views = [{ state: 'frozen', ySplit: 1 }];

      // Write file
      const fileName = `Checker_Reconciliation_Comparison_${location_id || 'Unknown'}_${new Date().toISOString().slice(0, 10)}.xlsx`;
      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      link.click();
      window.URL.revokeObjectURL(url);

      enqueueSnackbar('Comparison report exported successfully', { variant: 'success' });
    } catch (error) {
      console.error('Export error:', error);
      enqueueSnackbar('Failed to export comparison data', { variant: 'error' });
    } finally {
      setIsExporting(false);
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', gap: 2 }}>
        <CircularProgress />
        <Typography variant="body1" color="text.secondary">
          Loading reconciliation data...
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3, maxWidth: 1800, margin: '0 auto' }}>
      <Breadcrumbs sx={{ mb: 2 }}>
        <MuiLink component="button" variant="body2" onClick={handleBack} color="inherit">
          Checker Review
        </MuiLink>
        <Typography color="text.primary">System Reconciliation</Typography>
      </Breadcrumbs>

      <Stack direction={{ xs: 'column', md: 'row' }} alignItems={{ xs: 'stretch', md: 'center' }} justifyContent="space-between" spacing={2} sx={{ mb: 3 }}>
        <Box>
          <Typography variant="h4" gutterBottom>
            System Inventory Snapshot
          </Typography>
          <Typography variant="subtitle1" color="text.secondary" sx={{ mb: 1 }}>
            Location ID: {location_id || '-'}
          </Typography>
          <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
            {selectedItems.size > 0 && (
              <Button
                variant="contained"
                color="primary"
                onClick={handleMarkForChecking}
                sx={{ fontWeight: 600 }}
              >
                Mark for Checking ({selectedItems.size})
              </Button>
            )}
            {comparing && (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <CircularProgress size={20} />
                <Typography variant="body2" color="text.secondary">
                  Comparing with checked transactions...
                </Typography>
              </Box>
            )}
            {!comparing && comparisonResults.length > 0 && (
              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                <Chip
                  label={`Matches: ${comparisonResults.filter(r => r.status === 'Match').length}`}
                  size="small"
                  color="success"
                />
                <Chip
                  label={`Undercounts: ${comparisonResults.filter(r => r.status === 'Undercount').length}`}
                  size="small"
                  color="warning"
                />
                <Chip
                  label={`Overcounts: ${comparisonResults.filter(r => r.status === 'Overcount').length}`}
                  size="small"
                  color="info"
                />
                <Chip
                  label={`Found: ${comparisonResults.filter(r => r.status === 'Orphaned').length}`}
                  size="small"
                  color="error"
                />
              </Box>
            )}
            <Button 
              variant="outlined" 
              color="primary" 
              onClick={() => performComparison()}
              disabled={comparing}
            >
              {comparing ? 'Comparing...' : 'Refresh Comparison'}
            </Button>
            {comparisonResults.length > 0 && (
              <Button
                variant="contained"
                color="success"
                startIcon={isExporting ? <CircularProgress size={16} /> : <DownloadIcon />}
                onClick={handleExport}
                disabled={isExporting || comparing}
                sx={{ fontWeight: 600 }}
              >
                {isExporting ? 'Exporting...' : 'Download Comparison'}
              </Button>
            )}
          </Stack>
        </Box>
      </Stack>


      {summary && (
        <Grid container spacing={2} sx={{ mb: 3 }}>
          {[{
            label: 'Branch',
            value: summary.branch || '-'
          }, {
            label: 'Warehouse',
            value: summary.warehouse || '-'
          }, {
            label: 'Total System Items',
            value: formatNumber(summary.total_system_items || summary.totalItems || 0)
          }, {
            label: 'Total System Quantity',
            value: formatNumber(summary.total_system_quantity || 0)
          }, summary.record_date ? {
            label: 'Record Date',
            value: new Date(summary.record_date).toLocaleString()
          } : null].filter(Boolean).map((card, index) => (
            <Grid item xs={12} sm={6} md={4} lg={3} key={index}>
              <Paper elevation={1} sx={{ p: 2, height: '100%', borderRadius: 2, background: 'linear-gradient(135deg, #f5f9ff 0%, #ffffff 100%)' }}>
                <Typography variant="body2" color="text.secondary" sx={{ textTransform: 'uppercase', letterSpacing: 0.4 }}>
                  {card!.label}
                </Typography>
                <Typography variant="h6" sx={{ mt: 0.5 }}>
                  {card!.value}
                </Typography>
              </Paper>
            </Grid>
          ))}
        </Grid>
      )}

      {/* Filter Bar */}
      <Paper sx={{ p: 2, mb: 2 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Tooltip title="Filter the table below">
            <TextField
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              size="small"
              placeholder="Search by tag, form, grade, mill, heat..."
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon fontSize="small" />
                  </InputAdornment>
                )
              }}
              sx={{ maxWidth: 400 }}
            />
          </Tooltip>
          <Button
            variant="outlined"
            size="small"
            onClick={() => {
              setFilterTagNumber(null);
              setFilterForm(null);
              setFilterGrade(null);
              setFilterSize(null);
              setFilterFinish(null);
              setFilterExtFinish(null);
              setFilterLocation(null);
              setFilterMill(null);
              setFilterHeat(null);
              setFilterInvType(null);
              setFilterInvQuality(null);
              setFilterStatus(null);
              setFilterBranch(null);
              setFilterWarehouse(null);
            }}
            disabled={[
              filterTagNumber, filterForm, filterGrade, filterSize, filterFinish, filterExtFinish,
              filterLocation, filterMill, filterHeat, filterInvType, filterInvQuality,
              filterStatus, filterBranch, filterWarehouse
            ].every(v => !v)}
          >
            Clear Filters
          </Button>
        </Box>
        
        {/* Filter Dropdowns */}
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.5 }}>
          <TextField
            size="small"
            label="Tag Number"
            value={filterTagNumber || ''}
            onChange={(e) => setFilterTagNumber(e.target.value || null)}
            sx={{ minWidth: 140 }}
            placeholder="Enter tag number"
          />
          
          <FormControl size="small" sx={{ minWidth: 120 }}>
            <InputLabel>Form</InputLabel>
            <Select
              value={filterForm || ''}
              label="Form"
              onChange={(e) => setFilterForm(e.target.value || null)}
            >
              <MenuItem value="">All</MenuItem>
              {uniqueValues.forms?.map((value) => (
                <MenuItem key={String(value)} value={String(value)}>{String(value)}</MenuItem>
              ))}
            </Select>
          </FormControl>
          
          <FormControl size="small" sx={{ minWidth: 120 }}>
            <InputLabel>Grade</InputLabel>
            <Select
              value={filterGrade || ''}
              label="Grade"
              onChange={(e) => setFilterGrade(e.target.value || null)}
            >
              <MenuItem value="">All</MenuItem>
              {uniqueValues.grades?.map((value) => (
                <MenuItem key={String(value)} value={String(value)}>{String(value)}</MenuItem>
              ))}
            </Select>
          </FormControl>
          
          <FormControl size="small" sx={{ minWidth: 120 }}>
            <InputLabel>Size</InputLabel>
            <Select
              value={filterSize || ''}
              label="Size"
              onChange={(e) => setFilterSize(e.target.value || null)}
            >
              <MenuItem value="">All</MenuItem>
              {uniqueValues.sizes?.map((value) => (
                <MenuItem key={String(value)} value={String(value)}>{String(value)}</MenuItem>
              ))}
            </Select>
          </FormControl>
          
          <FormControl size="small" sx={{ minWidth: 120 }}>
            <InputLabel>Finish</InputLabel>
            <Select
              value={filterFinish || ''}
              label="Finish"
              onChange={(e) => setFilterFinish(e.target.value || null)}
            >
              <MenuItem value="">All</MenuItem>
              {uniqueValues.finishes?.map((value) => (
                <MenuItem key={String(value)} value={String(value)}>{String(value)}</MenuItem>
              ))}
            </Select>
          </FormControl>
          
          <FormControl size="small" sx={{ minWidth: 140 }}>
            <InputLabel>Location</InputLabel>
            <Select
              value={filterLocation || ''}
              label="Location"
              onChange={(e) => setFilterLocation(e.target.value || null)}
            >
              <MenuItem value="">All</MenuItem>
              {uniqueValues.locations?.map((value) => (
                <MenuItem key={String(value)} value={String(value)}>{String(value)}</MenuItem>
              ))}
            </Select>
          </FormControl>
          
          <FormControl size="small" sx={{ minWidth: 120 }}>
            <InputLabel>Mill</InputLabel>
            <Select
              value={filterMill || ''}
              label="Mill"
              onChange={(e) => setFilterMill(e.target.value || null)}
            >
              <MenuItem value="">All</MenuItem>
              {uniqueValues.mills?.map((value) => (
                <MenuItem key={String(value)} value={String(value)}>{String(value)}</MenuItem>
              ))}
            </Select>
          </FormControl>
          
          <FormControl size="small" sx={{ minWidth: 120 }}>
            <InputLabel>Heat</InputLabel>
            <Select
              value={filterHeat || ''}
              label="Heat"
              onChange={(e) => setFilterHeat(e.target.value || null)}
            >
              <MenuItem value="">All</MenuItem>
              {uniqueValues.heats?.map((value) => (
                <MenuItem key={String(value)} value={String(value)}>{String(value)}</MenuItem>
              ))}
            </Select>
          </FormControl>
          
          <FormControl size="small" sx={{ minWidth: 140 }}>
            <InputLabel>Status</InputLabel>
            <Select
              value={filterStatus || ''}
              label="Status"
              onChange={(e) => setFilterStatus(e.target.value || null)}
            >
              <MenuItem value="">All</MenuItem>
              {uniqueValues.statuses?.map((value) => (
                <MenuItem key={String(value)} value={String(value)}>{getDisplayStatus(String(value))}</MenuItem>
              ))}
            </Select>
          </FormControl>
          
          <FormControl size="small" sx={{ minWidth: 120 }}>
            <InputLabel>Branch</InputLabel>
            <Select
              value={filterBranch || ''}
              label="Branch"
              onChange={(e) => setFilterBranch(e.target.value || null)}
            >
              <MenuItem value="">All</MenuItem>
              {uniqueValues.branches?.map((value) => (
                <MenuItem key={String(value)} value={String(value)}>{String(value)}</MenuItem>
              ))}
            </Select>
          </FormControl>
          
          <FormControl size="small" sx={{ minWidth: 120 }}>
            <InputLabel>Warehouse</InputLabel>
            <Select
              value={filterWarehouse || ''}
              label="Warehouse"
              onChange={(e) => setFilterWarehouse(e.target.value || null)}
            >
              <MenuItem value="">All</MenuItem>
              {uniqueValues.warehouses?.map((value) => (
                <MenuItem key={String(value)} value={String(value)}>{String(value)}</MenuItem>
              ))}
            </Select>
          </FormControl>
        </Box>
        
        {/* Active Filters Display */}
        {[
          filterTagNumber, filterForm, filterGrade, filterSize, filterFinish, filterExtFinish,
          filterLocation, filterMill, filterHeat, filterInvType, filterInvQuality,
          filterStatus, filterBranch, filterWarehouse
        ].some(v => v) && (
          <Box sx={{ mt: 2, display: 'flex', flexWrap: 'wrap', gap: 1 }}>
            {filterTagNumber && (
              <Chip 
                label={`Tag Number: ${filterTagNumber}`} 
                size="small" 
                onDelete={() => setFilterTagNumber(null)}
                color="primary"
                variant="outlined"
              />
            )}
            {filterForm && (
              <Chip 
                label={`Form: ${filterForm}`} 
                size="small" 
                onDelete={() => setFilterForm(null)}
                color="primary"
                variant="outlined"
              />
            )}
            {filterGrade && (
              <Chip 
                label={`Grade: ${filterGrade}`} 
                size="small" 
                onDelete={() => setFilterGrade(null)}
                color="primary"
                variant="outlined"
              />
            )}
            {filterSize && (
              <Chip 
                label={`Size: ${filterSize}`} 
                size="small" 
                onDelete={() => setFilterSize(null)}
                color="primary"
                variant="outlined"
              />
            )}
            {filterFinish && (
              <Chip 
                label={`Finish: ${filterFinish}`} 
                size="small" 
                onDelete={() => setFilterFinish(null)}
                color="primary"
                variant="outlined"
              />
            )}
            {filterLocation && (
              <Chip 
                label={`Location: ${filterLocation}`} 
                size="small" 
                onDelete={() => setFilterLocation(null)}
                color="primary"
                variant="outlined"
              />
            )}
            {filterMill && (
              <Chip 
                label={`Mill: ${filterMill}`} 
                size="small" 
                onDelete={() => setFilterMill(null)}
                color="primary"
                variant="outlined"
              />
            )}
            {filterHeat && (
              <Chip 
                label={`Heat: ${filterHeat}`} 
                size="small" 
                onDelete={() => setFilterHeat(null)}
                color="primary"
                variant="outlined"
              />
            )}
            {filterStatus && (
              <Chip 
                label={`Status: ${getDisplayStatus(filterStatus)}`} 
                size="small" 
                onDelete={() => setFilterStatus(null)}
                color="primary"
                variant="outlined"
              />
            )}
            {filterBranch && (
              <Chip 
                label={`Branch: ${filterBranch}`} 
                size="small" 
                onDelete={() => setFilterBranch(null)}
                color="primary"
                variant="outlined"
              />
            )}
            {filterWarehouse && (
              <Chip 
                label={`Warehouse: ${filterWarehouse}`} 
                size="small" 
                onDelete={() => setFilterWarehouse(null)}
                color="primary"
                variant="outlined"
              />
            )}
          </Box>
        )}
      </Paper>

      <Paper sx={{ borderRadius: 2, overflow: 'hidden', boxShadow: (theme) => theme.shadows[2] }}>
        <TableContainer sx={{ maxHeight: '65vh' }}>
          <Table 
            stickyHeader 
            size="small"
            key={`table-${filterTagNumber || ''}-${filterForm || ''}-${filterGrade || ''}-${filterSize || ''}-${filterFinish || ''}-${filterStatus || ''}-${filteredItems.length}`}
          >
            <TableHead>
              <TableRow>
                      <TableCell sx={{ 
                        backgroundColor: theme.palette.mode === 'dark' 
                          ? theme.palette.background.paper 
                          : '#ffffff',
                        fontWeight: 600,
                        position: 'sticky',
                        top: 0,
                        zIndex: 10,
                        boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                        borderBottom: `2px solid ${theme.palette.divider}`
                      }}>Action</TableCell>
                <TableCell sx={{ 
                  backgroundColor: theme.palette.mode === 'dark' 
                    ? theme.palette.background.paper 
                    : '#ffffff',
                  fontWeight: 600,
                  position: 'sticky',
                  top: 0,
                  zIndex: 10,
                  boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                  borderBottom: `2px solid ${theme.palette.divider}`
                }}>Tag Number</TableCell>
                <TableCell sx={{ 
                  backgroundColor: theme.palette.mode === 'dark' 
                    ? theme.palette.background.paper 
                    : '#ffffff',
                  fontWeight: 600,
                  position: 'sticky',
                  top: 0,
                  zIndex: 10,
                  boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                  borderBottom: `2px solid ${theme.palette.divider}`
                }}>Form</TableCell>
                <TableCell sx={{ 
                  backgroundColor: theme.palette.mode === 'dark' 
                    ? theme.palette.background.paper 
                    : '#ffffff',
                  fontWeight: 600,
                  position: 'sticky',
                  top: 0,
                  zIndex: 10,
                  boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                  borderBottom: `2px solid ${theme.palette.divider}`
                }}>Grade</TableCell>
                <TableCell sx={{ 
                  backgroundColor: theme.palette.mode === 'dark' 
                    ? theme.palette.background.paper 
                    : '#ffffff',
                  fontWeight: 600,
                  position: 'sticky',
                  top: 0,
                  zIndex: 10,
                  boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                  borderBottom: `2px solid ${theme.palette.divider}`
                }}>Size</TableCell>
                <TableCell sx={{ 
                  backgroundColor: theme.palette.mode === 'dark' 
                    ? theme.palette.background.paper 
                    : '#ffffff',
                  fontWeight: 600,
                  position: 'sticky',
                  top: 0,
                  zIndex: 10,
                  boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                  borderBottom: `2px solid ${theme.palette.divider}`
                }}>Finish</TableCell>
                <TableCell sx={{ 
                  backgroundColor: theme.palette.mode === 'dark' 
                    ? theme.palette.background.paper 
                    : '#ffffff',
                  fontWeight: 600,
                  position: 'sticky',
                  top: 0,
                  zIndex: 10,
                  boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                  borderBottom: `2px solid ${theme.palette.divider}`
                }}>Extended Finish</TableCell>
                <TableCell sx={{ 
                  backgroundColor: theme.palette.mode === 'dark' 
                    ? theme.palette.background.paper 
                    : '#ffffff',
                  fontWeight: 600,
                  position: 'sticky',
                  top: 0,
                  zIndex: 10,
                  boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                  borderBottom: `2px solid ${theme.palette.divider}`
                }}>Width</TableCell>
                <TableCell sx={{ 
                  backgroundColor: theme.palette.mode === 'dark' 
                    ? theme.palette.background.paper 
                    : '#ffffff',
                  fontWeight: 600,
                  position: 'sticky',
                  top: 0,
                  zIndex: 10,
                  boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                  borderBottom: `2px solid ${theme.palette.divider}`
                }}>Length (ft)</TableCell>
                <TableCell sx={{ 
                  backgroundColor: theme.palette.mode === 'dark' 
                    ? theme.palette.background.paper 
                    : '#ffffff',
                  fontWeight: 600,
                  position: 'sticky',
                  top: 0,
                  zIndex: 10,
                  boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                  borderBottom: `2px solid ${theme.palette.divider}`
                }}>Location</TableCell>
                <TableCell sx={{ 
                  backgroundColor: theme.palette.mode === 'dark' 
                    ? theme.palette.background.paper 
                    : '#ffffff',
                  fontWeight: 600,
                  position: 'sticky',
                  top: 0,
                  zIndex: 10,
                  boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                  borderBottom: `2px solid ${theme.palette.divider}`
                }}>Mill</TableCell>
                <TableCell sx={{ 
                  backgroundColor: theme.palette.mode === 'dark' 
                    ? theme.palette.background.paper 
                    : '#ffffff',
                  fontWeight: 600,
                  position: 'sticky',
                  top: 0,
                  zIndex: 10,
                  boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                  borderBottom: `2px solid ${theme.palette.divider}`
                }}>Heat</TableCell>
                <TableCell align="right" sx={{ 
                  backgroundColor: theme.palette.mode === 'dark' 
                    ? theme.palette.background.paper 
                    : '#ffffff',
                  fontWeight: 600,
                  position: 'sticky',
                  top: 0,
                  zIndex: 10,
                  boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                  borderBottom: `2px solid ${theme.palette.divider}`
                }}>Weight</TableCell>
                <TableCell sx={{ 
                  backgroundColor: theme.palette.mode === 'dark' 
                    ? theme.palette.background.paper 
                    : '#ffffff',
                  fontWeight: 600,
                  position: 'sticky',
                  top: 0,
                  zIndex: 10,
                  boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                  borderBottom: `2px solid ${theme.palette.divider}`
                }}>Branch</TableCell>
                <TableCell sx={{ 
                  backgroundColor: theme.palette.mode === 'dark' 
                    ? theme.palette.background.paper 
                    : '#ffffff',
                  fontWeight: 600,
                  position: 'sticky',
                  top: 0,
                  zIndex: 10,
                  boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                  borderBottom: `2px solid ${theme.palette.divider}`
                }}>Warehouse</TableCell>
                <TableCell sx={{ 
                  backgroundColor: theme.palette.mode === 'dark' 
                    ? theme.palette.background.paper 
                    : '#ffffff',
                  fontWeight: 600,
                  position: 'sticky',
                  top: 0,
                  zIndex: 10,
                  boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                  borderBottom: `2px solid ${theme.palette.divider}`
                }}>Inventory Type</TableCell>
                <TableCell sx={{ 
                  backgroundColor: theme.palette.mode === 'dark' 
                    ? theme.palette.background.paper 
                    : '#ffffff',
                  fontWeight: 600,
                  position: 'sticky',
                  top: 0,
                  zIndex: 10,
                  boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                  borderBottom: `2px solid ${theme.palette.divider}`
                }}>Inventory Quality</TableCell>
                <TableCell align="right" sx={{ 
                  backgroundColor: theme.palette.mode === 'dark' 
                    ? theme.palette.background.paper 
                    : '#ffffff',
                  fontWeight: 600,
                  position: 'sticky',
                  top: 0,
                  zIndex: 10,
                  boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                  borderBottom: `2px solid ${theme.palette.divider}`
                }}>System Quantity</TableCell>
                <TableCell align="right" sx={{ 
                  backgroundColor: theme.palette.mode === 'dark' 
                    ? theme.palette.background.paper 
                    : '#ffffff',
                  fontWeight: 600,
                  position: 'sticky',
                  top: 0,
                  zIndex: 10,
                  boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                  borderBottom: `2px solid ${theme.palette.divider}`
                }}>Counted Quantity</TableCell>
                <TableCell align="right" sx={{ 
                  backgroundColor: theme.palette.mode === 'dark' 
                    ? theme.palette.background.paper 
                    : '#ffffff',
                  fontWeight: 600,
                  position: 'sticky',
                  top: 0,
                  zIndex: 10,
                  boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                  borderBottom: `2px solid ${theme.palette.divider}`
                }}>Variance</TableCell>
                <TableCell sx={{ 
                  backgroundColor: theme.palette.mode === 'dark' 
                    ? theme.palette.background.paper 
                    : '#ffffff',
                  fontWeight: 600,
                  position: 'sticky',
                  top: 0,
                  zIndex: 10,
                  boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                  borderBottom: `2px solid ${theme.palette.divider}`
                }}>Status</TableCell>
                <TableCell align="right" sx={{ 
                  backgroundColor: theme.palette.mode === 'dark' 
                    ? theme.palette.background.paper 
                    : '#ffffff',
                  fontWeight: 600,
                  position: 'sticky',
                  top: 0,
                  zIndex: 10,
                  boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                  borderBottom: `2px solid ${theme.palette.divider}`
                }}>Cost</TableCell>
                <TableCell align="right" sx={{ 
                  backgroundColor: theme.palette.mode === 'dark' 
                    ? theme.palette.background.paper 
                    : '#ffffff',
                  fontWeight: 600,
                  position: 'sticky',
                  top: 0,
                  zIndex: 10,
                  boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                  borderBottom: `2px solid ${theme.palette.divider}`
                }}>Total Amount</TableCell>
              </TableRow>
            </TableHead>
            <TableBody key={`tbody-${filteredItems.length}-${filterTagNumber || ''}-${filterForm || ''}-${filterGrade || ''}-${filterStatus || ''}`}>
              {filteredItems.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={23} align="center" sx={{ py: 4 }}>
                    <Typography variant="body1" color="text.secondary">
                      {systemItems.length === 0
                        ? 'No system inventory records were returned for this location.'
                        : 'No system records match your search.'}
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                filteredItems.map((item, index) => {
                  // Get comparison data for this item
                  const itemKey = createComparisonKey({
                    prd_tag_no: item.prd_tag_no || item.tag_no,
                    form: item.form,
                    grade: item.grade,
                    size: item.size,
                    finish: item.finish,
                    ext_finish: item.ext_finish,
                    width: item.width,
                    length: item.length,
                    location: item.location,
                    mill: item.mill,
                    heat: item.heat,
                    inv_type: item.inv_type,
                    inv_quality: item.inv_quality
                  });
                  const comparison = comparisonMap.get(itemKey);
                  const status = comparison?.status;
                  
                  // Get background color based on status
                  const getBackgroundColor = () => {
                    if (!comparison) return 'transparent';
                    switch (status) {
                      case 'Match':
                        return 'rgba(76, 175, 80, 0.08)'; // Green
                      case 'Undercount':
                        return 'rgba(211, 47, 47, 0.08)'; // Red
                      case 'Overcount':
                        return 'rgba(255, 152, 0, 0.08)'; // Orange
                      case 'Orphaned':
                        return 'rgba(255, 235, 59, 0.15)'; // Yellow
                      default:
                        return 'transparent';
                    }
                  };

                  const getHoverBackgroundColor = () => {
                    if (!comparison) return 'rgba(0, 0, 0, 0.04)';
                    switch (status) {
                      case 'Match':
                        return 'rgba(76, 175, 80, 0.12)'; // Green
                      case 'Undercount':
                        return 'rgba(211, 47, 47, 0.12)'; // Red
                      case 'Overcount':
                        return 'rgba(255, 152, 0, 0.12)'; // Orange
                      case 'Orphaned':
                        return 'rgba(255, 235, 59, 0.20)'; // Yellow
                      default:
                        return 'rgba(0, 0, 0, 0.04)';
                    }
                  };

                  const getOddRowBackgroundColor = () => {
                    if (!comparison) return 'rgba(15, 23, 42, 0.015)';
                    switch (status) {
                      case 'Match':
                        return 'rgba(76, 175, 80, 0.04)'; // Green
                      case 'Undercount':
                        return 'rgba(211, 47, 47, 0.04)'; // Red
                      case 'Overcount':
                        return 'rgba(255, 152, 0, 0.04)'; // Orange
                      case 'Orphaned':
                        return 'rgba(255, 235, 59, 0.10)'; // Yellow
                      default:
                        return 'rgba(15, 23, 42, 0.015)';
                    }
                  };

                  const statusColor = comparison ? {
                    Match: 'success',
                    Undercount: 'error', // Red
                    Overcount: 'warning', // Orange
                    Orphaned: 'warning' // Yellow (using warning as closest, but we'll use custom color)
                  }[comparison.status] as 'success' | 'warning' | 'error' : undefined;

                  // Check if checkbox should be shown (only for items with counted quantity)
                  const showCheckbox = comparison && comparison.countedQuantity > 0;
                  const isSelected = selectedItems.has(itemKey);
                  const isMarked = isItemMarked(item);

                  return (
                  <TableRow
                    key={`${item.prd_tag_no || item.tag_no || index}-${filterTagNumber || ''}-${filterForm || ''}-${filterGrade || ''}-${filterSize || ''}-${filterStatus || ''}`}
                    hover
                      sx={{
                        '&:nth-of-type(odd)': { backgroundColor: getOddRowBackgroundColor() },
                        backgroundColor: getBackgroundColor(),
                        '&:hover': {
                          backgroundColor: getHoverBackgroundColor()
                        },
                        // Add border for marked items
                        ...(isMarked && {
                          borderLeft: '4px solid #1976d2',
                          backgroundColor: isMarked ? 'rgba(25, 118, 210, 0.05)' : getBackgroundColor()
                        })
                      }}
                  >
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        {showCheckbox ? (
                          <Checkbox
                            checked={isSelected}
                            onChange={() => handleSelectItem(itemKey)}
                            size="small"
                            color="primary"
                          />
                        ) : null}
                        {isMarked && (
                          <Chip
                            label="Marked"
                            size="small"
                            color="info"
                            sx={{ 
                              height: 20,
                              fontSize: '0.65rem',
                              fontWeight: 600
                            }}
                          />
                        )}
                      </Box>
                    </TableCell>
                    <TableCell>{formatValue(item.prd_tag_no || item.tag_no)}</TableCell>
                    <TableCell>{formatValue(item.form)}</TableCell>
                    <TableCell>{formatValue(item.grade)}</TableCell>
                    <TableCell>{formatValue(item.size)}</TableCell>
                    <TableCell>{formatValue(item.finish)}</TableCell>
                    <TableCell>{formatValue(item.ext_finish)}</TableCell>
                    <TableCell>{formatValue(item.width)}</TableCell>
                    <TableCell>{formatLengthInFeet(item.length)}</TableCell>
                    <TableCell>{formatValue(item.location)}</TableCell>
                    <TableCell>{formatValue(item.mill)}</TableCell>
                    <TableCell>{formatValue(item.heat)}</TableCell>
                    <TableCell align="right">{formatNumber(item.weight)}</TableCell>
                    <TableCell>{formatValue(item.branch)}</TableCell>
                    <TableCell>{formatValue(item.warehouse)}</TableCell>
                    <TableCell>{formatValue(item.inv_type)}</TableCell>
                    <TableCell>{formatValue(item.inv_quality)}</TableCell>
                    <TableCell align="right">{formatNumber(item.total_qty)}</TableCell>
                      <TableCell align="right">
                        {comparison && comparison.countedQuantity > 0 ? (
                          <Box>
                            <Typography variant="body2">
                              {formatNumber(comparison.countedQuantity)}
                            </Typography>
                            {comparison.sections && comparison.sections.length > 0 && (
                              <Box sx={{ mt: 0.5 }}>
                                {comparison.sections.map((section) => (
                                  <Typography
                                    key={section.section_id}
                                    variant="caption"
                                    sx={{
                                      display: 'block',
                                      color: 'text.secondary',
                                      fontSize: '0.7rem',
                                      lineHeight: 1.2
                                    }}
                                  >
                                    {section.section_desc}: {formatNumber(section.quantity)}
                                  </Typography>
                                ))}
                              </Box>
                            )}
                          </Box>
                        ) : '-'}
                      </TableCell>
                      <TableCell align="right">
                        {comparison ? (
                          <Typography
                            variant="body2"
                            sx={{
                              color: comparison.variance === 0 ? 'success.main' : comparison.variance > 0 ? 'warning.main' : 'error.main',
                              fontWeight: comparison.variance !== 0 ? 600 : 'normal'
                            }}
                          >
                            {comparison.variance > 0 ? '+' : ''}{formatNumber(comparison.variance)}
                          </Typography>
                        ) : '-'}
                      </TableCell>
                      <TableCell>
                        {comparison ? (
                          <Chip
                            label={getDisplayStatus(comparison.status)}
                            size="small"
                            color={status === 'Orphaned' ? 'warning' : statusColor}
                            sx={{ 
                              fontWeight: 600,
                              ...(status === 'Orphaned' && {
                                backgroundColor: 'rgba(255, 235, 59, 0.3)',
                                color: 'rgba(0, 0, 0, 0.87)'
                              })
                            }}
                          />
                        ) : (
                          <Chip
                            label="Not Counted"
                            size="small"
                            color="default"
                            variant="outlined"
                          />
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </TableContainer>
        <Divider />
        <Box sx={{ p: 2, display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 1 }}>
          <Typography variant="body2" color="text.secondary">
            Showing {filteredItems.length} of {systemItems.length} record{systemItems.length === 1 ? '' : 's'}
          </Typography>
          <Tooltip title="Sum of the System Quantity column for visible rows" arrow>
            <Typography variant="body2" color="text.secondary">
              Visible system quantity total: {formatNumber(totalSystemQuantity)}
            </Typography>
          </Tooltip>
        </Box>
      </Paper>

      {/* Recheck Section */}
      <Paper sx={{ p: 2, borderRadius: 2, overflow: 'hidden', boxShadow: (theme) => theme.shadows[2], mt: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h6">
            Items Marked for Recheck ({recheckItems.length})
          </Typography>
          {recheckItems.length > 0 && (
            <Button
              variant="outlined"
              color="primary"
              size="small"
              onClick={handleExportRecheckItems}
              startIcon={<DownloadIcon />}
            >
              Export List
            </Button>
          )}
        </Box>
        
        <TableContainer sx={{ maxHeight: 400 }}>
          <Table stickyHeader size="small">
            <TableHead>
              <TableRow>
                <TableCell>Tag Number</TableCell>
                <TableCell>Form</TableCell>
                <TableCell>Size</TableCell>
                <TableCell>Weight</TableCell>
                <TableCell>System Qty</TableCell>
                <TableCell>Checker Qty</TableCell>
                <TableCell>Reason</TableCell>
                <TableCell>Notes</TableCell>
                <TableCell>Status</TableCell>
                <TableCell align="center">Action</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {recheckItems.map((item: RecheckItem, index: number) => (
                <TableRow key={index} hover>
                  <TableCell>
                    {item.prd_tag_no || item.tag_no || '-'}
                  </TableCell>
                  <TableCell>{item.form || '-'}</TableCell>
                  <TableCell>{item.size || '-'}</TableCell>
                  <TableCell>{item.weight ?? '-'}</TableCell>
                  <TableCell>{item.system_qty ?? '-'}</TableCell>
                  <TableCell>{item.checker_qty ?? '-'}</TableCell>
                  <TableCell>{item.recheck_reason || '-'}</TableCell>
                  <TableCell>{item.recheck_notes || '-'}</TableCell>
                  <TableCell>
                    {item.status ? (
                      <Chip 
                        label={item.status}
                        size="small"
                        color={item.status === 'pending' ? 'warning' : 'success'}
                      />
                    ) : '-'}
                  </TableCell>
                  <TableCell align="center">
                    <IconButton 
                      size="small" 
                      color="error" 
                      onClick={() => handleRemoveFromRecheck(item)}
                      title="Remove from recheck list"
                    >
                      <CloseIcon fontSize="small" />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
              {recheckItems.length === 0 && (
                <TableRow>
                  <TableCell colSpan={10} align="center" sx={{ py: 3 }}>
                    No items marked for rechecking.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>
    </Box>
  );
};

export default ReconciliationCheckerPage; 