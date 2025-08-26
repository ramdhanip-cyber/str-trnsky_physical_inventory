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
      <DialogTitle sx={{ 
        borderBottom: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
        pb: 2
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box>
            <Typography variant="h6" component="div" sx={{ fontWeight: 600 }}>
              Edit Transaction #{transaction.transaction_id}
            </Typography>
            <Typography variant="subtitle2" color="text.secondary" sx={{ mt: 0.5 }}>
              Tag ID: {transaction.tag_id}
              {transaction.verified && (
                <Chip 
                  label="Verified" 
                  size="small" 
                  color="success" 
                  sx={{ ml: 1 }} 
                />
              )}
            </Typography>
          </Box>
          <Chip 
            label={`Total Quantity: ${totalQuantity}`}
            color="primary"
            variant="outlined"
            sx={{ fontWeight: 600 }}
          />
        </Box>
      </DialogTitle>
      
      <DialogContent sx={{ mt: 2, p: 3 }}>
        <Box sx={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(2, 1fr)', 
          gap: 3,
          mb: 3
        }}>
          <TextField
            label="Form"
            value={transaction.form}
            onChange={(e) => handleFieldChange('form', e.target.value)}
            fullWidth
            size="small"
            required
            sx={{ 
              '& .MuiInputBase-input': {
                fontSize: '14px',
                padding: '8px 12px'
              }
            }}
          />
          <TextField
            label="Grade"
            value={transaction.grade}
            onChange={(e) => handleFieldChange('grade', e.target.value)}
            fullWidth
            size="small"
            required
            sx={{ 
              '& .MuiInputBase-input': {
                fontSize: '14px',
                padding: '8px 12px'
              }
            }}
          />
          <TextField
            label="Size"
            value={transaction.size}
            onChange={(e) => handleFieldChange('size', e.target.value)}
            fullWidth
            size="small"
            required
            sx={{ 
              '& .MuiInputBase-input': {
                fontSize: '14px',
                padding: '8px 12px'
              }
            }}
          />
          <TextField
            label="Width"
            value={transaction.width}
            onChange={(e) => handleFieldChange('width', e.target.value)}
            fullWidth
            size="small"
            required
            type="number"
            sx={{ 
              '& .MuiInputBase-input': {
                fontSize: '14px',
                padding: '8px 12px'
              }
            }}
          />
          <TextField
            label="Finish"
            value={transaction.finish}
            onChange={(e) => handleFieldChange('finish', e.target.value)}
            fullWidth
            size="small"
            required
          />
          <TextField
            label="Ext. Finish"
            value={transaction.ext_finish}
            onChange={(e) => handleFieldChange('ext_finish', e.target.value)}
            fullWidth
            size="small"
          />
          <TextField
            label="Length"
            value={transaction.length}
            onChange={(e) => handleFieldChange('length', e.target.value)}
            fullWidth
            size="small"
            required
            type="number"
          />
          <TextField
            label="Mill"
            value={transaction.mill || ''}
            onChange={(e) => handleFieldChange('mill', e.target.value)}
            fullWidth
            size="small"
          />
          <TextField
            label="Heat"
            value={transaction.heat || ''}
            onChange={(e) => handleFieldChange('heat', e.target.value)}
            fullWidth
            size="small"
          />
          <TextField
            label="Type"
            value={transaction.type || ''}
            onChange={(e) => handleFieldChange('type', e.target.value)}
            fullWidth
            size="small"
          />
          <FormControl fullWidth size="small">
            <InputLabel>Count Type</InputLabel>
            <Select
              value={transaction.count_type}
              onChange={(e) => handleFieldChange('count_type', e.target.value)}
              label="Count Type"
            >
                              <MenuItem value="pcs">Pieces</MenuItem>
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
          />
        </Box>

        {/* Additional Information Section */}
        <Box sx={{ mt: 3, mb: 2 }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2 }}>
            Additional Information
          </Typography>
        </Box>

        <Box sx={{ 
          display: 'grid', 
          gridTemplateColumns: '1fr', 
          gap: 2,
          mb: 3
        }}>
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
          sx={{ borderRadius: 2 }}
        >
          Cancel
        </Button>
        <Button 
          onClick={handleSave} 
          variant="contained" 
          startIcon={isSaving ? <CircularProgress size={20} /> : <Save />}
          disabled={isSaving}
          sx={{ borderRadius: 2 }}
        >
          {isSaving ? 'Saving...' : 'Save Changes'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default EditTransactionDialog;