import React, { useState, useEffect, useRef } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Autocomplete,
  Grid,
  LinearProgress,
  Chip,
  Typography,
  Tabs,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  CircularProgress,
  Box
} from '@mui/material';
import { Add, Delete, Save } from '@mui/icons-material';
import { servicesAPI } from '../config/api';
import { useParams } from "react-router-dom";
import { Location, Section, Team, FormData, CountType, BundleItem } from '../types';

interface AddLineItemDialogProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: any) => void;
  locationId: string;
  teamId: string;
}



interface RouteParams {
  location_id: string;
  section_id: string;
  team_id: string;
  [key: string]: string | undefined;
}

const COUNT_TYPES = {
  PIECES: 'pcs' as CountType,
  BUNDLES: 'bundle' as CountType
};

const createEmptyBundle = (): BundleItem => ({
  quantity: 0,
  tag_id: '',
  num_of_bundle: 0,
  bundle_count: 0
});

const AddLineItemDialog: React.FC<AddLineItemDialogProps> = ({
  open,
  onClose,
  onSubmit,
  locationId,
  teamId
}) => {
  const { location_id, section_id, team_id } = useParams<RouteParams>();
  const [formData, setFormData] = useState<FormData>({
    form: '',
    grade: '',
    size: '',
    width: '',
    length: '',
    finish: '',
    extendedFinish: '',
    mill: '-',
    heat: '-',
    quantity: '',
    remarks: 'Conforms to Std',
    ad_cmts: '',
    type: 'M',
    location: '',
    countType: COUNT_TYPES.PIECES,
    checker_count: 0,
    bundles: [],
    tag_id: 0
  });

  const [error, setError] = useState<string | null>(null);

  // Field navigation refs
  const fieldRefs = useRef<{ [key: string]: HTMLInputElement | null }>({});
  
  // Field navigation order
  const fieldOrder = [
    'form', 'grade', 'size', 'finish', 'extendedFinish', 
    'width', 'length', 'heat', 'mill', 'location', 
    'type', 'remarks', 'ad_cmts', 'quantity'
  ];
  
  // Navigate to next field
  const navigateToNextField = (currentField: string, currentValue?: string) => {
    console.log(`🔍 Starting navigation from ${currentField} with currentValue: "${currentValue}"`);
    console.log(`📊 Current form data:`, {
      form: formData.form,
      grade: formData.grade,
      size: formData.size,
      finish: formData.finish,
      extendedFinish: formData.extendedFinish,
      width: formData.width,
      length: formData.length,
      heat: formData.heat,
      mill: formData.mill
    });
    
    const currentIndex = fieldOrder.indexOf(currentField);
    console.log(`📍 Current field index: ${currentIndex} of ${fieldOrder.length - 1}`);
    
    if (currentIndex < fieldOrder.length - 1) {
      // Find the next enabled field
      for (let i = currentIndex + 1; i < fieldOrder.length; i++) {
        const nextField = fieldOrder[i];
        const nextFieldRef = fieldRefs.current[nextField];
        
        console.log(`🔍 Checking field ${i}: ${nextField}, ref exists: ${!!nextFieldRef}`);
        
        // Check if the field is enabled based on its dependencies
        let isEnabled = true;
        
        switch (nextField) {
          case 'extendedFinish': {
            // Use currentValue if we're navigating from finish field, otherwise use formData
            const finishValue = currentField === 'finish' ? currentValue : formData.finish;
            isEnabled = !!finishValue;
            console.log(`🔧 Extended Finish check: finish="${finishValue}" (from ${currentField}), isEnabled=${isEnabled}`);
            break;
          }
          case 'width':
            isEnabled = !!formData.extendedFinish;
            console.log(`🔧 Width check: extendedFinish="${formData.extendedFinish}" (${typeof formData.extendedFinish}), isEnabled=${isEnabled}`);
            break;
          case 'length':
            isEnabled = !!formData.width;
            console.log(`🔧 Length check: width="${formData.width}" (${typeof formData.width}), isEnabled=${isEnabled}`);
            break;
          case 'heat':
            isEnabled = !!formData.length;
            console.log(`🔧 Heat check: length="${formData.length}" (${typeof formData.length}), isEnabled=${isEnabled}`);
            break;
          case 'mill':
            isEnabled = !!formData.heat;
            console.log(`🔧 Mill check: heat="${formData.heat}" (${typeof formData.heat}), isEnabled=${isEnabled}`);
            break;
          case 'location':
            isEnabled = !!formData.mill;
            break;
          case 'type':
            isEnabled = !!formData.location;
            break;
          case 'remarks':
            isEnabled = !!formData.type;
            break;
          case 'ad_cmts':
            isEnabled = !!formData.remarks;
            break;
          case 'quantity':
            isEnabled = !!formData.ad_cmts;
            break;
          default:
            isEnabled = true;
        }
        
        console.log(`📋 Field ${nextField}: isEnabled=${isEnabled}, hasRef=${!!nextFieldRef}`);
        
        if (isEnabled && nextFieldRef) {
          console.log(`✅ SUCCESS: Navigating from ${currentField} to ${nextField}`);
          nextFieldRef.focus();
          nextFieldRef.select(); // Select all text for easy replacement
          return;
        } else {
          console.log(`❌ SKIP: ${nextField} - isEnabled=${isEnabled}, hasRef=${!!nextFieldRef}`);
        }
      }
      
      console.log(`⚠️ No enabled field found after ${currentField}`);
    } else {
      console.log(`⚠️ Already at last field: ${currentField}`);
    }
  };
  
  // Validate field value against available options
  const validateFieldValue = (fieldName: string, value: string): { isValid: boolean; message?: string } => {
    // Fields that allow spaces as valid values
    const fieldsThatAllowSpaces = ['finish', 'extendedFinish', 'width', 'length', 'heat', 'mill', 'remarks', 'ad_cmts'];
    
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
      case 'extendedFinish':
        // Allow empty spaces and the actual value
        if (trimmedValue === '' || extFinishOptions.includes(trimmedValue)) {
          // Valid: empty (spaces) or found in options
        } else {
          return { isValid: false, message: `Extended Finish "${trimmedValue}" not found. Please select from available options.` };
        }
        break;
      case 'width':
        // Allow empty spaces and the actual value
        if (trimmedValue === '' || widthOptions.includes(trimmedValue)) {
          // Valid: empty (spaces) or found in options
        } else {
          return { isValid: false, message: `Width "${trimmedValue}" not found. Please select from available options.` };
        }
        break;
      case 'length':
        // Allow empty spaces and the actual value
        if (trimmedValue === '' || lengthOptions.includes(trimmedValue)) {
          // Valid: empty (spaces) or found in options
        } else {
          return { isValid: false, message: `Length "${trimmedValue}" not found. Please select from available options.` };
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

  // Handle key press for field navigation with validation
  const handleKeyPress = (fieldName: string, event: React.KeyboardEvent, currentValue?: string) => {
    if (event.key === 'Enter' || event.key === 'Tab') {
      event.preventDefault();
      
      // Get the current value from the input field if not provided
      let valueToUse = currentValue;
      if (!valueToUse && event.target) {
        const target = event.target as HTMLInputElement;
        valueToUse = target.value;
      }
      
      // Validate the field value
      const validation = validateFieldValue(fieldName, valueToUse || '');
      
      if (!validation.isValid) {
        // Show validation error
        setError(validation.message || 'Invalid value');
        // Focus back to the current field
        const currentFieldRef = fieldRefs.current[fieldName as keyof typeof fieldRefs.current];
        if (currentFieldRef) {
          currentFieldRef.focus();
        }
        return;
      }
      
      // Clear any previous error
      setError(null);
      
      // Delay navigation slightly to allow state updates to complete
      setTimeout(() => {
        navigateToNextField(fieldName, valueToUse);
      }, 50);
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
        setFormData(prev => {
          console.log('Setting width to 0.00, previous state:', prev);
          return { ...prev, width: '0.00' };
        });
        
        // Don't auto-focus Length field here - let normal field navigation handle it
        console.log('Width auto-set to 0.00, normal field navigation will handle Length field focus');
      }
    } catch (error) {
      console.error('Error checking dimension segment:', error);
    }
  };

  const [loading, setLoading] = useState({
    form: false,
    grade: false,
    size: false,
    finish: false,
    extFinish: false,
    width: false,
    length: false,
    mill: false,
    heat: false,
    location: false,
    general: false,
    submitting: false
  });

  // Individual option states like in counter
  const [formOptions, setFormOptions] = useState<string[]>([]);
  const [gradeOptions, setGradeOptions] = useState<string[]>([]);
  const [sizeOptions, setSizeOptions] = useState<string[]>([]);
  const [finishOptions, setFinishOptions] = useState<string[]>([]);
  const [extFinishOptions, setExtFinishOptions] = useState<string[]>([]);
  const [widthOptions, setWidthOptions] = useState<string[]>([]);
  const [lengthOptions, setLengthOptions] = useState<string[]>([]);
  const [millOptions, setMillOptions] = useState<string[]>([]);
  const [heatOptions, setHeatOptions] = useState<string[]>([]);
  const [remarksOptions, setRemarksOptions] = useState<string[]>([]);
  const [typeOptions] = useState([
    { value: 'D', label: 'D - Drop' },
    { value: 'F', label: 'F - Finished' },
    { value: 'M', label: 'M - Master' },
    { value: 'R', label: 'R - Reject' },
    { value: 'S', label: 'S - Scrap' },
    { value: 'W', label: 'W - Work in Process' }
  ]);
  const [locationOptions, setLocationOptions] = useState<string[]>([]);

  const [openBundleModal, setOpenBundleModal] = useState(false);
  const [, setActiveTab] = useState(0);
  const [locationData, setLocationData] = useState<Location | null>(null);
  const [sectionData, setSectionData] = useState<Section | null>(null);
  const [teamData, setTeamData] = useState<Team | null>(null);

  // Fetch initial data including current tag
  useEffect(() => {

    // Fetch location data
    if (location_id) {
      servicesAPI.getLocation(location_id)
      .then(res => setLocationData(res.data))
      .catch(error => console.error('Error fetching location:', error));
    }

    // Fetch section data
    if (location_id) {
      console.log('🔍 Fetching sections for location_id:', location_id, 'section_id:', section_id);
      servicesAPI.getSections(location_id)
      .then(res => {
        console.log('📋 Sections response:', res.data);
        // Find the specific section from the list
        const sections = res.data;
        const currentSection = sections.find((section: { section_id: number; section_desc: string }) => section.section_id === parseInt(section_id || "0"));
        console.log('🎯 Found section:', currentSection);
        setSectionData(currentSection || null);
      })
      .catch(error => console.error('Error fetching section:', error));
    }

    // Fetch team data
    if (team_id) {
      servicesAPI.getTeam(team_id)
      .then(res => setTeamData(res.data))
      .catch(error => console.error('Error fetching team:', error));
    }
    const fetchInitialData = async () => {
      try {
        setLoading(prev => ({ ...prev, general: true }));
        
        // Fetch current tag
        const tagResponse = await servicesAPI.getTeamTagRange(teamId);
        setFormData(prev => ({ ...prev, tag_id: tagResponse.data.current_tag }));

        // Fetch form options
        const formResponse = await servicesAPI.getForms(locationId);
        if (formResponse.data.success) {
          setFormOptions(formResponse.data.data.map((item: { item_name: string }) => item.item_name));
        }

        // Fetch remarks options
        const remarksResponse = await servicesAPI.getRemarks();
        if (remarksResponse.data?.Data) {
          setRemarksOptions(remarksResponse.data.Data.map((r: { inq_desc15: string }) => r.inq_desc15.trim() || "null"));
        }

        // Type options are already initialized in state

        // Location options will be fetched when locationData is available

      } catch (error) {
        console.error("Error fetching initial data:", error);
      } finally {
        setLoading(prev => ({ ...prev, general: false }));
      }
    };

    if (open) {
      fetchInitialData();
    }
  }, [open, locationId, teamId]);

  // Fetch dependent options (similar to counter)
  const fetchDependentOptions = async (
    endpoint: string,
    params: Record<string, string>,
    optionSetter: React.Dispatch<React.SetStateAction<string[]>>,
    loadingKey: string,
    fieldName?: string
  ) => {
    try {
      setLoading(prev => ({ ...prev, [loadingKey]: true }));
      
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
          throw new Error(`Unknown endpoint: ${endpoint}`);
      }
      
      if (responseData?.Data) {
        const options = responseData.Data.map((item: Record<string, unknown>) => {
          const value = fieldName ? item[fieldName] : Object.values(item)[0];
          
          if (value === null || value === undefined || value === '') {
            return ' ';
          }
          
          return typeof value === 'string' ? value.trim() : String(value);
        });
        
        // Filter out empty/null values and add empty option
        const filteredOptions = options.filter((opt: string) => opt && opt !== 'null');
        filteredOptions.unshift(' '); // Add empty option
        
        optionSetter(filteredOptions);
        
        // Special handling for width field - auto-select appropriate zero value
        if (endpoint === '/services/width') {
          // Check if current width is 0.00 (auto-set by dimension segment check)
          if (formData.width === '0.00') {
            const hasZeroOption = filteredOptions.includes('0.00');
            if (hasZeroOption) {
              console.log('Auto-selecting 0.00 from width options');
              setFormData(prev => ({ ...prev, width: '0.00' }));
            } else {
              // Check for 0.0000 or other zero variations
              const zeroVariations = filteredOptions.filter((opt: string) => 
                opt && (opt === '0.0000' || opt === '0.00' || opt === '0' || opt.startsWith('0.0'))
              );
              if (zeroVariations.length > 0) {
                const selectedZero = zeroVariations[0];
                console.log('Auto-selecting zero variation:', selectedZero);
                setFormData(prev => ({ ...prev, width: selectedZero }));
              }
            }
          }
        }
      }
    } catch (error) {
      console.error(`Error fetching ${loadingKey} options:`, error);
    } finally {
      setLoading(prev => ({ ...prev, [loadingKey]: false }));
    }
  };

  // Fetch grade options when form changes
  useEffect(() => {
    if (formData.form) {
      fetchDependentOptions(
        "/services/grade",
        { form: formData.form },
        setGradeOptions,
        "grade",
        "prd_grd"
      );
    } else {
      setGradeOptions([]);
      setFormData(prev => ({
        ...prev,
        grade: '',
        size: '',
        finish: '',
        extendedFinish: '',
        width: '',
        length: '',
        mill: '-',
        heat: '-'
      }));
    }
  }, [formData.form]);

  // Fetch size options when grade changes
  useEffect(() => {
    if (formData.form && formData.grade) {
      fetchDependentOptions(
        "/services/size",
        { form: formData.form, grade: formData.grade },
        setSizeOptions,
        "size",
        "prd_size"
      );
    } else {
      setSizeOptions([]);
      setFormData(prev => ({
        ...prev,
        size: '',
        finish: '',
        extendedFinish: '',
        width: '',
        length: '',
        mill: '-',
        heat: '-'
      }));
    }
  }, [formData.grade]);

  // Fetch finish options when size changes
  useEffect(() => {
    if (formData.form && formData.grade && formData.size) {
      fetchDependentOptions(
        "/services/finish",
        { form: formData.form, grade: formData.grade, size: formData.size },
        setFinishOptions,
        "finish",
        "prd_fnsh"
      );
    } else {
      setFinishOptions([]);
      setFormData(prev => ({
        ...prev,
        finish: '',
        extendedFinish: '',
        width: '',
        length: '',
        mill: '-',
        heat: '-'
      }));
    }
  }, [formData.size]);

  // Fetch extended finish options when finish changes
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
        setExtFinishOptions,
        "extFinish",
        "prd_ef_svar"
      );
    } else {
      setExtFinishOptions([]);
      setFormData(prev => ({
        ...prev,
        extendedFinish: '',
        width: '',
        length: '',
        mill: '-',
        heat: '-'
      }));
    }
  }, [formData.finish]);

  // Fetch width options when extended finish changes
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
        "prd_wdth"
      );
    } else {
      setWidthOptions([]);
      setFormData(prev => ({
        ...prev,
        width: '',
        length: '',
        mill: '-',
        heat: '-'
      }));
    }
  }, [formData.extendedFinish]);

  // Fetch length options when width changes
  useEffect(() => {
    console.log('Width useEffect triggered, width value:', formData.width);
    console.log('All required fields:', {
      form: formData.form,
      grade: formData.grade,
      size: formData.size,
      finish: formData.finish,
      extendedFinish: formData.extendedFinish,
      width: formData.width
    });
    
    if (formData.form && formData.grade && formData.size && formData.finish && formData.extendedFinish && formData.width) {
      console.log('Fetching length options for width:', formData.width);
      
      // For length-based products, try multiple width variations to ensure we get length options
      const fetchLengthWithWidthVariations = async (widthValue: string) => {
        console.log('Fetching length options for width:', widthValue);
        
        try {
          const response = await servicesAPI.getLength({
            form: formData.form,
            grade: formData.grade,
            size: formData.size,
            finish: formData.finish,
            extfinish: formData.extendedFinish,
            width: widthValue
          });
          
          if (response.data?.Data) {
            const options = response.data.Data.map((item: Record<string, unknown>) => {
              const value = item['prd_lgth'];
              if (value === null || value === undefined || value === '') {
                return ' ';
              }
              return typeof value === 'string' ? value.trim() : String(value);
            });
            
            const filteredOptions = options.filter((opt: string) => opt && opt !== 'null');
            filteredOptions.unshift(' '); // Add empty option
            
            setLengthOptions(filteredOptions);
            console.log('Successfully fetched length options for width:', widthValue);
            return true; // Success
          }
        } catch (error) {
          console.log('Failed to fetch length options for width:', widthValue, error);
        }
        return false; // Failed
      };
      
      // Use async function to handle the await calls
      const fetchLengthOptions = async () => {
        // Try the current width value first
        let success = await fetchLengthWithWidthVariations(formData.width);
        
        // If that failed and width is 0.00, try 0.0000
        if (!success && formData.width === '0.00') {
          console.log('Trying 0.0000 as width variation');
          success = await fetchLengthWithWidthVariations('0.0000');
          
          // If 0.0000 worked, update the form data to use 0.0000
          if (success) {
            setFormData(prev => ({ ...prev, width: '0.0000' }));
          }
        }
        
        // If still no success, try other zero variations
        if (!success && formData.width === '0.00') {
          const zeroVariations = ['0', '0.0', '0.000'];
          for (const variation of zeroVariations) {
            console.log('Trying width variation:', variation);
            success = await fetchLengthWithWidthVariations(variation);
            if (success) {
              setFormData(prev => ({ ...prev, width: variation }));
              break;
            }
          }
        }
        
        // If all attempts failed, clear length options
        if (!success) {
          console.log('All width variations failed, clearing length options');
          setLengthOptions([]);
        }
      };
      
      fetchLengthOptions();
    } else {
      console.log('Clearing length options - missing required fields');
      setLengthOptions([]);
      setFormData(prev => ({
        ...prev,
        length: '',
        mill: '-',
        heat: '-'
      }));
    }
  }, [formData.width]);

  // Fetch heat options when length changes (with debouncing)
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
          "heat",
          "prd_heat"
        );
      }, 300); // 300ms debounce

      return () => clearTimeout(timeoutId);
    } else {
      setHeatOptions([]);
    }
    
    // Always set mill to default value when heat changes
    setFormData(prev => ({ ...prev, mill: '-' }));
  }, [formData.form, formData.grade, formData.size, formData.finish, formData.extendedFinish, formData.width, formData.length]);

  // Fetch mill options when heat changes (based on heat and location)
  useEffect(() => {
    if (formData.heat && locationId) {
      fetchDependentOptions(
        "/services/mill-by-heat",
        { 
          heat: formData.heat,
          location_id: locationId
        },
        setMillOptions,
        "mill",
        "het_mill" // fieldName
      );
    } else {
      setMillOptions([]);
      // Clear mill field when heat is empty, but preserve default value
      setFormData(prev => ({ ...prev, mill: '-' }));
    }
  }, [formData.heat, locationId]);

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
              .map((loc: { prd_loc: string }) => loc.prd_loc)
              .filter((loc: string) => loc !== null && loc !== undefined) // Filter out null/undefined first
              .map((loc: string) => loc.trim()) // Then trim the valid values
              .filter((loc: string) => loc && loc !== 'null' && loc !== '') // Final filter for empty strings
              .sort(); // Sort alphabetically for better UX
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
  }, [locationData?.warehouse]);

  const handleTabChange = (_: React.SyntheticEvent, newValue: number) => {
    const newCountType = newValue === 0 ? COUNT_TYPES.PIECES : COUNT_TYPES.BUNDLES;
    setFormData(prev => ({
      ...prev,
      countType: newCountType,
      quantity: '',
      bundles: newCountType === COUNT_TYPES.BUNDLES ? [] : prev.bundles
    }));
    setActiveTab(newValue);
  };

  const handleAddBundle = () => {
    setFormData(prev => ({
      ...prev,
      bundles: [...prev.bundles, createEmptyBundle()]
    }));
  };

  const handleBundleChange = (index: number, field: keyof BundleItem, value: number | string): void => {
    const numericValue = typeof value === 'number' ? value : parseInt(value) || 0;
    
    setFormData((prev: FormData): FormData => {
      const newBundles = [...prev.bundles];
      
      // Ensure the bundle exists with all required fields
      if (!newBundles[index]) {
        newBundles[index] = createEmptyBundle();
      }
      
      // Update the specific field
      const updatedBundle: BundleItem = {
        ...newBundles[index],
        [field]: field === 'tag_id' ? value : numericValue
      } as BundleItem;
      
      newBundles[index] = updatedBundle;
      
      // Calculate total quantity
      const totalQuantity = newBundles.reduce(
        (sum: number, bundle: BundleItem): number => sum + (bundle.num_of_bundle * bundle.bundle_count), 
        0
      );
      
      return {
        ...prev,
        bundles: newBundles,
        quantity: totalQuantity.toString()
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
        quantity: updatedBundles.reduce((sum, bundle) => sum + (bundle.num_of_bundle * bundle.bundle_count), 0).toString()
      };
    });
  };

  const handleSubmit = async () => {
    const selectedRole = localStorage.getItem('Selected Role');
    const selectedUser = localStorage.getItem('User ID');
    
    const payload = {
      tag_id: formData.tag_id,
      form: formData.form,
      grade: formData.grade,
      size: formData.size,
      finish: formData.finish || null,
      ext_finish: formData.extendedFinish || null,
      width: formData.width ? parseFloat(formData.width) : null,
      length: formData.length ? parseFloat(formData.length) : null,
      mill: formData.mill || null,
      heat: formData.heat || null,
      type: formData.type || 'M',
      location: formData.location || null,
      remarks: formData.remarks || null,
      ad_cmts: formData.ad_cmts || null,
      count_type: formData.countType,
      qty: formData.countType === COUNT_TYPES.PIECES ? parseInt(formData.quantity) || 0 : 
           formData.bundles.reduce((sum, b) => sum + (b.num_of_bundle * b.bundle_count), 0),
      counted_by: parseInt(selectedUser || "0"),
      team_id: parseInt(teamId || "0"),
      location_id: parseInt(locationId || "0"),
      section_id: parseInt(section_id || "0"),
      role: selectedRole,
      verified: false,
      bundles: formData.countType === COUNT_TYPES.BUNDLES ? 
        formData.bundles.map(b => ({
          ...b,
          tag_id: formData.tag_id
        })) : 
        undefined
    };

    console.log('📤 Submitting payload:', payload);
    console.log('🔍 Form data type field:', formData.type);
    console.log('🔍 Form data location field:', formData.location);

    try {
      setLoading(prev => ({ ...prev, submitting: true }));
      await onSubmit(payload);
      resetForm();
      onClose();
    } finally {
      setLoading(prev => ({ ...prev, submitting: false }));
    }
  };

  const handleFormChange = (_: unknown, value: string | null) => {
    setFormData(prev => ({ ...prev, form: value || '' }));
  };

  // Reset form to initial state
  const resetForm = () => {
    setFormData({
      form: '',
      grade: '',
      size: '',
      width: '',
      length: '',
      finish: '',
      extendedFinish: '',
      mill: '-',
      heat: '-',
      quantity: '',
      remarks: 'Conforms to Std',
      ad_cmts: '',
      type: 'M',
      location: '',
      countType: COUNT_TYPES.PIECES,
      checker_count: 0,
      bundles: [],
      tag_id: 0
    });
    setError(null); // Clear any validation errors
    setOpenBundleModal(false);
  };

  // Handle dialog close with form reset
  const handleClose = () => {
    resetForm();
    onClose();
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
      <DialogTitle>
        Add New Line Item
        <Typography variant="subtitle1" color="text.secondary">
                Location: {locationData?.location_desc || 'Loading...'} | 
                Section: {sectionData?.section_desc || 'Loading...'} | 
                Team: {teamData?.team_name || 'Loading...'}
        </Typography>
        <Chip 
          label={`Current Tag: ${formData.tag_id}`} 
          color="primary" 
          size="small" 
          sx={{ mt: 1 }}
        />
      </DialogTitle>
      <DialogContent>
        {loading.general && <LinearProgress sx={{ mb: 2 }} />}
        
        {error && (
          <Box sx={{ mb: 2, p: 2, backgroundColor: 'error.light', borderRadius: 1, color: 'error.contrastText' }}>
            <Typography variant="body2" sx={{ fontWeight: 500 }}>
              ⚠️ {error}
            </Typography>
          </Box>
        )}

        <Grid container spacing={2} sx={{ mt: 1 }}>
          {/* Form Field */}
          <Grid item xs={12} sm={6}>
            <Autocomplete
              freeSolo
              options={formOptions}
              value={formData.form}
              onChange={handleFormChange}
              loading={loading.form}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Form"
                  fullWidth
                  inputRef={(input) => {
                    fieldRefs.current.form = input;
                  }}
                  onKeyDown={(e) => handleKeyPress('form', e)}
                  required
                  InputProps={{
                    ...params.InputProps,
                    endAdornment: (
                      <>
                        {loading.form ? <CircularProgress color="inherit" size={20} /> : null}
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
                setFormData(prev => ({ ...prev, grade: value || '' }));
              }}
              loading={loading.grade}
              disabled={!formData.form}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Grade"
                  fullWidth
                  inputRef={(input) => {
                    fieldRefs.current.grade = input;
                  }}
                  onKeyDown={(e) => handleKeyPress('grade', e)}
                  required
                  InputProps={{
                    ...params.InputProps,
                    endAdornment: (
                      <>
                        {loading.grade ? <CircularProgress color="inherit" size={20} /> : null}
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
                setFormData(prev => ({ ...prev, size: value || '' }));
              }}
              loading={loading.size}
              disabled={!formData.grade}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Size"
                  fullWidth
                  inputRef={(input) => {
                    fieldRefs.current.size = input;
                  }}
                  onKeyDown={(e) => handleKeyPress('size', e)}
                  required
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
                setFormData(prev => ({ ...prev, finish: newFinish }));
                // Check dimension segment with the new finish value
                checkDimensionSegment(newFinish);
              }}
              loading={loading.finish}
              disabled={!formData.size}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Finish"
                  fullWidth
                  inputRef={(input) => {
                    fieldRefs.current.finish = input;
                  }}
                  onKeyDown={(e) => handleKeyPress('finish', e)}
                  required
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

          {/* Extended Finish Field */}
          <Grid item xs={12} sm={6}>
            <Autocomplete
              freeSolo
              options={extFinishOptions}
              value={formData.extendedFinish}
              onChange={(_, value) => {
                setFormData(prev => ({ ...prev, extendedFinish: value || '' }));
              }}
              loading={loading.extFinish}
              disabled={!formData.finish}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Extended Finish"
                  fullWidth
                  inputRef={(input) => {
                    fieldRefs.current.extendedFinish = input;
                  }}
                  onKeyDown={(e) => handleKeyPress('extendedFinish', e)}
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

          {/* Width Field */}
          <Grid item xs={12} sm={6}>
            <Autocomplete
              freeSolo
              options={widthOptions}
              value={formData.width}
              onChange={(_, value) => {
                setFormData(prev => ({ ...prev, width: value || '' }));
                // Let normal field navigation handle focus
              }}
              loading={loading.width}
              disabled={!formData.extendedFinish}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Width"
                  fullWidth
                  inputRef={(input) => {
                    fieldRefs.current.width = input;
                  }}
                  onKeyDown={(e) => handleKeyPress('width', e)}
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

          {/* Length Field */}
          <Grid item xs={12} sm={6}>
            <Autocomplete
              freeSolo
              options={lengthOptions}
              value={formData.length}
              onChange={(_, value) => {
                setFormData(prev => ({ ...prev, length: value || '' }));
              }}
              loading={loading.length}
              disabled={!formData.width}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Length"
                  fullWidth
                  inputRef={(input) => {
                    fieldRefs.current.length = input;
                  }}
                  onKeyDown={(e) => handleKeyPress('length', e)}
                  InputProps={{
                    ...params.InputProps,
                    endAdornment: (
                      <>
                        {loading.length ? <CircularProgress color="inherit" size={20} /> : null}
                        {params.InputProps.endAdornment}
                      </>
                    ),
                  }}
                />
              )}
            />
          </Grid>

          {/* Heat Field */}
          <Grid item xs={12} sm={6}>
            <Autocomplete
              freeSolo
              options={heatOptions}
              value={formData.heat || (heatOptions.length ? heatOptions[1] : '-')}
              onChange={(_, value) => {
                setFormData(prev => ({ ...prev, heat: value || '-' }));
              }}
              loading={loading.heat}
              disabled={!formData.length}
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
                <TextField
                  {...params}
                  label="Heat"
                  fullWidth
                  inputRef={(input) => {
                    fieldRefs.current.heat = input;
                  }}
                  onKeyDown={(e) => handleKeyPress('heat', e)}
                  placeholder="Type to search heat values..."
                  InputProps={{
                    ...params.InputProps,
                    endAdornment: (
                      <>
                        {loading.heat ? <CircularProgress color="inherit" size={20} /> : null}
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
                setFormData(prev => ({ ...prev, mill: value || '-' }));
              }}
              loading={loading.mill}
              disabled={!formData.heat}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Mill *"
                  required
                  fullWidth
                  inputRef={(input) => {
                    fieldRefs.current.mill = input;
                  }}
                  onKeyDown={(e) => handleKeyPress('mill', e)}
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      borderColor: 'primary.main',
                      '&:hover': {
                        borderColor: 'primary.dark',
                      },
                      '&.Mui-focused': {
                        borderColor: 'primary.main',
                      },
                    },
                  }}
                  InputProps={{
                    ...params.InputProps,
                    endAdornment: (
                      <>
                        {loading.mill ? <CircularProgress color="inherit" size={20} /> : null}
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
                setFormData(prev => ({ ...prev, location: value || '' }));
              }}
              onInputChange={(_, value) => {
                // Handle when user types a custom value
                if (value !== null) {
                  setFormData(prev => ({ ...prev, location: value }));
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
                  inputRef={(input) => {
                    fieldRefs.current.location = input;
                  }}
                  onKeyDown={(e) => handleKeyPress('location', e)}
                  placeholder="Select location..."
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
            {/* Debug info - remove this later */}
            <Typography variant="caption" color="text.secondary">
              Options: {locationOptions.length} | Loading: {loading.location ? 'Yes' : 'No'} | Selected: {formData.location}
            </Typography>
            <Button 
              size="small" 
              onClick={() => {
                console.log('Current locationOptions:', locationOptions);
                console.log('Current formData.location:', formData.location);
              }}
              sx={{ mt: 1 }}
            >
              Debug Location
            </Button>
          </Grid>

          {/* Type Field */}
          <Grid item xs={12} sm={6}>
            <Autocomplete
              freeSolo
              options={typeOptions}
              getOptionLabel={(option) => typeof option === 'string' ? option : option.label}
              value={typeOptions.find(option => option.value === formData.type) || null}
              onChange={(_, value) => {
                console.log('Type selected:', value);
                if (value && typeof value === 'object' && 'value' in value) {
                  setFormData(prev => ({ ...prev, type: value.value }));
                } else if (typeof value === 'string') {
                  setFormData(prev => ({ ...prev, type: value }));
                } else {
                  setFormData(prev => ({ ...prev, type: 'M' }));
                }
              }}
              onInputChange={(_, value) => {
                // Handle when user types a custom value
                if (value !== null) {
                  // Check if it's a label format (e.g., "M - Master")
                  const foundOption = typeOptions.find(option => option.label === value);
                  if (foundOption) {
                    setFormData(prev => ({ ...prev, type: foundOption.value }));
                  } else {
                    // Check if it's a value format (e.g., "M")
                    const foundByValue = typeOptions.find(option => option.value === value);
                    if (foundByValue) {
                      setFormData(prev => ({ ...prev, type: foundByValue.value }));
                    } else {
                      // Store the typed value as-is for validation
                      setFormData(prev => ({ ...prev, type: value }));
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
                  onKeyDown={(e) => handleKeyPress('type', e)}
                  placeholder="Select type..."
                />
              )}
            />
            {/* Debug info - remove this later */}
            <Typography variant="caption" color="text.secondary">
              Options: {typeOptions.length} | Selected: {formData.type}
            </Typography>
            <Button 
              size="small" 
              onClick={() => {
                console.log('Current typeOptions:', typeOptions);
                console.log('Current formData.type:', formData.type);
              }}
              sx={{ mt: 1 }}
            >
              Debug Type
            </Button>
          </Grid>

          {/* Remarks Field */}
          <Grid item xs={12} sm={6}>
            <Autocomplete
              freeSolo
              options={remarksOptions}
              value={formData.remarks || 'Conforms to Std'}
              onChange={(_, value) => {
                setFormData(prev => ({ ...prev, remarks: value || 'Conforms to Std' }));
              }}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Quality Standard"
                  fullWidth
                  inputRef={(input) => {
                    fieldRefs.current.remarks = input;
                  }}
                  onKeyDown={(e) => handleKeyPress('remarks', e)}
                />
              )}
            />
          </Grid>

          {/* Additional Comments */}
          <Grid item xs={12}>
            <TextField
              label="Additional Comments"
              fullWidth
              multiline
              inputRef={(input) => {
                fieldRefs.current.ad_cmts = input;
              }}
              onKeyDown={(e) => handleKeyPress('ad_cmts', e)}
              rows={2}
              value={formData.ad_cmts}
              onChange={(e) => setFormData(prev => ({
                ...prev,
                ad_cmts: e.target.value
              }))}
            />
          </Grid>

          {/* Count Type Selection */}
          <Grid item xs={12}>
            <Tabs
              value={formData.countType === COUNT_TYPES.PIECES ? 0 : 1}
              onChange={handleTabChange}
              indicatorColor="primary"
              textColor="primary"
              variant="fullWidth"
            >
              <Tab label="Pieces" />
              <Tab label="Bundles" />
            </Tabs>
          </Grid>

          {/* Quantity Input */}
          <Grid item xs={12}>
            {formData.countType === COUNT_TYPES.PIECES ? (
              <TextField
                label="Quantity (Pieces)"
                type="text"
                value={formData.quantity}
                inputRef={(input) => {
                  fieldRefs.current.quantity = input;
                }}
                onKeyDown={(e) => handleKeyPress('quantity', e)}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  quantity: e.target.value
                }))}
                fullWidth
                required
              />
            ) : (
              <>
                <Button
                  onClick={() => setOpenBundleModal(true)}
                  variant="outlined"
                  startIcon={<Add />}
                  fullWidth
                  sx={{ mb: 2 }}
                >
                  {formData.bundles.length > 0 
                    ? `Edit Bundles (${formData.bundles.length})` 
                    : "Add Bundles"}
                </Button>
                <TextField
                  label="Total Quantity"
                  type="number"
                  value={formData.quantity}
                  fullWidth
                  disabled
                />
              </>
            )}
          </Grid>

          {/* Checker Count */}
          {/* <Grid item xs={12} sm={6}>
            <TextField
              label="Checker Count"
              type="number"
              fullWidth
              value={formData.checker_count}
              onChange={(e) => setFormData(prev => ({
                ...prev,
                checker_count: parseInt(e.target.value) || 0
              }))}
              inputProps={{ min: 1 }}
            />
          </Grid> */}
        </Grid>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose}>Cancel</Button>
        <Button 
          onClick={handleSubmit}
          variant="contained"
          color="primary"
          disabled={!formData.form || !formData.quantity || formData.quantity === '' || loading.submitting}
          startIcon={loading.submitting ? <CircularProgress size={20} /> : <Save />}
        >
          {loading.submitting ? 'Submitting...' : 'Add Line Item'}
        </Button>
      </DialogActions>

      {/* Bundle Modal */}
      <Dialog 
        open={openBundleModal} 
        onClose={() => setOpenBundleModal(false)} 
        fullWidth 
        maxWidth="md"
      >
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
                        type="number"
                        value={bundle.num_of_bundle || ''}
                        onChange={(e) => {
                          const value = parseInt(e.target.value) || 0;
                          handleBundleChange(index, "num_of_bundle", value);
                        }}
                        fullWidth
                        inputProps={{ min: 1 }}
                      />
                    </TableCell>
                    <TableCell>
                      <TextField
                        type="number"
                        value={bundle.bundle_count || ''}
                        onChange={(e) => {
                          const value = parseInt(e.target.value) || 0;
                          handleBundleChange(index, "bundle_count", value);
                        }}
                        fullWidth
                        inputProps={{ min: 1 }}
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
            onClick={() => setOpenBundleModal(false)}
            color="primary"
            variant="contained"
          >
            Save Bundles
          </Button>
        </DialogActions>
      </Dialog>
    </Dialog>
  );
};

export default AddLineItemDialog;