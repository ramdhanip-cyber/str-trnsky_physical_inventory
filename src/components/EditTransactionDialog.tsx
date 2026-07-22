import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Select,
  MenuItem,
  Button,
  Box,
  Typography,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  IconButton,
  CircularProgress,
  Chip,
  FormControl,
  InputLabel,
  Tooltip,
  useTheme,
  alpha
} from "@mui/material";
import { Save, Close, Add, Delete } from "@mui/icons-material";

interface Transaction {
  transaction_id: number;
  tag_id: string;
  sys_tag_no?: string;
  form: string;
  grade: string;
  size: string;
  width: string;
  finish: string;
  ext_finish: string;
  length: string;
  count_type: 'bundle' | 'piece';
  checker_count?: number;
  verified?: boolean;
  remarks?: string;
  ad_cmts?: string;
  mill?: string;
  heat?: string;
  type?: string;
  location?: string;
}

interface Bundle {
  id: number;
  transaction_id: number;
  tag_id: string;
  num_of_bundle: number;
  bundle_count: number;
}

interface EditTransactionDialogProps {
  open: boolean;
  transaction: Transaction | null;
  bundles: Bundle[];
  onClose: () => void;
  onSave: () => void;
  onFieldChange: (field: keyof Transaction, value: string | number) => void;
  onBundleChange: (index: number, field: keyof Bundle, value: number) => void;
  onAddBundle: () => void;
  onRemoveBundle: (index: number) => void;
  isSaving?: boolean;
}

