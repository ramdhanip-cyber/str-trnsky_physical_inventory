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
  Snackbar,
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
  Tooltip,
  Chip,
  Stack
} from "@mui/material";
import { styled } from "@mui/material/styles";
import { servicesAPI } from "../config/api";
import { Add, Delete, Save, History, Inventory2, Description, Category, Tag, LocationOn, Factory, LocalFireDepartment, Comment, ClearAll } from "@mui/icons-material";
import { useParams, useNavigate } from "react-router-dom";
import TransactionsTableModal from '../components/TransactionsTableModal';

// Styled Components
const StyledCard = styled(Card)(({ theme }) => ({
  borderRadius: '20px',
  boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
  border: `1px solid ${alpha(theme.palette.primary.main || '#0088FE', 0.1)}`,
  background: `${alpha(theme.palette.primary.main || '#0088FE', 0.02)}`,
  transition: 'all 0.3s ease',
  '&:hover': {
    boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
  }
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


/** Join extended-finish segment values into the stored prd_ef_svar string (e.g. DCF + RFD + OPT → DCFRFDOPT). */
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

/** Find a system ext-finish value that uses the same segments (any order). */
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

function validateExtFinishOrder(
  segments: string[],
  systemValues: string[]
): { isValid: boolean; message?: string } {
  const trimmed = segments.map((s) => s.trim()).filter(Boolean);
  if (trimmed.length === 0) return { isValid: true };

  const combined = trimmed.join("");
  const normalized = systemValues.map((v) => v.trim()).filter((v) => v && v !== " ");

  if (normalized.includes(combined)) return { isValid: true };

  const matching = findSystemExtFinishFromSegments(trimmed, normalized);
  if (matching && matching !== combined) {
    return {
      isValid: false,
      message: `Extended finish order mismatch. Did you mean '${matching}'?`,
    };
  }

  return {
    isValid: false,
    message: `Extended Finish "${combined}" not found for this product. Please check segment values.`,
  };
}

/** Split a combined ext-finish into segments using known system values (longest match first). */
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

// Constants and Types
const COUNT_TYPES = {
  PIECES: "pcs",
  BUNDLES: "bundle",
} as const;

type CountType = typeof COUNT_TYPES[keyof typeof COUNT_TYPES];

interface FormData {
  tag_id: number;
  form: string;
  type: string;
  grade: string;
  size: string;
  finish: string;
  extendedFinish: string;
  width: string;
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

/**
 * An item attached to the counted product (e.g. hardware counted along with it).
 * Sent to the reconciler as its own transaction so it reconciles separately
 * from the product it is attached to.
 */
interface AttachmentItem {
  form: string;
  grade: string;
  size: string;
  finish: string;
  extFinishes: string[];
  quantity: number;
}

// Commented out - not currently used but kept for potential future tag range feature
/* interface TeamTagRange {
  tag_from: number;
  tag_to: number;
  current_tag: number;
} */

interface Transaction {
  id?: number;
  tag_id: number;
  form: string;
  type: string;
  grade: string;
  size: string;
  finish: string;
  ext_finish: string;
  width: string;
  length: string;
  mill: string;
  heat: string;
  location?: string;
  remarks: string;
  ad_cmts: string;
  count_type: CountType;
  qty: number;
  counted_by: number;
  team_id: number;
  location_id: number;
  section_id: number;
  counted_at?: Date;
  bundles?: Bundle[];
  page_number?: string;
  serial_number?: string;
}

interface BundleItem {
  num_of_bundle: number;
  bundle_count: number;
  tag_id?: number;
}

interface Bundle extends BundleItem {
  id?: number;
  transaction_id?: number;
}

// Add proper types for the state
interface LocationData {
  location_desc: string;
  warehouse: string;
}

interface SectionData {
  section_desc: string;
}

interface TeamData {
  team_name: string;
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

const CounterPage: React.FC = () => {
  const { location_id, section_id, team_id, user_id } = useParams<{
    location_id: string;
    section_id: string;
    team_id: string;
    user_id: string;
  }>();
  const navigate = useNavigate();

  // State management
  const [formData, setFormData] = useState<FormData>({
    tag_id: 0,
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
    remarks: 'Conforms to Std',
    ad_cmts: '',
    mill: '-',
    heat: '-',
    location: '',
    pageNumber: '',
    serialNumber: ''
  });

  const [submittedData, setSubmittedData] = useState<Transaction[]>([]);
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
    tagFetch: false
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [openBundleModal, setOpenBundleModal] = useState(false);
  const [openTableModal, setOpenTableModal] = useState(false);
  const [tagRecordsDialogOpen, setTagRecordsDialogOpen] = useState(false);
  const [tagRecordsList, setTagRecordsList] = useState<TagRecord[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [validationWarnings, setValidationWarnings] = useState<{ [key: string]: string }>({});
  const [extFinishSegments, setExtFinishSegments] = useState<string[]>(['']);
  const pendingExtFinishSplit = useRef<string | null>(null);

  // Attachment items: counted with this item but reconciled as separate products
  const [attachments, setAttachments] = useState<AttachmentItem[]>([]);
  const [attachmentDialogOpen, setAttachmentDialogOpen] = useState(false);
  const emptyAttachmentForm = { form: '', grade: '', size: '', finish: '', extFinishes: [] as string[], quantity: '' };
  const [attachmentForm, setAttachmentForm] = useState(emptyAttachmentForm);
  const [attGradeOptions, setAttGradeOptions] = useState<string[]>([]);
  const [attSizeOptions, setAttSizeOptions] = useState<string[]>([]);
  const [attFinishOptions, setAttFinishOptions] = useState<string[]>([]);
  const [attExtFinishOptions, setAttExtFinishOptions] = useState<string[]>([]);
  const [attLoading, setAttLoading] = useState({ grade: false, size: false, finish: false, extFinish: false });
  
  // Field navigation refs
  const fieldRefs = useRef<{ [key: string]: HTMLInputElement | null }>({});
  
  // Field navigation order
  const fieldOrder = [
    'form', 'grade', 'size', 'finish', 'extendedFinish', 
    'width', 'lengthFeet', 'lengthInches', 'sysTag', 'heat', 'mill', 'location', 
    'type', 'remarks', 'ad_cmts', 'pageNumber', 'serialNumber', 'quantity'
  ];
  
  // Navigate to next field
  const navigateToNextField = (currentField: string) => {
    const currentIndex = fieldOrder.indexOf(currentField);
    if (currentIndex < fieldOrder.length - 1) {
      const nextField = fieldOrder[currentIndex + 1];
      const nextFieldRef = fieldRefs.current[nextField];
      if (nextFieldRef) {
        nextFieldRef.focus();
        nextFieldRef.select(); // Select all text for easy replacement
      } else {
        // If the next field ref is not available, try to find it after a short delay
        // This handles cases where the field might be conditionally rendered
        setTimeout(() => {
          const delayedRef = fieldRefs.current[nextField];
          if (delayedRef) {
            delayedRef.focus();
            delayedRef.select();
          }
        }, 100);
      }
    }
  };

  // Length unit conversion functions
  /**
   * Parse "5' 12''" or "5 ft 12 in" style input to total inches and display string.
   * Returns { inches, display } e.g. { inches: 72, display: "5' 12''" } or null if not matched.
   */
  const parseFeetInches = (value: string): { inches: number; display: string } | null => {
    // Strip our own " (X.XX ft)" suffix so editing the displayed value still parses
    const withoutSuffix = value.replace(/\s*\(\d+(?:\.\d+)?\s*ft\)\s*$/i, '').trim();
    const trimmed = withoutSuffix.trim();
    // Match: 5' 12'' or 5' 12" (feet with ', inches with '' or ")
    const match1 = trimmed.match(/^\s*(\d+(?:\.\d+)?)\s*'\s*(\d+(?:\.\d+)?)\s*(?:''|")\s*$/i);
    if (match1) {
      const feet = parseFloat(match1[1]);
      const inches = parseFloat(match1[2]);
      if (!Number.isNaN(feet) && !Number.isNaN(inches)) {
        const totalInches = feet * 12 + inches;
        const display = `${feet}' ${inches}''`;
        return { inches: totalInches, display };
      }
    }
    // Match: 5 ft 12 in
    const match2 = trimmed.match(/^\s*(\d+(?:\.\d+)?)\s*ft\s*(\d+(?:\.\d+)?)\s*in\s*$/i);
    if (match2) {
      const feet = parseFloat(match2[1]);
      const inches = parseFloat(match2[2]);
      if (!Number.isNaN(feet) && !Number.isNaN(inches)) {
        const totalInches = feet * 12 + inches;
        const display = `${feet}' ${inches}''`;
        return { inches: totalInches, display };
      }
    }
    return null;
  };

  // Validate field value against available options
  const validateFieldValue = (fieldName: string, value: string): { isValid: boolean; message?: string } => {
    // Fields that allow spaces as valid values
    const fieldsThatAllowSpaces = ['finish', 'extendedFinish', 'width', 'length', 'lengthFeet', 'lengthInches', 'sysTag', 'heat', 'mill', 'remarks', 'ad_cmts'];
    
    // For fields that allow spaces, don't fail on empty/whitespace-only input
    if (!fieldsThatAllowSpaces.includes(fieldName) && (!value || value.trim() === '')) {
      return { isValid: false, message: `${fieldName} is required` };
    }

    const trimmedValue = value.trim();
    
    switch (fieldName) {
      case 'form':
        if (!formOptions.includes(trimmedValue)) {
          return { isValid: false, message: `Form "${trimmedValue}" not found. Please select from available options.` };
        }
        break;
      case 'grade':
        if (!gradeOptions.includes(trimmedValue)) {
          return { isValid: false, message: `Grade "${trimmedValue}" not found. Please select from available options.` };
        }
        break;
      case 'size':
        if (!sizeOptions.includes(trimmedValue)) {
          return { isValid: false, message: `Size "${trimmedValue}" not found. Please select from available options.` };
        }
        break;
      case 'finish':
        // Allow empty spaces and the actual value
        if (trimmedValue === '' || finishOptions.includes(trimmedValue)) {
          // Valid: empty (spaces) or found in options
        } else {
          return { isValid: false, message: `Finish "${trimmedValue}" not found. Please select from available options.` };
        }
        break;
      case 'extendedFinish': {
        if (trimmedValue === '') return { isValid: true };
        return validateExtFinishOrder(extFinishSegments, extfinishOptions);
      }
      case 'width':
        // Allow empty spaces and the actual value
        if (trimmedValue === '' || widthOptions.includes(trimmedValue)) {
          // Valid: empty (spaces) or found in options
        } else {
          // Check if the value is a valid number that could be formatted
          const numValue = parseFloat(trimmedValue);
          if (!isNaN(numValue)) {
            // Check if any width option matches when converted to the same format
            // API returns values like "0.0000" but user might type "0.00"
            const hasMatchingOption = widthOptions.some(option => {
              const optionNum = parseFloat(option);
              return !isNaN(optionNum) && Math.abs(optionNum - numValue) < 0.0001;
            });
            if (hasMatchingOption) {
              // Valid: numeric value that matches an option
            } else {
              return { isValid: false, message: `Width "${trimmedValue}" not found. Please select from available options.` };
            }
          } else {
            return { isValid: false, message: `Width "${trimmedValue}" not found. Please select from available options.` };
          }
        }
        break;
      case 'length':
      case 'lengthFeet':
      case 'lengthInches': {
        // Length is derived from lengthFeet + lengthInches; accept any non-negative number (convert and store in feet)
        if (trimmedValue === '') break;
        const lenNum = parseFloat(trimmedValue);
        if (isNaN(lenNum) || lenNum < 0) {
          return { isValid: false, message: `Length "${trimmedValue}" must be a valid non-negative number.` };
        }
        break;
      }
      case 'sysTag':
        // Allow empty spaces and the actual value
        if (trimmedValue === '' || sysTagOptions.includes(trimmedValue)) {
          // Valid: empty (spaces) or found in options
        } else {
          return { isValid: false, message: `System Tag "${trimmedValue}" not found. Please select from available options.` };
        }
        break;
      case 'heat':
        // Allow empty spaces, dash, and actual values
        if (trimmedValue === '' || trimmedValue === '-' || heatOptions.includes(trimmedValue)) {
          // Valid: empty (spaces), dash, or found in options
        } else {
          return { isValid: false, message: `Heat "${trimmedValue}" not found. Please select from available options, use "-", or use empty space.` };
        }
        break;
      case 'mill':
        // Allow empty spaces, dash, and actual values
        if (trimmedValue === '' || trimmedValue === '-' || millOptions.includes(trimmedValue)) {
          // Valid: empty (spaces), dash, or found in options
        } else {
          return { isValid: false, message: `Mill "${trimmedValue}" not found. Please select from available options, use "-", or use empty space.` };
        }
        break;
      case 'location':
        if (!locationOptions.includes(trimmedValue)) {
          return { isValid: false, message: `Location "${trimmedValue}" not found. Please select from available options.` };
        }
        break;
      case 'type': {
        const validTypes = typeOptions.map(t => t.value);
        const validLabels = typeOptions.map(t => t.label);
        // Accept both value format (e.g., "M") and label format (e.g., "M - Master")
        if (!validTypes.includes(trimmedValue) && !validLabels.includes(trimmedValue)) {
          return { isValid: false, message: `Type "${trimmedValue}" not found. Please select from available options.` };
        }
        break;
      }
      case 'remarks':
        // Allow empty spaces, default value, and actual values
        if (trimmedValue === '' || trimmedValue === 'Conforms to Std' || remarksOptions.includes(trimmedValue)) {
          // Valid: empty (spaces), default value, or found in options
        } else {
          return { isValid: false, message: `Remarks "${trimmedValue}" not found. Please select from available options, use "Conforms to Std", or use empty space.` };
        }
        break;
      case 'ad_cmts':
        // Additional comments are optional - always valid
        break;
      case 'quantity': {
        const qty = parseFloat(trimmedValue);
        if (isNaN(qty) || qty <= 0) {
          return { isValid: false, message: `Quantity must be a positive number.` };
        }
        break;
      }
    }
    
    return { isValid: true };
  };

  // Handle key press for field navigation
  const handleKeyPress = (fieldName: string, event: React.KeyboardEvent, currentValue?: string) => {
    if (event.key === 'Enter' || event.key === 'Tab') {
      event.preventDefault();
      let valueToUse = currentValue;
      if (!valueToUse && event.target) {
        const target = event.target as HTMLInputElement;
        valueToUse = target.value;
      }

      // Auto-complete: if user typed partial value, find first matching option
      if (valueToUse && fieldName === 'sysTag') {
        const partialValue = valueToUse.toLowerCase().trim();
        if (partialValue && !sysTagOptions.includes(valueToUse.trim())) {
          // Find first option that starts with or contains the partial value
          const matchingOption = sysTagOptions.find(option => 
            option.toLowerCase().startsWith(partialValue) || 
            option.toLowerCase().includes(partialValue)
          );
          if (matchingOption) {
            valueToUse = matchingOption;
            setFormData(prev => ({ ...prev, sysTag: matchingOption }));
          }
        }
      }

      const validation = validateFieldValue(fieldName, valueToUse || '');
      if (!validation.isValid) {
        // Show warning but allow navigation
        setError(validation.message || 'Invalid value');
        setValidationWarnings(prev => ({
          ...prev,
          [fieldName]: validation.message || 'Invalid value'
        }));
        // Still navigate to next field - don't block user
        setTimeout(() => {
          navigateToNextField(fieldName);
        }, 50);
      } else {
        // Clear error and warning for this field if validation passes
        setError(null);
        setValidationWarnings(prev => {
          const newWarnings = { ...prev };
          delete newWarnings[fieldName];
          return newWarnings;
        });
        setTimeout(() => {
          navigateToNextField(fieldName);
        }, 50);
      }
    }
  };

  // Check dimension segment and auto-set width for length-based products
  const checkDimensionSegment = async (newFinish?: string) => {
    const { form, grade, size } = formData;
    const finish = newFinish || formData.finish;
    
    // Only check if all four fields are filled
    if (!form || !grade || !size || !finish) {
      return;
    }

    try {
      console.log('Checking dimension segment for:', { form, grade, size, finish });
      
      const response = await servicesAPI.checkDimensionSegment({
        prm_frm: form,
        prm_grd: grade,
        prm_size: size,
        prm_fnsh: finish
      });

      if (response.data.success && response.data.isLengthBased) {
        console.log('Length-based product detected, setting width to 0.00');
        setFormData(prev => ({ ...prev, width: '0.00' }));
      }
    } catch (error) {
      console.error('Error checking dimension segment:', error);
    }
  };
  
  // Options state
  const [formOptions, setFormOptions] = useState<string[]>([]);
  const [typeOptions] = useState([
    { value: 'D', label: 'D - Drop' },
    { value: 'F', label: 'F - Finished' },
    { value: 'M', label: 'M - Master' },
    { value: 'R', label: 'R - Reject' },
    { value: 'S', label: 'S - Scrap' },
    { value: 'W', label: 'W - Work in Process' }
  ]);
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
  const [locationData, setLocationData] = useState<LocationData | null>(null);
  /** Incremented on form reset so form fields (e.g. Autocomplete) remount and clear internal state */
  const [formResetKey, setFormResetKey] = useState<number>(0);

  // Feet options: convert lengthOptions (inches) to feet. Inches options: show raw inch values from API (e.g. 120, 250, 72).
  const { lengthFeetOptions, lengthInchesOptions } = React.useMemo(() => {
    const feet = new Set<string>();
    const inchSet = new Set<string>();
    lengthOptions.forEach(opt => {
      const n = parseFloat(opt);
      if (!isNaN(n) && n >= 0) {
        feet.add(Math.floor(n / 12).toString());
        const inchStr = (opt.trim() || n.toFixed(4));
        inchSet.add(inchStr);
      }
    });
    const feetArr = ['', ...Array.from(feet).sort((a, b) => parseFloat(a) - parseFloat(b))];
    const inchesArr = ['', ...Array.from(inchSet).sort((a, b) => parseFloat(a) - parseFloat(b))];
    return { lengthFeetOptions: feetArr, lengthInchesOptions: inchesArr };
  }, [lengthOptions]);

  // Cache for heat options to avoid repeated API calls
  const heatCache = React.useRef<Map<string, string[]>>(new Map());
  const [sectionData, setSectionData] = useState<SectionData | null>(null);
  const [teamData, setTeamData] = useState<TeamData | null>(null);

  // Snackbar state
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: "",
    severity: "success" as "success" | "error",
  });

  // Function to reset form with proper defaults
  const resetFormWithDefaults = (transactionId?: number) => {
    const defaultRemarks = remarksOptions.length > 0 ? remarksOptions[0] : 'Conforms to Std';
    const defaultLocation = sectionData?.section_desc || '';
    
    setFormData({
      tag_id: transactionId || 0,
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
      remarks: defaultRemarks,
      ad_cmts: '',
      mill: '-',
      heat: '-',
      location: defaultLocation,
      pageNumber: '',
      serialNumber: ''
    });
    setFormResetKey(k => k + 1);
    setExtFinishSegments(['']);
    pendingExtFinishSplit.current = null;
    setAttachments([]);
  };

  const handleClearForm = () => {
    resetFormWithDefaults();
    setValidationWarnings({});
    setError(null);
  };

  // Function to refresh submitted transactions
  const refreshSubmittedTransactions = async () => {
    try {
      console.log('Refreshing transactions with params:', {
        team_id: team_id?.toString() || '',
        section_id: section_id?.toString() || ''
      });
      
      const response = await servicesAPI.getTransactions({
        team_id: team_id?.toString() || '',
        section_id: section_id?.toString() || ''
      });
      
      console.log('Refresh response:', response.data);
      setSubmittedData(response.data);
    } catch (error) {
      console.error('Error refreshing transactions:', error);
    }
  };

  // Fetch initial data
  useEffect(() => {

    // Fetch location data
    servicesAPI.getLocation(location_id?.toString() || '')
    .then(res => {
      console.log('Location data received:', res.data);
      setLocationData(res.data);
    })
    .catch(error => console.error('Error fetching location:', error));

    // Fetch section data
    servicesAPI.getSection(section_id?.toString() || '')
    .then(res => setSectionData(res.data))
    .catch(error => console.error('Error fetching section:', error));

    // Fetch team data
    servicesAPI.getTeam(team_id?.toString() || '')
    .then(res => setTeamData(res.data))
    .catch(error => console.error('Error fetching team:', error));
    const fetchInitialData = async () => {
      try {
        setLoading(prev => ({ ...prev, general: true }));
        

        // Fetch form options
        const formResponse = await servicesAPI.getForms(location_id?.toString() || '');
        if (formResponse.data.success) {
          setFormOptions(formResponse.data.data.map((item: any) => item.item_name));
        }

        // Fetch remarks options
        const remarksResponse = await servicesAPI.getRemarks();
        if (remarksResponse.data?.Data) {
          setRemarksOptions(remarksResponse.data.Data.map((r: any) => r.inq_desc15.trim() || "null"));
        }



        // Fetch transactions
        const transactionsResponse = await servicesAPI.getTransactions({ 
          team_id: team_id?.toString() || '', 
          section_id: section_id?.toString() || '' 
        });
        setSubmittedData(transactionsResponse.data);

      } catch (error) {
        console.error("Initial data fetch error:", error);
        setSnackbar({
          open: true,
          message: "Failed to load initial data",
          severity: "error",
        });
      } finally {
        setLoading(prev => ({ ...prev, general: false }));
      }
    };

    fetchInitialData();
  }, [location_id, section_id, team_id]);

  // Fetch location options when locationData is available
  useEffect(() => {
    const fetchLocationOptions = async () => {
      if (locationData?.warehouse) {
        try {
          setLoading(prev => ({ ...prev, location: true }));
          const locationResponse = await servicesAPI.getLocationsByWarehouse(locationData.warehouse);
          const responseData = locationResponse.data;
          if (responseData?.Data) {
            const locations = responseData.Data
              .map((loc: any) => loc.prd_loc)
              .filter((loc: any) => loc !== null && loc !== undefined) // Filter out null/undefined first
              .map((loc: any) => loc.trim()) // Then trim the valid values
              .filter((loc: any) => loc && loc !== 'null' && loc !== '') // Final filter for empty strings
              .sort(); // Sort alphabetically for better UX
            
            // Add section name to location options if it exists and is not already in the list
            if (sectionData?.section_desc) {
              const sectionName = sectionData.section_desc.trim();
              if (sectionName && !locations.includes(sectionName)) {
                locations.unshift(sectionName); // Add section name at the beginning
              }
            }
            
            setLocationOptions(locations);
            console.log('Fetched location options:', locations);
            console.log('Number of location options:', locations.length);
            console.log('First few options:', locations.slice(0, 5));
          } else {
            console.log('No Data property in response:', responseData);
          }
        } catch (error) {
          console.error('Error fetching location options:', error);
          setLocationOptions([]);
        } finally {
          setLoading(prev => ({ ...prev, location: false }));
        }
      }
    };

    fetchLocationOptions();
  }, [locationData?.warehouse, sectionData?.section_desc]);

  // Set default location value when section data is available
  useEffect(() => {
    if (sectionData?.section_desc && !formData.location) {
      setFormData(prev => ({ ...prev, location: sectionData.section_desc }));
    }
  }, [sectionData?.section_desc]);

  // Set default quality code (remarks) to first option when remarks options are loaded
  useEffect(() => {
    if (remarksOptions.length > 0 && formData.remarks === 'Conforms to Std') {
      const firstOption = remarksOptions[0];
      if (firstOption && firstOption.trim() !== '') {
        setFormData(prev => ({ ...prev, remarks: firstOption }));
      }
    }
  }, [remarksOptions]);

  // Fetch dependent options
  const fetchDependentOptions = async (
    endpoint: string,
    params: Record<string, string>,
    optionSetter: React.Dispatch<React.SetStateAction<string[]>>,
    loadingKey: string,
    fieldName?: string,
    formDataSetter?: React.Dispatch<React.SetStateAction<FormData>>,
    formFieldName?: keyof FormData
  ) => {
    try {
      setLoading(prev => ({ ...prev, [loadingKey]: true }));
      
      // Check cache for heat options
      if (endpoint.includes('/heat') && heatCache.current) {
        const cacheKey = JSON.stringify(params);
        const cachedOptions = heatCache.current.get(cacheKey);
        if (cachedOptions) {
          console.log('Using cached heat options');
          optionSetter(cachedOptions);
          setLoading(prev => ({ ...prev, [loadingKey]: false }));
          return;
        }
      }
      
      // Use servicesAPI instead of direct fetch
      let responseData;
      switch (endpoint) {
        case '/services/grade': {
          const gradeResponse = await servicesAPI.getGrade(params);
          responseData = gradeResponse.data;
          break;
        }

        case '/services/size': {
          const sizeResponse = await servicesAPI.getSize(params);
          responseData = sizeResponse.data;
          break;
        }
        case '/services/finish': {
          const finishResponse = await servicesAPI.getFinish(params);
          responseData = finishResponse.data;
          break;
        }
        case '/services/extfinish': {
          const extFinishResponse = await servicesAPI.getExtFinish(params);
          responseData = extFinishResponse.data;
          break;
        }
        case '/services/width': {
          const widthResponse = await servicesAPI.getWidth(params);
          responseData = widthResponse.data;
          break;
        }
        case '/services/length': {
          const lengthResponse = await servicesAPI.getLength(params);
          responseData = lengthResponse.data;
          break;
        }
        case '/services/sys-tag': {
          const sysTagResponse = await servicesAPI.getSysTag(params);
          responseData = sysTagResponse.data;
          break;
        }
        case '/services/mill': {
          const millResponse = await servicesAPI.getMill(params);
          responseData = millResponse.data;
          break;
        }
        case '/services/mill-by-heat': {
          const millResponse = await servicesAPI.getMillByHeat(params);
          responseData = millResponse.data;
          break;
        }
        case '/services/heat': {
          const heatResponse = await servicesAPI.getHeat(params);
          responseData = heatResponse.data;
          break;
        }
        default:
          throw new globalThis.Error(`Unknown endpoint: ${endpoint}`);
      }
      
      if (responseData?.Data) {
        const options = responseData.Data.map((item: Record<string, unknown>) => {
          const value = fieldName ? item[fieldName] : Object.values(item)[0];
          
          // Special handling for width field
          if (formFieldName === 'width') {
            const numValue = Number(value);
            return isNaN(numValue) ? ' ' : numValue.toFixed(4);
          }
          
          // Special handling for length field
          if (formFieldName === 'length') {
            const numValue = Number(value);
            return isNaN(numValue) ? ' ' : numValue.toFixed(4);
          }
          
          if (value === null || value === undefined || value === '') {
            return ' ';
          }
          
          return typeof value === 'string' ? value.trim() : String(value);
        });

        if (formFieldName === 'width' && formDataSetter) {
          const hasZeroOption = options.includes('0.00');
          if (hasZeroOption) {
            formDataSetter(prevData => ({
              ...prevData,
              [formFieldName]: '0.00'
            }));
          }
        }

        // Special handling for mill field - auto-select first value
        if (formFieldName === 'mill' && formDataSetter && options.length > 0) {
          const firstValidOption = options.find((opt: string) => opt && opt !== ' ' && opt !== 'null');
          if (firstValidOption) {
            formDataSetter(prevData => ({
              ...prevData,
              [formFieldName]: firstValidOption
            }));
          }
        }

        if (formFieldName !== 'width' && !options.includes(' ')) {
          options.unshift(' ');
        }

        // Cache heat options
        if (endpoint.includes('/heat') && heatCache.current) {
          const cacheKey = JSON.stringify(params);
          heatCache.current.set(cacheKey, options);
          console.log('Cached heat options for key:', cacheKey);
        }

        optionSetter(options);
      }
    } catch (error) {
      console.error(`Error fetching ${loadingKey} options:`, error);
      optionSetter([]);
    } finally {
      setLoading(prev => ({ ...prev, [loadingKey]: false }));
    }
  };

  // Effect for grade options
  useEffect(() => {
    if (formData.form) {
      fetchDependentOptions(
        "/services/grade",
        { form: formData.form },
        setGradeOptions,
        "grade"
      );
    } else {
      setGradeOptions([]);
    }
  }, [formData.form]);



  // Effect for size options
  useEffect(() => {
    if (formData.form && formData.grade) {
      fetchDependentOptions(
        "/services/size",
        { form: formData.form, grade: formData.grade },
        setSizeOptions,
        "size"
      );
    } else {
      setSizeOptions([]);
    }
  }, [formData.form, formData.grade]);

  // Effect for finish options
  useEffect(() => {
    if (formData.form && formData.grade && formData.size) {
      fetchDependentOptions(
        "/services/finish",
        { form: formData.form, grade: formData.grade, size: formData.size },
        setFinishOptions,
        "finish"
      );
    } else {
      setFinishOptions([]);
    }
  }, [formData.form, formData.grade, formData.size]);

  // Effect for extended finish options
  useEffect(() => {
    if (formData.form && formData.grade && formData.size && formData.finish) {
      fetchDependentOptions(
        "/services/extfinish",
        { 
          form: formData.form, 
          grade: formData.grade, 
          size: formData.size, 
          finish: formData.finish 
        },
        setExtfinishOptions,
        "extFinish"
      );
    } else {
      setExtfinishOptions([]);
    }
  }, [formData.form, formData.grade, formData.size, formData.finish]);

  // Keep formData.extendedFinish in sync with segment inputs
  useEffect(() => {
    const combined = joinExtFinishSegments(extFinishSegments);
    setFormData((prev) => (prev.extendedFinish !== combined ? { ...prev, extendedFinish: combined } : prev));
  }, [extFinishSegments]);

  // Split a loaded combined ext-finish into segments once system options are available
  useEffect(() => {
    if (!pendingExtFinishSplit.current || extfinishOptions.length === 0) return;
    const value = pendingExtFinishSplit.current;
    pendingExtFinishSplit.current = null;
    setExtFinishSegments(splitExtFinishIntoSegments(value, extfinishOptions));
  }, [extfinishOptions]);

  // Validate extended-finish segment order against intprd_rec values
  useEffect(() => {
    const hasProduct = formData.form && formData.grade && formData.size && formData.finish;
    const hasSegments = extFinishSegments.some((s) => s.trim());
    if (!hasProduct || !hasSegments || loading.extFinish) {
      setValidationWarnings((prev) => {
        if (!prev.extendedFinish) return prev;
        const next = { ...prev };
        delete next.extendedFinish;
        return next;
      });
      return;
    }

    const validation = validateExtFinishOrder(extFinishSegments, extfinishOptions);
    setValidationWarnings((prev) => {
      if (validation.isValid) {
        if (!prev.extendedFinish) return prev;
        const next = { ...prev };
        delete next.extendedFinish;
        return next;
      }
      return { ...prev, extendedFinish: validation.message || "Invalid extended finish" };
    });
  }, [extFinishSegments, extfinishOptions, formData.form, formData.grade, formData.size, formData.finish, loading.extFinish]);

  // ---- Attachment dialog: cascading option fetches (form → grade → size → finish → ext finish) ----
  const loadAttachmentOptions = async (
    fetcher: () => Promise<{ data?: { Data?: Record<string, unknown>[] } }>,
    setter: React.Dispatch<React.SetStateAction<string[]>>,
    key: 'grade' | 'size' | 'finish' | 'extFinish'
  ) => {
    setAttLoading(prev => ({ ...prev, [key]: true }));
    try {
      const res = await fetcher();
      const rows = res.data?.Data ?? [];
      const options = rows
        .map((item) => {
          const value = Object.values(item)[0];
          if (value === null || value === undefined || value === '') return ' ';
          return typeof value === 'string' ? value.trim() : String(value);
        })
        .filter((v, i, arr) => arr.indexOf(v) === i);
      setter(options);
    } catch (err) {
      console.error(`Error fetching attachment ${key} options:`, err);
      setter([]);
    } finally {
      setAttLoading(prev => ({ ...prev, [key]: false }));
    }
  };

  useEffect(() => {
    if (attachmentDialogOpen && attachmentForm.form) {
      loadAttachmentOptions(() => servicesAPI.getGrade({ form: attachmentForm.form }), setAttGradeOptions, 'grade');
    } else {
      setAttGradeOptions([]);
    }
  }, [attachmentDialogOpen, attachmentForm.form]);

  useEffect(() => {
    if (attachmentDialogOpen && attachmentForm.form && attachmentForm.grade) {
      loadAttachmentOptions(
        () => servicesAPI.getSize({ form: attachmentForm.form, grade: attachmentForm.grade }),
        setAttSizeOptions,
        'size'
      );
    } else {
      setAttSizeOptions([]);
    }
  }, [attachmentDialogOpen, attachmentForm.form, attachmentForm.grade]);

  useEffect(() => {
    if (attachmentDialogOpen && attachmentForm.form && attachmentForm.grade && attachmentForm.size) {
      loadAttachmentOptions(
        () => servicesAPI.getFinish({ form: attachmentForm.form, grade: attachmentForm.grade, size: attachmentForm.size }),
        setAttFinishOptions,
        'finish'
      );
    } else {
      setAttFinishOptions([]);
    }
  }, [attachmentDialogOpen, attachmentForm.form, attachmentForm.grade, attachmentForm.size]);

  useEffect(() => {
    if (attachmentDialogOpen && attachmentForm.form && attachmentForm.grade && attachmentForm.size && attachmentForm.finish) {
      loadAttachmentOptions(
        () => servicesAPI.getExtFinish({
          form: attachmentForm.form,
          grade: attachmentForm.grade,
          size: attachmentForm.size,
          finish: attachmentForm.finish,
        }),
        setAttExtFinishOptions,
        'extFinish'
      );
    } else {
      setAttExtFinishOptions([]);
    }
  }, [attachmentDialogOpen, attachmentForm.form, attachmentForm.grade, attachmentForm.size, attachmentForm.finish]);

  // Changing a parent field clears its dependent fields (same cascade as the main form)
  const handleAttachmentFieldChange = (field: 'form' | 'grade' | 'size' | 'finish', value: string) => {
    setAttachmentForm(prev => {
      const next = { ...prev, [field]: value };
      if (field === 'form') { next.grade = ''; next.size = ''; next.finish = ''; next.extFinishes = []; }
      if (field === 'grade') { next.size = ''; next.finish = ''; next.extFinishes = []; }
      if (field === 'size') { next.finish = ''; next.extFinishes = []; }
      if (field === 'finish') { next.extFinishes = []; }
      return next;
    });
  };

  const attachmentQty = parseFloat(attachmentForm.quantity);
  const canAddAttachment =
    !!attachmentForm.form &&
    !!attachmentForm.grade &&
    !!attachmentForm.size &&
    !!attachmentForm.finish &&
    !isNaN(attachmentQty) &&
    attachmentQty > 0;

  const handleOpenAttachmentDialog = () => {
    setAttachmentForm(emptyAttachmentForm);
    setAttachmentDialogOpen(true);
  };

  const handleCloseAttachmentDialog = () => {
    setAttachmentDialogOpen(false);
    setAttachmentForm(emptyAttachmentForm);
  };

  const handleAddAttachment = () => {
    if (!canAddAttachment) return;
    setAttachments(prev => [
      ...prev,
      {
        form: attachmentForm.form,
        grade: attachmentForm.grade,
        size: attachmentForm.size,
        finish: attachmentForm.finish,
        extFinishes: [...attachmentForm.extFinishes],
        quantity: attachmentQty,
      },
    ]);
    handleCloseAttachmentDialog();
  };

  const handleRemoveAttachment = (index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  };

  // Effect for width options
  useEffect(() => {
    if (formData.form && formData.grade && formData.size && formData.finish && formData.extendedFinish) {
      fetchDependentOptions(
        "/services/width",
        { 
          form: formData.form,
          grade: formData.grade,
          size: formData.size,
          finish: formData.finish,
          extfinish: formData.extendedFinish
        },
        setWidthOptions,
        "width",
        "prd_wdth", // fieldName - API returns prd_wdth field
        setFormData, // formDataSetter
        "width" // formFieldName
      );
    } else {
      setWidthOptions([]);
    }
  }, [formData.form, formData.grade, formData.size, formData.finish, formData.extendedFinish]);

  // Effect for length options
  useEffect(() => {
    if (formData.form && formData.grade && formData.size && formData.finish && formData.extendedFinish && formData.width) {
      fetchDependentOptions(
        "/services/length",
        { 
          form: formData.form,
          grade: formData.grade,
          size: formData.size,
          finish: formData.finish,
          extfinish: formData.extendedFinish,
          width: formData.width
        },
        setLengthOptions,
        "length"
      );
    } else {
      setLengthOptions([]);
    }
  }, [formData.form, formData.grade, formData.size, formData.finish, formData.extendedFinish, formData.width]);

  // Effect for system tag options
  useEffect(() => {
    if (formData.form && formData.grade && formData.size && formData.finish && formData.extendedFinish && formData.width && formData.length) {
      fetchDependentOptions(
        "/services/sys-tag",
        { 
          form: formData.form,
          grade: formData.grade,
          size: formData.size,
          finish: formData.finish,
          extfinish: formData.extendedFinish,
          width: formData.width,
          length: formData.length
        },
        setSysTagOptions,
        "sysTag",
        "prd_tag_no" // fieldName - API returns prd_tag_no field
      );
    } else {
      setSysTagOptions([]);
    }
  }, [formData.form, formData.grade, formData.size, formData.finish, formData.extendedFinish, formData.width, formData.length]);

  // Effect for heat options (now comes first)
  useEffect(() => {
    if (formData.form && formData.grade && formData.size && formData.finish && formData.extendedFinish && formData.width && formData.length) {
      // Add debouncing to prevent excessive API calls
      const timeoutId = setTimeout(() => {
        fetchDependentOptions(
          "/services/heat",
          { 
            form: formData.form // Only send form parameter as required by backend
          },
          setHeatOptions,
          "heat"
        );
      }, 300); // 300ms debounce

      return () => clearTimeout(timeoutId);
    } else {
      setHeatOptions([]);
    }
    
    // Always set mill to default value when other fields change
    setFormData(prev => ({ ...prev, mill: '-' }));
  }, [formData.form, formData.grade, formData.size, formData.finish, formData.extendedFinish, formData.width, formData.length]);

  // Effect for mill options (now populated based on heat)
  useEffect(() => {
    if (formData.heat && location_id) {
      fetchDependentOptions(
        "/services/mill-by-heat",
        { 
          heat: formData.heat,
          location_id: location_id
        },
        setMillOptions,
        "mill",
        "het_mill", // fieldName
        setFormData, // formDataSetter
        "mill" // formFieldName
      );
    } else {
      setMillOptions([]);
      // Clear mill field when heat is empty, but preserve default value
      setFormData(prev => ({ ...prev, mill: '-' }));
    }
  }, [formData.heat, location_id]);

  // Update total length (inches) when feet or inches change
  const applyLengthFromFeetInches = (feet: string, inches: string) => {
    if ((feet ?? '').trim() === '' && (inches ?? '').trim() === '') return '';
    const f = parseFloat(feet || '0');
    const i = parseFloat(inches || '0');
    const totalInches = (isNaN(f) ? 0 : f * 12) + (isNaN(i) ? 0 : i);
    return totalInches.toFixed(4);
  };

  // Helper function to validate and clear warnings when field changes
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
        next.length = applyLengthFromFeetInches(feet, inches);
      }
      return next;
    });
    
    // Validate the new value and clear warning if valid
    const validation = validateFieldValue(fieldName, value);
    if (validation.isValid) {
      setValidationWarnings(prev => {
        const newWarnings = { ...prev };
        delete newWarnings[fieldName];
        return newWarnings;
      });
      // Clear error if it was for this field
      if (error && error.includes(fieldName)) {
        setError(null);
      }
    }
  };

  // Form handlers
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    const processedValue = name === "quantity" ? Number(value) : value;
    handleFieldChange(name, String(processedValue));
  };

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

    // Treat 0 as a real length; only skip when length is absent from the API
    const rawLen = data.length;
    const hasLength =
      rawLen !== null &&
      rawLen !== undefined &&
      String(rawLen).trim() !== '';
    const totalInches = hasLength ? parseFloat(String(rawLen)) : NaN;
    const lengthFields =
      Number.isFinite(totalInches)
        ? (() => {
            const lenStr = totalInches.toFixed(4);
            const lenFeet = Math.floor(totalInches / 12).toString();
            const lenInches = (totalInches % 12).toFixed(4).replace(/\.?0+$/, '') || '0';
            return { length: lenStr, lengthFeet: lenFeet, lengthInches: lenInches };
          })()
        : null;

    setFormData(prev => ({
      ...prev,
      form: data.form ?? prev.form,
      grade: data.grade ?? prev.grade,
      size: data.size ?? prev.size,
      finish: finishVal !== '' ? finishVal : ' ',
      extendedFinish: extFinishVal !== '' ? extFinishVal : ' ',
      width: widthStr || prev.width,
      ...(lengthFields
        ? {
            length: lengthFields.length,
            lengthFeet: lengthFields.lengthFeet,
            lengthInches: lengthFields.lengthInches,
          }
        : {}),
      mill: data.mill ?? prev.mill,
      heat: data.heat ?? prev.heat,
      location: data.location ?? prev.location,
      type: (data.type ?? data.inventory_type ?? prev.type) || prev.type,
      remarks: (data.quality ?? prev.remarks) || prev.remarks
    }));
  };

  const fetchBySystemTagNo = async () => {
    const tag = formData.sysTag.trim();
    if (!tag) {
      setSnackbar({ open: true, message: 'Please enter System Tag No', severity: 'error' });
      return;
    }
    setLoading(prev => ({ ...prev, tagFetch: true }));
    try {
      const response = await servicesAPI.getProductByTag(tag);
      if (response.data?.multiple && response.data?.Records?.length) {
        setTagRecordsList(response.data.Records);
        setTagRecordsDialogOpen(true);
        setSnackbar({ open: true, message: `Multiple records found. Please select one.`, severity: 'success' });
        return;
      }
      const data = response.data?.Data;
      if (!data) {
        setSnackbar({
          open: true,
          message: response.data?.message || 'No record found for this tag number',
          severity: 'error'
        });
        return;
      }
      applyTagRecordToForm(data);
      setSnackbar({ open: true, message: 'Fields populated from System Tag No', severity: 'success' });
    } catch (err) {
      console.error('Fetch by tag error:', err);
      const errMsg = (err as { response?: { data?: { error?: string; message?: string } } })?.response?.data?.error
        || (err as { response?: { data?: { message?: string } } })?.response?.data?.message
        || 'Failed to fetch by tag';
      setSnackbar({ open: true, message: errMsg, severity: 'error' });
    } finally {
      setLoading(prev => ({ ...prev, tagFetch: false }));
    }
  };

  const handleSelectTagRecord = (record: TagRecord) => {
    applyTagRecordToForm(record);
    setTagRecordsDialogOpen(false);
    setTagRecordsList([]);
    setSnackbar({ open: true, message: 'Fields populated from selected record', severity: 'success' });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const selectedRole = localStorage.getItem('Selected Role');
  
    // Validation

    const requiredFields = [
      { field: formData.form, name: "Form" },
      { field: formData.grade, name: "Grade" },
      { field: formData.size, name: "Size" },
      { field: formData.finish, name: "Finish" },
      { field: formData.mill, name: "Mill" },
    ];

    const missingField = requiredFields.find(f => !f.field);
    if (missingField) {
      setSnackbar({
        open: true,
        message: `Please fill required field: ${missingField.name}`,
        severity: "error"
      });
      return;
    }

    if (formData.countType === 'bundle' && formData.bundles.length === 0) {
      setSnackbar({
        open: true,
        message: "Please add at least one bundle",
        severity: "error"
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const payload = {
        tag_id: 0, // Will be set to transaction_id after creation
        form: formData.form,
        type: formData.type,
        grade: formData.grade,
        size: formData.size,
        finish: formData.finish || null,
        ext_finish: formData.extendedFinish || null,
        width: formData.width ? parseFloat(formData.width) : null,
        length: Number.isFinite(parseFloat(String(formData.length)))
          ? parseFloat(String(formData.length)) / 12
          : null,
        sys_tag_no: formData.sysTag || null,
        mill: formData.mill || '-',
        heat: formData.heat || null,
        location: formData.location || null,
        remarks: formData.remarks && formData.remarks.trim() !== '' && formData.remarks !== 'Conforms to Std' ? formData.remarks : 'Conforms to Std',
        ad_cmts: formData.ad_cmts || null,
        page_number: formData.pageNumber || null,
        serial_number: formData.serialNumber || null,
        count_type: formData.countType,
        qty: formData.quantity,
        counted_by: parseInt(user_id || "0"),
        team_id: parseInt(team_id || "0"),
        location_id: parseInt(location_id || "0"),
        section_id: parseInt(section_id || "0"),
        role: selectedRole,
        bundles: formData.countType === COUNT_TYPES.BUNDLES ? 
          formData.bundles.map(b => ({
            ...b,
            tag_id: 0 // Will be updated after transaction creation
          })) : 
          undefined
      };

      // Save the transaction
      const response = await servicesAPI.createTransaction(payload);

      if (!response.data.success) {
        const errorMessage = response.data.message || 'Failed to save transaction';
        throw { message: errorMessage };
      }

      // Get the transaction_id from the response and use it as tag_id
      const transactionId = response.data.transaction_id || response.data.id;
      
      // Update the tag_id in the database to match transaction_id
      if (transactionId) {
        try {
          await servicesAPI.updateTransactionTagId(transactionId, transactionId);
        } catch (error) {
          console.error('Error updating tag_id:', error);
        }
      }

      // Submit attachments as their own transactions so the reconciler
      // treats the main product and each attachment as separate items
      let attachmentFailures = 0;
      for (const att of attachments) {
        try {
          const attPayload = {
            tag_id: 0,
            form: att.form,
            type: formData.type,
            grade: att.grade,
            size: att.size,
            finish: att.finish || null,
            ext_finish: att.extFinishes.join('') || null,
            width: null,
            length: null,
            sys_tag_no: null,
            mill: '-',
            heat: null,
            location: formData.location || null,
            remarks: 'Conforms to Std',
            ad_cmts: transactionId ? `Attachment of tag ${transactionId}` : 'Attachment',
            page_number: formData.pageNumber || null,
            serial_number: formData.serialNumber || null,
            count_type: 'pcs',
            qty: att.quantity,
            counted_by: parseInt(user_id || "0"),
            team_id: parseInt(team_id || "0"),
            location_id: parseInt(location_id || "0"),
            section_id: parseInt(section_id || "0"),
            role: selectedRole,
          };
          const attResponse = await servicesAPI.createTransaction(attPayload);
          const attId = attResponse.data.transaction_id || attResponse.data.id;
          if (attId) {
            try {
              await servicesAPI.updateTransactionTagId(attId, attId);
            } catch (err) {
              console.error('Error updating attachment tag_id:', err);
            }
          }
        } catch (err) {
          attachmentFailures++;
          console.error('Error saving attachment transaction:', err);
        }
      }

      // Show success message
      setSnackbar({
        open: true,
        message: attachmentFailures > 0
          ? `Transaction saved, but ${attachmentFailures} attachment(s) failed to save.`
          : attachments.length > 0
            ? `Transaction and ${attachments.length} attachment(s) saved successfully! Form reset.`
            : `Transaction saved successfully! Form reset.`,
        severity: attachmentFailures > 0 ? "error" : "success"
      });

      // Reset the form to initial state with proper defaults (clears System Tag No and all fields)
      resetFormWithDefaults(transactionId);

      // Clear validation warnings and errors after form reset
      setValidationWarnings({});
      setError(null);

      // Refresh the submitted transactions list
      await refreshSubmittedTransactions();

    } catch (error) {
      console.error('Transaction submission error:', error);
      
      let errorMessage = "Failed to save transaction";
      if (error && typeof error === 'object' && 'response' in error) {
        // If it's an Axios error, try to get the error message from the response
        const axiosError = error as { response?: { data?: { message?: string; error?: string }; statusText?: string } };
        errorMessage = axiosError.response?.data?.message || 
                      axiosError.response?.data?.error ||
                      axiosError.response?.statusText || 
                      'Network error occurred';
      } else if (error && typeof error === 'object' && 'message' in error) {
        errorMessage = (error as { message: string }).message;
      }

      setSnackbar({
        open: true,
        message: errorMessage,
        severity: "error"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Bundle handlers
  const handleAddBundle = () => {
    setFormData(prev => ({
      ...prev,
      bundles: [...prev.bundles, { num_of_bundle: 0, bundle_count: 0 }]
    }));
  };

  const handleBundleChange = (index: number, field: keyof Bundle, value: number) => {
    setFormData(prev => {
      const updatedBundles = [...prev.bundles];
      updatedBundles[index] = { ...updatedBundles[index], [field]: value, tag_id: prev.tag_id };
      return {
        ...prev,
        bundles: updatedBundles,
        quantity: updatedBundles.reduce((sum, bundle) => sum + (bundle.num_of_bundle * bundle.bundle_count), 0)
      };
    });
  };

  const handleDeleteBundle = (index: number) => {
    setFormData(prev => {
      const updatedBundles = [...prev.bundles];
      updatedBundles.splice(index, 1);
      return {
        ...prev,
        bundles: updatedBundles,
        quantity: updatedBundles.reduce((sum, bundle) => sum + (bundle.num_of_bundle * bundle.bundle_count), 0)
      };
    });
  };

  const handleCompleteLocation = async () => {
    try {
      await servicesAPI.completeAssignedLocation(location_id || '', section_id || '', {
        status: "Completed"
      });
      
      setSnackbar({
        open: true,
        message: "Location marked as completed!",
        severity: "success"
      });
    } catch (error) {
      console.error("Error updating location status:", error);
      setSnackbar({
        open: true,
        message: "Failed to complete location",
        severity: "error"
      });
    }
  };

  const handleCloseSnackbar = () => {
    setSnackbar(prev => ({ ...prev, open: false }));
  };

  const handleTabChange = (_: React.SyntheticEvent, newValue: number) => {
    const newCountType = newValue === 0 ? COUNT_TYPES.PIECES : COUNT_TYPES.BUNDLES;
    setFormData(prev => ({
      ...prev,
      countType: newCountType,
      quantity: 0,
      bundles: newCountType === COUNT_TYPES.BUNDLES ? [] : prev.bundles
    }));
  };

  return (
    <Box sx={{ p: 3, maxWidth: 1800, margin: '0 auto', background: alpha('#0088FE', 0.01), minHeight: '100vh' }}>
      {/* Header Section */}
      <Box sx={{ mb: 4 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
          <Box sx={{
            width: 56,
            height: 56,
            borderRadius: '16px',
            background: '#0088FE',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: `0 8px 24px ${alpha('#0088FE', 0.3)}`
          }}>
            <Inventory2 sx={{ fontSize: 32, color: 'white' }} />
          </Box>
          <Box>
            <Typography variant="h4" component="h1" sx={{ fontWeight: 800, color: '#0088FE', mb: 0.5 }}>
              Inventory Counting
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 500 }}>
              Record and manage inventory items efficiently
            </Typography>
          </Box>
        </Box>
        <Box sx={{ 
          display: 'flex', 
          gap: 2, 
          flexWrap: 'wrap',
          p: 2,
          borderRadius: '12px',
          background: alpha('#0088FE', 0.05),
          border: `1px solid ${alpha('#0088FE', 0.1)}`
        }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <LocationOn sx={{ fontSize: 18, color: '#0088FE' }} />
            <Typography variant="body2" sx={{ fontWeight: 600 }}>
              Location: <span style={{ color: '#0088FE' }}>{locationData?.location_desc || 'Loading...'}</span>
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Description sx={{ fontSize: 18, color: '#0088FE' }} />
            <Typography variant="body2" sx={{ fontWeight: 600 }}>
              Section: <span style={{ color: '#0088FE' }}>{sectionData?.section_desc || 'Loading...'}</span>
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Category sx={{ fontSize: 18, color: '#0088FE' }} />
            <Typography variant="body2" sx={{ fontWeight: 600 }}>
              Team: <span style={{ color: '#0088FE' }}>{teamData?.team_name || 'Loading...'}</span>
            </Typography>
          </Box>
        </Box>
      </Box>

      {loading.general && <LinearProgress sx={{ mb: 2, borderRadius: '10px', height: 6 }} color="primary" />}

      {/* Main Form */}
      <StyledCard sx={{ mb: 4 }}>
        <SectionHeader>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Inventory2 sx={{ color: '#0088FE', fontSize: 24 }} />
            <Typography variant="h6" sx={{ fontWeight: 700, color: '#0088FE' }}>
              Item Details
            </Typography>
          </Box>
          <Button
            variant="outlined"
            size="small"
            onClick={handleClearForm}
            startIcon={<ClearAll />}
            sx={{
              borderRadius: '8px',
              borderColor: '#0088FE',
              color: '#0088FE',
              '&:hover': {
                borderColor: '#0066CC',
                background: alpha('#0088FE', 0.08)
              }
            }}
          >
            Clear form
          </Button>
        </SectionHeader>
        <CardContent sx={{ pt: 0 }}>
          {error && (
            <Alert severity="warning" sx={{ mb: 2 }} onClose={() => setError(null)}>
              <Typography variant="body2" sx={{ fontWeight: 500 }}>
                {error}
              </Typography>
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
              {/* System Tag No Field - enter tag and click Fetch to populate fields */}
              <Grid item xs={12}>
                <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-start' }}>
                  <Autocomplete
                    freeSolo
                    options={sysTagOptions}
                    value={formData.sysTag}
                    onChange={(_, value) => {
                      handleFieldChange('sysTag', value ?? '');
                    }}
                    onInputChange={(_, value) => {
                      handleFieldChange('sysTag', value ?? '');
                    }}
                    loading={loading.sysTag}
                    sx={{ flex: 1 }}
                    renderInput={(params) => (
                      <TextField
                        {...params}
                        label="System Tag No"
                        fullWidth
                        placeholder="Enter tag number and click Fetch to fill fields"
                        inputRef={(input) => {
                          fieldRefs.current.sysTag = input;
                        }}
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

              {/* Form Field */}
              <Grid item xs={12} sm={6}>
                <Autocomplete
                  freeSolo
                  options={formOptions}
                  value={formData.form}
                  onChange={(_, value) => {
                    handleFieldChange('form', value || '');
                  }}
                  loading={loading.form}
                  renderInput={(params) => (
                    <StyledTextField
                      {...params}
                      label="Form"
                      fullWidth
                      inputRef={(input) => {
                        fieldRefs.current.form = input;
                      }}
                      onKeyDown={(e) => handleKeyPress('form', e, formData.form)}
                      InputProps={{
                        ...params.InputProps,
                        startAdornment: (
                          <InputAdornment position="start">
                            <Description sx={{ color: '#0088FE', fontSize: 20 }} />
                          </InputAdornment>
                        ),
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

              {/* Grade Field */}
              <Grid item xs={12} sm={6}>
                <Autocomplete
                  freeSolo
                  options={gradeOptions}
                  value={formData.grade}
                  onChange={(_, value) => {
                    handleFieldChange('grade', value || '');
                  }}
                  loading={loading.grade}
                  renderInput={(params) => (
                    <StyledTextField
                      {...params}
                      label="Grade"
                      fullWidth
                      inputRef={(input) => {
                        fieldRefs.current.grade = input;
                      }}
                      onKeyDown={(e) => handleKeyPress('grade', e, formData.grade)}
                      InputProps={{
                        ...params.InputProps,
                        startAdornment: (
                          <InputAdornment position="start">
                            <Category sx={{ color: '#0088FE', fontSize: 20 }} />
                          </InputAdornment>
                        ),
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

              {/* Size Field */}
              <Grid item xs={12} sm={6}>
                <Autocomplete
                  freeSolo
                  options={sizeOptions}
                  value={formData.size}
                  onChange={(_, value) => {
                    handleFieldChange('size', value || '');
                  }}
                  loading={loading.size}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label="Size"
                      fullWidth
                      inputRef={(input) => {
                        fieldRefs.current.size = input;
                      }}
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

              {/* Finish Field */}
              <Grid item xs={12} sm={6}>
                <Autocomplete
                  freeSolo
                  options={finishOptions}
                  value={formData.finish}
                  onChange={async (_, value) => {
                    const newFinish = value || '';
                    handleFieldChange('finish', newFinish);
                    // Check dimension segment with the new finish value
                    checkDimensionSegment(newFinish);
                  }}
                  loading={loading.finish}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label="Finish"
                      fullWidth
                      inputRef={(input) => {
                        fieldRefs.current.finish = input;
                      }}
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

              {/* Extended Finish Field — multiple values combine (DCF + RFD + OPT → DCFRFDOPT); + adds an attachment item */}
              <Grid item xs={12} sm={6}>
                <Box>
                  {formData.extendedFinish ? (
                    <Typography variant="caption" color="text.secondary" sx={{ mb: 0.5, display: 'block' }}>
                      Combined: {formData.extendedFinish}
                    </Typography>
                  ) : null}
                  <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 0.5 }}>
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
                      sx={{ flex: 1 }}
                      renderTags={(value, getTagProps) =>
                        value.map((option, index) => (
                          <Chip
                            label={option}
                            size="small"
                            {...getTagProps({ index })}
                            key={`${option}-${index}`}
                          />
                        ))
                      }
                      renderInput={(params) => (
                        <TextField
                          {...params}
                          label="Extended Finish"
                          fullWidth
                          error={!!validationWarnings.extendedFinish}
                          helperText={validationWarnings.extendedFinish}
                          inputRef={(input) => {
                            fieldRefs.current.extendedFinish = input;
                          }}
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
                    <Tooltip title="Add attachment item (reconciled separately)">
                      <IconButton
                        color="primary"
                        onClick={handleOpenAttachmentDialog}
                        sx={{
                          mt: 1,
                          border: '1px solid',
                          borderColor: 'primary.main',
                          borderRadius: 2,
                        }}
                        aria-label="Add attachment item"
                      >
                        <Add />
                      </IconButton>
                    </Tooltip>
                  </Box>
                  {attachments.length > 0 && (
                    <Box sx={{ mt: 1 }}>
                      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
                        Attachments (reconciled separately):
                      </Typography>
                      <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
                        {attachments.map((att, index) => (
                          <Chip
                            key={`attachment-${index}`}
                            label={`${att.form} ${att.grade} ${att.size} ${att.finish}${att.extFinishes.length ? ' ' + att.extFinishes.join('') : ''} × ${att.quantity}`}
                            onDelete={() => handleRemoveAttachment(index)}
                            size="small"
                            sx={{
                              bgcolor: (theme) => alpha(theme.palette.primary.main, 0.14),
                              color: 'primary.dark',
                              border: '1px solid',
                              borderColor: (theme) => alpha(theme.palette.primary.main, 0.4),
                              fontWeight: 600,
                              '& .MuiChip-label': { color: 'primary.dark' },
                              '& .MuiChip-deleteIcon': {
                                color: 'primary.main',
                                '&:hover': { color: 'error.main' },
                              },
                            }}
                          />
                        ))}
                      </Stack>
                    </Box>
                  )}
                </Box>
              </Grid>

              {/* Width Field */}
              <Grid item xs={12} sm={6}>
                <Autocomplete
                  freeSolo
                  options={widthOptions}
                  value={formData.width !== '' ? Number(formData.width).toFixed(4) : ''}
                  onChange={(_, value) => {
                    const formattedValue = value !== null && value !== '' ? Number(value).toFixed(4) : '';
                    handleFieldChange('width', formattedValue);
                  }}
                  loading={loading.width}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label="Width"
                      fullWidth
                      inputRef={(input) => {
                        fieldRefs.current.width = input;
                      }}
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

              {/* Length: Feet and Inches (stored as total feet in backend) */}
              <Grid item xs={12} sm={3}>
                <Autocomplete
                  freeSolo
                  options={lengthFeetOptions}
                  value={formData.lengthFeet}
                  onChange={(_, value) => handleFieldChange('lengthFeet', value ?? '')}
                  onInputChange={(_, value) => {
                    const parsed = parseFeetInches(value);
                    if (parsed) {
                      const feet = Math.floor(parsed.inches / 12).toString();
                      const inches = (parsed.inches % 12).toFixed(4).replace(/\.?0+$/, '');
                      setFormData(prev => ({
                        ...prev,
                        lengthFeet: feet,
                        lengthInches: inches,
                        length: parsed.inches.toFixed(4)
                      }));
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
                    if (val !== '' && !isNaN(num) && num >= 12) {
                      const totalInches = num;
                      const feet = Math.floor(totalInches / 12).toString();
                      const inchesRem = (totalInches % 12).toFixed(4).replace(/\.?0+$/, '') || '0';
                      setFormData(prev => ({
                        ...prev,
                        lengthFeet: feet,
                        lengthInches: inchesRem,
                        length: totalInches.toFixed(4)
                      }));
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

              {/* Heat Field */}
              <Grid item xs={12} sm={6}>
                <Autocomplete
                  freeSolo
                  options={heatOptions}
                  value={formData.heat || (heatOptions.length ? heatOptions[1] : '')}
                  onChange={(_, value) => {
                    handleFieldChange('heat', value || '');
                  }}
                  loading={loading.heat}
                  filterOptions={(options, { inputValue }) => {
                    // Filter options based on user input for better performance with large datasets
                    if (!inputValue) return options.slice(0, 100); // Show first 100 when no input
                    return options
                      .filter(option => 
                        option.toLowerCase().includes(inputValue.toLowerCase())
                      )
                      .slice(0, 50); // Limit filtered results to 50
                  }}
                  renderInput={(params) => (
                    <StyledTextField
                      {...params}
                      label="Heat"
                      fullWidth
                      placeholder="Type to search heat values..."
                      inputRef={(input) => {
                        fieldRefs.current.heat = input;
                      }}
                      onKeyDown={(e) => handleKeyPress('heat', e, formData.heat)}
                      InputProps={{
                        ...params.InputProps,
                        startAdornment: (
                          <InputAdornment position="start">
                            <LocalFireDepartment sx={{ color: '#0088FE', fontSize: 20 }} />
                          </InputAdornment>
                        ),
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

              {/* Mill Field */}
              <Grid item xs={12} sm={6}>
                <Autocomplete
                  freeSolo
                  options={millOptions}
                  value={formData.mill || '-'}
                  onChange={(_, value) => {
                    handleFieldChange('mill', value || '-');
                  }}
                  loading={loading.mill}
                  renderInput={(params) => (
                    <StyledTextField
                      {...params}
                      label="Mill"
                      fullWidth
                      placeholder="-"
                      inputRef={(input) => {
                        fieldRefs.current.mill = input;
                      }}
                      onKeyDown={(e) => handleKeyPress('mill', e, formData.mill)}
                      InputProps={{
                        ...params.InputProps,
                        startAdornment: (
                          <InputAdornment position="start">
                            <Factory sx={{ color: '#0088FE', fontSize: 20 }} />
                          </InputAdornment>
                        ),
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

              {/* Location Field */}
              <Grid item xs={12} sm={6}>
                <Autocomplete
                  freeSolo
                  options={locationOptions}
                  value={formData.location}
                  onChange={(_, value) => {
                    console.log('Location selected:', value);
                    handleFieldChange('location', value || '');
                  }}
                  onInputChange={(_, value) => {
                    // Handle when user types a custom value
                    if (value !== null) {
                      handleFieldChange('location', value);
                    }
                  }}
                  loading={loading.location}
                  onOpen={() => console.log('Autocomplete opened, options:', locationOptions)}
                  onClose={() => console.log('Autocomplete closed')}
                  filterOptions={(options, { inputValue }) => {
                    if (!inputValue) return options.slice(0, 50); // Show first 50 when no input
                    return options
                      .filter(option => 
                        option.toLowerCase().includes(inputValue.toLowerCase())
                      )
                      .slice(0, 50); // Limit filtered results
                  }}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label="Location"
                      fullWidth
                      placeholder="Select location..."
                      inputRef={(input) => {
                        fieldRefs.current.location = input;
                      }}
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

              {/* Type Field */}
              <Grid item xs={12} sm={6}>
                <Autocomplete
                  freeSolo
                  options={typeOptions}
                  getOptionLabel={(option) => typeof option === 'string' ? option : option.label}
                  value={typeOptions.find(option => option.value === formData.type) || null}
                  onChange={(_, value) => {
                    let typeValue = 'M';
                    if (value && typeof value === 'object' && 'value' in value) {
                      typeValue = value.value;
                    } else if (typeof value === 'string') {
                      typeValue = value;
                    }
                    handleFieldChange('type', typeValue);
                  }}
                  onInputChange={(_, value) => {
                    // Handle when user types a custom value
                    if (value !== null) {
                      // Check if it's a label format (e.g., "M - Master")
                      const foundOption = typeOptions.find(option => option.label === value);
                      if (foundOption) {
                        handleFieldChange('type', foundOption.value);
                      } else {
                        // Check if it's a value format (e.g., "M")
                        const foundByValue = typeOptions.find(option => option.value === value);
                        if (foundByValue) {
                          handleFieldChange('type', foundByValue.value);
                        } else {
                          // Store the typed value as-is for validation
                          handleFieldChange('type', value);
                        }
                      }
                    }
                  }}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label="Type"
                      fullWidth
                      inputRef={(input) => {
                        fieldRefs.current.type = input;
                      }}
                      onKeyDown={(e) => handleKeyPress('type', e, formData.type)}
                    />
                  )}
                />
              </Grid>

              {/* Remarks Field */}
              <Grid item xs={12} sm={6}>
                <Autocomplete
                  freeSolo
                  options={remarksOptions}
                  value={formData.remarks || 'Conforms to Std'}
                  onChange={(_, value) => {
                    handleFieldChange('remarks', value || 'Conforms to Std');
                  }}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label="Quality Code"
                      fullWidth
                      inputRef={(input) => {
                        fieldRefs.current.remarks = input;
                      }}
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
                onChange={(e) => {
                  handleFieldChange('ad_cmts', e.target.value);
                }}
                inputRef={(input) => {
                  fieldRefs.current.ad_cmts = input;
                }}
                onKeyDown={(e) => handleKeyPress('ad_cmts', e, formData.ad_cmts)}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Comment sx={{ color: '#0088FE', fontSize: 20 }} />
                    </InputAdornment>
                  ),
                }}
              />
              </Grid>

              {/* Page Number Field */}
              <Grid item xs={12} sm={6}>
                <StyledTextField
                  label="Page Number"
                  fullWidth
                  value={formData.pageNumber}
                  onChange={(e) => {
                    handleFieldChange('pageNumber', e.target.value);
                  }}
                  inputRef={(input) => {
                    fieldRefs.current.pageNumber = input;
                  }}
                  onKeyDown={(e) => handleKeyPress('pageNumber', e, formData.pageNumber)}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <Description sx={{ color: '#0088FE', fontSize: 20 }} />
                      </InputAdornment>
                    ),
                  }}
                />
              </Grid>

              {/* Count Line Number Field */}
              <Grid item xs={12} sm={6}>
                <StyledTextField
                  label="Count Line Number"
                  fullWidth
                  value={formData.serialNumber}
                  onChange={(e) => {
                    handleFieldChange('serialNumber', e.target.value);
                  }}
                  inputRef={(input) => {
                    fieldRefs.current.serialNumber = input;
                  }}
                  onKeyDown={(e) => handleKeyPress('serialNumber', e, formData.serialNumber)}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <Tag sx={{ color: '#0088FE', fontSize: 20 }} />
                      </InputAdornment>
                    ),
                  }}
                />
              </Grid>

              {/* Count Type Selection */}
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
                      '& .MuiTab-root': {
                        borderRadius: '12px',
                        fontWeight: 600,
                        '&.Mui-selected': {
                          color: '#0088FE',
                        }
                      },
                      '& .MuiTabs-indicator': {
                        backgroundColor: '#0088FE',
                        height: 3,
                        borderRadius: '3px 3px 0 0'
                      }
                    }}
                  >
                    <Tab label="Pieces" />
                    <Tab label="Bundles" />
                  </Tabs>
                </FormControl>
              </Grid>

              {/* Quantity Input */}
              <Grid item xs={12}>
                {formData.countType === COUNT_TYPES.PIECES ? (
                  <StyledTextField
                    label="Quantity (Pieces)"
                    name="quantity"
                    type="text"
                    value={formData.quantity}
                    onChange={handleChange}
                    fullWidth
                    inputRef={(input) => {
                      fieldRefs.current.quantity = input;
                    }}
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
                        '&:hover': {
                          borderColor: '#0066CC',
                          background: alpha('#0088FE', 0.05)
                        }
                      }}
                    >
                      {formData.bundles.length > 0 
                        ? `Edit Bundles (${formData.bundles.length})` 
                        : "Add Bundles"}
                    </StyledButton>
                    <StyledTextField
                      label="Total Quantity"
                      name="quantity"
                      type="text"
                      value={formData.quantity}
                      fullWidth
                      disabled
                    />
                  </>
                )}
              </Grid>

              {/* Form Actions */}
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
                      '&:hover': {
                        background: '#0066CC',
                      },
                      '&:disabled': {
                        background: alpha('#0088FE', 0.3),
                      }
                    }}
                  >
                    {isSubmitting ? (
                      <>
                        <CircularProgress size={24} sx={{ mr: 1, color: 'white' }} />
                        Saving...
                      </>
                    ) : (
                      'Save Transaction'
                    )}
                  </StyledButton>
                  <StyledButton
                    variant="outlined"
                    color="primary"
                    size="large"
                    startIcon={<History />}
                    onClick={async () => {
                      // Refresh data before opening the modal
                      await refreshSubmittedTransactions();
                      setOpenTableModal(true);
                    }}
                    fullWidth
                    sx={{
                      borderColor: '#0088FE',
                      color: '#0088FE',
                      '&:hover': {
                        borderColor: '#0066CC',
                        color: '#0066CC',
                        background: alpha('#0088FE', 0.05),
                      }
                    }}
                  >
                    View History
                  </StyledButton>
                </Box>
              </Grid>
            </Grid>
          </form>
        </CardContent>
      </StyledCard>

      {/* Bundle Modal */}
      <Dialog 
        open={openBundleModal} 
        onClose={() => setOpenBundleModal(false)} 
        fullWidth 
        maxWidth="md"
      >
        <DialogTitle>
          Bundle Details
          <Typography variant="subtitle2" color="text.secondary">
            Tag ID: {formData.tag_id}
          </Typography>
        </DialogTitle>
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
                        onChange={(e) => {
                          const value = parseInt(e.target.value) || 0;
                          handleBundleChange(index, "num_of_bundle", value);
                        }}
                        fullWidth
                      />
                    </TableCell>
                    <TableCell>
                      <TextField
                        type="text"
                        value={bundle.bundle_count || ''}
                        onChange={(e) => {
                          const value = parseInt(e.target.value) || 0;
                          handleBundleChange(index, "bundle_count", value);
                        }}
                        fullWidth
                      />
                    </TableCell>
                    <TableCell>
                      {(bundle.num_of_bundle || 0) * (bundle.bundle_count || 0)}
                    </TableCell>
                    <TableCell>
                      <IconButton 
                        onClick={() => handleDeleteBundle(index)} 
                        color="error"
                      >
                        <Delete />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))}
                {formData.bundles.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} align="center">
                      No bundles added yet
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>

          <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 2 }}>
            <Button
              onClick={handleAddBundle}
              variant="outlined"
              startIcon={<Add />}
            >
              Add Bundle
            </Button>
            <Typography variant="h6">
              Total: {formData.quantity} pieces
            </Typography>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenBundleModal(false)}>
            Cancel
          </Button>
          <Button 
            onClick={() => {
              // Calculate total quantity when saving
              const total = formData.bundles.reduce(
                (sum, bundle) => sum + (bundle.num_of_bundle || 0) * (bundle.bundle_count || 0),
                0
              );
              setFormData(prev => ({
                ...prev,
                quantity: total
              }));
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

      {/* Add Attachment Dialog — attached items reconcile separately from the main product */}
      <Dialog
        open={attachmentDialogOpen}
        onClose={handleCloseAttachmentDialog}
        fullWidth
        maxWidth="sm"
        PaperProps={{ sx: { borderRadius: 3 } }}
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Add color="primary" />
            <Typography variant="h6" fontWeight={600}>Add Attachment</Typography>
          </Box>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            This item will be counted with the current product but reconciled as a separate item.
          </Typography>
        </DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <Autocomplete
              freeSolo
              options={formOptions}
              value={attachmentForm.form}
              onChange={(_, value) => handleAttachmentFieldChange('form', value || '')}
              renderInput={(params) => (
                <TextField {...params} label="Form" required fullWidth />
              )}
            />
            <Autocomplete
              freeSolo
              options={attGradeOptions}
              value={attachmentForm.grade}
              onChange={(_, value) => handleAttachmentFieldChange('grade', value || '')}
              loading={attLoading.grade}
              disabled={!attachmentForm.form}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Grade"
                  required
                  fullWidth
                  InputProps={{
                    ...params.InputProps,
                    endAdornment: (
                      <>
                        {attLoading.grade ? <CircularProgress color="inherit" size={20} /> : null}
                        {params.InputProps.endAdornment}
                      </>
                    ),
                  }}
                />
              )}
            />
            <Autocomplete
              freeSolo
              options={attSizeOptions}
              value={attachmentForm.size}
              onChange={(_, value) => handleAttachmentFieldChange('size', value || '')}
              loading={attLoading.size}
              disabled={!attachmentForm.grade}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Size"
                  required
                  fullWidth
                  InputProps={{
                    ...params.InputProps,
                    endAdornment: (
                      <>
                        {attLoading.size ? <CircularProgress color="inherit" size={20} /> : null}
                        {params.InputProps.endAdornment}
                      </>
                    ),
                  }}
                />
              )}
            />
            <Autocomplete
              freeSolo
              options={attFinishOptions}
              value={attachmentForm.finish}
              onChange={(_, value) => handleAttachmentFieldChange('finish', value || '')}
              loading={attLoading.finish}
              disabled={!attachmentForm.size}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Finish"
                  required
                  fullWidth
                  InputProps={{
                    ...params.InputProps,
                    endAdornment: (
                      <>
                        {attLoading.finish ? <CircularProgress color="inherit" size={20} /> : null}
                        {params.InputProps.endAdornment}
                      </>
                    ),
                  }}
                />
              )}
            />
            <Autocomplete
              multiple
              freeSolo
              options={attExtFinishOptions}
              value={attachmentForm.extFinishes}
              onChange={(_, values) => {
                const cleaned = (values as string[]).map((v) => v.trim()).filter(Boolean);
                setAttachmentForm(prev => ({ ...prev, extFinishes: cleaned }));
              }}
              loading={attLoading.extFinish}
              disabled={!attachmentForm.finish}
              renderTags={(value, getTagProps) =>
                value.map((option, index) => (
                  <Chip label={option} size="small" {...getTagProps({ index })} key={`${option}-${index}`} />
                ))
              }
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Extended Finish (multiple allowed)"
                  fullWidth
                  helperText={
                    attachmentForm.extFinishes.length > 1
                      ? `Combined: ${attachmentForm.extFinishes.join('')}`
                      : undefined
                  }
                  InputProps={{
                    ...params.InputProps,
                    endAdornment: (
                      <>
                        {attLoading.extFinish ? <CircularProgress color="inherit" size={20} /> : null}
                        {params.InputProps.endAdornment}
                      </>
                    ),
                  }}
                />
              )}
            />
            <TextField
              label="Quantity"
              type="number"
              required
              fullWidth
              value={attachmentForm.quantity}
              onChange={(e) => setAttachmentForm(prev => ({ ...prev, quantity: e.target.value }))}
              inputProps={{ min: 1 }}
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5 }}>
          <Button onClick={handleCloseAttachmentDialog} variant="outlined">
            Cancel
          </Button>
          <Button
            onClick={handleAddAttachment}
            variant="contained"
            disabled={!canAddAttachment}
            startIcon={<Add />}
          >
            Add Attachment
          </Button>
        </DialogActions>
      </Dialog>

      {/* Transactions Table Modal */}
      <TransactionsTableModal 
        open={openTableModal}
        onClose={() => setOpenTableModal(false)}
        data={submittedData}
        onSubmitAll={async () => {
          setSnackbar({
            open: true,
            message: "All transactions submitted successfully! Redirecting to counter home...",
            severity: "success",
          });
          // Refresh the data after submitting all
          await refreshSubmittedTransactions();
          setOpenTableModal(false);
          
          // Wait a moment for the snackbar to be visible, then redirect
          setTimeout(() => {
            navigate('/counter-home');
          }, 2000);
        }}
        onUpdateTransaction={async (updatedTransaction) => {
          try {
            // Call the counter-specific update API
            const response = await servicesAPI.updateCounterTransaction(updatedTransaction);
            
            if (response.data.success) {
              setSubmittedData(prev => 
                prev.map(transaction => 
                  transaction.id === updatedTransaction.id || transaction.tag_id === updatedTransaction.tag_id 
                    ? updatedTransaction 
                    : transaction
                )
              );
              // Refresh the data after updating a transaction
              await refreshSubmittedTransactions();
              
              setSnackbar({
                open: true,
                message: "Transaction updated successfully!",
                severity: "success"
              });
            } else {
              throw new Error(response.data.message || 'Failed to update transaction');
            }
          } catch (error) {
            console.error('Error updating transaction:', error);
            setSnackbar({
              open: true,
              message: `Failed to update transaction: ${error instanceof Error ? error.message : 'Unknown error'}`,
              severity: "error"
            });
          }
        }}
        onCompleteLocation={handleCompleteLocation}
      />

      {/* Snackbar for notifications */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert
          onClose={handleCloseSnackbar}
          severity={snackbar.severity}
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default CounterPage;