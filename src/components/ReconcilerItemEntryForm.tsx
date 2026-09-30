import React, { useState, useEffect, useRef } from "react";
import {
  TextField,
  Button,
  Autocomplete,
  Box,
  Typography,
  TableContainer,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  Paper,
  IconButton,
  Alert,
  CircularProgress,
  Card,
  CardContent,
  Grid,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Tabs,
  Tab,
  LinearProgress,
  FormControl,
  alpha,
  InputAdornment,
  Chip,
} from "@mui/material";
import { styled } from "@mui/material/styles";
import { servicesAPI } from "../config/api";
import { Add, Delete, Save, Inventory2, Description, Category, Tag, Factory, LocalFireDepartment, Comment, ClearAll } from "@mui/icons-material";

const StyledCard = styled(Card)(({ theme }) => ({
  borderRadius: '20px',
  border: `1px solid ${alpha(theme.palette.primary.main || '#0088FE', 0.1)}`,
  background: `${alpha(theme.palette.primary.main || '#0088FE', 0.02)}`,
  boxShadow: 'none',
}));

const StyledTextField = styled(TextField)(({ theme }) => ({
  '& .MuiOutlinedInput-root': {
    borderRadius: '12px',
    backgroundColor: theme.palette.background.paper,
    transition: 'all 0.3s ease',
    '&:hover': {
      backgroundColor: alpha(theme.palette.primary.main || '#0088FE', 0.02),
      '& .MuiOutlinedInput-notchedOutline': {
        borderColor: alpha(theme.palette.primary.main || '#0088FE', 0.3),
      },
    },
    '&.Mui-focused': {
      backgroundColor: alpha(theme.palette.primary.main || '#0088FE', 0.04),
      '& .MuiOutlinedInput-notchedOutline': {
        borderColor: theme.palette.primary.main || '#0088FE',
        borderWidth: '2px',
      },
    },
  },
  '& .MuiInputLabel-root': {
    fontWeight: 500,
    '&.Mui-focused': {
      color: theme.palette.primary.main || '#0088FE',
    },
  },
}));

const StyledButton = styled(Button)(({ theme }) => ({
  borderRadius: '12px',
  textTransform: 'none',
  fontWeight: 600,
  padding: '10px 24px',
  boxShadow: 'none',
  transition: 'all 0.3s ease',
  '&:hover': {
    transform: 'translateY(-2px)',
    boxShadow: `0 4px 16px ${alpha(theme.palette.primary.main || '#0088FE', 0.3)}`,
  }
}));

const SectionHeader = styled(Box)(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: 1,
  padding: theme.spacing(2),
  background: `linear-gradient(135deg, ${alpha(theme.palette.primary.main || '#0088FE', 0.1)} 0%, ${alpha(theme.palette.primary.main || '#0088FE', 0.05)} 100%)`,
  borderRadius: '12px 12px 0 0',
  borderBottom: `2px solid ${alpha(theme.palette.primary.main || '#0088FE', 0.2)}`,
  marginBottom: theme.spacing(2),
}));

function joinExtFinishSegments(segments: string[]): string {
  return segments.map((s) => s.trim()).filter(Boolean).join("");
}

function permuteSegments(segments: string[]): string[][] {
  if (segments.length <= 1) return [segments];
  const result: string[][] = [];
  for (let i = 0; i < segments.length; i++) {
    const rest = [...segments.slice(0, i), ...segments.slice(i + 1)];
    for (const perm of permuteSegments(rest)) {
      result.push([segments[i], ...perm]);
    }
  }
  return result;
}

function findSystemExtFinishFromSegments(segments: string[], systemValues: string[]): string | null {
  const trimmed = segments.map((s) => s.trim()).filter(Boolean);
  if (trimmed.length === 0) return null;
  const normalized = systemValues.map((v) => v.trim()).filter((v) => v && v !== " ");
  const combined = trimmed.join("");
  if (normalized.includes(combined)) return combined;
  for (const sys of normalized) {
    for (const perm of permuteSegments(trimmed)) {
      if (perm.join("") === sys) return sys;
    }
  }
  return null;
}

function validateExtFinishOrder(segments: string[], systemValues: string[]): { isValid: boolean; message?: string } {
  const trimmed = segments.map((s) => s.trim()).filter(Boolean);
  if (trimmed.length === 0) return { isValid: true };
  const combined = trimmed.join("");
  const normalized = systemValues.map((v) => v.trim()).filter((v) => v && v !== " ");
  if (normalized.includes(combined)) return { isValid: true };
  const matching = findSystemExtFinishFromSegments(trimmed, normalized);
  if (matching && matching !== combined) {
    return { isValid: false, message: `Extended finish order mismatch. Did you mean '${matching}'?` };
  }
  return { isValid: false, message: `Extended Finish "${combined}" not found for this product. Please check segment values.` };
}

function splitExtFinishIntoSegments(value: string, systemValues: string[]): string[] {
  const trimmed = value.trim();
  if (!trimmed || trimmed === " ") return [""];
  const codes = systemValues
    .map((v) => v.trim())
    .filter((v) => v && v !== " ")
    .sort((a, b) => b.length - a.length);
  const segments: string[] = [];
  let remaining = trimmed;
  while (remaining.length > 0) {
    const match = codes.find((code) => remaining.startsWith(code));
    if (match) {
      segments.push(match);
      remaining = remaining.slice(match.length);
    } else {
      return [trimmed];
    }
  }
  return segments.length > 0 ? segments : [trimmed];
}