const EditTransactionDialog: React.FC<EditTransactionDialogProps> = ({
  open,
  transaction,
  bundles,
  onClose,
  onSave,
  onFieldChange,
  onBundleChange,
  onAddBundle,
  onRemoveBundle,
  isSaving = false,
}) => {
  const theme = useTheme();
  const [totalQuantity, setTotalQuantity] = useState<number>(0);
  const [error] = useState<string | null>(null);

  useEffect(() => {
    if (transaction) {
      // Calculate total quantity
      if (transaction.count_type === 'bundle') {
        const total = bundles.reduce((sum, b) => sum + (b.num_of_bundle * b.bundle_count), 0);
        setTotalQuantity(total);
      } else {
        setTotalQuantity(transaction.checker_count || 0);
      }
    }
  }, [transaction, bundles]);

  const handleFieldChange = (field: keyof Transaction, value: string | number) => {
    onFieldChange(field, value);
  };

  const handleSave = () => {
    onSave();
  };


  // Match the visual style used on the Counter page (StyledTextField)
  const modernFieldSx = {
    '& .MuiInputLabel-root': {
      fontWeight: 500,
      '&.Mui-focused': {
        color: theme.palette.primary.main || '#0088FE',
      },
    },
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
    '& .MuiInputBase-input': {
      fontSize: '14px',
      padding: '10px 12px',
    },
  };

  if (!transaction) return null;

  return (
    <Dialog 
      open={open} 
      onClose={onClose} 
      maxWidth="lg" 
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 2,
          boxShadow: theme.shadows[3]
        }
      }}
    >
      <DialogTitle
        sx={{
          p: 3,
          background: `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.95)} 0%, ${alpha(
            theme.palette.primary.dark,
            0.92
          )} 100%)`,
          color: theme.palette.primary.contrastText,
          borderBottom: `1px solid ${alpha(theme.palette.divider, 0.15)}`
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 2 }}>
          <Box>
            <Typography variant="h6" component="div" sx={{ fontWeight: 800, letterSpacing: '-0.01em' }}>
              Edit Transaction #{transaction.transaction_id}
            </Typography>
            <Typography variant="body2" sx={{ mt: 0.5, opacity: 0.92 }}>
              Tag ID: <Box component="span" sx={{ fontWeight: 800 }}>{transaction.tag_id}</Box>
              {transaction.verified && (
                <Chip
                  label="Verified"
                  size="small"
                  color="success"
                  sx={{
                    ml: 1,
                    bgcolor: alpha(theme.palette.success.main, 0.18),
                    color: theme.palette.success.contrastText
                  }}
                />
              )}
            </Typography>
          </Box>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Chip
              label={`Total Qty: ${totalQuantity}`}
              color="primary"
              variant="outlined"
              sx={{ fontWeight: 800, borderColor: alpha(theme.palette.common.white, 0.35) }}
            />
            <IconButton
              onClick={onClose}
              size="small"
              sx={{
                color: theme.palette.common.white,
                bgcolor: alpha(theme.palette.common.white, 0.12),
                ':hover': { bgcolor: alpha(theme.palette.common.white, 0.18) },
                borderRadius: 2
              }}
            >
              <Close fontSize="small" />
            </IconButton>
          </Box>
        </Box>
      </DialogTitle>
      
      <DialogContent sx={{ p: 3, pt: 2 }}>
        {error && (
          <Box sx={{ mb: 2, p: 2, backgroundColor: 'error.light', borderRadius: 1, color: 'error.contrastText' }}>
            <Typography variant="body2" sx={{ fontWeight: 500 }}>
              ⚠️ {error}
            </Typography>
          </Box>
        )}
        <Box
          sx={{
            mb: 3,
            p: 2.5,
            borderRadius: 3,
            bgcolor: alpha(theme.palette.primary.main || '#0088FE', 0.02),
            border: `1px solid ${alpha(theme.palette.primary.main || '#0088FE', 0.1)}`
          }}
        >
          <Typography
            variant="subtitle2"
            sx={{
              fontWeight: 800,
              mb: 2,
              color: theme.palette.text.secondary,
              textTransform: 'uppercase',
              letterSpacing: '0.06em'
            }}
          >
            Core details
          </Typography>

          <Box sx={{
            display: 'grid',
            gridTemplateColumns: 'repeat(2, 1fr)',
            gap: 3
          }}>
          <Box sx={{ gridColumn: 'span 2' }}>
            <TextField
              label="System Tag No"
              value={transaction.sys_tag_no || ''}
              onChange={(e) => handleFieldChange('sys_tag_no', e.target.value)}
              fullWidth
              size="small"
              sx={modernFieldSx}
            />
          </Box>
          <TextField
            label="Form"
            value={transaction.form}
            onChange={(e) => handleFieldChange('form', e.target.value)}
            fullWidth
            size="small"
            required
            sx={modernFieldSx}
          />
          <TextField
            label="Grade"
            value={transaction.grade}
            onChange={(e) => handleFieldChange('grade', e.target.value)}
            fullWidth
            size="small"
            required
            sx={modernFieldSx}
          />
          <TextField
            label="Size"
            value={transaction.size}
            onChange={(e) => handleFieldChange('size', e.target.value)}
            fullWidth
            size="small"
            required
            sx={modernFieldSx}
          />
          <TextField
            label="Width"
            value={transaction.width}
            onChange={(e) => handleFieldChange('width', e.target.value)}
            fullWidth
            size="small"
            required
            type="number"
            sx={modernFieldSx}
          />
          <TextField
            label="Finish"
            value={transaction.finish}
            onChange={(e) => handleFieldChange('finish', e.target.value)}
            fullWidth
            size="small"
            required
            sx={modernFieldSx}
          />
          <TextField
            label="Ext. Finish"
            value={transaction.ext_finish}
            onChange={(e) => handleFieldChange('ext_finish', e.target.value)}
            fullWidth
            size="small"
            sx={modernFieldSx}
          />
          <TextField
            label="Length"
            value={transaction.length}
            onChange={(e) => handleFieldChange('length', e.target.value)}
            fullWidth
            size="small"
            required
            type="number"
            sx={modernFieldSx}
          />
          <TextField
            label="Mill"
            value={transaction.mill || ''}
            onChange={(e) => handleFieldChange('mill', e.target.value)}
            fullWidth
            size="small"
            sx={modernFieldSx}
          />
          <TextField
            label="Heat"
            value={transaction.heat || ''}
            onChange={(e) => handleFieldChange('heat', e.target.value)}
            fullWidth
            size="small"
            sx={modernFieldSx}
          />
          <TextField
            label="Type"
            value={transaction.type || ''}
            onChange={(e) => handleFieldChange('type', e.target.value)}
            fullWidth
            size="small"
            sx={modernFieldSx}
          />
          <TextField
            label="Location"
            value={transaction.location || ''}
            onChange={(e) => handleFieldChange('location', e.target.value)}
            fullWidth
            size="small"
            sx={modernFieldSx}
          />
          <FormControl fullWidth size="small">
            <InputLabel>Count Type</InputLabel>
            <Select
              value={transaction.count_type}
              onChange={(e) => handleFieldChange('count_type', e.target.value)}
              label="Count Type"
              sx={modernFieldSx}
            >
              <MenuItem value="piece">Pieces</MenuItem>
              <MenuItem value="bundle">Bundle</MenuItem>
            </Select>
          </FormControl>
          <TextField
            label="Checker Count"
            type="number"
            value={transaction.checker_count || ''}
            onChange={(e) => handleFieldChange('checker_count', Number(e.target.value))}
            fullWidth
            size="small"
            disabled={transaction.count_type === 'bundle'}
            required={transaction.count_type === 'piece'}
            sx={modernFieldSx}
          />
          </Box>
        </Box>

        <Box
          sx={{
            mt: 3,
            mb: 3,
            p: 2.5,
            borderRadius: 3,
            bgcolor: alpha(theme.palette.grey[500], 0.04),
            border: `1px solid ${alpha(theme.palette.divider, 0.15)}`
          }}
        >
          <Typography
            variant="subtitle2"
            sx={{
              fontWeight: 800,
              mb: 2,
              color: theme.palette.text.secondary,
              textTransform: 'uppercase',
              letterSpacing: '0.06em'
            }}
          >
            Notes
          </Typography>

          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: '1fr',
              gap: 2
            }}
          >
          <TextField
            label="Quality (Remarks)"
            value={transaction.remarks || ''}
            onChange={(e) => handleFieldChange('remarks', e.target.value)}
            fullWidth
            size="small"
            multiline
            rows={2}
            placeholder="Enter quality remarks..."
          />
          <TextField
            label="Comments (Additional Comments)"
            value={transaction.ad_cmts || ''}
            onChange={(e) => handleFieldChange('ad_cmts', e.target.value)}
            fullWidth
            size="small"
            multiline
            rows={2}
            placeholder="Enter additional comments..."
          />
          </Box>
        </Box>

        {transaction.count_type === 'bundle' && (
          <Box sx={{ mt: 3 }}>
            <Box sx={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center',
              mb: 2
            }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                Bundle Details
              </Typography>
              <Button 
                variant="outlined" 
                onClick={onAddBundle} 
                size="small"
                startIcon={<Add />}
                sx={{ borderRadius: 2 }}
              >
                Add Bundle
              </Button>
            </Box>
            <Table size="small" sx={{ 
              '& .MuiTableCell-root': {
                padding: '8px 16px'
              },
              border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
              borderRadius: 1
            }}>
              <TableHead>
                <TableRow>
                  <TableCell>Bundle #</TableCell>
                  <TableCell>Count</TableCell>
                  <TableCell>Total</TableCell>
                  <TableCell width="50px">Action</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {bundles.map((bundle, index) => (
                  <TableRow key={index} hover>
                    <TableCell>
                      <TextField
                        type="number"
                        value={bundle.num_of_bundle}
                        onChange={(e) => onBundleChange(index, 'num_of_bundle', Number(e.target.value))}
                        size="small"
                        inputProps={{ min: 1 }}
                        fullWidth
                      />
                    </TableCell>
                    <TableCell>
                      <TextField
                        type="number"
                        value={bundle.bundle_count}
                        onChange={(e) => onBundleChange(index, 'bundle_count', Number(e.target.value))}
                        size="small"
                        inputProps={{ min: 0 }}
                        fullWidth
                      />
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>
                        {bundle.num_of_bundle * bundle.bundle_count}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Tooltip title="Remove bundle">
                        <IconButton 
                          size="small" 
                          onClick={() => onRemoveBundle(index)}
                          disabled={bundles.length <= 1}
                          color="error"
                        >
                          <Delete fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Box>
        )}
      </DialogContent>
      <DialogActions sx={{ 
        p: 2,
        borderTop: `1px solid ${alpha(theme.palette.divider, 0.1)}`
      }}>
        <Button 
          onClick={onClose} 
          startIcon={<Close />}
          sx={{ 
            borderRadius: 2,
            textTransform: 'none',
            fontWeight: 600,
            padding: '10px 24px'
          }}
        >
          Cancel
        </Button>
        <Button 
          onClick={handleSave} 
          variant="contained" 
          startIcon={isSaving ? <CircularProgress size={20} /> : <Save />}
          disabled={isSaving}
          sx={{ 
            borderRadius: 2,
            textTransform: 'none',
            fontWeight: 600,
            padding: '10px 24px',
            boxShadow: 'none',
            '&:hover': {
              transform: 'translateY(-1px)',
              boxShadow: `0 4px 16px ${alpha(theme.palette.primary.main || '#0088FE', 0.3)}`
            }
          }}
        >
          {isSaving ? 'Saving...' : 'Save Changes'}
        </Button>
      </DialogActions>

    </Dialog>
  );
};

export default EditTransactionDialog;