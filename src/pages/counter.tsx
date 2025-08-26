import React, { useState, useEffect } from "react";
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
  CardHeader,
  Grid,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Tabs,
  Tab,
  Chip,
  LinearProgress,
  FormControl
} from "@mui/material";
import { servicesAPI } from "../config/api";
import { Add, Delete, Save, History, CheckCircle, Error as ErrorIcon } from "@mui/icons-material";
import { useParams, useNavigate } from "react-router-dom";
import TransactionsTableModal from '../components/TransactionsTableModal';

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
  quantity: number;
  countType: CountType;
  bundles: BundleItem[];
  remarks: string;
  mill: string;
  heat: string;
  location: string;
  ad_cmts: string;
}

interface TeamTagRange {
  tag_from: number;
  tag_to: number;
  current_tag: number;
}

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
    quantity: 0,
    countType: 'pcs',
    bundles: [],
    remarks: 'Conforms to Std',
    ad_cmts: '',
    mill: '-',
    heat: '-',
    location: ''
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
    mill: false,
    heat: false,
    location: false,
    general: false
  });
  const [tagRange, setTagRange] = useState<TeamTagRange | null>(null);
  const [isTagExhausted, setIsTagExhausted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [openBundleModal, setOpenBundleModal] = useState(false);
  const [openTableModal, setOpenTableModal] = useState(false);
  
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
  const [millOptions, setMillOptions] = useState<string[]>([]);
  const [heatOptions, setHeatOptions] = useState<string[]>([]);
  const [locationOptions, setLocationOptions] = useState<string[]>([]);
  const [remarksOptions, setRemarksOptions] = useState<string[]>([]);
  const [locationData, setLocationData] = useState<LocationData | null>(null);
  
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

  // Function to reset form to initial state
  const resetForm = () => {
    setFormData({
      tag_id: 0,
      form: '',
      type: 'M',
      grade: '',
      size: '',
      finish: '',
      extendedFinish: '',
      width: '',
      length: '',
      quantity: 0,
      countType: 'pcs',
      bundles: [],
      remarks: 'Conforms to Std',
      ad_cmts: '',
      mill: '-',
      heat: '-',
      location: ''
    });
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
    servicesAPI.getSections(location_id?.toString() || '')
    .then(res => setSectionData(res.data))
    .catch(error => console.error('Error fetching section:', error));

    // Fetch team data
    servicesAPI.getTeam(team_id?.toString() || '')
    .then(res => setTeamData(res.data))
    .catch(error => console.error('Error fetching team:', error));
    const fetchInitialData = async () => {
      try {
        setLoading(prev => ({ ...prev, general: true }));
        
        // Fetch tag range
        const tagResponse = await servicesAPI.getTeamTagRange(team_id?.toString() || '');
        setTagRange(tagResponse.data);
        setIsTagExhausted(tagResponse.data.current_tag > tagResponse.data.tag_to);
        setFormData(prev => ({ ...prev, tag_id: tagResponse.data.current_tag }));

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
            return isNaN(numValue) ? ' ' : numValue.toFixed(2);
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
        "width", // fieldName
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
    
    // Clear mill when heat changes, but preserve default value if heat is default
    setFormData(prev => ({ ...prev, mill: formData.heat === '-' ? '-' : '' }));
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

  // Form handlers
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === "quantity" ? Number(value) : value,
    }));
  };



  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const selectedRole = localStorage.getItem('Selected Role');
  
    // Validation
    if (isTagExhausted) {
      setSnackbar({
        open: true,
        message: "Tag range exhausted! Please request new tags.",
        severity: "error"
      });
      return;
    }

    const requiredFields = [
      { field: formData.form, name: "Form" },
      { field: formData.grade, name: "Grade" },
      { field: formData.size, name: "Size" },
      { field: formData.finish, name: "Finish" },
      { field: formData.mill && formData.mill !== '-', name: "Mill" },
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
        tag_id: formData.tag_id,
        form: formData.form,
        type: formData.type,
        grade: formData.grade,
        size: formData.size,
        finish: formData.finish || null,
        ext_finish: formData.extendedFinish || null,
        width: formData.width ? parseFloat(formData.width) : null,
        length: formData.length ? parseFloat(formData.length) : null,
        mill: formData.mill && formData.mill !== '-' ? formData.mill : null,
        heat: formData.heat || null,
        location: formData.location || null,
        remarks: formData.remarks && formData.remarks.trim() !== '' && formData.remarks !== 'Conforms to Std' ? formData.remarks : 'Conforms to Std',
        ad_cmts: formData.ad_cmts || null,
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
            tag_id: formData.tag_id
          })) : 
          undefined
      };

      // Save the transaction
      const response = await servicesAPI.createTransaction(payload);

      if (!response.data.success) {
        const errorMessage = response.data.message || 'Failed to save transaction';
        throw { message: errorMessage };
      }

      // Show success message
      setSnackbar({
        open: true,
        message: `Transaction saved successfully! Form reset.`,
        severity: "success"
      });

      // Reset the form to initial state
      resetForm();

      // Refresh the submitted transactions list
      await refreshSubmittedTransactions();

      // Get next tag if available
      if (tagRange && !isTagExhausted) {
        try {
          const tagResponse = await servicesAPI.getTeamTagRange(team_id?.toString() || '');
          if (tagResponse.data.current_tag) {
            setTagRange(tagResponse.data);
            setIsTagExhausted(tagResponse.data.current_tag > tagResponse.data.tag_to);
            setFormData(prev => ({ ...prev, tag_id: tagResponse.data.current_tag }));
          }
        } catch {
          console.log('No more tags available or error getting next tag');
        }
      }

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
    <Box sx={{ p: 3, maxWidth: 1800, margin: '0 auto' }}>
      {/* Header Section */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Inventory Counting
        </Typography>
        <Typography variant="subtitle1" color="text.secondary">
        Location: {locationData?.location_desc || 'Loading...'} | 
        Section: {sectionData?.section_desc || 'Loading...'} | 
        Team: {teamData?.team_name || 'Loading...'}
        </Typography>
      </Box>

      {loading.general && <LinearProgress sx={{ mb: 2 }} />}

      {/* Tag Status Card */}
      <Card sx={{ mb: 4 }}>
        <CardHeader 
          title="Tag Information" 
          action={
            isTagExhausted ? (
              <Chip 
                icon={<ErrorIcon />} 
                label="TAG RANGE EXHAUSTED" 
                color="error" 
                variant="outlined"
              />
            ) : (
              <Chip 
                icon={<CheckCircle />} 
                label="TAGS AVAILABLE" 
                color="success" 
                variant="outlined"
              />
            )
          }
        />
        <CardContent>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <Typography variant="h6" component="div">
                Current Tag: {formData.tag_id}
              </Typography>
            </Grid>
            <Grid item xs={12} sm={6}>
              <Typography variant="body1" component="div">
                Range: {tagRange?.tag_from} - {tagRange?.tag_to}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {tagRange && `${tagRange.tag_to - tagRange.current_tag + 1} tags remaining`}
              </Typography>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Main Form */}
      <Card sx={{ mb: 4 }}>
        <CardHeader title="Item Details" />
        <CardContent>
          <form onSubmit={handleSubmit}>
            <Grid container spacing={2}>
              {/* Form Field */}
              <Grid item xs={12} sm={6}>
                <Autocomplete
                  freeSolo
                  options={formOptions}
                  value={formData.form}
                  onChange={(_, value) => {
                    setFormData(prev => ({ ...prev, form: value || '' }));
                  }}
                  loading={loading.form}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label="Form"
                      fullWidth
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
                  onChange={(_, value) => {
                    setFormData(prev => ({ ...prev, finish: value || '' }));
                  }}
                  loading={loading.finish}
                  disabled={!formData.size}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label="Finish"
                      fullWidth
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
                  options={extfinishOptions}
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
                  value={formData.width ? Number(formData.width).toFixed(2) : ''}
                  onChange={(_, value) => {
                    const formattedValue = value ? Number(value).toFixed(2) : '';
                    setFormData(prev => ({ ...prev, width: formattedValue }));
                  }}
                  loading={loading.width}
                  disabled={!formData.extendedFinish}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label="Width"
                      fullWidth
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
                  value={formData.heat || (heatOptions.length ? heatOptions[1] : '')}
                  onChange={(_, value) => {
                    setFormData(prev => ({ ...prev, heat: value || '' }));
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
                  value={formData.mill}
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
                  options={locationOptions}
                  value={formData.location}
                  onChange={(_, value) => {
                    console.log('Location selected:', value);
                    setFormData(prev => ({ ...prev, location: value || '' }));
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
                  options={typeOptions}
                  getOptionLabel={(option) => option.label}
                  value={typeOptions.find(option => option.value === formData.type) || null}
                  onChange={(_, value) => {
                    setFormData(prev => ({ ...prev, type: value ? value.value : '' }));
                  }}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label="Type"
                      fullWidth
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
                    setFormData(prev => ({ ...prev, remarks: value || 'Conforms to Std' }));
                  }}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label="Quality Code"
                      fullWidth
                    />
                  )}
                />
              </Grid>

              <Grid item xs={12} sm={6}>
              <TextField
                label="Additional Comments"
                fullWidth
                value={formData.ad_cmts}
                onChange={(e) => {
                  setFormData(prev => ({ ...prev, ad_cmts: e.target.value }));
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
                  >
                    <Tab label="Pieces" />
                    <Tab label="Bundles" />
                  </Tabs>
                </FormControl>
              </Grid>

              {/* Quantity Input */}
              <Grid item xs={12}>
                {formData.countType === COUNT_TYPES.PIECES ? (
                  <TextField
                    label="Quantity (Pieces)"
                    name="quantity"
                    type="number"
                    value={formData.quantity}
                    onChange={handleChange}
                    fullWidth
                    required
                    inputProps={{ min: 1 }}
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
                      name="quantity"
                      type="number"
                      value={formData.quantity}
                      fullWidth
                      disabled
                    />
                  </>
                )}
              </Grid>

              {/* Form Actions */}
              <Grid item xs={12}>
                <Box sx={{ display: 'flex', gap: 2 }}>
                  <Button
                    type="submit"
                    variant="contained"
                    color="primary"
                    size="large"
                    startIcon={<Save />}
                    disabled={isSubmitting || isTagExhausted}
                    fullWidth
                  >
                    {isSubmitting ? (
                      <>
                        <CircularProgress size={24} sx={{ mr: 1 }} />
                        Saving...
                      </>
                    ) : (
                      'Save Transaction'
                    )}
                  </Button>
                  <Button
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
                  >
                    View History
                  </Button>
                </Box>
              </Grid>
            </Grid>
          </form>
        </CardContent>
      </Card>

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
          setSubmittedData(prev => 
            prev.map(transaction => 
              transaction.id === updatedTransaction.id || transaction.tag_id === updatedTransaction.tag_id 
                ? updatedTransaction 
                : transaction
            )
          );
          // Refresh the data after updating a transaction
          await refreshSubmittedTransactions();
        }}
        onUpdateBundles={async (transactionId, updatedBundles) => {
          setSubmittedData(prev => 
            prev.map(transaction => 
              transaction.id === transactionId || transaction.tag_id === transactionId
                ? { ...transaction, bundles: updatedBundles }
                : transaction
            )
          );
          // Refresh the data after updating bundles
          await refreshSubmittedTransactions();
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