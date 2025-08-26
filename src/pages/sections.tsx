import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  Typography,
  Alert,
  Box,
  CircularProgress
} from "@mui/material";
import { servicesAPI } from "../config/api";
import CheckCircleIcon from '@mui/icons-material/CheckCircle';

interface SectionsProps {
  open: boolean;
  onClose: () => void;
  onCreate: () => void;
  location_id: string;
  warehouse: string;
  location_desc: string;
  branch: string;
  existingSections: string[]; // Add this prop to check existing sections
}

// Helper type guard for axios error
function isAxiosError(error: unknown): error is { response: { status: number } } {
  return (
    typeof error === 'object' &&
    error !== null &&
    'response' in error &&
    typeof (error as { response?: unknown }).response === 'object' &&
    (error as { response: { status: number } }).response !== undefined
  );
}

// Helper to fetch latest sections for a location
async function fetchExistingSections(location_id: string): Promise<string[]> {
  try {
    const response = await servicesAPI.getSections(location_id);
    return response.data.map((s: { section_desc: string }) => s.section_desc);
  } catch (err) {
    return [];
  }
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
  const [numSections, setNumSections] = useState<number>(1);
  const [generatedSections, setGeneratedSections] = useState<string[]>([]);
  const [isCreating, setIsCreating] = useState<boolean>(false);
  const [creationSuccess, setCreationSuccess] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Check if sections already exist for this location
  const hasExistingSections = existingSections && existingSections.length > 0;

  const handleGenerateSections = async () => {
    if (numSections <= 0) {
      setError("Please enter a valid number of sections");
      return;
    }

    try {
      // Fetch existing sections for this location from backend
      let existing: string[] = [];
      try {
        const response = await servicesAPI.getSections(location_id);
        existing = response.data.map((s: { section_desc: string }) => s.section_desc);
      } catch (err: unknown) {
        // If 404, treat as no sections found
        if (isAxiosError(err) && err.response.status === 404) {
          existing = [];
        } else {
          throw err;
        }
      }

      // Find the highest section number for this warehouse
      let maxNum = 0;
      existing.forEach((desc: string) => {
        const match = desc.match(new RegExp(`^${warehouse}-(\\d+)$`));
        if (match) {
          const num = parseInt(match[1], 10);
          if (num > maxNum) maxNum = num;
        }
      });

      // Generate the next N sections
      const newSections = [];
      for (let i = 1; i <= numSections; i++) {
        newSections.push(`${warehouse}-${maxNum + i}`);
      }

      setGeneratedSections(newSections);
      setError(null);
    } catch {
      setError("Failed to check existing sections. Please try again.");
    }
  };

  const handleCreateSections = async () => {
    if (numSections <= 0) {
      setError("Please enter a valid number of sections");
      return;
    }

    if (generatedSections.length === 0) {
      setError("Please generate sections first");
      return;
    }

    setIsCreating(true);
    setError(null);

    try {
      const userId = localStorage.getItem('User ID');
      for (const generatedSection of generatedSections) {
        await servicesAPI.createSection({
          section_desc: generatedSection,
          location_id: location_id,
          created_by: userId,
        });
      }

      setCreationSuccess(true);
      onCreate();

      // Fetch the latest sections after creation so next generation is correct
      await fetchExistingSections(location_id);
      setGeneratedSections([]); // clear generated
    } catch (error) {
      console.error("Error creating sections:", error);
      setError("Failed to create sections. Please try again.");
    } finally {
      setIsCreating(false);
    }
  };

  const handleClose = () => {
    setNumSections(1);
    setGeneratedSections([]);
    setCreationSuccess(false);
    setError(null);
    onClose();
  };

  useEffect(() => {
    if (open) {
      setGeneratedSections([]);
      setCreationSuccess(false);
      setError(null);
    }
  }, [open]);

  return (
    <Dialog open={open} onClose={handleClose}>
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
            <Typography variant="body1" sx={{ mb: 2 }}>
              {generatedSections.join(", ")}
            </Typography>
          </Box>
        ) : (
          <>
            {error && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {error}
              </Alert>
            )}

            <TextField
              label="Number of Sections"
              type="number"
              value={numSections}
              onChange={(e) => setNumSections(Number(e.target.value))}
              fullWidth
              margin="normal"
              inputProps={{ min: 1 }}
              disabled={hasExistingSections}
            />

            <Button
              onClick={handleGenerateSections}
              variant="contained"
              color="primary"
              style={{ marginTop: "10px" }}
              disabled={hasExistingSections}
            >
              Generate Sections
            </Button>

            {generatedSections.length > 0 && (
              <Box sx={{ mt: 3 }}>
                <Typography variant="subtitle2" gutterBottom>
                  Sections to be created:
                </Typography>
                <Box sx={{ 
                  p: 2, 
                  backgroundColor: 'background.paper', 
                  borderRadius: 1,
                  maxHeight: 150,
                  overflow: 'auto'
                }}>
                  {generatedSections.map((section, index) => (
                    <Typography key={index}>{section}</Typography>
                  ))}
                </Box>
              </Box>
            )}
          </>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose} color="primary">
          {creationSuccess ? "Close" : "Cancel"}
        </Button>
        {!creationSuccess && !hasExistingSections && (
          <Button 
            onClick={handleCreateSections} 
            color="primary" 
            variant="contained"
            disabled={generatedSections.length === 0 || isCreating}
          >
            {isCreating ? (
              <>
                <CircularProgress size={20} sx={{ mr: 1 }} />
                Creating...
              </>
            ) : "Create Sections"}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
};

export default Sections;