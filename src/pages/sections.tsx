import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Alert,
  Box,
  CircularProgress,
  Chip,
  IconButton,
  Tabs,
  Tab
} from "@mui/material";
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import DescriptionIcon from '@mui/icons-material/Description';
import CloseIcon from '@mui/icons-material/Close';
import StorageIcon from '@mui/icons-material/Storage';
import DownloadIcon from '@mui/icons-material/Download';
import * as XLSX from 'xlsx';
import { servicesAPI } from '../config/api';

interface SectionsProps {
  open: boolean;
  onClose: () => void;
  onCreate: () => void;
  location_id: string;
  warehouse: string;
  location_desc: string;
  branch: string;
  existingSections: string[];
}

const Sections: React.FC<SectionsProps> = ({
  open,
  onClose,
  onCreate,
  location_id,
  warehouse,
  location_desc,
  branch,
  existingSections
}) => {
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [cleanedSections, setCleanedSections] = useState<string[]>([]);
  const [duplicatesRemoved, setDuplicatesRemoved] = useState<number>(0);
  const [isCreating, setIsCreating] = useState<boolean>(false);
  const [creationSuccess, setCreationSuccess] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<number>(0);
  const [preloadSections, setPreloadSections] = useState<{loc_loc: string}[]>([]);
  const [isLoadingPreload, setIsLoadingPreload] = useState<boolean>(false);
  const [selectedPreloadSections, setSelectedPreloadSections] = useState<string[]>([]);
  const [success, setSuccess] = useState<string | null>(null);
  const [currentExistingSections, setCurrentExistingSections] = useState<string[]>(existingSections || []);
  const [isExporting, setIsExporting] = useState<boolean>(false);

  const hasExistingSections = existingSections && existingSections.length > 0;

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    setError(null);
    const file = e.target.files?.[0];
    if (!file) return;

    // Check file type
    if (!file.name.match(/\.(xlsx|xls|csv)$/)) {
      setError("Please upload a valid Excel file (xlsx, xls, or csv)");
      return;
    }

    setUploadedFile(file);
    processExcelFile(file);
  };

  const processExcelFile = (file: File) => {
    setIsProcessing(true);
    setError(null);

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: 'binary' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

        // Extract sections from the first column
        const sections: string[] = [];
        jsonData.forEach((row: any) => {
          if (row[0] && typeof row[0] === 'string') {
            const section = row[0].toString().trim();
            if (section) {
              sections.push(section);
            }
          }
        });

        // Remove duplicates and filter out existing sections
        const uniqueSections = [...new Set(sections)];
        const filteredSections = uniqueSections.filter(section => 
          !existingSections.includes(section)
        );

        setCleanedSections(filteredSections);
        setDuplicatesRemoved(uniqueSections.length - filteredSections.length);
        setIsProcessing(false);
      } catch (error) {
        console.error('Error processing Excel file:', error);
        setError('Failed to process Excel file. Please check the file format.');
        setIsProcessing(false);
      }
    };

    reader.readAsBinaryString(file);
  };

  const handleCreateFromPreload = async () => {
    if (selectedPreloadSections.length === 0) {
      setError("Please select at least one section to create");
      return;
    }

    setIsCreating(true);
    setError(null);

    try {
      const response = await servicesAPI.createBulkSections({
        location_id: location_id,
        sections: selectedPreloadSections
      });

      console.log('Bulk sections created from preload:', response.data);
      
      const { created, skipped } = response.data;
      let successMessage = `${created} sections created successfully`;
      if (skipped > 0) {
        successMessage += `, ${skipped} sections already existed`;
      }
      
      setSuccess(successMessage);
      setCreationSuccess(true);
      onCreate();
    } catch (error) {
      console.error("Error creating sections from preload:", error);
      setError("Failed to create sections. Please try again.");
    } finally {
      setIsCreating(false);
    }
  };

  const handleCreateSections = async () => {
    if (cleanedSections.length === 0) {
      setError("No valid sections to create after cleaning the data");
      return;
    }

    setIsCreating(true);
    setError(null);

    try {
      const response = await servicesAPI.createBulkSections({
        location_id: location_id,
        sections: cleanedSections
      });

      console.log('Bulk sections created from Excel:', response.data);
      
      // Show detailed success message
      const { created, skipped } = response.data;
      let successMessage = `${created} sections created successfully`;
      if (skipped > 0) {
        successMessage += `, ${skipped} sections already existed`;
      }
      
      console.log(successMessage);
      
      setCreationSuccess(true);
      onCreate();
    } catch (error) {
      console.error("Error creating sections:", error);
      setError("Failed to create sections. Please try again.");
    } finally {
      setIsCreating(false);
    }
  };

  const handleRemoveFile = () => {
    setUploadedFile(null);
    setCleanedSections([]);
    setDuplicatesRemoved(0);
    setError(null);
  };

  const handleClose = () => {
    setUploadedFile(null);
    setCleanedSections([]);
    setDuplicatesRemoved(0);
    setCreationSuccess(false);
    setError(null);
    setSuccess(null);
    setActiveTab(0);
    setPreloadSections([]);
    setSelectedPreloadSections([]);
    onClose();
  };

  useEffect(() => {
    if (open) {
      setUploadedFile(null);
      setCleanedSections([]);
      setDuplicatesRemoved(0);
      setCreationSuccess(false);
      setError(null);
      setSuccess(null);
      setActiveTab(0);
      setPreloadSections([]);
      setSelectedPreloadSections([]);
    }
  }, [open]);

  useEffect(() => {
    if (open && activeTab === 1 && preloadSections.length === 0) {
      loadPreloadSections();
    }
  }, [open, activeTab]);

  useEffect(() => {
    if (open) {
      fetchExistingSections();
    }
  }, [open]);

  const fetchExistingSections = async () => {
    try {
      const response = await servicesAPI.getSections(location_id);
      const existingSectionNames = response.data.map((section: any) => section.section_desc);
      setCurrentExistingSections(existingSectionNames);
    } catch (error) {
      console.error('Error fetching existing sections:', error);
      setCurrentExistingSections(existingSections || []);
    }
  };

  const loadPreloadSections = async () => {
    setIsLoadingPreload(true);
    try {
      const response = await servicesAPI.getPreloadSections(warehouse);
      console.log('Preload sections response:', response.data);
      
      // The main project returns response.data directly, which contains the Data array
      const sections = Array.isArray(response.data.Data) ? response.data.Data : [];
      setPreloadSections(sections);
    } catch (error) {
      console.error('Error loading preload sections:', error);
      setError('Failed to load preload sections');
      setPreloadSections([]); // Set empty array on error
    } finally {
      setIsLoadingPreload(false);
    }
  };

  const handlePreloadSectionToggle = (section: string) => {
    // Don't allow toggling if the section already exists
    if (currentExistingSections.includes(section)) {
      return;
    }
    
    setSelectedPreloadSections(prev => 
      prev.includes(section) 
        ? prev.filter(s => s !== section)
        : [...prev, section]
    );
  };

  const handleExportSectionsManagement = async () => {
    try {
      setIsExporting(true);
      setError(null);
      setSuccess(null);

      const [sectionsResponse, assignedResponse, teamsResponse] = await Promise.all([
        servicesAPI.getSections(location_id),
        servicesAPI.getAssignedLocations(),
        servicesAPI.getTeamsWithMembers()
      ]);

      const sectionsData = Array.isArray(sectionsResponse.data) ? sectionsResponse.data : [];
      const assignedData = Array.isArray(assignedResponse.data) ? assignedResponse.data : [];
      const teamsData = Array.isArray(teamsResponse.data) ? teamsResponse.data : [];

      const locationAssignments = assignedData.filter(
        (assignment: any) => assignment.location_id?.toString() === location_id.toString()
      );

      const rows = sectionsData.map((section: any, index: number) => {
        const assignment = locationAssignments.find(
          (a: any) => a.sub_location_id?.toString() === section.section_id?.toString()
        );

        const team = assignment
          ? teamsData.find((t: any) => t.team_id?.toString() === assignment.team_id?.toString())
          : null;

        const groupedMembers: Record<string, Set<string>> = {};
        if (team?.members) {
          team.members.forEach((member: any) => {
            const name = typeof member.full_name === 'string' ? member.full_name.trim() : '';
            const role = typeof member.role_desc === 'string' ? member.role_desc.trim() : '';
            if (!name) return;
            if (!groupedMembers[name]) groupedMembers[name] = new Set<string>();
            if (role) groupedMembers[name].add(role);
          });
        }
        const memberWithRoles = Object.entries(groupedMembers).map(([name, roleSet]) => {
          const roles = Array.from(roleSet);
          return roles.length > 0 ? `${name} (${roles.join(', ')})` : name;
        });

        return {
          'No.': index + 1,
          'Section Name': section.section_desc || '-',
          'Assigned Team': assignment?.team_name || team?.team_name || 'Not Assigned',
          'Team Members & Roles': memberWithRoles.length > 0 ? memberWithRoles.join('; ') : '-',
          'Assignment Status': assignment?.status || 'Not Assigned',
          'Assigned At': assignment?.assigned_at ? new Date(assignment.assigned_at).toLocaleString() : '-'
        };
      });

      const worksheet = XLSX.utils.json_to_sheet([]);
      XLSX.utils.sheet_add_aoa(worksheet, [
        ['Sections Management Export'],
        [`Location: ${location_desc} | Branch: ${branch} | Warehouse: ${warehouse}`],
        [`Generated: ${new Date().toLocaleString()}`],
        []
      ], { origin: 'A1' });
      XLSX.utils.sheet_add_json(worksheet, rows, { origin: 'A5', skipHeader: false });
      worksheet['!cols'] = [
        { wch: 6 },
        { wch: 24 },
        { wch: 24 },
        { wch: 70 },
        { wch: 20 },
        { wch: 22 }
      ];
      worksheet['!autofilter'] = { ref: 'A5:F5' };
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Sections Export');
      const fileName = `Sections_Management_${location_id}_${new Date().toISOString().slice(0, 10)}.xlsx`;
      XLSX.writeFile(workbook, fileName);

      setSuccess('Sections Management exported successfully.');
    } catch (exportError) {
      console.error('Error exporting sections management:', exportError);
      setError('Failed to export sections data. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
      <DialogTitle>
        {creationSuccess ? "Sections Created Successfully" : "Create New Sections"}
        <Typography
          variant="body2"
          color="textSecondary"
          style={{ marginTop: "5px", fontSize: "0.875rem" }}
        >
          for {location_desc} | {branch} | {warehouse}
        </Typography>
      </DialogTitle>
      <DialogContent>
        {hasExistingSections && !creationSuccess && (
          <Alert severity="info" sx={{ mb: 2 }}>
            Sections already exist for this location: {existingSections.join(", ")}
          </Alert>
        )}

        {creationSuccess ? (
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', p: 3 }}>
            <CheckCircleIcon color="success" sx={{ fontSize: 60, mb: 2 }} />
            <Typography variant="h6" color="textSecondary" gutterBottom>
              Sections Created
            </Typography>
            {success && (
              <Typography variant="body1" sx={{ mb: 2 }}>
                {success}
              </Typography>
            )}
          </Box>
        ) : (
          <>
            {error && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {error}
              </Alert>
            )}

            <Tabs value={activeTab} onChange={(_, newValue) => setActiveTab(newValue)} sx={{ mb: 2 }}>
              <Tab 
                icon={<CloudUploadIcon />} 
                label="Upload Excel File" 
                iconPosition="start"
              />
              <Tab 
                icon={<StorageIcon />} 
                label="Select from Preload" 
                iconPosition="start"
              />
            </Tabs>

            {activeTab === 0 && (
              <Box>
                <Box sx={{ mb: 3 }}>
                  <input
                    accept=".xlsx,.xls,.csv"
                    style={{ display: 'none' }}
                    id="excel-upload"
                    type="file"
                    onChange={handleFileUpload}
                  />
                  <label htmlFor="excel-upload">
                    <Button
                      variant="outlined"
                      component="span"
                      startIcon={<CloudUploadIcon />}
                      sx={{ mb: 2 }}
                    >
                      Upload Excel File
                    </Button>
                  </label>
                  <Typography variant="body2" color="textSecondary" sx={{ ml: 1 }}>
                    Upload an Excel file with section names in the first column
                  </Typography>
                </Box>

                {uploadedFile && (
                  <Box sx={{ mb: 2 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                      <DescriptionIcon color="primary" />
                      <Typography variant="body1">
                        {uploadedFile.name}
                      </Typography>
                      <IconButton size="small" onClick={handleRemoveFile}>
                        <CloseIcon />
                      </IconButton>
                    </Box>
                    
                    {isProcessing && (
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <CircularProgress size={20} />
                        <Typography variant="body2">Processing file...</Typography>
                      </Box>
                    )}

                    {cleanedSections.length > 0 && (
                      <Box>
                        <Typography variant="body2" color="textSecondary" sx={{ mb: 1 }}>
                          Found {cleanedSections.length} unique sections
                          {duplicatesRemoved > 0 && ` (${duplicatesRemoved} duplicates removed)`}
                        </Typography>
                        <Box sx={{ 
                          maxHeight: 150, 
                          overflow: 'auto', 
                          border: '1px solid #e0e0e0', 
                          borderRadius: 1, 
                          p: 1 
                        }}>
                          {cleanedSections.map((section, index) => (
                            <Chip 
                              key={index} 
                              label={section} 
                              size="small" 
                              sx={{ m: 0.5 }} 
                            />
                          ))}
                        </Box>
                      </Box>
                    )}
                  </Box>
                )}
              </Box>
            )}

            {activeTab === 1 && (
              <Box>
                <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
                  Select sections from the preloaded list for {warehouse}
                </Typography>
                
                {isLoadingPreload ? (
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <CircularProgress size={20} />
                    <Typography variant="body2">Loading preload sections...</Typography>
                  </Box>
                ) : (
                  <Box sx={{ 
                    maxHeight: 300, 
                    overflow: 'auto', 
                    border: '1px solid #e0e0e0', 
                    borderRadius: 1, 
                    p: 1 
                  }}>
                    {Array.isArray(preloadSections) && preloadSections.length > 0 ? (
                      preloadSections
                        .filter(section => section.loc_loc && section.loc_loc.trim() !== '')
                        .map((section, index) => {
                          const isExisting = currentExistingSections.includes(section.loc_loc);
                          const isSelected = selectedPreloadSections.includes(section.loc_loc);
                          
                          return (
                            <Chip
                              key={index}
                              label={isExisting ? `${section.loc_loc} (Already Created)` : section.loc_loc}
                              onClick={() => handlePreloadSectionToggle(section.loc_loc)}
                              color={isSelected ? "primary" : isExisting ? "default" : "default"}
                              variant={isSelected ? "filled" : "outlined"}
                              disabled={isExisting}
                              sx={{ 
                                m: 0.5,
                                opacity: isExisting ? 0.5 : 1,
                                cursor: isExisting ? 'not-allowed' : 'pointer',
                                '&.Mui-disabled': {
                                  opacity: 0.5,
                                  textDecoration: 'line-through'
                                }
                              }}
                            />
                          );
                        })
                    ) : (
                      <Typography variant="body2" color="textSecondary">
                        No preload sections available for {warehouse}
                      </Typography>
                    )}
                  </Box>
                )}
              </Box>
            )}
          </>
        )}
      </DialogContent>
      <DialogActions>
        <Button
          onClick={handleExportSectionsManagement}
          color="primary"
          variant="outlined"
          startIcon={<DownloadIcon />}
          disabled={isExporting}
        >
          {isExporting ? (
            <>
              <CircularProgress size={18} sx={{ mr: 1 }} />
              Exporting...
            </>
          ) : 'Export'}
        </Button>
        <Button onClick={handleClose} color="primary">
          {creationSuccess ? "Close" : "Cancel"}
        </Button>
        {!creationSuccess && !hasExistingSections && (
          <>
            {activeTab === 0 && cleanedSections.length > 0 && (
              <Button 
                onClick={handleCreateSections} 
                color="primary" 
                variant="contained"
                disabled={isCreating}
              >
                {isCreating ? (
                  <>
                    <CircularProgress size={20} sx={{ mr: 1 }} />
                    Creating...
                  </>
                ) : "Create Sections"}
              </Button>
            )}
            {activeTab === 1 && selectedPreloadSections.length > 0 && (
              <Button 
                onClick={handleCreateFromPreload} 
                color="primary" 
                variant="contained"
                disabled={isCreating}
              >
                {isCreating ? (
                  <>
                    <CircularProgress size={20} sx={{ mr: 1 }} />
                    Creating...
                  </>
                ) : `Create ${selectedPreloadSections.length} Sections`}
              </Button>
            )}
          </>
        )}
      </DialogActions>
    </Dialog>
  );
};

export default Sections;