/** Parse "5' 12''" or "5 ft 12 in" style input to total inches. */
function parseFeetInches(value: string): number | null {
  const trimmed = value.replace(/\s*\(\d+(?:\.\d+)?\s*ft\)\s*$/i, '').trim();
  const match =
    trimmed.match(/^\s*(\d+(?:\.\d+)?)\s*'\s*(\d+(?:\.\d+)?)\s*(?:''|")\s*$/i) ||
    trimmed.match(/^\s*(\d+(?:\.\d+)?)\s*ft\s*(\d+(?:\.\d+)?)\s*in\s*$/i);
  if (!match) return null;
  const feet = parseFloat(match[1]);
  const inches = parseFloat(match[2]);
  if (Number.isNaN(feet) || Number.isNaN(inches)) return null;
  return feet * 12 + inches;
}

/** Split total inches into the feet / inches fields plus the total-inches string. */
function lengthFieldsFromInches(totalInches: number) {
  return {
    length: totalInches.toFixed(4),
    lengthFeet: Math.floor(totalInches / 12).toString(),
    lengthInches: (totalInches % 12).toFixed(4).replace(/\.?0+$/, '') || '0',
  };
}

function totalInchesFromFeetInches(feet: string, inches: string): string {
  if ((feet ?? '').trim() === '' && (inches ?? '').trim() === '') return '';
  const f = parseFloat(feet || '0');
  const i = parseFloat(inches || '0');
  return ((isNaN(f) ? 0 : f * 12) + (isNaN(i) ? 0 : i)).toFixed(4);
}

const COUNT_TYPES = {
  PIECES: "pcs",
  BUNDLES: "bundle",
} as const;

type CountType = typeof COUNT_TYPES[keyof typeof COUNT_TYPES];

interface BundleItem {
  num_of_bundle: number;
  bundle_count: number;
  tag_id?: number;
}

interface FormData {
  form: string;
  type: string;
  grade: string;
  size: string;
  finish: string;
  extendedFinish: string;
  width: string;
  /** Total length in inches; saved to the backend in feet */
  length: string;
  lengthFeet: string;
  lengthInches: string;
  sysTag: string;
  quantity: number;
  countType: CountType;
  bundles: BundleItem[];
  remarks: string;
  mill: string;
  heat: string;
  location: string;
  ad_cmts: string;
  pageNumber: string;
  serialNumber: string;
}

interface TagRecord {
  form: string;
  grade: string;
  size: string;
  finish: string;
  ext_finish: string;
  width: string;
  length: string;
  mill: string;
  heat: string;
  location: string;
  type?: string;
  inventory_type?: string;
  quality: string;
  type_display?: string;
}

const TYPE_OPTIONS = [
  { value: 'D', label: 'D - Drop' },
  { value: 'F', label: 'F - Finished' },
  { value: 'M', label: 'M - Master' },
  { value: 'R', label: 'R - Reject' },
  { value: 'S', label: 'S - Scrap' },
  { value: 'W', label: 'W - Work in Process' },
];

const FIELDS_THAT_ALLOW_SPACES = ['finish', 'extendedFinish', 'width', 'length', 'lengthFeet', 'lengthInches', 'sysTag', 'heat', 'mill', 'remarks', 'ad_cmts'];

const FIELD_ORDER = [
  'form', 'grade', 'size', 'finish', 'extendedFinish',
  'width', 'lengthFeet', 'lengthInches', 'sysTag', 'heat', 'mill', 'location',
  'type', 'remarks', 'ad_cmts', 'pageNumber', 'serialNumber', 'quantity'
];

export interface ReconcilerItemEntryFormProps {
  locationId: string;
  sectionId: string;
  teamId: string;
  sectionDesc?: string;
  onSaved: () => void;
  onCancel?: () => void;
}

const ReconcilerItemEntryForm: React.FC<ReconcilerItemEntryFormProps> = ({
  locationId,
  sectionId,
  teamId,
  sectionDesc = '',
  onSaved,
  onCancel,
}) => {
  const emptyForm = (remarks = 'Conforms to Std'): FormData => ({
    form: '',
    type: 'M',
    grade: '',
    size: '',
    finish: '',
    extendedFinish: '',
    width: '',
    length: '',
    lengthFeet: '',
    lengthInches: '',
    sysTag: '',
    quantity: 0,
    countType: 'pcs',
    bundles: [],
    remarks,
    ad_cmts: '',
    mill: '-',
    heat: '-',
    location: sectionDesc,
    pageNumber: '',
    serialNumber: '',
  });

  const [formData, setFormData] = useState<FormData>(() => emptyForm());
  const [loading, setLoading] = useState({
    form: false,
    grade: false,
    size: false,
    finish: false,
    extFinish: false,
    width: false,
    length: false,
    sysTag: false,
    mill: false,
    heat: false,
    location: false,
    general: false,
    tagFetch: false,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [openBundleModal, setOpenBundleModal] = useState(false);
  const [tagRecordsDialogOpen, setTagRecordsDialogOpen] = useState(false);
  const [tagRecordsList, setTagRecordsList] = useState<TagRecord[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<{ message: string; severity: 'success' | 'error' } | null>(null);
  const [validationWarnings, setValidationWarnings] = useState<{ [key: string]: string }>({});
  const [extFinishSegments, setExtFinishSegments] = useState<string[]>(['']);
  const pendingExtFinishSplit = useRef<string | null>(null);
  const fieldRefs = useRef<{ [key: string]: HTMLInputElement | null }>({});
  const heatCache = useRef<Map<string, string[]>>(new Map());
  const [formResetKey, setFormResetKey] = useState(0);

  const [formOptions, setFormOptions] = useState<string[]>([]);
  const [gradeOptions, setGradeOptions] = useState<string[]>([]);
  const [sizeOptions, setSizeOptions] = useState<string[]>([]);
  const [finishOptions, setFinishOptions] = useState<string[]>([]);
  const [extfinishOptions, setExtfinishOptions] = useState<string[]>([]);
  const [widthOptions, setWidthOptions] = useState<string[]>([]);
  const [lengthOptions, setLengthOptions] = useState<string[]>([]);
  const [sysTagOptions, setSysTagOptions] = useState<string[]>([]);
  const [millOptions, setMillOptions] = useState<string[]>([]);
  const [heatOptions, setHeatOptions] = useState<string[]>([]);
  const [locationOptions, setLocationOptions] = useState<string[]>([]);
  const [remarksOptions, setRemarksOptions] = useState<string[]>([]);
  const [warehouse, setWarehouse] = useState<string>('');

  const showNotice = (message: string, severity: 'success' | 'error') => setNotice({ message, severity });

  // Feet options derive from API lengths (inches); inches options show the raw inch values
  const { lengthFeetOptions, lengthInchesOptions } = React.useMemo(() => {
    const feet = new Set<string>();
    const inchSet = new Set<string>();
    lengthOptions.forEach(opt => {
      const n = parseFloat(opt);
      if (!isNaN(n) && n >= 0) {
        feet.add(Math.floor(n / 12).toString());
        inchSet.add(opt.trim() || n.toFixed(4));
      }
    });
    return {
      lengthFeetOptions: ['', ...Array.from(feet).sort((a, b) => parseFloat(a) - parseFloat(b))],
      lengthInchesOptions: ['', ...Array.from(inchSet).sort((a, b) => parseFloat(a) - parseFloat(b))],
    };
  }, [lengthOptions]);

  const navigateToNextField = (currentField: string) => {
    const currentIndex = FIELD_ORDER.indexOf(currentField);
    if (currentIndex < 0 || currentIndex >= FIELD_ORDER.length - 1) return;
    const nextField = FIELD_ORDER[currentIndex + 1];
    const focus = () => {
      const ref = fieldRefs.current[nextField];
      if (ref) {
        ref.focus();
        ref.select();
        return true;
      }
      return false;
    };
    if (!focus()) setTimeout(focus, 100);
  };

  const validateFieldValue = (fieldName: string, value: string): { isValid: boolean; message?: string } => {
    if (!FIELDS_THAT_ALLOW_SPACES.includes(fieldName) && (!value || value.trim() === '')) {
      return { isValid: false, message: `${fieldName} is required` };
    }
    const v = value.trim();
    switch (fieldName) {
      case 'form':
        if (!formOptions.includes(v)) return { isValid: false, message: `Form "${v}" not found. Please select from available options.` };
        break;
      case 'grade':
        if (!gradeOptions.includes(v)) return { isValid: false, message: `Grade "${v}" not found. Please select from available options.` };
        break;
      case 'size':
        if (!sizeOptions.includes(v)) return { isValid: false, message: `Size "${v}" not found. Please select from available options.` };
        break;
      case 'finish':
        if (v !== '' && !finishOptions.includes(v)) return { isValid: false, message: `Finish "${v}" not found. Please select from available options.` };
        break;
      case 'extendedFinish':
        if (v === '') return { isValid: true };
        return validateExtFinishOrder(extFinishSegments, extfinishOptions);
      case 'width': {
        if (v === '' || widthOptions.includes(v)) break;
        const num = parseFloat(v);
        const matches = !isNaN(num) && widthOptions.some(option => {
          const optionNum = parseFloat(option);
          return !isNaN(optionNum) && Math.abs(optionNum - num) < 0.0001;
        });
        if (!matches) return { isValid: false, message: `Width "${v}" not found. Please select from available options.` };
        break;
      }
      case 'length':
      case 'lengthFeet':
      case 'lengthInches': {
        if (v === '') break;
        const lenNum = parseFloat(v);
        if (isNaN(lenNum) || lenNum < 0) return { isValid: false, message: `Length "${v}" must be a valid non-negative number.` };
        break;
      }
      case 'sysTag':
        if (v !== '' && !sysTagOptions.includes(v)) return { isValid: false, message: `System Tag "${v}" not found. Please select from available options.` };
        break;
      case 'heat':
        if (v !== '' && v !== '-' && !heatOptions.includes(v)) return { isValid: false, message: `Heat "${v}" not found. Please select from available options, use "-", or use empty space.` };
        break;
      case 'mill':
        if (v !== '' && v !== '-' && !millOptions.includes(v)) return { isValid: false, message: `Mill "${v}" not found. Please select from available options, use "-", or use empty space.` };
        break;
      case 'location':
        if (!locationOptions.includes(v)) return { isValid: false, message: `Location "${v}" not found. Please select from available options.` };
        break;
      case 'type':
        if (!TYPE_OPTIONS.some(t => t.value === v || t.label === v)) return { isValid: false, message: `Type "${v}" not found. Please select from available options.` };
        break;
      case 'remarks':
        if (v !== '' && v !== 'Conforms to Std' && !remarksOptions.includes(v)) {
          return { isValid: false, message: `Remarks "${v}" not found. Please select from available options, use "Conforms to Std", or use empty space.` };
        }
        break;
      case 'quantity': {
        const qty = parseFloat(v);
        if (isNaN(qty) || qty <= 0) return { isValid: false, message: `Quantity must be a positive number.` };
        break;
      }
    }
    return { isValid: true };
  };

  const clearWarning = (fieldName: string) =>
    setValidationWarnings(prev => {
      if (!prev[fieldName]) return prev;
      const next = { ...prev };
      delete next[fieldName];
      return next;
    });

  const handleFieldChange = (fieldName: string, value: string) => {
    if (['form', 'grade', 'size', 'finish'].includes(fieldName)) {
      setExtFinishSegments(['']);
      pendingExtFinishSplit.current = null;
    }
    setFormData(prev => {
      const next = { ...prev, [fieldName]: value };
      if (fieldName === 'lengthFeet' || fieldName === 'lengthInches') {
        const feet = fieldName === 'lengthFeet' ? value : prev.lengthFeet;
        const inches = fieldName === 'lengthInches' ? value : prev.lengthInches;
        next.length = totalInchesFromFeetInches(feet, inches);
      }
      return next;
    });
    if (validateFieldValue(fieldName, value).isValid) {
      clearWarning(fieldName);
      if (error && error.includes(fieldName)) setError(null);
    }
  };

  const handleKeyPress = (fieldName: string, event: React.KeyboardEvent, currentValue?: string) => {
    if (event.key !== 'Enter' && event.key !== 'Tab') return;
    event.preventDefault();
    let valueToUse = currentValue ?? (event.target as HTMLInputElement)?.value;

    if ((!valueToUse || valueToUse.trim() === '') && FIELDS_THAT_ALLOW_SPACES.includes(fieldName)) {
      valueToUse = ' ';
      handleFieldChange(fieldName, ' ');
    }

    if (valueToUse && fieldName === 'sysTag') {
      const partial = valueToUse.toLowerCase().trim();
      if (partial && !sysTagOptions.includes(valueToUse.trim())) {
        const match = sysTagOptions.find(o => o.toLowerCase().startsWith(partial) || o.toLowerCase().includes(partial));
        if (match) {
          valueToUse = match;
          setFormData(prev => ({ ...prev, sysTag: match }));
        }
      }
    }

    const validation = validateFieldValue(fieldName, valueToUse || '');
    if (!validation.isValid) {
      setError(validation.message || 'Invalid value');
      setValidationWarnings(prev => ({ ...prev, [fieldName]: validation.message || 'Invalid value' }));
    } else {
      setError(null);
      clearWarning(fieldName);
    }
    setTimeout(() => navigateToNextField(fieldName), 50);
  };

  const checkDimensionSegment = async (newFinish?: string) => {
    const { form, grade, size } = formData;
    const finish = newFinish || formData.finish;
    if (!form || !grade || !size || !finish) return;
    try {
      const response = await servicesAPI.checkDimensionSegment({
        prm_frm: form,
        prm_grd: grade,
        prm_size: size,
        prm_fnsh: finish,
      });
      if (response.data.success && response.data.isLengthBased) {
        setFormData(prev => ({ ...prev, width: '0.00' }));
      }
    } catch (err) {
      console.error('Error checking dimension segment:', err);
    }
  };

  // Initial data: location (for warehouse), forms, remarks
  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(prev => ({ ...prev, general: true }));
      try {
        const [locationRes, formRes, remarksRes] = await Promise.all([
          servicesAPI.getLocation(locationId),
          servicesAPI.getForms(locationId),
          servicesAPI.getRemarks(),
        ]);
        if (cancelled) return;
        setWarehouse(locationRes.data?.warehouse || '');
        if (formRes.data?.success) {
          setFormOptions(formRes.data.data.map((item: { item_name: string }) => item.item_name));
        }
        if (remarksRes.data?.Data) {
          const remarks = remarksRes.data.Data.map((r: { inq_desc15: string }) => r.inq_desc15.trim() || "null");
          setRemarksOptions(remarks);
          const first = remarks[0];
          if (first && first.trim() !== '') {
            setFormData(prev => (prev.remarks === 'Conforms to Std' ? { ...prev, remarks: first } : prev));
          }
        }
      } catch (err) {
        console.error('Initial data fetch error:', err);
        if (!cancelled) showNotice('Failed to load initial data', 'error');
      } finally {
        if (!cancelled) setLoading(prev => ({ ...prev, general: false }));
      }
    };
    load();
    return () => { cancelled = true; };
  }, [locationId]);

  // Location options for the warehouse, with the section name first
  useEffect(() => {
    if (!warehouse) return;
    const load = async () => {
      setLoading(prev => ({ ...prev, location: true }));
      try {
        const res = await servicesAPI.getLocationsByWarehouse(warehouse);
        const data = res.data?.Data;
        if (data) {
          const locations: string[] = data
            .map((loc: { prd_loc?: string | null }) => loc.prd_loc)
            .filter((loc: string | null | undefined): loc is string => loc !== null && loc !== undefined)
            .map((loc: string) => loc.trim())
            .filter((loc: string) => loc && loc !== 'null')
            .sort();
          const sectionName = sectionDesc.trim();
          if (sectionName && !locations.includes(sectionName)) locations.unshift(sectionName);
          setLocationOptions(locations);
        }
      } catch (err) {
        console.error('Error fetching location options:', err);
        setLocationOptions([]);
      } finally {
        setLoading(prev => ({ ...prev, location: false }));
      }
    };
    load();
  }, [warehouse, sectionDesc]);

  const fetchDependentOptions = async (
    fetcher: () => Promise<{ data?: { Data?: Record<string, unknown>[] } }>,
    optionSetter: React.Dispatch<React.SetStateAction<string[]>>,
    loadingKey: keyof typeof loading,
    fieldName?: string,
    formFieldName?: 'width' | 'length' | 'mill',
    cacheKey?: string
  ) => {
    try {
      setLoading(prev => ({ ...prev, [loadingKey]: true }));
      if (cacheKey) {
        const cached = heatCache.current.get(cacheKey);
        if (cached) {
          optionSetter(cached);
          return;
        }
      }
      const response = await fetcher();
      const rows = response.data?.Data;
      if (!rows) return;

      const options: string[] = rows.map((item) => {
        const value = fieldName ? item[fieldName] : Object.values(item)[0];
        if (formFieldName === 'width' || formFieldName === 'length') {
          const numValue = Number(value);
          return isNaN(numValue) ? ' ' : numValue.toFixed(4);
        }
        if (value === null || value === undefined || value === '') return ' ';
        return typeof value === 'string' ? value.trim() : String(value);
      });

      if (formFieldName === 'width' && options.includes('0.00')) {
        setFormData(prev => ({ ...prev, width: '0.00' }));
      }
      if (formFieldName === 'mill') {
        const firstValid = options.find(opt => opt && opt !== ' ' && opt !== 'null');
        if (firstValid) setFormData(prev => ({ ...prev, mill: firstValid }));
      }
      if (formFieldName !== 'width' && !options.includes(' ')) options.unshift(' ');
      if (cacheKey) heatCache.current.set(cacheKey, options);
      optionSetter(options);
    } catch (err) {
      console.error(`Error fetching ${loadingKey} options:`, err);
      optionSetter([]);
    } finally {
      setLoading(prev => ({ ...prev, [loadingKey]: false }));
    }
  };

  useEffect(() => {
    if (formData.form) {
      fetchDependentOptions(() => servicesAPI.getGrade({ form: formData.form }), setGradeOptions, 'grade');
    } else {
      setGradeOptions([]);
    }
  }, [formData.form]);

  useEffect(() => {
    if (formData.form && formData.grade) {
      fetchDependentOptions(() => servicesAPI.getSize({ form: formData.form, grade: formData.grade }), setSizeOptions, 'size');
    } else {
      setSizeOptions([]);
    }
  }, [formData.form, formData.grade]);

  useEffect(() => {
    if (formData.form && formData.grade && formData.size) {
      fetchDependentOptions(
        () => servicesAPI.getFinish({ form: formData.form, grade: formData.grade, size: formData.size }),
        setFinishOptions,
        'finish'
      );
    } else {
      setFinishOptions([]);
    }
  }, [formData.form, formData.grade, formData.size]);

  useEffect(() => {
    if (formData.form && formData.grade && formData.size && formData.finish) {
      fetchDependentOptions(
        () => servicesAPI.getExtFinish({ form: formData.form, grade: formData.grade, size: formData.size, finish: formData.finish }),
        setExtfinishOptions,
        'extFinish'
      );
    } else {
      setExtfinishOptions([]);
    }
  }, [formData.form, formData.grade, formData.size, formData.finish]);

  useEffect(() => {
    const combined = joinExtFinishSegments(extFinishSegments);
    setFormData(prev => (prev.extendedFinish !== combined ? { ...prev, extendedFinish: combined } : prev));
  }, [extFinishSegments]);

  useEffect(() => {
    if (!pendingExtFinishSplit.current || extfinishOptions.length === 0) return;
    const value = pendingExtFinishSplit.current;
    pendingExtFinishSplit.current = null;
    setExtFinishSegments(splitExtFinishIntoSegments(value, extfinishOptions));
  }, [extfinishOptions]);

  useEffect(() => {
    const hasProduct = formData.form && formData.grade && formData.size && formData.finish;
    const hasSegments = extFinishSegments.some((s) => s.trim());
    if (!hasProduct || !hasSegments || loading.extFinish) {
      clearWarning('extendedFinish');
      return;
    }
    const validation = validateExtFinishOrder(extFinishSegments, extfinishOptions);
    if (validation.isValid) {
      clearWarning('extendedFinish');
    } else {
      setValidationWarnings(prev => ({ ...prev, extendedFinish: validation.message || "Invalid extended finish" }));
    }
  }, [extFinishSegments, extfinishOptions, formData.form, formData.grade, formData.size, formData.finish, loading.extFinish]);

  useEffect(() => {
    const { form, grade, size, finish, extendedFinish } = formData;
    if (form && grade && size && finish && extendedFinish) {
      fetchDependentOptions(
        () => servicesAPI.getWidth({ form, grade, size, finish, extfinish: extendedFinish }),
        setWidthOptions,
        'width',
        'prd_wdth',
        'width'
      );
    } else {
      setWidthOptions([]);
    }
  }, [formData.form, formData.grade, formData.size, formData.finish, formData.extendedFinish]);

  useEffect(() => {
    const { form, grade, size, finish, extendedFinish, width } = formData;
    if (form && grade && size && finish && extendedFinish && width) {
      fetchDependentOptions(
        () => servicesAPI.getLength({ form, grade, size, finish, extfinish: extendedFinish, width }),
        setLengthOptions,
        'length'
      );
    } else {
      setLengthOptions([]);
    }
  }, [formData.form, formData.grade, formData.size, formData.finish, formData.extendedFinish, formData.width]);

  useEffect(() => {
    const { form, grade, size, finish, extendedFinish, width, length } = formData;
    if (form && grade && size && finish && extendedFinish && width && length) {
      fetchDependentOptions(
        () => servicesAPI.getSysTag({ form, grade, size, finish, extfinish: extendedFinish, width, length }),
        setSysTagOptions,
        'sysTag',
        'prd_tag_no'
      );
    } else {
      setSysTagOptions([]);
    }
  }, [formData.form, formData.grade, formData.size, formData.finish, formData.extendedFinish, formData.width, formData.length]);

  useEffect(() => {
    const { form, grade, size, finish, extendedFinish, width, length } = formData;
    let timeoutId: ReturnType<typeof setTimeout> | undefined;
    if (form && grade && size && finish && extendedFinish && width && length) {
      timeoutId = setTimeout(() => {
        fetchDependentOptions(
          () => servicesAPI.getHeat({ form }),
          setHeatOptions,
          'heat',
          undefined,
          undefined,
          JSON.stringify({ form })
        );
      }, 300);
    } else {
      setHeatOptions([]);
    }
    setFormData(prev => ({ ...prev, mill: '-' }));
    return () => { if (timeoutId) clearTimeout(timeoutId); };
  }, [formData.form, formData.grade, formData.size, formData.finish, formData.extendedFinish, formData.width, formData.length]);

  useEffect(() => {
    if (formData.heat && locationId) {
      fetchDependentOptions(
        () => servicesAPI.getMillByHeat({ heat: formData.heat, location_id: locationId }),
        setMillOptions,
        'mill',
        'het_mill',
        'mill'
      );
    } else {
      setMillOptions([]);
      setFormData(prev => ({ ...prev, mill: '-' }));
    }
  }, [formData.heat, locationId]);

  const applyTagRecordToForm = (data: TagRecord) => {
    const widthStr = data.width != null && data.width !== '' && !isNaN(Number(data.width))
      ? Number(data.width).toFixed(4)
      : (data.width ?? '');
    const finishVal = (data.finish ?? '').toString().trim();
    const extFinishVal = (data.ext_finish ?? '').toString().trim();
    if (extFinishVal && extFinishVal !== ' ') {
      pendingExtFinishSplit.current = extFinishVal;
      setExtFinishSegments([extFinishVal]);
    } else {
      pendingExtFinishSplit.current = null;
      setExtFinishSegments(['']);
    }

    // ERP tag length is in inches; treat 0 as a real length
    const rawLen = data.length;
    const totalInches = rawLen !== null && rawLen !== undefined && String(rawLen).trim() !== ''
      ? parseFloat(String(rawLen))
      : NaN;
    const lengthFields = Number.isFinite(totalInches) ? lengthFieldsFromInches(totalInches) : null;

    setFormData(prev => ({
      ...prev,
      form: data.form ?? prev.form,
      grade: data.grade ?? prev.grade,
      size: data.size ?? prev.size,
      finish: finishVal !== '' ? finishVal : ' ',
      extendedFinish: extFinishVal !== '' ? extFinishVal : ' ',
      width: widthStr || prev.width,
      ...(lengthFields ?? {}),
      mill: data.mill ?? prev.mill,
      heat: data.heat ?? prev.heat,
      location: data.location ?? prev.location,
      type: (data.type ?? data.inventory_type ?? prev.type) || prev.type,
      remarks: (data.quality ?? prev.remarks) || prev.remarks,
    }));
  };

  const fetchBySystemTagNo = async () => {
    const tag = formData.sysTag.trim();
    if (!tag) {
      showNotice('Please enter System Tag No', 'error');
      return;
    }
    setLoading(prev => ({ ...prev, tagFetch: true }));
    try {
      const response = await servicesAPI.getProductByTag(tag);
      if (response.data?.multiple && response.data?.Records?.length) {
        setTagRecordsList(response.data.Records);
        setTagRecordsDialogOpen(true);
        showNotice('Multiple records found. Please select one.', 'success');
        return;
      }
      const data = response.data?.Data;
      if (!data) {
        showNotice(response.data?.message || 'No record found for this tag number', 'error');
        return;
      }
      applyTagRecordToForm(data);
      showNotice('Fields populated from System Tag No', 'success');
    } catch (err) {
      console.error('Fetch by tag error:', err);
      const data = (err as { response?: { data?: { error?: string; message?: string } } })?.response?.data;
      showNotice(data?.error || data?.message || 'Failed to fetch by tag', 'error');
    } finally {
      setLoading(prev => ({ ...prev, tagFetch: false }));
    }
  };

  const handleSelectTagRecord = (record: TagRecord) => {
    applyTagRecordToForm(record);
    setTagRecordsDialogOpen(false);
    setTagRecordsList([]);
    showNotice('Fields populated from selected record', 'success');
  };

  const handleClearForm = () => {
    setFormData(emptyForm(remarksOptions[0] || 'Conforms to Std'));
    setFormResetKey(k => k + 1);
    setExtFinishSegments(['']);
    pendingExtFinishSplit.current = null;
    setValidationWarnings({});
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const requiredFields = [
      { field: formData.form, name: "Form" },
      { field: formData.grade, name: "Grade" },
      { field: formData.size, name: "Size" },
      { field: formData.finish, name: "Finish" },
      { field: formData.mill, name: "Mill" },
    ];
    const missing = requiredFields.find(f => !f.field);
    if (missing) {
      showNotice(`Please fill required field: ${missing.name}`, 'error');
      return;
    }
    if (formData.countType === 'bundle' && formData.bundles.length === 0) {
      showNotice('Please add at least one bundle', 'error');
      return;
    }
    setIsSubmitting(true);
    try {
      const totalInches = parseFloat(String(formData.length));
      // Saved as a Counter line so Counter Review, reconciliation and reports pick it up
      const payload = {
        tag_id: 0,
        form: formData.form,
        type: formData.type,
        grade: formData.grade,
        size: formData.size,
        finish: formData.finish || null,
        ext_finish: formData.extendedFinish || null,
        width: formData.width ? parseFloat(formData.width) : null,
        length: Number.isFinite(totalInches) ? totalInches / 12 : null,
        sys_tag_no: formData.sysTag.trim() || null,
        mill: formData.mill || '-',
        heat: formData.heat || null,
        location: formData.location || null,
        remarks: formData.remarks && formData.remarks.trim() !== '' ? formData.remarks : 'Conforms to Std',
        ad_cmts: formData.ad_cmts || null,
        page_number: formData.pageNumber || null,
        serial_number: formData.serialNumber || null,
        count_type: formData.countType,
        qty: formData.quantity,
        counted_by: parseInt(localStorage.getItem('User ID') || '0'),
        team_id: parseInt(teamId),
        location_id: parseInt(locationId),
        section_id: parseInt(sectionId),
        role: 'Counter',
        bundles: formData.countType === COUNT_TYPES.BUNDLES
          ? formData.bundles.map(b => ({ ...b, tag_id: 0 }))
          : undefined,
      };

      const response = await servicesAPI.createTransaction(payload);
      if (!response.data.success) {
        throw { message: response.data.message || 'Failed to save item' };
      }
      const transactionId = response.data.transaction_id || response.data.id;
      if (transactionId) {
        try {
          await servicesAPI.updateTransactionTagId(transactionId, transactionId);
        } catch (err) {
          console.error('Error updating tag_id:', err);
        }
      }
      onSaved();
    } catch (err) {
      console.error('Reconciler item save error:', err);
      let message = 'Failed to save item';
      if (err && typeof err === 'object' && 'response' in err) {
        const axiosError = err as { response?: { data?: { message?: string; error?: string }; statusText?: string } };
        message = axiosError.response?.data?.message || axiosError.response?.data?.error || axiosError.response?.statusText || 'Network error occurred';
      } else if (err && typeof err === 'object' && 'message' in err) {
        message = (err as { message: string }).message;
      }
      showNotice(message, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAddBundle = () => {
    setFormData(prev => ({ ...prev, bundles: [...prev.bundles, { num_of_bundle: 0, bundle_count: 0 }] }));
  };

  const bundleTotal = (bundles: BundleItem[]) =>
    bundles.reduce((sum, b) => sum + (b.num_of_bundle || 0) * (b.bundle_count || 0), 0);

  const handleBundleChange = (index: number, field: 'num_of_bundle' | 'bundle_count', value: number) => {
    setFormData(prev => {
      const bundles = [...prev.bundles];
      bundles[index] = { ...bundles[index], [field]: value };
      return { ...prev, bundles, quantity: bundleTotal(bundles) };
    });
  };

  const handleDeleteBundle = (index: number) => {
    setFormData(prev => {
      const bundles = prev.bundles.filter((_, i) => i !== index);
      return { ...prev, bundles, quantity: bundleTotal(bundles) };
    });
  };

  const handleTabChange = (_: React.SyntheticEvent, newValue: number) => {
    const countType = newValue === 0 ? COUNT_TYPES.PIECES : COUNT_TYPES.BUNDLES;
    setFormData(prev => ({
      ...prev,
      countType,
      quantity: 0,
      bundles: countType === COUNT_TYPES.BUNDLES ? [] : prev.bundles,
    }));
  };

  const iconAdornment = (icon: React.ReactNode) => (
    <InputAdornment position="start">{icon}</InputAdornment>
  );

  return (
    <Box sx={{ p: 1 }}>
      {loading.general && <LinearProgress sx={{ mb: 2, borderRadius: '10px', height: 6 }} color="primary" />}

      <StyledCard>
        <SectionHeader>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Inventory2 sx={{ color: '#0088FE', fontSize: 24 }} />
            <Typography variant="h6" sx={{ fontWeight: 700, color: '#0088FE' }}>
              Item Details
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', gap: 1 }}>
            {onCancel && (
              <Button
                variant="outlined"
                size="small"
                onClick={onCancel}
                sx={{ borderRadius: '8px', borderColor: '#94a3b8', color: '#64748b' }}
              >
                Close
              </Button>
            )}
            <Button
              variant="outlined"
              size="small"
              onClick={handleClearForm}
              startIcon={<ClearAll />}
              sx={{
                borderRadius: '8px',
                borderColor: '#0088FE',
                color: '#0088FE',
                '&:hover': { borderColor: '#0066CC', background: alpha('#0088FE', 0.08) },
              }}
            >
              Clear form
            </Button>
          </Box>
        </SectionHeader>
        <CardContent sx={{ pt: 0 }}>
          {notice && (
            <Alert severity={notice.severity} sx={{ mb: 2 }} onClose={() => setNotice(null)}>
              {notice.message}
            </Alert>
          )}
          {error && (
            <Alert severity="warning" sx={{ mb: 2 }} onClose={() => setError(null)}>
              <Typography variant="body2" sx={{ fontWeight: 500 }}>{error}</Typography>
            </Alert>
          )}
          {Object.keys(validationWarnings).length > 0 && (
            <Alert severity="warning" sx={{ mb: 2 }}>
              <Typography variant="body2" sx={{ fontWeight: 500, mb: 1 }}>
                Validation Warnings (you can still proceed):
              </Typography>
              {Object.entries(validationWarnings).map(([field, message]) => (
                <Typography key={field} variant="body2" sx={{ ml: 2 }}>
                  • {field}: {message}
                </Typography>
              ))}
            </Alert>
          )}
          <form key={formResetKey} onSubmit={handleSubmit}>
            <Grid container spacing={2}>
              {/* System Tag No */}
              <Grid item xs={12}>
                <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-start' }}>
                  <Autocomplete
                    freeSolo
                    options={sysTagOptions}
                    value={formData.sysTag}
                    onChange={(_, value) => handleFieldChange('sysTag', value ?? '')}
                    onInputChange={(_, value) => handleFieldChange('sysTag', value ?? '')}
                    loading={loading.sysTag}
                    sx={{ flex: 1 }}
                    renderInput={(params) => (
                      <TextField
                        {...params}
                        label="System Tag No"
                        fullWidth
                        placeholder="Enter tag number and click Fetch to fill fields"
                        inputRef={(input) => { fieldRefs.current.sysTag = input; }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            fetchBySystemTagNo();
                          } else {
                            handleKeyPress('sysTag', e, formData.sysTag);
                          }
                        }}
                        disabled={loading.tagFetch}
                        InputProps={{
                          ...params.InputProps,
                          endAdornment: (
                            <>
                              {loading.sysTag || loading.tagFetch ? <CircularProgress color="inherit" size={20} /> : null}
                              {params.InputProps.endAdornment}
                            </>
                          ),
                        }}
                      />
                    )}
                  />
                  <Button
                    type="button"
                    variant="outlined"
                    onClick={fetchBySystemTagNo}
                    disabled={loading.tagFetch || !formData.sysTag.trim()}
                    sx={{ minWidth: 100, mt: 1 }}
                  >
                    {loading.tagFetch ? 'Fetching...' : 'Fetch'}
                  </Button>
                </Box>
              </Grid>

              {/* Form */}
              <Grid item xs={12} sm={6}>
                <Autocomplete
                  freeSolo
                  options={formOptions}
                  value={formData.form}
                  onChange={(_, value) => handleFieldChange('form', value || '')}
                  loading={loading.form}
                  renderInput={(params) => (
                    <StyledTextField
                      {...params}
                      label="Form"
                      fullWidth
                      inputRef={(input) => { fieldRefs.current.form = input; }}
                      onKeyDown={(e) => handleKeyPress('form', e, formData.form)}
                      InputProps={{
                        ...params.InputProps,
                        startAdornment: iconAdornment(<Description sx={{ color: '#0088FE', fontSize: 20 }} />),
                        endAdornment: (
                          <>
                            {loading.form ? <CircularProgress color="primary" size={20} /> : null}
                            {params.InputProps.endAdornment}
                          </>
                        ),
                      }}
                    />
                  )}
                />
              </Grid>

              {/* Grade */}
              <Grid item xs={12} sm={6}>
                <Autocomplete
                  freeSolo
                  options={gradeOptions}
                  value={formData.grade}
                  onChange={(_, value) => handleFieldChange('grade', value || '')}
                  loading={loading.grade}
                  renderInput={(params) => (
                    <StyledTextField
                      {...params}
                      label="Grade"
                      fullWidth
                      inputRef={(input) => { fieldRefs.current.grade = input; }}
                      onKeyDown={(e) => handleKeyPress('grade', e, formData.grade)}
                      InputProps={{
                        ...params.InputProps,
                        startAdornment: iconAdornment(<Category sx={{ color: '#0088FE', fontSize: 20 }} />),
                        endAdornment: (
                          <>
                            {loading.grade ? <CircularProgress color="primary" size={20} /> : null}
                            {params.InputProps.endAdornment}
                          </>
                        ),
                      }}
                    />
                  )}
                />
              </Grid>

              {/* Size */}
              <Grid item xs={12} sm={6}>
                <Autocomplete
                  freeSolo
                  options={sizeOptions}
                  value={formData.size}
                  onChange={(_, value) => handleFieldChange('size', value || '')}
                  loading={loading.size}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label="Size"
                      fullWidth
                      inputRef={(input) => { fieldRefs.current.size = input; }}
                      onKeyDown={(e) => handleKeyPress('size', e, formData.size)}
                      InputProps={{
                        ...params.InputProps,
                        endAdornment: (
                          <>
                            {loading.size ? <CircularProgress color="inherit" size={20} /> : null}
                            {params.InputProps.endAdornment}
                          </>
                        ),
                      }}
                    />
                  )}
                />
              </Grid>

              {/* Finish */}
              <Grid item xs={12} sm={6}>
                <Autocomplete
                  freeSolo
                  options={finishOptions}
                  value={formData.finish}
                  onChange={(_, value) => {
                    const newFinish = value || '';
                    handleFieldChange('finish', newFinish);
                    checkDimensionSegment(newFinish);
                  }}
                  loading={loading.finish}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label="Finish"
                      fullWidth
                      inputRef={(input) => { fieldRefs.current.finish = input; }}
                      onKeyDown={(e) => handleKeyPress('finish', e, formData.finish)}
                      InputProps={{
                        ...params.InputProps,
                        endAdornment: (
                          <>
                            {loading.finish ? <CircularProgress color="inherit" size={20} /> : null}
                            {params.InputProps.endAdornment}
                          </>
                        ),
                      }}
                    />
                  )}
                />
              </Grid>

              {/* Extended Finish — segments combine (DCF + RFD + OPT → DCFRFDOPT) */}
              <Grid item xs={12} sm={6}>
                {formData.extendedFinish ? (
                  <Typography variant="caption" color="text.secondary" sx={{ mb: 0.5, display: 'block' }}>
                    Combined: {formData.extendedFinish}
                  </Typography>
                ) : null}
                <Autocomplete
                  multiple
                  freeSolo
                  options={extfinishOptions}
                  value={extFinishSegments.filter((s) => s.trim() !== '')}
                  onChange={(_, values) => {
                    const cleaned = (values as string[]).map((v) => v.trim()).filter(Boolean);
                    setExtFinishSegments(cleaned.length ? cleaned : ['']);
                  }}
                  loading={loading.extFinish}
                  renderTags={(value, getTagProps) =>
                    value.map((option, index) => (
                      <Chip label={option} size="small" {...getTagProps({ index })} key={`${option}-${index}`} />
                    ))
                  }
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label="Extended Finish"
                      fullWidth
                      error={!!validationWarnings.extendedFinish}
                      helperText={validationWarnings.extendedFinish}
                      inputRef={(input) => { fieldRefs.current.extendedFinish = input; }}
                      InputProps={{
                        ...params.InputProps,
                        endAdornment: (
                          <>
                            {loading.extFinish ? <CircularProgress color="inherit" size={20} /> : null}
                            {params.InputProps.endAdornment}
                          </>
                        ),
                      }}
                    />
                  )}
                />
              </Grid>

              {/* Width */}
              <Grid item xs={12} sm={6}>
                <Autocomplete
                  freeSolo
                  options={widthOptions}
                  value={formData.width !== '' ? Number(formData.width).toFixed(4) : ''}
                  onChange={(_, value) => {
                    handleFieldChange('width', value !== null && value !== '' ? Number(value).toFixed(4) : '');
                  }}
                  loading={loading.width}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label="Width"
                      fullWidth
                      inputRef={(input) => { fieldRefs.current.width = input; }}
                      onKeyDown={(e) => handleKeyPress('width', e, formData.width)}
                      InputProps={{
                        ...params.InputProps,
                        endAdornment: (
                          <>
                            {loading.width ? <CircularProgress color="inherit" size={20} /> : null}
                            {params.InputProps.endAdornment}
                          </>
                        ),
                      }}
                    />
                  )}
                />
              </Grid>

              {/* Length: feet + inches (stored as total feet) */}
              <Grid item xs={12} sm={3}>
                <Autocomplete
                  freeSolo
                  options={lengthFeetOptions}
                  value={formData.lengthFeet}
                  onChange={(_, value) => handleFieldChange('lengthFeet', value ?? '')}
                  onInputChange={(_, value) => {
                    const parsedInches = parseFeetInches(value ?? '');
                    if (parsedInches !== null) {
                      setFormData(prev => ({ ...prev, ...lengthFieldsFromInches(parsedInches) }));
                    } else {
                      handleFieldChange('lengthFeet', value ?? '');
                    }
                  }}
                  loading={loading.length}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label="Length (feet)"
                      fullWidth
                      placeholder="e.g. 5 or 5' 12''"
                      inputRef={(input) => { fieldRefs.current.lengthFeet = input; }}
                      onKeyDown={(e) => handleKeyPress('lengthFeet', e, formData.lengthFeet)}
                      InputProps={{
                        ...params.InputProps,
                        endAdornment: loading.length ? <CircularProgress color="inherit" size={20} /> : params.InputProps.endAdornment,
                      }}
                    />
                  )}
                />
              </Grid>
              <Grid item xs={12} sm={3}>
                <Autocomplete
                  freeSolo
                  options={lengthInchesOptions}
                  value={formData.lengthInches}
                  onChange={(_, value) => {
                    const val = (value ?? '').toString().trim();
                    const num = parseFloat(val);
                    // A full inch value (e.g. 120) is split into feet + remaining inches
                    if (val !== '' && !isNaN(num) && num >= 12) {
                      setFormData(prev => ({ ...prev, ...lengthFieldsFromInches(num) }));
                    } else {
                      handleFieldChange('lengthInches', val);
                    }
                  }}
                  onInputChange={(_, value) => handleFieldChange('lengthInches', value ?? '')}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label="Length (inches)"
                      fullWidth
                      placeholder="e.g. 120 or 0–11 for remainder"
                      inputRef={(input) => { fieldRefs.current.lengthInches = input; }}
                      onKeyDown={(e) => handleKeyPress('lengthInches', e, formData.lengthInches)}
                    />
                  )}
                />
              </Grid>
              {formData.length !== '' && (
                <Grid item xs={12} sm={6} sx={{ display: 'flex', alignItems: 'center' }}>
                  <Typography variant="body2" color="text.secondary">
                    {formData.lengthFeet !== '' || formData.lengthInches !== ''
                      ? `${formData.lengthFeet || '0'}′ ${formData.lengthInches || '0'}″ = `
                      : ''}
                    {(parseFloat(formData.length || '0') / 12).toFixed(4)} ft (stored)
                  </Typography>
                </Grid>
              )}

              {/* Heat */}
              <Grid item xs={12} sm={6}>
                <Autocomplete
                  freeSolo
                  options={heatOptions}
                  value={formData.heat || (heatOptions.length ? heatOptions[1] : '')}
                  onChange={(_, value) => handleFieldChange('heat', value || '')}
                  loading={loading.heat}
                  filterOptions={(options, { inputValue }) => {
                    if (!inputValue) return options.slice(0, 100);
                    return options.filter(o => o.toLowerCase().includes(inputValue.toLowerCase())).slice(0, 50);
                  }}
                  renderInput={(params) => (
                    <StyledTextField
                      {...params}
                      label="Heat"
                      fullWidth
                      placeholder="Type to search heat values..."
                      inputRef={(input) => { fieldRefs.current.heat = input; }}
                      onKeyDown={(e) => handleKeyPress('heat', e, formData.heat)}
                      InputProps={{
                        ...params.InputProps,
                        startAdornment: iconAdornment(<LocalFireDepartment sx={{ color: '#0088FE', fontSize: 20 }} />),
                        endAdornment: (
                          <>
                            {loading.heat ? <CircularProgress color="primary" size={20} /> : null}
                            {params.InputProps.endAdornment}
                          </>
                        ),
                      }}
                    />
                  )}
                />
              </Grid>

              {/* Mill */}
              <Grid item xs={12} sm={6}>
                <Autocomplete
                  freeSolo
                  options={millOptions}
                  value={formData.mill || '-'}
                  onChange={(_, value) => handleFieldChange('mill', value || '-')}
                  loading={loading.mill}
                  renderInput={(params) => (
                    <StyledTextField
                      {...params}
                      label="Mill"
                      fullWidth
                      placeholder="-"
                      inputRef={(input) => { fieldRefs.current.mill = input; }}
                      onKeyDown={(e) => handleKeyPress('mill', e, formData.mill)}
                      InputProps={{
                        ...params.InputProps,
                        startAdornment: iconAdornment(<Factory sx={{ color: '#0088FE', fontSize: 20 }} />),
                        endAdornment: (
                          <>
                            {loading.mill ? <CircularProgress color="primary" size={20} /> : null}
                            {params.InputProps.endAdornment}
                          </>
                        ),
                      }}
                    />
                  )}
                />
              </Grid>

              {/* Location */}
              <Grid item xs={12} sm={6}>
                <Autocomplete
                  freeSolo
                  options={locationOptions}
                  value={formData.location}
                  onChange={(_, value) => handleFieldChange('location', value || '')}
                  onInputChange={(_, value) => { if (value !== null) handleFieldChange('location', value); }}
                  loading={loading.location}
                  filterOptions={(options, { inputValue }) => {
                    if (!inputValue) return options.slice(0, 50);
                    return options.filter(o => o.toLowerCase().includes(inputValue.toLowerCase())).slice(0, 50);
                  }}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label="Location"
                      fullWidth
                      placeholder="Select location..."
                      inputRef={(input) => { fieldRefs.current.location = input; }}
                      onKeyDown={(e) => handleKeyPress('location', e, formData.location)}
                      InputProps={{
                        ...params.InputProps,
                        endAdornment: (
                          <>
                            {loading.location ? <CircularProgress color="inherit" size={20} /> : null}
                            {params.InputProps.endAdornment}
                          </>
                        ),
                      }}
                    />
                  )}
                />
              </Grid>

              {/* Type */}
              <Grid item xs={12} sm={6}>
                <Autocomplete
                  freeSolo
                  options={TYPE_OPTIONS}
                  getOptionLabel={(option) => typeof option === 'string' ? option : option.label}
                  value={TYPE_OPTIONS.find(option => option.value === formData.type) || null}
                  onChange={(_, value) => {
                    let typeValue = 'M';
                    if (value && typeof value === 'object' && 'value' in value) typeValue = value.value;
                    else if (typeof value === 'string') typeValue = value;
                    handleFieldChange('type', typeValue);
                  }}
                  onInputChange={(_, value) => {
                    if (value === null) return;
                    const found = TYPE_OPTIONS.find(o => o.label === value) || TYPE_OPTIONS.find(o => o.value === value);
                    handleFieldChange('type', found ? found.value : value);
                  }}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label="Type"
                      fullWidth
                      inputRef={(input) => { fieldRefs.current.type = input; }}
                      onKeyDown={(e) => handleKeyPress('type', e, formData.type)}
                    />
                  )}
                />
              </Grid>

              {/* Quality Code */}
              <Grid item xs={12} sm={6}>
                <Autocomplete
                  freeSolo
                  options={remarksOptions}
                  value={formData.remarks || 'Conforms to Std'}
                  onChange={(_, value) => handleFieldChange('remarks', value || 'Conforms to Std')}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label="Quality Code"
                      fullWidth
                      inputRef={(input) => { fieldRefs.current.remarks = input; }}
                      onKeyDown={(e) => handleKeyPress('remarks', e, formData.remarks)}
                    />
                  )}
                />
              </Grid>

              <Grid item xs={12} sm={6}>
                <StyledTextField
                  label="Additional Comments"
                  fullWidth
                  value={formData.ad_cmts}
                  onChange={(e) => handleFieldChange('ad_cmts', e.target.value)}
                  inputRef={(input) => { fieldRefs.current.ad_cmts = input; }}
                  onKeyDown={(e) => handleKeyPress('ad_cmts', e, formData.ad_cmts)}
                  InputProps={{ startAdornment: iconAdornment(<Comment sx={{ color: '#0088FE', fontSize: 20 }} />) }}
                />
              </Grid>

              <Grid item xs={12} sm={6}>
                <StyledTextField
                  label="Page Number"
                  fullWidth
                  value={formData.pageNumber}
                  onChange={(e) => handleFieldChange('pageNumber', e.target.value)}
                  inputRef={(input) => { fieldRefs.current.pageNumber = input; }}
                  onKeyDown={(e) => handleKeyPress('pageNumber', e, formData.pageNumber)}
                  InputProps={{ startAdornment: iconAdornment(<Description sx={{ color: '#0088FE', fontSize: 20 }} />) }}
                />
              </Grid>

              <Grid item xs={12} sm={6}>
                <StyledTextField
                  label="Count Line Number"
                  fullWidth
                  value={formData.serialNumber}
                  onChange={(e) => handleFieldChange('serialNumber', e.target.value)}
                  inputRef={(input) => { fieldRefs.current.serialNumber = input; }}
                  onKeyDown={(e) => handleKeyPress('serialNumber', e, formData.serialNumber)}
                  InputProps={{ startAdornment: iconAdornment(<Tag sx={{ color: '#0088FE', fontSize: 20 }} />) }}
                />
              </Grid>

              {/* Count Type */}
              <Grid item xs={12}>
                <FormControl component="fieldset" fullWidth>
                  <Typography variant="subtitle1" gutterBottom>
                    Count Type
                  </Typography>
                  <Tabs
                    value={formData.countType === COUNT_TYPES.PIECES ? 0 : 1}
                    onChange={handleTabChange}
                    indicatorColor="primary"
                    textColor="primary"
                    variant="fullWidth"
                    sx={{
                      borderRadius: '12px',
                      background: alpha('#0088FE', 0.05),
                      '& .MuiTab-root': { borderRadius: '12px', fontWeight: 600, '&.Mui-selected': { color: '#0088FE' } },
                      '& .MuiTabs-indicator': { backgroundColor: '#0088FE', height: 3, borderRadius: '3px 3px 0 0' },
                    }}
                  >
                    <Tab label="Pieces" />
                    <Tab label="Bundles" />
                  </Tabs>
                </FormControl>
              </Grid>

              {/* Quantity */}
              <Grid item xs={12}>
                {formData.countType === COUNT_TYPES.PIECES ? (
                  <StyledTextField
                    label="Quantity (Pieces)"
                    name="quantity"
                    type="text"
                    value={formData.quantity}
                    onChange={(e) => {
                      const qty = Number(e.target.value);
                      setFormData(prev => ({ ...prev, quantity: qty }));
                      if (validateFieldValue('quantity', e.target.value).isValid) clearWarning('quantity');
                    }}
                    fullWidth
                    inputRef={(input) => { fieldRefs.current.quantity = input; }}
                    onKeyDown={(e) => handleKeyPress('quantity', e, formData.quantity.toString())}
                  />
                ) : (
                  <>
                    <StyledButton
                      onClick={() => setOpenBundleModal(true)}
                      variant="outlined"
                      startIcon={<Add />}
                      fullWidth
                      sx={{
                        mb: 2,
                        borderColor: '#0088FE',
                        color: '#0088FE',
                        '&:hover': { borderColor: '#0066CC', background: alpha('#0088FE', 0.05) },
                      }}
                    >
                      {formData.bundles.length > 0 ? `Edit Bundles (${formData.bundles.length})` : "Add Bundles"}
                    </StyledButton>
                    <StyledTextField label="Total Quantity" name="quantity" type="text" value={formData.quantity} fullWidth disabled />
                  </>
                )}
              </Grid>

              <Grid item xs={12}>
                <Box sx={{ display: 'flex', gap: 2, mt: 2 }}>
                  <StyledButton
                    type="submit"
                    variant="contained"
                    color="primary"
                    size="large"
                    startIcon={<Save />}
                    disabled={isSubmitting}
                    fullWidth
                    sx={{
                      background: '#0088FE',
                      color: 'white',
                      '&:hover': { background: '#0066CC' },
                      '&:disabled': { background: alpha('#0088FE', 0.3) },
                    }}
                  >
                    {isSubmitting ? (
                      <>
                        <CircularProgress size={24} sx={{ mr: 1, color: 'white' }} />
                        Saving...
                      </>
                    ) : 'Add Item'}
                  </StyledButton>
                </Box>
              </Grid>
            </Grid>
          </form>
        </CardContent>
      </StyledCard>

      {/* Bundle Modal */}
      <Dialog open={openBundleModal} onClose={() => setOpenBundleModal(false)} fullWidth maxWidth="md">
        <DialogTitle>Bundle Details</DialogTitle>
        <DialogContent>
          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Bundle #</TableCell>
                  <TableCell>Number of Bundles</TableCell>
                  <TableCell>Pieces per Bundle</TableCell>
                  <TableCell>Total Pieces</TableCell>
                  <TableCell>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {formData.bundles.map((bundle, index) => (
                  <TableRow key={index}>
                    <TableCell>{index + 1}</TableCell>
                    <TableCell>
                      <TextField
                        type="text"
                        value={bundle.num_of_bundle || ''}
                        onChange={(e) => handleBundleChange(index, "num_of_bundle", parseInt(e.target.value) || 0)}
                        fullWidth
                      />
                    </TableCell>
                    <TableCell>
                      <TextField
                        type="text"
                        value={bundle.bundle_count || ''}
                        onChange={(e) => handleBundleChange(index, "bundle_count", parseInt(e.target.value) || 0)}
                        fullWidth
                      />
                    </TableCell>
                    <TableCell>{(bundle.num_of_bundle || 0) * (bundle.bundle_count || 0)}</TableCell>
                    <TableCell>
                      <IconButton onClick={() => handleDeleteBundle(index)} color="error">
                        <Delete />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))}
                {formData.bundles.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} align="center">No bundles added yet</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 2 }}>
            <Button onClick={handleAddBundle} variant="outlined" startIcon={<Add />}>
              Add Bundle
            </Button>
            <Typography variant="h6">Total: {formData.quantity} pieces</Typography>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenBundleModal(false)}>Cancel</Button>
          <Button
            onClick={() => {
              setFormData(prev => ({ ...prev, quantity: bundleTotal(prev.bundles) }));
              setOpenBundleModal(false);
            }}
            color="primary"
            variant="contained"
          >
            Save Bundles
          </Button>
        </DialogActions>
      </Dialog>

      {/* Multiple records by System Tag – select one */}
      <Dialog
        open={tagRecordsDialogOpen}
        onClose={() => { setTagRecordsDialogOpen(false); setTagRecordsList([]); }}
        maxWidth="xl"
        fullWidth
        PaperProps={{ sx: { borderRadius: 2 } }}
      >
        <DialogTitle>Multiple records for this System Tag – select one</DialogTitle>
        <DialogContent>
          <TableContainer component={Paper} variant="outlined" sx={{ mt: 1, maxHeight: 440 }}>
            <Table size="small" stickyHeader>
              <TableHead>
                <TableRow>
                  <TableCell>Form</TableCell>
                  <TableCell>Grade</TableCell>
                  <TableCell>Size</TableCell>
                  <TableCell>Finish</TableCell>
                  <TableCell>Ext Finish</TableCell>
                  <TableCell>Width</TableCell>
                  <TableCell>Length</TableCell>
                  <TableCell>Mill</TableCell>
                  <TableCell>Heat</TableCell>
                  <TableCell>Location</TableCell>
                  <TableCell>Type</TableCell>
                  <TableCell>Quality</TableCell>
                  <TableCell align="right">Action</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {tagRecordsList.map((rec, idx) => (
                  <TableRow key={idx} hover>
                    <TableCell>{rec.form}</TableCell>
                    <TableCell>{rec.grade}</TableCell>
                    <TableCell>{rec.size}</TableCell>
                    <TableCell>{rec.finish}</TableCell>
                    <TableCell>{rec.ext_finish}</TableCell>
                    <TableCell>{rec.width}</TableCell>
                    <TableCell>{rec.length}</TableCell>
                    <TableCell>{rec.mill}</TableCell>
                    <TableCell>{rec.heat}</TableCell>
                    <TableCell>{rec.location}</TableCell>
                    <TableCell>{rec.type_display ?? rec.type ?? rec.inventory_type ?? ''}</TableCell>
                    <TableCell>{rec.quality}</TableCell>
                    <TableCell align="right">
                      <Button size="small" variant="contained" onClick={() => handleSelectTagRecord(rec)}>
                        Select
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => { setTagRecordsDialogOpen(false); setTagRecordsList([]); }}>Cancel</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ReconcilerItemEntryForm;
