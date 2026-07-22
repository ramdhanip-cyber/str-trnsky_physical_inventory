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
  Divider,
  Grid,
  Stack,
  TextField,
  Tooltip,
  Button,
  Chip,
  Checkbox,
  Collapse,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  IconButton,
  Tabs,
  Tab,
  Badge,
  useTheme
} from '@mui/material';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { useSnackbar } from 'notistack';
import type { ReconciliationData, ReconciliationItem, ReconciliationSummary } from '../types/reconciliation';
import SearchIcon from '@mui/icons-material/Search';
import FilterListIcon from '@mui/icons-material/FilterList';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import ChevronLeft from '@mui/icons-material/ChevronLeft';
import CategoryOutlinedIcon from '@mui/icons-material/CategoryOutlined';
import PlaceOutlinedIcon from '@mui/icons-material/PlaceOutlined';
import PrecisionManufacturingOutlinedIcon from '@mui/icons-material/PrecisionManufacturingOutlined';
import ClearAllIcon from '@mui/icons-material/ClearAll';
import TuneIcon from '@mui/icons-material/Tune';
import { servicesAPI } from '../config/api';
import { alpha } from '@mui/material/styles';

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

const getStatusDisplayLabel = (status: string): string => {
  return status === 'Orphaned' ? 'Found' : status;
};

const RECONCILE_ALLOWED_FIELDS = ['sys_tag_no', 'form', 'grade', 'size', 'finish', 'ext_finish', 'width', 'length', 'location', 'mill', 'heat', 'type', 'quality'] as const;

// Convert length to feet for display only when it clearly looks like inches.
// Counter/orphaned counted values are already in feet and must not be divided again.
const formatLengthInFeet = (value: number | string | undefined | null): string => {
  if (value === null || value === undefined || value === '') {
    return '-';
  }
  const numeric = typeof value === 'number' ? value : Number(value);
  if (Number.isNaN(numeric)) {
    return String(value);
  }
  const feet = numeric > 100 ? numeric / 12 : numeric;
  return feet.toFixed(2);
};

// Strip 'ft' suffix from length (e.g. from API) so stored/displayed value has no unit
const stripLengthFt = (value: string | number | undefined | null): string | number | undefined | null => {
  if (value === null || value === undefined) return value;
  if (typeof value === 'number') return value;
  const s = String(value).trim().replace(/\s*ft\s*$/i, '').trim();
  return s === '' ? value : s;
};

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
  foundReason?: string;
  combinedItems?: Array<{
    transactionId?: number | null;
    sectionId?: number;
    sectionDesc?: string;
    sysTagNo?: string;
    form?: string;
    grade?: string;
    size?: string;
    finish?: string;
    extFinish?: string;
    width?: string | number;
    length?: string | number;
    location?: string;
    mill?: string;
    heat?: string;
    type?: string;
    quality?: string;
    quantity: number;
  }>;
  sections?: Array<{ section_id: number; section_desc: string; quantity: number; transaction_ids: number[] }>;
}

const createEmptyReconciliationData = (
  context: { location_id?: string; warehouse?: string; branch?: string }
): ReconciliationData => ({
  summary: {
    total_system_items: 0,
    total_system_quantity: 0,
    totalItems: 0,
    matchedItems: 0,
    discrepancies: 0,
    missingItems: 0,
    overcounts: 0,
    undercounts: 0,
    branch: context.branch,
    warehouse: context.warehouse,
    location_id: context.location_id,
    record_date: new Date().toISOString(),
  },
  items: [],
});

