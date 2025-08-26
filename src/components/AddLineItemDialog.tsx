import React, { useState, useEffect } from 'react';
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
  sectionId: string;
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
  sectionId,
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
    mill: '',
    heat: '',
    quantity: 0,
    remarks: '',
    ad_cmts: '',
    type: '',
    location: '',
    countType: COUNT_TYPES.PIECES,
    checker_count: 0,
    bundles: [],
    tag_id: 0
  });

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

  const [options, setOptions] = useState({
    form: [] as string[],
    grade: [] as string[],
    size: [] as string[],
    finish: [] as string[],
    extFinish: [] as string[],
    width: [] as string[],
    length: [] as string[],
    mill: [] as string[],
    heat: [] as string[],
    remarks: [] as string[],
    type: [] as { label: string; value: string }[],
    location: [] as string[]
  });

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
    if (section_id) {
      servicesAPI.getSections(section_id)
      .then(res => setSectionData(res.data))
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
          setOptions(prev => ({
            ...prev,
            form: formResponse.data.data.map((item: any) => item.item_name)
          }));
        }

        // Fetch remarks options
        const remarksResponse = await servicesAPI.getRemarks();
        if (remarksResponse.data?.Data) {
          setOptions(prev => ({
            ...prev,
            remarks: remarksResponse.data.Data.map((r: any) => r.inq_desc15.trim() || "null")
          }));
        }

        // Initialize type options (same as counter page)
        setOptions(prev => ({
          ...prev,
          type: [
            { value: 'D', label: 'D - Drop' },
            { value: 'F', label: 'F - Finished' },
            { value: 'M', label: 'M - Master' },
            { value: 'R', label: 'R - Reject' },
            { value: 'S', label: 'S - Scrap' },
            { value: 'W', label: 'W - Work in Process' }
          ]
        }));

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

  // Fetch dependent options
  const fetchDependentOptions = async (
    endpoint: string,
    params: Record<string, string>,
    optionKey: keyof typeof options,
    loadingKey: keyof typeof loading,
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
        
        setOptions(prev => ({ ...prev, [optionKey]: filteredOptions }));
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
        "grade",
        "grade",
        "prd_grd"
      );
    } else {
      setOptions(prev => ({ ...prev, grade: [] }));
      setFormData(prev => ({
        ...prev,
        grade: '',
        size: '',
        finish: '',
        extendedFinish: '',
        width: '',
        length: '',
        mill: '-',
        heat: ''
      }));
    }
  }, [formData.form]);

  // Fetch size options when grade changes
  useEffect(() => {
    if (formData.form && formData.grade) {
      fetchDependentOptions(
        "/services/size",
        { form: formData.form, grade: formData.grade },
        "size",
        "size",
        "prd_size"
      );
    } else {
      setOptions(prev => ({ ...prev, size: [] }));
      setFormData(prev => ({
        ...prev,
        size: '',
        finish: '',
        extendedFinish: '',
        width: '',
        length: '',
        mill: '-',
        heat: ''
      }));
    }
  }, [formData.grade]);

  // Fetch finish options when size changes
  useEffect(() => {
    if (formData.form && formData.grade && formData.size) {
      fetchDependentOptions(
        "/services/finish",
        { form: formData.form, grade: formData.grade, size: formData.size },
        "finish",
        "finish",
        "prd_fnsh"
      );
    } else {
      setOptions(prev => ({ ...prev, finish: [] }));
      setFormData(prev => ({
        ...prev,
        finish: '',
        extendedFinish: '',
        width: '',
        length: '',
        mill: '-',
        heat: ''
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
        "extFinish",
        "extFinish",
        "prd_ef_svar"
      );
    } else {
      setOptions(prev => ({ ...prev, extFinish: [] }));
      setFormData(prev => ({
        ...prev,
        extendedFinish: '',
        width: '',
        length: '',
        mill: '-',
        heat: ''
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
        "width",
        "width",
        "prd_wdth"
      );
    } else {
      setOptions(prev => ({ ...prev, width: [] }));
      setFormData(prev => ({
        ...prev,
        width: '',
        length: '',
        mill: '-',
        heat: ''
      }));
    }
  }, [formData.extendedFinish]);

  // Fetch length options when width changes
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
        "length",
        "length",
        "prd_lgth"
      );
    } else {
      setOptions(prev => ({ ...prev, length: [] }));
      setFormData(prev => ({
        ...prev,
        length: '',
        mill: '-',
        heat: ''
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
          "heat",
          "heat",
          "prd_heat"
        );
      }, 300); // 300ms debounce

      return () => clearTimeout(timeoutId);
    } else {
      setOptions(prev => ({ ...prev, heat: [] }));
    }
    
    // Clear mill when heat changes, but preserve default value if heat is default
    setFormData(prev => ({ ...prev, mill: formData.heat === '-' ? '-' : '' }));
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
        "mill",
        "mill",
        "het_mill" // fieldName
      );
    } else {
      setOptions(prev => ({ ...prev, mill: [] }));
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
              .map((loc: any) => loc.prd_loc)
              .filter((loc: any) => loc !== null && loc !== undefined) // Filter out null/undefined first
              .map((loc: any) => loc.trim()) // Then trim the valid values
              .filter((loc: any) => loc && loc !== 'null' && loc !== '') // Final filter for empty strings
              .sort(); // Sort alphabetically for better UX
            setOptions(prev => ({ ...prev, location: locations }));
            console.log('Fetched location options:', locations);
            console.log('Number of location options:', locations.length);
            console.log('First few options:', locations.slice(0, 5));
          } else {
            console.log('No Data property in response:', responseData);
          }
        } catch (error) {
          console.error('Error fetching location options:', error);
          setOptions(prev => ({ ...prev, location: [] }));
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
      quantity: 0,
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
        quantity: totalQuantity
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
      remarks: formData.remarks || null,
      ad_cmts: formData.ad_cmts || null,
      count_type: formData.countType,
      qty: formData.countType === COUNT_TYPES.PIECES ? formData.quantity : 
           formData.bundles.reduce((sum, b) => sum + (b.num_of_bundle * b.bundle_count), 0),
      counted_by: parseInt(selectedUser || "0"),
      team_id: parseInt(teamId || "0"),
      location_id: parseInt(locationId || "0"),
      section_id: parseInt(sectionId || "0"),
      role: selectedRole,
      verified: false,
      bundles: formData.countType === COUNT_TYPES.BUNDLES ? 
        formData.bundles.map(b => ({
          ...b,
          tag_id: formData.tag_id
        })) : 
        undefined
    };

    try {
      setLoading(prev => ({ ...prev, submitting: true }));
      await onSubmit(payload);
      onClose();
    } finally {
      setLoading(prev => ({ ...prev, submitting: false }));
    }
  };

  const handleFormChange = (_: unknown, value: string | null) => {
    setFormData(prev => ({ ...prev, form: value || '' }));
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
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

        <Grid container spacing={2} sx={{ mt: 1 }}>
          {/* Form Field */}
          <Grid item xs={12} sm={6}>
            <Autocomplete
              freeSolo
              options={options.form}
              value={formData.form}
              onChange={handleFormChange}
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
              options={options.grade}
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
              options={options.size}
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
              options={options.finish}
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
              options={options.extFinish}
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
              options={options.width}
              value={formData.width}
              onChange={(_, value) => {
                setFormData(prev => ({ ...prev, width: value || '' }));
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
              options={options.length}
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
              options={options.heat}
              value={formData.heat || (options.heat.length ? options.heat[1] : '')}
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
              options={options.mill}
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
              options={options.location}
              value={formData.location}
              onChange={(_, value) => {
                console.log('Location selected:', value);
                setFormData(prev => ({ ...prev, location: value || '' }));
              }}
              loading={loading.location}
              onOpen={() => console.log('Autocomplete opened, options:', options.location)}
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
              Options: {options.location.length} | Loading: {loading.location ? 'Yes' : 'No'} | Selected: {formData.location}
            </Typography>
            <Button 
              size="small" 
              onClick={() => {
                console.log('Current locationOptions:', options.location);
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
              options={options.type}
              getOptionLabel={(option) => option.label}
              value={options.type.find(option => option.value === formData.type) || null}
              onChange={(_, value) => {
                console.log('Type selected:', value);
                setFormData(prev => ({ ...prev, type: value ? value.value : '' }));
              }}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Type"
                  fullWidth
                  placeholder="Select type..."
                />
              )}
            />
            {/* Debug info - remove this later */}
            <Typography variant="caption" color="text.secondary">
              Options: {options.type.length} | Selected: {formData.type}
            </Typography>
            <Button 
              size="small" 
              onClick={() => {
                console.log('Current typeOptions:', options.type);
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
              options={options.remarks}
              value={formData.remarks}
              onChange={(_, value) => {
                setFormData(prev => ({ ...prev, remarks: value || '' }));
              }}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Quality Standard"
                  fullWidth
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
                type="number"
                value={formData.quantity}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  quantity: parseInt(e.target.value) || 0
                }))}
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
        <Button onClick={onClose}>Cancel</Button>
        <Button 
          onClick={handleSubmit}
          variant="contained"
          color="primary"
          disabled={!formData.form || !formData.quantity || loading.submitting}
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