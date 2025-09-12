import React, { useState, useMemo } from "react";
import {
  Modal,
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
  Collapse,
  Button,
  AppBar,
  Toolbar,
  Chip,
  TextField,
  InputAdornment,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Select,
  MenuItem,
  FormControl
} from "@mui/material";
import { 
  KeyboardArrowDown, 
  KeyboardArrowUp, 
  Close,
  Search,
  Edit,
  Save,
  Cancel,
  Add
} from "@mui/icons-material";


const COUNT_TYPES = {
  PIECES: "pcs",
  BUNDLES: "bundle",
} as const;

type CountType = typeof COUNT_TYPES[keyof typeof COUNT_TYPES];

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

interface Bundle {
  id?: number;
  transaction_id?: number;
  num_of_bundle: number;
  bundle_count: number;
  tag_id?: number;
}

interface TableModalProps {
  open: boolean;
  onClose: () => void;
  data: Transaction[];
  onSubmitAll: () => void;
  onUpdateTransaction: (updatedTransaction: Transaction) => void;
  onCompleteLocation: () => Promise<void>; // Add this new prop
}



const TransactionsTableModal: React.FC<TableModalProps> = ({ 
  open, 
  onClose, 
  data,
  onSubmitAll,
  onUpdateTransaction,
  onCompleteLocation
}) => {
  const [expandedRows, setExpandedRows] = useState<Record<number, boolean>>({});
  const [searchTerm, setSearchTerm] = useState("");
  const [searchBy, setSearchBy] = useState<"tag_id" | "counted_by">("tag_id");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [editingBundles, setEditingBundles] = useState<Bundle[]>([]);
  const [openBundleDialog, setOpenBundleDialog] = useState(false);

  const filteredData = useMemo(() => {
    if (!searchTerm) return data;
    return data.filter(transaction => {
      const fieldValue = searchBy === "tag_id" 
        ? transaction.tag_id.toString() 
        : transaction.counted_by.toString();
      return fieldValue.includes(searchTerm);
    });
  }, [data, searchTerm, searchBy]);

  const toggleRow = (id: number) => {
    setExpandedRows(prev => ({ ...prev, [id]: !prev[id] }));
  };



  const handleEdit = (transaction: Transaction) => {
    const rowId = transaction.id || transaction.tag_id;
    setEditingId(Number(rowId));
    setEditingTransaction({...transaction});
    if (transaction.count_type === COUNT_TYPES.BUNDLES && transaction.bundles) {
      setEditingBundles([...transaction.bundles]);
    }
  };

  const handleSave = () => {
    if (editingTransaction) {
      // Include bundles in the transaction object if it's a bundle type
      const transactionToUpdate = {
        ...editingTransaction,
        bundles: editingTransaction.count_type === COUNT_TYPES.BUNDLES ? editingBundles : editingTransaction.bundles
      };
      
      onUpdateTransaction(transactionToUpdate);
    }
    setEditingId(null);
    setEditingTransaction(null);
    setEditingBundles([]);
  };

  const handleCancel = () => {
    setEditingId(null);
    setEditingTransaction(null);
    setEditingBundles([]);
  };

  const handleTransactionChange = (field: keyof Transaction, value: string | number) => {
    if (editingTransaction) {
      setEditingTransaction({
        ...editingTransaction,
        [field]: value
      });
    }
  };

  const handleBundleChange = (index: number, field: keyof Bundle, value: number) => {
    const updatedBundles = [...editingBundles];
    updatedBundles[index] = {
      ...updatedBundles[index],
      [field]: value
    };
    setEditingBundles(updatedBundles);
  };

  const handleAddBundle = () => {
    setEditingBundles([...editingBundles, {
      num_of_bundle: 0,
      bundle_count: 0,
      tag_id: editingTransaction?.tag_id
    }]);
  };

  const handleRemoveBundle = (index: number) => {
    const updatedBundles = [...editingBundles];
    updatedBundles.splice(index, 1);
    setEditingBundles(updatedBundles);
  };

  const handleSubmitAll = async () => {
    try {
      // First submit all transactions
      onSubmitAll();
      
      // Then update the location status to "Completed"
      await onCompleteLocation();
      
      // Optionally show a success message or handle the completion
    } catch (error) {
      console.error("Error completing location:", error);
      // Handle error (show error message, etc.)
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      aria-labelledby="transaction-table-modal"
      sx={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Box sx={{
        width: '98%',
        maxWidth: '1800px',
        maxHeight: '95vh',
        bgcolor: 'background.paper',
        boxShadow: 24,
        borderRadius: 1,
        overflow: 'hidden'
      }}>
        <AppBar position="static" color="primary" enableColorOnDark>
          <Toolbar>
            <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
              Transaction History
            </Typography>
            <IconButton edge="end" color="inherit" onClick={onClose}>
              <Close />
            </IconButton>
          </Toolbar>
        </AppBar>
        
        {/* Search Bar */}
        <Box sx={{ 
          p: 2, 
          display: 'flex', 
          gap: 2,
          alignItems: 'center',
          borderBottom: '1px solid rgba(0, 0, 0, 0.12)'
        }}>
          <TextField
            select
            value={searchBy}
            onChange={(e) => setSearchBy(e.target.value as "tag_id" | "counted_by")}
            variant="outlined"
            size="small"
            SelectProps={{
              native: true,
            }}
            sx={{ minWidth: 120 }}
          >
            <option value="tag_id">Tag ID</option>
            <option value="counted_by">User ID</option>
          </TextField>
          
          <TextField
            fullWidth
            variant="outlined"
            size="small"
            placeholder={`Search by ${searchBy === "tag_id" ? "Tag ID" : "User ID"}...`}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Search />
                </InputAdornment>
              ),
            }}
          />
        </Box>

        <Box sx={{ p: 2, overflow: 'auto', maxHeight: 'calc(95vh - 180px)' }}>
          <TableContainer component={Paper}>
            <Table stickyHeader size="small">
              <TableHead>
                <TableRow>
                  <TableCell width="50px">Expand</TableCell>
                  <TableCell>Tag ID</TableCell>
                  <TableCell>Form</TableCell>
                  <TableCell>Grade</TableCell>
                  <TableCell>Size</TableCell>
                  <TableCell>Finish</TableCell>
                  <TableCell>Ext. Finish</TableCell>
                  <TableCell>Width</TableCell>
                  <TableCell>Length</TableCell>
                  <TableCell>Mill</TableCell>
                  <TableCell>Heat</TableCell>
                  <TableCell>Count Type</TableCell>
                  <TableCell>Type</TableCell>
                  <TableCell align="right">Quantity</TableCell>
                  <TableCell>Quality Standards</TableCell>
                  <TableCell>Additional Comments</TableCell>
                  {/* <TableCell>Date</TableCell> */}
                  <TableCell>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredData.length > 0 ? (
                  filteredData.map((transaction) => {
                    const rowId = transaction.id || transaction.tag_id;
                    const isExpanded = !!expandedRows[rowId];
                    const isEditing = editingId === rowId;

                    return (
                      <React.Fragment key={rowId}>
                        <TableRow hover sx={{ '& > td': { borderBottom: 'unset' } }}>
                          <TableCell>
                            {transaction.count_type === "bundle" && (
                              <IconButton
                                size="small"
                                onClick={() => toggleRow(rowId)}
                                aria-label="expand row"
                              >
                                {isExpanded ? (
                                  <KeyboardArrowUp />
                                ) : (
                                  <KeyboardArrowDown />
                                )}
                              </IconButton>
                            )}
                          </TableCell>
                          
                          {/* Editable Fields */}
                          <TableCell >{transaction.tag_id}</TableCell>
                          {/* <TableCell>
                            {isEditing ? (
                              <TextField
                                size="small"
                                value={editingTransaction?.tag_id || ''}
                                onChange={(e) => handleTransactionChange('tag_id', parseInt(e.target.value))}
                                type="number"
                              />
                            ) : (
                              transaction.tag_id
                            )}
                          </TableCell> */}

                          <TableCell>
                            {isEditing ? (
                              <TextField
                                size="small"
                                value={editingTransaction?.form || ''}
                                onChange={(e) => handleTransactionChange('form', e.target.value)}
                              />
                            ) : (
                              transaction.form
                            )}
                          </TableCell>

                          <TableCell>
                            {isEditing ? (
                              <TextField
                                size="small"
                                value={editingTransaction?.grade || ''}
                                onChange={(e) => handleTransactionChange('grade', e.target.value)}
                              />
                            ) : (
                              transaction.grade
                            )}
                          </TableCell>

                          <TableCell>
                            {isEditing ? (
                              <TextField
                                size="small"
                                value={editingTransaction?.size || ''}
                                onChange={(e) => handleTransactionChange('size', e.target.value)}
                              />
                            ) : (
                              transaction.size
                            )}
                          </TableCell>

                          <TableCell>
                            {isEditing ? (
                              <TextField
                                size="small"
                                value={editingTransaction?.finish || ''}
                                onChange={(e) => handleTransactionChange('finish', e.target.value)}
                              />
                            ) : (
                              transaction.finish || '-'
                            )}
                          </TableCell>

                          <TableCell>
                            {isEditing ? (
                              <TextField
                                size="small"
                                value={editingTransaction?.ext_finish || ''}
                                onChange={(e) => handleTransactionChange('ext_finish', e.target.value)}
                              />
                            ) : (
                              transaction.ext_finish || '-'
                            )}
                          </TableCell>

                          <TableCell>
                            {isEditing ? (
                              <TextField
                                size="small"
                                value={editingTransaction?.width || ''}
                                onChange={(e) => handleTransactionChange('width', e.target.value)}
                              />
                            ) : (
                              transaction.width || '-'
                            )}
                          </TableCell>

                          <TableCell>
                            {isEditing ? (
                              <TextField
                                size="small"
                                value={editingTransaction?.length || ''}
                                onChange={(e) => handleTransactionChange('length', e.target.value)}
                              />
                            ) : (
                              transaction.length || '-'
                            )}
                          </TableCell>

                          <TableCell>
                            {isEditing ? (
                              <TextField
                                size="small"
                                value={editingTransaction?.mill || ''}
                                onChange={(e) => handleTransactionChange('mill', e.target.value)}
                              />
                            ) : (
                              transaction.mill || '-'
                            )}
                          </TableCell>

                          <TableCell>
                            {isEditing ? (
                              <TextField
                                size="small"
                                value={editingTransaction?.heat || ''}
                                onChange={(e) => handleTransactionChange('heat', e.target.value)}
                              />
                            ) : (
                              transaction.heat || '-'
                            )}
                          </TableCell>

                          <TableCell>
                            {isEditing ? (
                              <FormControl size="small" fullWidth>
                                <Select
                                  value={editingTransaction?.count_type || ''}
                                  onChange={(e) => handleTransactionChange('count_type', e.target.value)}
                                >
                                  <MenuItem value={COUNT_TYPES.PIECES}>Pieces</MenuItem>
                                  <MenuItem value={COUNT_TYPES.BUNDLES}>Bundles</MenuItem>
                                </Select>
                              </FormControl>
                            ) : (
                              <Chip 
                                label={transaction.count_type} 
                                size="small"
                                color={
                                  transaction.count_type === COUNT_TYPES.BUNDLES ? "primary" :
                                  transaction.count_type === COUNT_TYPES.PIECES ? "secondary" :
                                  "default"
                                }
                                sx={{
                                  fontWeight: 'bold',
                                  backgroundColor: 
                                    transaction.count_type === COUNT_TYPES.BUNDLES ? '#1976d2' :
                                    transaction.count_type === COUNT_TYPES.PIECES ? '#dc004e' :
                                    '#6c757d',
                                  color: 'white'
                                }}
                              />
                            )}
                          </TableCell>

                          <TableCell>
                            {isEditing ? (
                              <FormControl size="small" fullWidth>
                                <Select
                                  value={editingTransaction?.type || ''}
                                  onChange={(e) => handleTransactionChange('type', e.target.value)}
                                >
                                  <MenuItem value="D">D - Drop</MenuItem>
                                  <MenuItem value="F">F - Finished</MenuItem>
                                  <MenuItem value="M">M - Master</MenuItem>
                                  <MenuItem value="R">R - Reject</MenuItem>
                                  <MenuItem value="S">S - Scrap</MenuItem>
                                  <MenuItem value="W">W - Work in Process</MenuItem>
                                </Select>
                              </FormControl>
                            ) : (
                              (() => {
                                const typeLabels: { [key: string]: string } = {
                                  'D': 'D - Drop',
                                  'F': 'F - Finished',
                                  'M': 'M - Master',
                                  'R': 'R - Reject',
                                  'S': 'S - Scrap',
                                  'W': 'W - Work in Process'
                                };
                                return typeLabels[transaction.type] || transaction.type || '-';
                              })()
                            )}
                          </TableCell>

                          <TableCell align="right">
                            {isEditing ? (
                              <TextField
                                size="small"
                                value={editingTransaction?.qty || 0}
                                onChange={(e) => handleTransactionChange('qty', parseInt(e.target.value))}
                                type="text"
                              />
                            ) : (
                              transaction.qty
                            )}
                          </TableCell>
                          <TableCell sx={{ maxWidth: 200 }}>
                            {isEditing ? (
                              <TextField
                                size="small"
                                value={editingTransaction?.remarks || ''}
                                onChange={(e) => handleTransactionChange('remarks', e.target.value)}
                                fullWidth
                              />
                            ) : (
                              <Box sx={{ 
                                whiteSpace: 'nowrap', 
                                overflow: 'hidden', 
                                textOverflow: 'ellipsis' 
                              }}>
                                {transaction.remarks || 'Conforms to Std'}
                              </Box>
                            )}
                          </TableCell>
                          <TableCell sx={{ maxWidth: 200 }}>
                            {isEditing ? (
                              <TextField
                                size="small"
                                value={editingTransaction?.ad_cmts || ''}
                                onChange={(e) => handleTransactionChange('ad_cmts', e.target.value)}
                                fullWidth
                              />
                            ) : (
                              <Box sx={{ 
                                whiteSpace: 'nowrap', 
                                overflow: 'hidden', 
                                textOverflow: 'ellipsis' 
                              }}>
                                {transaction.ad_cmts || '-'}
                              </Box>
                            )}
                          </TableCell>
                          {/* <TableCell>{formatDate(transaction.counted_at)}</TableCell> */}
                          <TableCell>
                            {isEditing ? (
                              <>
                                <IconButton size="small" onClick={handleSave} color="primary">
                                  <Save />
                                </IconButton>
                                <IconButton size="small" onClick={handleCancel} color="error">
                                  <Cancel />
                                </IconButton>
                                {editingTransaction?.count_type === COUNT_TYPES.BUNDLES && (
                                  <Button 
                                    size="small" 
                                    onClick={() => setOpenBundleDialog(true)}
                                    sx={{ ml: 1 }}
                                  >
                                    Edit Bundles
                                  </Button>
                                )}
                              </>
                            ) : (
                              <IconButton 
                                size="small" 
                                onClick={() => handleEdit(transaction)}
                                color="primary"
                              >
                                <Edit />
                              </IconButton>
                            )}
                          </TableCell>
                        </TableRow>

                        {transaction.count_type === "bundle" && transaction.bundles && (
                          <TableRow>
                            <TableCell colSpan={14} sx={{ p: 0, borderTop: 0 }}>
                              <Collapse 
                                in={isExpanded} 
                                timeout="auto" 
                                unmountOnExit
                              >
                                <Box sx={{ 
                                  backgroundColor: '#f5f5f5',
                                  p: 2,
                                  borderBottom: '1px solid rgba(224, 224, 224, 1)'
                                }}>
                                  <Typography variant="subtitle1" gutterBottom>
                                    Bundle Details (Tag ID: {transaction.tag_id})
                                  </Typography>
                                  <Table size="small">
                                    <TableHead>
                                      <TableRow>
                                        <TableCell>#</TableCell>
                                        <TableCell>Bundles</TableCell>
                                        <TableCell>Count/Bundle</TableCell>
                                        <TableCell align="right">Total</TableCell>
                                        <TableCell>Tag ID</TableCell>
                                      </TableRow>
                                    </TableHead>
                                    <TableBody>
                                      {transaction.bundles.map((bundle, index) => (
                                        <TableRow key={bundle.id || index}>
                                          <TableCell>{index + 1}</TableCell>
                                          <TableCell>{bundle.num_of_bundle}</TableCell>
                                          <TableCell>{bundle.bundle_count}</TableCell>
                                          <TableCell align="right">
                                            {bundle.num_of_bundle * bundle.bundle_count}
                                          </TableCell>
                                          <TableCell>{bundle.tag_id || '-'}</TableCell>
                                        </TableRow>
                                      ))}
                                    </TableBody>
                                  </Table>
                                </Box>
                              </Collapse>
                            </TableCell>
                          </TableRow>
                        )}
                      </React.Fragment>
                    );
                  })
                ) : (
                  <TableRow>
                    <TableCell colSpan={14} align="center" sx={{ py: 4 }}>
                      <Typography variant="body1" color="textSecondary">
                        No transactions found matching your search criteria
                      </Typography>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </Box>

        {/* Bundle Edit Dialog */}
        <Dialog 
          open={openBundleDialog} 
          onClose={() => setOpenBundleDialog(false)}
          maxWidth="lg"
          fullWidth
        >
          <DialogTitle>Edit Bundles</DialogTitle>
          <DialogContent>
            <TableContainer component={Paper}>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>#</TableCell>
                    <TableCell>Number of Bundles</TableCell>
                    <TableCell>Count per Bundle</TableCell>
                    <TableCell>Total</TableCell>
                    <TableCell>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {editingBundles.map((bundle, index) => (
                    <TableRow key={index}>
                      <TableCell>{index + 1}</TableCell>
                      <TableCell>
                        <TextField
                          size="small"
                          value={bundle.num_of_bundle}
                          onChange={(e) => handleBundleChange(index, 'num_of_bundle', parseInt(e.target.value))}
                          type="text"
                        />
                      </TableCell>
                      <TableCell>
                        <TextField
                          size="small"
                          value={bundle.bundle_count}
                          onChange={(e) => handleBundleChange(index, 'bundle_count', parseInt(e.target.value))}
                          type="text"
                        />
                      </TableCell>
                      <TableCell>
                        {bundle.num_of_bundle * bundle.bundle_count}
                      </TableCell>
                      <TableCell>
                        <IconButton 
                          size="small" 
                          onClick={() => handleRemoveBundle(index)}
                          color="error"
                        >
                          <Close />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
            <Button
              variant="outlined"
              startIcon={<Add />}
              onClick={handleAddBundle}
              sx={{ mt: 2 }}
            >
              Add Bundle
            </Button>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setOpenBundleDialog(false)}>Cancel</Button>
            <Button 
              onClick={() => {
                setOpenBundleDialog(false);
                // Update quantity when bundles change
                if (editingTransaction) {
                  const totalQuantity = editingBundles.reduce(
                    (sum, bundle) => sum + (bundle.num_of_bundle * bundle.bundle_count),
                    0
                  );
                  handleTransactionChange('qty', totalQuantity);
                }
              }}
              color="primary"
            >
              Save Bundles
            </Button>
          </DialogActions>
        </Dialog>

        <Box sx={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          p: 2,
          borderTop: '1px solid rgba(0, 0, 0, 0.12)'
        }}>
          <Typography variant="body2" color="text.secondary">
            Showing {filteredData.length} of {data.length} records
          </Typography>
          <Box>
            <Button 
              variant="outlined" 
              onClick={onClose}
              sx={{ mr: 2 }}
            >
              Close
            </Button>
            <Button 
              variant="contained" 
              color="primary"
              onClick={handleSubmitAll}
              disabled={data.length === 0}
            >
              Submit All Transactions
            </Button>
          </Box>
        </Box>
      </Box>
    </Modal>
  );
};

export default TransactionsTableModal;