const ReconciliationCounterPage: React.FC = () => {
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
  const [filterLength, setFilterLength] = useState<string | null>(null);
  const [filterWidth, setFilterWidth] = useState<string | null>(null);
  const [filtersExpanded, setFiltersExpanded] = useState(false);
  const [filterTab, setFilterTab] = useState(0);
  const [expandedCombinedRows, setExpandedCombinedRows] = useState<Set<string>>(new Set());
  

  const effectiveCompareFields = useMemo(() => {
    const raw = (summary as any)?.compare_fields;
    if (!Array.isArray(raw) || raw.length === 0) {
      return [...RECONCILE_ALLOWED_FIELDS];
    }
    return raw.filter((f: string) => (RECONCILE_ALLOWED_FIELDS as readonly string[]).includes(f));
  }, [summary]);

  useEffect(() => {
    const applyReconciliationData = (stateData: ReconciliationData) => {
      const items = (stateData.items ?? []).map((item: ReconciliationItem) => ({
        ...item,
        length: stripLengthFt(item.length) ?? item.length
      }));
      setSystemItems(items);
      setSummary(stateData.summary ?? null);
      setLoading(false);
    };

    const loadReconciliation = async () => {
      const stateData = location.state?.reconciliationData as ReconciliationData | undefined;
      if (stateData) {
        applyReconciliationData(stateData);
        return;
      }

      const locationContext = location.state?.locationContext as
        | { warehouse: string; branch: string; location_id?: string }
        | undefined;

      const tryLoadSavedRecord = async (warehouse: string, branch: string) => {
        if (!location_id) return false;
        try {
          const response = await servicesAPI.checkExistingReconciliation({
            location_id,
            warehouse,
            branch,
          });
          if (response.data.exists && response.data.record) {
            const record = response.data.record;
            applyReconciliationData({
              summary: record.summary,
              items: record.items ?? [],
            });
            enqueueSnackbar('Loaded saved reconciliation data', { variant: 'info' });
            return true;
          }
        } catch (error) {
          console.error('Failed to load saved reconciliation:', error);
        }
        return false;
      };

      if (locationContext?.warehouse && locationContext?.branch) {
        const loaded = await tryLoadSavedRecord(locationContext.warehouse, locationContext.branch);
        if (!loaded) {
          applyReconciliationData(
            createEmptyReconciliationData({
              location_id,
              warehouse: locationContext.warehouse,
              branch: locationContext.branch,
            })
          );
          enqueueSnackbar(
            'Reconciliation page opened without system data. Reconcile may have failed or no saved record exists yet.',
            { variant: 'info' }
          );
        }
        return;
      }

      if (location_id) {
        try {
          const locResponse = await servicesAPI.getLocation(location_id);
          const warehouse = locResponse.data?.warehouse;
          const branch = locResponse.data?.branch;
          if (warehouse && branch) {
            const loaded = await tryLoadSavedRecord(warehouse, branch);
            if (!loaded) {
              applyReconciliationData(
                createEmptyReconciliationData({ location_id, warehouse, branch })
              );
              enqueueSnackbar('No reconciliation data yet. Showing empty reconciliation page.', { variant: 'info' });
            }
            return;
          }
        } catch (error) {
          console.error('Failed to resolve location for reconciliation page:', error);
        }
      }

      setLoading(false);
      enqueueSnackbar(
        'No reconciliation data found. Open this page from Counter Review using "Open Reconciliation Page".',
        { variant: 'warning' }
      );
    };

    loadReconciliation();
  }, [location_id, location.state, enqueueSnackbar]);

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

// Length for comparison key:
// - counter/counted values are already in feet (never reconvert)
// - system values convert only when they clearly look like inches
  const lengthForComparisonKey = (value: string | number | undefined | null, alreadyInFeet: boolean): string => {
    if (value === null || value === undefined || value === '') return '';
    const num = typeof value === 'number' ? value : parseFloat(String(value));
    if (Number.isNaN(num)) return String(value).trim();
  const inFeet = alreadyInFeet ? num : (num > 100 ? num / 12 : num);
    return inFeet === 0 ? '0' : inFeet.toFixed(4);
  };

  const getCompareFieldValue = (
    item: {
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
    },
    field: string,
    alreadyInFeet: boolean
  ): string => {
    switch (field) {
      case 'sys_tag_no':
        return normalizeValue(item.tag_no || item.prd_tag_no || item.sys_tag_no || item.sys_tag_id || '');
      case 'form':
        return normalizeValue(item.form);
      case 'grade':
        return normalizeValue(item.grade);
      case 'size':
        return normalizeValue(item.size);
      case 'finish':
        return normalizeValue(item.finish);
      case 'ext_finish':
        return normalizeValue(item.ext_finish || item.extendedFinish);
      case 'width':
        return normalizeValue(item.width);
      case 'length':
        return lengthForComparisonKey(item.length, alreadyInFeet);
      case 'location':
        return normalizeValue(item.location);
      case 'mill':
        return normalizeValue(item.mill);
      case 'heat':
        return normalizeValue(item.heat);
      case 'type':
        return normalizeValue(item.inv_type || item.type);
      case 'quality':
        return normalizeQuality(item.inv_quality || item.remarks || '');
      default:
        return '';
    }
  };

  // Create comparison key from selected compare fields.
  // Pass alreadyInFeet=true for counter/counted items (length already in feet).
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
    const fields = effectiveCompareFields.map((field) => getCompareFieldValue(item, field, alreadyInFeet));
    return fields.join('|');
  };

  // Auto-run comparison when system items are loaded
  useEffect(() => {
    if (systemItems.length > 0 && location_id && !comparing) {
      performComparison();
      fetchMarkedItems();
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
    const lengths = new Set<string>();
    const widths = new Set<string>();

    const addNumericFilter = (
      set: Set<string>,
      val: string | number | undefined | null
    ) => {
      if (val === null || val === undefined || val === '') return;
      const n = typeof val === 'number' ? val : Number(val);
      if (!Number.isNaN(n)) set.add(String(n));
      else set.add(String(val).trim());
    };

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
      addNumericFilter(lengths, item.length);
      addNumericFilter(widths, item.width);
      
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
        addNumericFilter(lengths, item.length);
        addNumericFilter(widths, item.width);
        statuses.add('Orphaned');
      });

    const sortedLengths = Array.from(lengths).sort((a, b) => {
      const na = Number(a);
      const nb = Number(b);
      if (!Number.isNaN(na) && !Number.isNaN(nb)) return na - nb;
      return String(a).localeCompare(String(b));
    });
    const sortedWidths = Array.from(widths).sort((a, b) => {
      const na = Number(a);
      const nb = Number(b);
      if (!Number.isNaN(na) && !Number.isNaN(nb)) return na - nb;
      return String(a).localeCompare(String(b));
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
      statuses: Array.from(statuses).sort(),
      lengths: sortedLengths,
      widths: sortedWidths
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
    if (filterLength) {
      const normLen = (v: string | number | undefined | null) => {
        if (v === null || v === undefined || v === '') return '';
        const n = typeof v === 'number' ? v : Number(v);
        return Number.isNaN(n) ? String(v).trim() : n.toFixed(4);
      };
      const lengthFilterNorm = normLen(filterLength);
      filtered = filtered.filter(item => normLen(item.length) === lengthFilterNorm);
    }
    if (filterWidth) {
      const normWid = (v: string | number | undefined | null) => {
        if (v === null || v === undefined || v === '') return '';
        const n = typeof v === 'number' ? v : Number(v);
        return Number.isNaN(n) ? String(v).trim() : n.toFixed(4);
      };
      const widthFilterNorm = normWid(filterWidth);
      filtered = filtered.filter(item => normWid(item.width) === widthFilterNorm);
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
    filterLength,
    filterWidth,
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

      // Fetch counted transactions for all sections in this location
      const allTransactions: any[] = [];
      
      for (const section of sections) {
        try {
          const transactionsResponse = await servicesAPI.getReviewTransactionsForCounter(
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

      const countedTransactions = allTransactions;

      // Group counted transactions by comparison key and sum quantities, tracking sections and transaction IDs
      const countedMap = new Map<string, { 
        item: any; 
        totalQuantity: number;
        combinedItems: Array<{
          transactionId?: number | null;
          sectionId?: number;
          sectionDesc?: string;
          sysTagNo?: string;
          form?: string;
          grade?: string;
          size?: string;
          finish?: string;
          extFinish?: string;
          width?: string | number;
          length?: string | number;
          location?: string;
          mill?: string;
          heat?: string;
          type?: string;
          quality?: string;
          quantity: number;
        }>;
        sections: Map<number, { section_id: number; section_desc: string; quantity: number; transaction_ids: number[] }>;
      }>();

      countedTransactions.forEach((transaction: any) => {
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
        }, true); // counted length is already in feet

        const quantity = transaction.qty || transaction.quantity || 0;
        const sectionId = transaction.section_id;
        const sectionDesc = transaction.section_desc || sectionMap.get(sectionId) || `Section ${sectionId}`;
        const transactionId = transaction.transaction_id || transaction.id || null;
        const combinedItemEntry = {
          transactionId,
          sectionId,
          sectionDesc,
          sysTagNo: transaction.sys_tag_no || transaction.sys_tag_id,
          form: transaction.form,
          grade: transaction.grade,
          size: transaction.size,
          finish: transaction.finish,
          extFinish: transaction.ext_finish || transaction.extendedFinish,
          width: transaction.width,
          length: transaction.length,
          location: transaction.location,
          mill: transaction.mill,
          heat: transaction.heat,
          type: transaction.type,
          quality: transaction.remarks,
          quantity
        };

        if (countedMap.has(key)) {
          const existing = countedMap.get(key)!;
          existing.totalQuantity += quantity;
          existing.combinedItems.push(combinedItemEntry);
          
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
            combinedItems: [combinedItemEntry],
            sections: sectionsMap
          });
        }
      });

      // Compare system items with counted items
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
            combinedItems: countedData.combinedItems,
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

      const findFoundReason = (countedItem: {
        sys_tag_no?: string;
        sys_tag_id?: string;
        form?: string;
        grade?: string;
        size?: string;
        finish?: string;
        ext_finish?: string;
        width?: string | number;
        length?: string | number;
        location?: string;
        mill?: string;
        heat?: string;
        type?: string;
        remarks?: string;
      }): string => {
        const fieldLabelMap: Record<string, string> = {
          sys_tag_no: 'System Tag',
          form: 'Form',
          grade: 'Grade',
          size: 'Size',
          finish: 'Finish',
          ext_finish: 'Extended Finish',
          width: 'Width',
          length: 'Length',
          location: 'Location',
          mill: 'Mill',
          heat: 'Heat',
          type: 'Inventory Type',
          quality: 'Inventory Quality',
        };

        const countedComparable = {
          sys_tag_no: countedItem.sys_tag_no || countedItem.sys_tag_id,
          form: countedItem.form,
          grade: countedItem.grade,
          size: countedItem.size,
          finish: countedItem.finish,
          ext_finish: countedItem.ext_finish,
          width: countedItem.width,
          length: countedItem.length,
          location: countedItem.location,
          mill: countedItem.mill,
          heat: countedItem.heat,
          type: countedItem.type,
          remarks: countedItem.remarks,
        };

        const ranked = systemItems.map((sys) => {
          const mismatchedFields = effectiveCompareFields.filter((field) => {
            const sysVal = getCompareFieldValue(
              {
                prd_tag_no: sys.prd_tag_no || sys.tag_no,
                form: sys.form,
                grade: sys.grade,
                size: sys.size,
                finish: sys.finish,
                ext_finish: sys.ext_finish,
                width: sys.width,
                length: sys.length,
                location: sys.location,
                mill: sys.mill,
                heat: sys.heat,
                inv_type: sys.inv_type,
                inv_quality: sys.inv_quality,
              },
              field,
              false
            );
            const countedVal = getCompareFieldValue(
              countedComparable,
              field,
              true
            );
            return sysVal !== countedVal;
          });

          return {
            mismatchedFields,
          };
        }).sort((a, b) => a.mismatchedFields.length - b.mismatchedFields.length);

        const best = ranked[0];
        if (!best) {
          return 'No system rows available for comparison in this snapshot.';
        }

        if (best.mismatchedFields.length === 0) {
          return 'Row appears to match selected compare fields. Refresh comparison to recalculate status.';
        }

        const labels = best.mismatchedFields.map((f) => fieldLabelMap[f] || f);
        if (labels.length === 1) {
          return `Mismatch on: ${labels[0]}.`;
        }
        return `Closest system row differs on: ${labels.join(', ')}.`;
      };

      // Add counted items that don't match any system item (Orphaned from counted perspective)
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
            foundReason: findFoundReason(countedData.item),
            combinedItems: countedData.combinedItems,
            sections: sectionsArray
          });
        }
      });

      setComparisonResults(results);
    } catch (error) {
      console.error('Error performing comparison:', error);
      enqueueSnackbar('Failed to fetch counted transactions', { variant: 'error' });
    } finally {
      setComparing(false);
    }
  };

  const handleBack = () => {
    navigate(-1);
  };

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
        recheck_reason: 'Marked for checking from reconciliation counter page'
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
        // Refresh marked items
        await fetchMarkedItems();
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

  const toggleCombinedRow = (rowKey: string) => {
    setExpandedCombinedRows((prev) => {
      const next = new Set(prev);
      if (next.has(rowKey)) next.delete(rowKey);
      else next.add(rowKey);
      return next;
    });
  };

  const activeFilterValues = [
    filterTagNumber, filterForm, filterGrade, filterSize, filterFinish, filterExtFinish,
    filterLocation, filterMill, filterHeat, filterInvType, filterInvQuality,
    filterStatus, filterBranch, filterWarehouse, filterLength, filterWidth
  ];
  const activeFilterCount = activeFilterValues.filter(Boolean).length;

  const clearAllFilters = () => {
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
    setFilterLength(null);
    setFilterWidth(null);
  };

  const activeFilterChips = useMemo(() => {
    const chips: { key: string; label: string; onDelete: () => void }[] = [];
    if (filterTagNumber) chips.push({ key: 'tag', label: `Tag: ${filterTagNumber}`, onDelete: () => setFilterTagNumber(null) });
    if (filterForm) chips.push({ key: 'form', label: `Form: ${filterForm}`, onDelete: () => setFilterForm(null) });
    if (filterGrade) chips.push({ key: 'grade', label: `Grade: ${filterGrade}`, onDelete: () => setFilterGrade(null) });
    if (filterSize) chips.push({ key: 'size', label: `Size: ${filterSize}`, onDelete: () => setFilterSize(null) });
    if (filterLength) chips.push({ key: 'length', label: `Length: ${formatLengthInFeet(filterLength)}`, onDelete: () => setFilterLength(null) });
    if (filterWidth) chips.push({ key: 'width', label: `Width: ${filterWidth}`, onDelete: () => setFilterWidth(null) });
    if (filterFinish) chips.push({ key: 'finish', label: `Finish: ${filterFinish}`, onDelete: () => setFilterFinish(null) });
    if (filterExtFinish) chips.push({ key: 'extFinish', label: `Ext. Finish: ${filterExtFinish}`, onDelete: () => setFilterExtFinish(null) });
    if (filterLocation) chips.push({ key: 'location', label: `Location: ${filterLocation}`, onDelete: () => setFilterLocation(null) });
    if (filterBranch) chips.push({ key: 'branch', label: `Branch: ${filterBranch}`, onDelete: () => setFilterBranch(null) });
    if (filterWarehouse) chips.push({ key: 'warehouse', label: `Warehouse: ${filterWarehouse}`, onDelete: () => setFilterWarehouse(null) });
    if (filterStatus) chips.push({ key: 'status', label: `Status: ${getStatusDisplayLabel(filterStatus)}`, onDelete: () => setFilterStatus(null) });
    if (filterMill) chips.push({ key: 'mill', label: `Mill: ${filterMill}`, onDelete: () => setFilterMill(null) });
    if (filterHeat) chips.push({ key: 'heat', label: `Heat: ${filterHeat}`, onDelete: () => setFilterHeat(null) });
    if (filterInvType) chips.push({ key: 'invType', label: `Type: ${filterInvType}`, onDelete: () => setFilterInvType(null) });
    if (filterInvQuality) chips.push({ key: 'invQuality', label: `Quality: ${filterInvQuality}`, onDelete: () => setFilterInvQuality(null) });
    return chips;
  }, [
    filterTagNumber, filterForm, filterGrade, filterSize, filterLength, filterWidth,
    filterFinish, filterExtFinish, filterLocation, filterBranch, filterWarehouse,
    filterStatus, filterMill, filterHeat, filterInvType, filterInvQuality
  ]);

  const quickStatusFilters = ['Match', 'Undercount', 'Overcount', 'Orphaned', 'Not Counted'] as const;

  const filterControlSx = {
    '& .MuiOutlinedInput-root': {
      borderRadius: 2,
      bgcolor: 'background.paper',
      transition: 'box-shadow 0.2s ease, border-color 0.2s ease',
      '&:hover': {
        boxShadow: (t: typeof theme) => `0 2px 8px ${alpha(t.palette.primary.main, 0.12)}`,
      },
      '&.Mui-focused': {
        boxShadow: (t: typeof theme) => `0 0 0 3px ${alpha(t.palette.primary.main, 0.15)}`,
      },
    },
  };

  const renderFilterSelect = (
    label: string,
    value: string | null,
    onChange: (next: string | null) => void,
    options: string[] | undefined,
    formatOption?: (option: string) => string
  ) => (
    <FormControl size="small" fullWidth sx={filterControlSx}>
      <InputLabel>{label}</InputLabel>
      <Select value={value || ''} label={label} onChange={(e) => onChange(e.target.value || null)}>
        <MenuItem value="">
          <em>All</em>
        </MenuItem>
        {options?.map((option) => (
          <MenuItem key={option} value={option}>
            {formatOption ? formatOption(option) : option}
          </MenuItem>
        ))}
      </Select>
    </FormControl>
  );

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
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        height: 'calc(100vh - 88px)',
        width: '100%',
        maxWidth: '100%',
        mx: 0,
        px: 0.75,
        py: 1,
        overflow: 'hidden',
      }}
    >
      <Paper
        variant="outlined"
        sx={{ flexShrink: 0, px: 1, py: 0.75, mb: 1, borderRadius: 1.5 }}
      >
        <Stack
          direction="row"
          alignItems="center"
          justifyContent="space-between"
          flexWrap="wrap"
          gap={1}
        >
          <Stack direction="row" alignItems="center" spacing={1} flexWrap="wrap" useFlexGap>
            <IconButton size="small" onClick={handleBack} aria-label="Back to counter review">
              <ChevronLeft fontSize="small" />
            </IconButton>
            <Typography variant="subtitle1" sx={{ fontWeight: 700, lineHeight: 1.2 }}>
              System Reconciliation
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Location {location_id || '-'}
            </Typography>
            {summary && (
              <>
                <Divider orientation="vertical" flexItem sx={{ mx: 0.25 }} />
                <Chip size="small" variant="outlined" label={`Branch: ${summary.branch || '-'}`} />
                <Chip size="small" variant="outlined" label={`WH: ${summary.warehouse || '-'}`} />
                <Chip
                  size="small"
                  variant="outlined"
                  label={`Items: ${formatNumber(summary.total_system_items || summary.totalItems || 0)}`}
                />
                <Chip
                  size="small"
                  variant="outlined"
                  label={`Qty: ${formatNumber(summary.total_system_quantity || 0)}`}
                />
              </>
            )}
            {comparing && (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                <CircularProgress size={16} />
                <Typography variant="caption" color="text.secondary">
                  Comparing...
                </Typography>
              </Box>
            )}
            {!comparing && comparisonResults.length > 0 && (
              <>
                <Chip size="small" color="success" label={`Match ${comparisonResults.filter((r) => r.status === 'Match').length}`} />
                <Chip size="small" color="warning" label={`Under ${comparisonResults.filter((r) => r.status === 'Undercount').length}`} />
                <Chip size="small" color="info" label={`Over ${comparisonResults.filter((r) => r.status === 'Overcount').length}`} />
                <Chip size="small" color="error" label={`Found ${comparisonResults.filter((r) => r.status === 'Orphaned').length}`} />
              </>
            )}
          </Stack>
          <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
            {selectedItems.size > 0 && (
              <Button
                size="small"
                variant="contained"
                onClick={handleMarkForChecking}
                sx={{ textTransform: 'none', fontWeight: 600 }}
              >
                Mark ({selectedItems.size})
              </Button>
            )}
            <Button
              size="small"
              variant="outlined"
              onClick={() => performComparison()}
              disabled={comparing}
              sx={{ textTransform: 'none' }}
            >
              {comparing ? 'Comparing...' : 'Refresh'}
            </Button>
          </Stack>
        </Stack>
      </Paper>

      <Paper
        elevation={0}
        sx={{
          flexShrink: 0,
          mb: 1,
          borderRadius: 2.5,
          overflow: 'hidden',
          border: '1px solid',
          borderColor: alpha(theme.palette.primary.main, 0.18),
          background: `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.07)} 0%, ${alpha(theme.palette.background.paper, 1)} 55%, ${alpha(theme.palette.primary.light, 0.04)} 100%)`,
          boxShadow: `0 8px 32px ${alpha(theme.palette.primary.main, 0.1)}`,
        }}
      >
        <Box
          sx={{
            px: 1.25,
            py: 1,
            display: 'flex',
            alignItems: 'center',
            gap: 1.5,
            flexWrap: 'wrap',
            borderBottom: filtersExpanded || activeFilterCount > 0 || searchTerm
              ? `1px solid ${alpha(theme.palette.divider, 0.8)}`
              : 'none',
          }}
        >
          <Box
            sx={{
              flex: 1,
              minWidth: 220,
              display: 'flex',
              alignItems: 'center',
              gap: 1,
              px: 1.25,
              py: 0.5,
              borderRadius: 3,
              bgcolor: alpha(theme.palette.background.paper, 0.9),
              border: '1px solid',
              borderColor: alpha(theme.palette.primary.main, 0.12),
              boxShadow: `inset 0 1px 2px ${alpha(theme.palette.common.black, 0.04)}`,
            }}
          >
            <SearchIcon sx={{ color: 'primary.main', fontSize: 20 }} />
            <TextField
              size="small"
              fullWidth
              variant="standard"
              placeholder="Search tag, form, grade, mill, heat..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              InputProps={{ disableUnderline: true }}
              sx={{ '& .MuiInputBase-input': { py: 0.75, fontSize: '0.9rem' } }}
            />
          </Box>

          <Badge
            badgeContent={activeFilterCount}
            color="primary"
            invisible={activeFilterCount === 0}
            sx={{ '& .MuiBadge-badge': { fontWeight: 700, fontSize: '0.65rem' } }}
          >
            <Button
              size="small"
              variant={filtersExpanded ? 'contained' : 'outlined'}
              startIcon={<TuneIcon fontSize="small" />}
              onClick={() => setFiltersExpanded((expanded) => !expanded)}
              sx={{
                textTransform: 'none',
                fontWeight: 600,
                borderRadius: 2,
                px: 2,
                borderWidth: filtersExpanded ? 0 : 1.5,
                boxShadow: filtersExpanded ? `0 4px 14px ${alpha(theme.palette.primary.main, 0.35)}` : 'none',
              }}
            >
              Advanced Filters
            </Button>
          </Badge>

          {activeFilterCount > 0 && (
            <Button
              size="small"
              color="inherit"
              startIcon={<ClearAllIcon fontSize="small" />}
              onClick={clearAllFilters}
              sx={{
                textTransform: 'none',
                borderRadius: 2,
                bgcolor: alpha(theme.palette.error.main, 0.08),
                color: 'error.main',
                '&:hover': { bgcolor: alpha(theme.palette.error.main, 0.14) },
              }}
            >
              Clear all
            </Button>
          )}

          <IconButton
            size="small"
            onClick={() => setFiltersExpanded((expanded) => !expanded)}
            aria-label={filtersExpanded ? 'Collapse filters' : 'Expand filters'}
            sx={{
              border: '1px solid',
              borderColor: alpha(theme.palette.primary.main, 0.2),
              bgcolor: alpha(theme.palette.background.paper, 0.8),
            }}
          >
            {filtersExpanded ? <ExpandLessIcon fontSize="small" /> : <ExpandMoreIcon fontSize="small" />}
          </IconButton>
        </Box>

        {(activeFilterChips.length > 0 || searchTerm) && (
          <Box
            sx={{
              px: 1.25,
              py: 0.75,
              display: 'flex',
              alignItems: 'center',
              gap: 1,
              flexWrap: 'wrap',
              bgcolor: alpha(theme.palette.primary.main, 0.03),
            }}
          >
            <FilterListIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
            <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.secondary', letterSpacing: 0.4 }}>
              ACTIVE
            </Typography>
            {searchTerm && (
              <Chip
                size="small"
                label={`Search: "${searchTerm}"`}
                onDelete={() => setSearchTerm('')}
                color="primary"
                variant="outlined"
                sx={{ fontWeight: 500, borderRadius: 1.5 }}
              />
            )}
            {activeFilterChips.map((chip) => (
              <Chip
                key={chip.key}
                size="small"
                label={chip.label}
                onDelete={chip.onDelete}
                color="primary"
                variant="outlined"
                sx={{ fontWeight: 500, borderRadius: 1.5 }}
              />
            ))}
          </Box>
        )}

        <Collapse in={filtersExpanded} timeout={280}>
          <Box sx={{ px: 1.25, pt: 1, pb: 1.5, maxHeight: '30vh', overflowY: 'auto' }}>
            <Stack direction="row" alignItems="center" spacing={1} flexWrap="wrap" useFlexGap sx={{ mb: 1.5 }}>
              <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.secondary', mr: 0.5 }}>
                Quick status
              </Typography>
              {quickStatusFilters.map((status) => {
                const isActive = filterStatus === status;
                return (
                  <Chip
                    key={status}
                    size="small"
                    label={getStatusDisplayLabel(status)}
                    clickable
                    onClick={() => setFilterStatus(isActive ? null : status)}
                    color={
                      status === 'Match' ? 'success'
                        : status === 'Undercount' ? 'warning'
                        : status === 'Overcount' ? 'info'
                        : status === 'Orphaned' ? 'error'
                        : 'default'
                    }
                    variant={isActive ? 'filled' : 'outlined'}
                    sx={{ fontWeight: 600, borderRadius: 2, transition: 'transform 0.15s ease', '&:hover': { transform: 'translateY(-1px)' } }}
                  />
                );
              })}
            </Stack>

            <Tabs
              value={filterTab}
              onChange={(_, value) => setFilterTab(value)}
              variant="fullWidth"
              sx={{
                mb: 2,
                minHeight: 40,
                borderRadius: 2,
                bgcolor: alpha(theme.palette.background.paper, 0.75),
                border: '1px solid',
                borderColor: alpha(theme.palette.divider, 0.9),
                '& .MuiTab-root': { minHeight: 40, textTransform: 'none', fontWeight: 600, fontSize: '0.8rem', gap: 0.75 },
                '& .Mui-selected': { color: 'primary.main' },
                '& .MuiTabs-indicator': { height: 3, borderRadius: '3px 3px 0 0' },
              }}
            >
              <Tab icon={<CategoryOutlinedIcon fontSize="small" />} iconPosition="start" label="Item" />
              <Tab icon={<PlaceOutlinedIcon fontSize="small" />} iconPosition="start" label="Location" />
              <Tab icon={<PrecisionManufacturingOutlinedIcon fontSize="small" />} iconPosition="start" label="Mill & Quality" />
            </Tabs>

            {filterTab === 0 && (
              <Paper variant="outlined" sx={{ p: 2, borderRadius: 2.5, borderColor: alpha(theme.palette.primary.main, 0.15), bgcolor: alpha(theme.palette.background.paper, 0.85) }}>
            <Grid container spacing={1.5}>
              <Grid item xs={12} sm={6} md={4} lg={3}>
                <TextField
                  size="small"
                  fullWidth
                  label="Tag Number"
                  placeholder="Enter tag..."
                  value={filterTagNumber || ''}
                  onChange={(e) => setFilterTagNumber(e.target.value || null)}
                  sx={filterControlSx}
                />
              </Grid>
              <Grid item xs={12} sm={6} md={4} lg={3}>
                {renderFilterSelect('Form', filterForm, setFilterForm, uniqueValues.forms)}
              </Grid>
              <Grid item xs={12} sm={6} md={4} lg={3}>
                {renderFilterSelect('Grade', filterGrade, setFilterGrade, uniqueValues.grades)}
              </Grid>
              <Grid item xs={12} sm={6} md={4} lg={3}>
                {renderFilterSelect('Size', filterSize, setFilterSize, uniqueValues.sizes)}
              </Grid>
              <Grid item xs={12} sm={6} md={4} lg={3}>
                {renderFilterSelect('Length', filterLength, setFilterLength, uniqueValues.lengths, formatLengthInFeet)}
              </Grid>
              <Grid item xs={12} sm={6} md={4} lg={3}>
                {renderFilterSelect('Width', filterWidth, setFilterWidth, uniqueValues.widths)}
              </Grid>
              <Grid item xs={12} sm={6} md={4} lg={3}>
                {renderFilterSelect('Finish', filterFinish, setFilterFinish, uniqueValues.finishes)}
              </Grid>
              <Grid item xs={12} sm={6} md={4} lg={3}>
                {renderFilterSelect('Ext. Finish', filterExtFinish, setFilterExtFinish, uniqueValues.extFinishes)}
              </Grid>
            </Grid>
              </Paper>
            )}

            {filterTab === 1 && (
              <Paper variant="outlined" sx={{ p: 2, borderRadius: 2.5, borderColor: alpha(theme.palette.primary.main, 0.15), bgcolor: alpha(theme.palette.background.paper, 0.85) }}>
                <Grid container spacing={1.5}>
              <Grid item xs={12} sm={6} md={4}>
                {renderFilterSelect('Location', filterLocation, setFilterLocation, uniqueValues.locations)}
              </Grid>
              <Grid item xs={12} sm={6} md={4}>
                {renderFilterSelect('Branch', filterBranch, setFilterBranch, uniqueValues.branches)}
              </Grid>
              <Grid item xs={12} sm={6} md={4}>
                {renderFilterSelect('Warehouse', filterWarehouse, setFilterWarehouse, uniqueValues.warehouses)}
              </Grid>
              <Grid item xs={12} sm={6} md={4}>
                {renderFilterSelect('Status', filterStatus, setFilterStatus, uniqueValues.statuses, getStatusDisplayLabel)}
              </Grid>
            </Grid>
              </Paper>
            )}

            {filterTab === 2 && (
              <Paper variant="outlined" sx={{ p: 2, borderRadius: 2.5, borderColor: alpha(theme.palette.primary.main, 0.15), bgcolor: alpha(theme.palette.background.paper, 0.85) }}>
                <Grid container spacing={1.5}>
              <Grid item xs={12} sm={6} md={3}>
                {renderFilterSelect('Mill', filterMill, setFilterMill, uniqueValues.mills)}
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                {renderFilterSelect('Heat', filterHeat, setFilterHeat, uniqueValues.heats)}
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                {renderFilterSelect('Inv. Type', filterInvType, setFilterInvType, uniqueValues.invTypes)}
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                {renderFilterSelect('Inv. Quality', filterInvQuality, setFilterInvQuality, uniqueValues.invQualities)}
              </Grid>
            </Grid>
              </Paper>
            )}
          </Box>
        </Collapse>
      </Paper>

      <Paper
        sx={{
          flex: 1,
          minHeight: 0,
          display: 'flex',
          flexDirection: 'column',
          borderRadius: 1.5,
          overflow: 'hidden',
          boxShadow: (t) => t.shadows[2],
        }}
      >
        <TableContainer sx={{ flex: 1, overflow: 'auto' }}>
          <Table 
            stickyHeader 
            size="small"
            sx={{
              tableLayout: 'auto',
              '& .MuiTableCell-root': {
                px: 0.75,
                py: 0.55,
                whiteSpace: 'nowrap',
                fontSize: '0.72rem',
              },
              '& .MuiTableHead-root .MuiTableCell-root': {
                fontSize: '0.69rem',
                fontWeight: 700,
                lineHeight: 1.15,
              },
            }}
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
                }}>Combined</TableCell>
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
                  <TableCell colSpan={24} align="center" sx={{ py: 4 }}>
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

                  const rowKey = `${item.prd_tag_no || item.tag_no || index}-${filterTagNumber || ''}-${filterForm || ''}-${filterGrade || ''}-${filterSize || ''}-${filterStatus || ''}`;
                  const showCombinedDropdown = Boolean(comparison?.combinedItems && comparison.combinedItems.length > 1);
                  const systemCombinedCount = Number((item as any).system_combined_count || 1);
                  const showSystemCombinedDropdown = systemCombinedCount > 1;
                  const hasCombinedDetails = showCombinedDropdown || showSystemCombinedDropdown;
                  const isCombinedExpanded = expandedCombinedRows.has(rowKey);

                  return (
                  <React.Fragment key={rowKey}>
                  <TableRow
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
                      <TableCell>
                        {hasCombinedDetails ? (
                          <Button
                            size="small"
                            variant="text"
                            onClick={() => toggleCombinedRow(rowKey)}
                            sx={{ textTransform: 'none', fontWeight: 600, px: 0.5, minWidth: 0 }}
                            startIcon={isCombinedExpanded ? <ExpandLessIcon fontSize="small" /> : <ExpandMoreIcon fontSize="small" />}
                          >
                            {showCombinedDropdown && showSystemCombinedDropdown
                              ? `Details (${comparison?.combinedItems?.length || 0} counted, ${systemCombinedCount} system)`
                              : showCombinedDropdown
                              ? `Counted (${comparison?.combinedItems?.length || 0})`
                              : `System (${systemCombinedCount})`}
                          </Button>
                        ) : (
                          '-'
                        )}
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
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, flexWrap: 'wrap' }}>
                            {status === 'Orphaned' && comparison.foundReason && (
                              <Tooltip title={comparison.foundReason} arrow placement="top">
                                <Chip
                                  label="Why?"
                                  size="small"
                                  variant="outlined"
                                  color="info"
                                  sx={{ fontWeight: 600, cursor: 'help' }}
                                />
                              </Tooltip>
                            )}
                            <Chip
                              label={getStatusDisplayLabel(comparison.status)}
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
                          </Box>
                        ) : (
                          <Chip
                            label="Not Counted"
                            size="small"
                            color="default"
                            variant="outlined"
                          />
                        )}
                      </TableCell>
                    <TableCell align="right">{formatNumber(item.prd_ohd_mat_cst, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</TableCell>
                    <TableCell align="right">{formatNumber(item.prd_ohd_mat_val, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</TableCell>
                  </TableRow>
                  {(showCombinedDropdown || showSystemCombinedDropdown) && (
                    <TableRow>
                      <TableCell colSpan={24} sx={{ py: 0, borderBottom: 0, backgroundColor: alpha(theme.palette.primary.main, 0.03) }}>
                        <Collapse in={isCombinedExpanded} timeout="auto" unmountOnExit>
                          <Box sx={{ p: 1.5 }}>
                            {showSystemCombinedDropdown && (
                              <Box sx={{ mb: showCombinedDropdown ? 2 : 0 }}>
                                <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 700, color: 'text.secondary' }}>
                                  Combined system items
                                </Typography>
                                <Table size="small" sx={{ backgroundColor: theme.palette.background.paper, borderRadius: 1 }}>
                                  <TableHead>
                                    <TableRow>
                                      <TableCell>System Tag</TableCell>
                                      <TableCell>Form</TableCell>
                                      <TableCell>Grade</TableCell>
                                      <TableCell>Size</TableCell>
                                      <TableCell>Finish</TableCell>
                                      <TableCell>Ext Finish</TableCell>
                                      <TableCell>Width</TableCell>
                                      <TableCell>Length</TableCell>
                                      <TableCell>Location</TableCell>
                                      <TableCell>Mill</TableCell>
                                      <TableCell>Heat</TableCell>
                                      <TableCell>Type</TableCell>
                                      <TableCell>Quality</TableCell>
                                      <TableCell align="right">Qty</TableCell>
                                    </TableRow>
                                  </TableHead>
                                  <TableBody>
                                    {((item as any).system_combined_items || []).map((sys: any, sysIdx: number) => (
                                      <TableRow key={`${rowKey}-sys-${sys.sys_tag_no || sysIdx}`}>
                                        <TableCell>{formatValue(sys.sys_tag_no)}</TableCell>
                                        <TableCell>{formatValue(sys.form)}</TableCell>
                                        <TableCell>{formatValue(sys.grade)}</TableCell>
                                        <TableCell>{formatValue(sys.size)}</TableCell>
                                        <TableCell>{formatValue(sys.finish)}</TableCell>
                                        <TableCell>{formatValue(sys.ext_finish)}</TableCell>
                                        <TableCell>{formatValue(sys.width)}</TableCell>
                                        <TableCell>{formatLengthInFeet(sys.length)}</TableCell>
                                        <TableCell>{formatValue(sys.location)}</TableCell>
                                        <TableCell>{formatValue(sys.mill)}</TableCell>
                                        <TableCell>{formatValue(sys.heat)}</TableCell>
                                        <TableCell>{formatValue(sys.inv_type)}</TableCell>
                                        <TableCell>{formatValue(sys.inv_quality)}</TableCell>
                                        <TableCell align="right">{formatNumber(sys.qty)}</TableCell>
                                      </TableRow>
                                    ))}
                                  </TableBody>
                                </Table>
                              </Box>
                            )}
                            {showCombinedDropdown && (
                              <>
                                <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 700, color: 'text.secondary' }}>
                                  Combined counted items
                                </Typography>
                                <Table size="small" sx={{ backgroundColor: theme.palette.background.paper, borderRadius: 1 }}>
                                  <TableHead>
                                    <TableRow>
                                      <TableCell>System Tag</TableCell>
                                      <TableCell>Form</TableCell>
                                      <TableCell>Grade</TableCell>
                                      <TableCell>Size</TableCell>
                                      <TableCell>Finish</TableCell>
                                      <TableCell>Ext Finish</TableCell>
                                      <TableCell>Width</TableCell>
                                      <TableCell>Length</TableCell>
                                      <TableCell>Section</TableCell>
                                      <TableCell>Location</TableCell>
                                      <TableCell>Mill</TableCell>
                                      <TableCell>Heat</TableCell>
                                      <TableCell>Type</TableCell>
                                      <TableCell>Quality</TableCell>
                                      <TableCell align="right">Qty</TableCell>
                                    </TableRow>
                                  </TableHead>
                                  <TableBody>
                                    {(comparison?.combinedItems || []).map((combined, combinedIdx) => (
                                      <TableRow key={`${rowKey}-combined-${combined.transactionId || combinedIdx}`}>
                                        <TableCell>{formatValue(combined.sysTagNo || combined.transactionId || '-')}</TableCell>
                                        <TableCell>{formatValue(combined.form)}</TableCell>
                                        <TableCell>{formatValue(combined.grade)}</TableCell>
                                        <TableCell>{formatValue(combined.size)}</TableCell>
                                        <TableCell>{formatValue(combined.finish)}</TableCell>
                                        <TableCell>{formatValue(combined.extFinish)}</TableCell>
                                        <TableCell>{formatValue(combined.width)}</TableCell>
                                        <TableCell>{formatLengthInFeet(combined.length)}</TableCell>
                                        <TableCell>{formatValue(combined.sectionDesc || combined.sectionId || '-')}</TableCell>
                                        <TableCell>{formatValue(combined.location)}</TableCell>
                                        <TableCell>{formatValue(combined.mill)}</TableCell>
                                        <TableCell>{formatValue(combined.heat)}</TableCell>
                                        <TableCell>{formatValue(combined.type)}</TableCell>
                                        <TableCell>{formatValue(combined.quality)}</TableCell>
                                        <TableCell align="right">{formatNumber(combined.quantity)}</TableCell>
                                      </TableRow>
                                    ))}
                                  </TableBody>
                                </Table>
                              </>
                            )}
                          </Box>
                        </Collapse>
                      </TableCell>
                    </TableRow>
                  )}
                  </React.Fragment>
                  );
                })
              )}
            </TableBody>
          </Table>
        </TableContainer>
        <Divider />
        <Box sx={{ px: 1.5, py: 0.75, display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 0.5, flexShrink: 0 }}>
          <Typography variant="caption" color="text.secondary">
            Showing {filteredItems.length} of {systemItems.length} record{systemItems.length === 1 ? '' : 's'}
          </Typography>
          <Tooltip title="Sum of the System Quantity column for visible rows" arrow>
            <Typography variant="caption" color="text.secondary">
              Visible qty total: {formatNumber(totalSystemQuantity)}
            </Typography>
          </Tooltip>
        </Box>
      </Paper>
    </Box>
  );
};

export default ReconciliationCounterPage; 