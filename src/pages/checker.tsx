import React, { useEffect, useState } from "react";
import { 
  Box, Typography, Table, TableBody, TableCell, TableContainer, 
  TableHead, TableRow, Paper, CircularProgress, IconButton,
  Collapse, Chip, Button, Alert, Badge, Avatar
} from "@mui/material";
import { ArrowBack, Refresh, Edit, Check, Add, CheckCircle, Close } from "@mui/icons-material";
import { useNavigate, useParams } from "react-router-dom";
import { green, orange } from "@mui/material/colors";
import EditTransactionDialog from "../components/EditTransactionDialog";
import AddLineItemDialog from '../components/AddLineItemDialog';
import { servicesAPI } from '../config/api';

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
  qty: number;
  checker_count?: number;
  location_id: number;
  section_id: number;
  location_desc?: string;
  section_desc?: string;
  verified?: boolean;
  remarks?: string;
  mill?: string;
  heat?: string;
  ad_cmts?: string;
  type?: string;
  role?: string | null;
  counted_by?: number;
  team_id?: number;
  created_at?: string;
  updated_at?: string;
}

interface Bundle {
  id: number;
  transaction_id: number;
  tag_id: string;
  num_of_bundle: number;
  bundle_count: number;
}


const Checker: React.FC = () => {
  const { location_id, section_id, team_id } = useParams();
  const navigate = useNavigate();
  
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [bundles, setBundles] = useState<Record<number, Bundle[]>>({});
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedRows, setExpandedRows] = useState<Record<number, boolean>>({});
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [editingBundles, setEditingBundles] = useState<Bundle[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [checkerTransactions, setCheckerTransactions] = useState<Transaction[]>([]);
  const [checkerBundles, setCheckerBundles] = useState<Record<number, Bundle[]>>({});
  const [addLineDialogOpen, setAddLineDialogOpen] = useState(false);
  const [newlyAddedTransactions, setNewlyAddedTransactions] = useState<Set<number>>(new Set());
  const [submitting, setSubmitting] = useState(false);
  const [verifyingTransactions, setVerifyingTransactions] = useState<Set<number>>(new Set());
  const [unverifyingTransactions, setUnverifyingTransactions] = useState<Set<number>>(new Set());

  // Function to identify new line items
  const isNewLineItem = (transactionId: number): boolean => {
    return newlyAddedTransactions.has(transactionId);
  };

  const fetchTransactions = async () => {
    try {
      const response = await servicesAPI.getCheckerTransactions({
        location_id: location_id || '',
        section_id: section_id || '',
        team_id: team_id || ''
      });
      return response.data;
    } catch (error) {
      throw error;
    }
  };

  const fetchCheckerUpdates = async () => {
    try {
      console.log('Fetching checker updates with:', { location_id, section_id, team_id });
      const response = await servicesAPI.getCheckerTransactionForChecker({
        location_id: location_id || '',
        section_id: section_id || '',
        team_id: team_id || ''
      });
      console.log('Checker updates response:', response.data);
      return response.data;
    } catch (error) {
      console.error('Error fetching checker updates:', error);
      throw error;
    }
  };

  const fetchBundles = async (transactionIds: number[]) => {
    if (transactionIds.length === 0) return {};
    
    try {
      const response = await servicesAPI.getCheckerBundles({
        transaction_ids: transactionIds.join(',')
      });
      const bundlesData = response.data;
      
      return bundlesData.reduce((acc: Record<number, Bundle[]>, bundle: Bundle) => {
        if (!acc[bundle.transaction_id]) acc[bundle.transaction_id] = [];
        acc[bundle.transaction_id].push(bundle);
        return acc;
      }, {});
    } catch (error) {
      throw error;
    }
  };

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Fetch original transactions
      const transactionsData = await fetchTransactions();
      setTransactions(transactionsData);
      
      // Fetch checker updates
      const checkerData = await fetchCheckerUpdates();
      setCheckerTransactions(checkerData);

      // Get all transaction IDs for bundles
      const allTransactionIds = [
        ...transactionsData.map((t: Transaction) => t.transaction_id),
        ...checkerData.map((t: Transaction) => t.transaction_id)
      ];

      const bundleTransactions = allTransactionIds.filter(id => 
        transactionsData.concat(checkerData).find((t: Transaction) => 
          t.transaction_id === id && t.count_type === 'bundle'
        )
      );
      
      if (bundleTransactions.length > 0) {
        const bundlesMap = await fetchBundles(bundleTransactions);
        setBundles(bundlesMap);
        
        // Separate checker bundles
        const checkerBundleIds = checkerData
          .filter((t: Transaction) => t.count_type === 'bundle')
          .map((t: Transaction) => t.transaction_id);
        
        const checkerBundlesMap = Object.fromEntries(
          Object.entries(bundlesMap)
            .filter(([id]) => checkerBundleIds.includes(Number(id)))
        ) as Record<number, Bundle[]>;
        setCheckerBundles(checkerBundlesMap);
      } else {
        setBundles({});
        setCheckerBundles({});
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { 
    fetchData(); 
  }, [location_id, section_id, team_id]);

  const toggleRowExpand = (transactionId: number) => {
    setExpandedRows(prev => ({
      ...prev, 
      [transactionId]: !prev[transactionId]
    }));
  };

  const calculateTotal = (bundles: Bundle[]) => {
    return bundles.reduce((sum, b) => sum + (b.num_of_bundle * b.bundle_count), 0);
  };

  const handleEdit = (transaction: Transaction) => {
    // Initialize checker_count with the original qty if not already set
    const transactionWithDefaultCheckerCount = {
      ...transaction,
      checker_count: transaction.checker_count ?? transaction.qty
    };
    console.log('🔍 Editing transaction:', {
      original_qty: transaction.qty,
      existing_checker_count: transaction.checker_count,
      final_checker_count: transactionWithDefaultCheckerCount.checker_count
    });
    setEditingTransaction(transactionWithDefaultCheckerCount);
    setEditingBundles(bundles[transaction.transaction_id] || []);
    setIsEditing(true);
  };



  const unverifyTransaction = async (transactionId: number) => {
    // Add to unverifying set
    setUnverifyingTransactions(prev => new Set(prev).add(transactionId));
    
    try {
      const selectedUser = localStorage.getItem('User ID');
      const selectedRole = localStorage.getItem('Selected Role');
      
      // Find the transaction to get its tag_id
      const transaction = transactions.find(t => t.transaction_id === transactionId);
      if (!transaction) {
        setError('Transaction not found');
        return;
      }
      
      const response = await servicesAPI.unverifyTransaction({
        transaction_id: transactionId,
        tag_id: transaction.tag_id,
        unverified_by: selectedUser,
        counted_by: selectedUser,
        role: selectedRole,
        unverified_at: new Date().toISOString()
      });
  
      // Get response data
      const responseData = response.data;
      
      if (responseData && responseData.deleted) {
        // A checker transaction was removed
        const deletedCheckerTransactionId = responseData.deletedCheckerTransactionId;
        
        // Remove the checker transaction from checker transactions list
        setCheckerTransactions(prev => prev.filter(t => t.transaction_id !== deletedCheckerTransactionId));
        
        // Remove from bundles
        setCheckerBundles(prev => {
          const newBundles = { ...prev };
          delete newBundles[deletedCheckerTransactionId];
          return newBundles;
        });
        
        // Mark the original transaction as unverified
        setTransactions(prev => prev.map(t => 
          t.transaction_id === transactionId ? { ...t, verified: false } : t
        ));
        
        setSuccessMessage('Transaction unverified and checker transaction removed successfully!');
      } else {
        // Fallback: just mark as unverified
        setTransactions(prev => prev.map(t => 
          t.transaction_id === transactionId ? { ...t, verified: false } : t
        ));
        setSuccessMessage('Transaction unverified successfully!');
      }
      
      setTimeout(() => setSuccessMessage(null), 3000);
      
      // Refresh data from server to ensure consistency
      await fetchData();
      
      return true;
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Unverification failed');
      return false;
    } finally {
      // Remove from unverifying set
      setUnverifyingTransactions(prev => {
        const newSet = new Set(prev);
        newSet.delete(transactionId);
        return newSet;
      });
    }
  };

  const handleSave = async () => {
    if (!editingTransaction) return;
  
    // Validate quantity
    if (editingTransaction.count_type === 'piece' && !editingTransaction.checker_count) {
      setError('Checker count cannot be empty for piece count');
      return;
    }
  
    if (editingTransaction.count_type === 'bundle') {
      const hasEmptyBundles = editingBundles.some(b => b.bundle_count <= 0);
      if (hasEmptyBundles) {
        setError('All bundles must have a count greater than 0');
        return;
      }
    }
  
    try {
      setIsSaving(true);
      setError(null);
      
      const selectedRole = localStorage.getItem('Selected Role');
      const selectedUser = localStorage.getItem('User ID');
      
      // Prepare payload for checker transaction
      const payload = {
        tag_id: editingTransaction.tag_id, // Same tag_id as original counter transaction
        form: editingTransaction.form,
        type: editingTransaction.type,
        grade: editingTransaction.grade,
        size: editingTransaction.size,
        width: editingTransaction.width,
        finish: editingTransaction.finish,
        ext_finish: editingTransaction.ext_finish,
        length: editingTransaction.length,
        count_type: editingTransaction.count_type,
        checker_count: editingTransaction.checker_count, // Use checker_count instead of qty
        location_id: editingTransaction.location_id,
        section_id: editingTransaction.section_id,
        team_id: editingTransaction.team_id,
        bundles: editingTransaction.count_type === 'bundle' ? editingBundles : [],
        remarks: editingTransaction.remarks,
        mill: editingTransaction.mill,
        heat: editingTransaction.heat,
        ad_cmts: editingTransaction.ad_cmts,
        role: selectedRole, // This will be 'Checker'
        counted_by: selectedUser ? parseInt(selectedUser) : undefined
      };
  
      // Save the checker transaction
      const saveResponse = await servicesAPI.updateTransaction(payload);
  
      if (!saveResponse.data.success) {
        throw new Error(saveResponse.data.message || 'Failed to save changes');
      }
  
      const saveResult = saveResponse.data;
      
      if (!saveResult.success) {
        throw new Error(saveResult.message || 'Failed to save changes');
      }
  
      // Update state to show the new checker transaction
      const newCheckerTransaction = {
        ...payload,
        transaction_id: saveResult.transaction_id,
        verified: false, // Checker transaction remains unverified
        role: selectedRole,
        counted_by: selectedUser ? parseInt(selectedUser) : undefined,
        qty: editingTransaction.checker_count || 0 // Add qty field for type compatibility
      };
      
            // Add to checker transactions list
      setCheckerTransactions(prev => {
        const existingIndex = prev.findIndex(t => t.tag_id === editingTransaction.tag_id && t.role === 'Checker');
        if (existingIndex >= 0) {
          const updated = [...prev];
          updated[existingIndex] = newCheckerTransaction;
          return updated;
        }
        return [...prev, newCheckerTransaction];
      });

      // Update the counter transaction to show as verified
      setTransactions(prev => prev.map(t => 
        t.tag_id === editingTransaction.tag_id && t.role === 'Counter' 
          ? { ...t, verified: true }
          : t
      ));

      // Update bundles if needed
      if (editingTransaction.count_type === 'bundle') {
        setCheckerBundles(prev => ({
          ...prev,
          [saveResult.transaction_id]: editingBundles
        }));
      }
  
      setSuccessMessage('Checker transaction saved and counter verified successfully!');
      setTimeout(() => setSuccessMessage(null), 3000);
      setIsEditing(false);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to save changes');
    } finally {
      setIsSaving(false);
    }
  };

  const handleQuickVerify = async (transactionId: number) => {
    // Add to verifying set
    setVerifyingTransactions(prev => new Set(prev).add(transactionId));
    
    try {
      // Find the transaction to verify
      const transaction = transactions.find(t => t.transaction_id === transactionId);
      if (!transaction) {
        setError('Transaction not found');
        return;
      }

      const selectedRole = localStorage.getItem('Selected Role');
      const selectedUser = localStorage.getItem('User ID');
      
      // Prepare payload for new checker transaction
      const payload = {
        tag_id: transaction.tag_id, // Same tag_id as the counter transaction
        form: transaction.form,
        type: transaction.type,
        grade: transaction.grade,
        size: transaction.size,
        width: transaction.width,
        finish: transaction.finish,
        ext_finish: transaction.ext_finish,
        length: transaction.length,
        count_type: transaction.count_type,
        checker_count: transaction.qty, // Checker count equals the original qty
        location_id: transaction.location_id,
        section_id: transaction.section_id,
        team_id: transaction.team_id,
        bundles: transaction.count_type === 'bundle' ? bundles[transaction.transaction_id] || [] : [],
        remarks: transaction.remarks,
        mill: transaction.mill,
        heat: transaction.heat,
        ad_cmts: transaction.ad_cmts,
        role: selectedRole, // This will be 'Checker'
        counted_by: selectedUser ? parseInt(selectedUser) : undefined
      };

      // Create new checker transaction
      const saveResponse = await servicesAPI.updateTransaction(payload);

      if (!saveResponse.data.success) {
        throw new Error(saveResponse.data.message || 'Failed to create checker transaction');
      }

      const saveResult = saveResponse.data;
      
      // Add the new checker transaction to checker transactions list
      const newCheckerTransaction = {
        ...payload,
        transaction_id: saveResult.transaction_id,
        verified: false, // Checker transaction remains unverified
        role: selectedRole,
        counted_by: selectedUser ? parseInt(selectedUser) : undefined,
        qty: transaction.qty // Add qty field for type compatibility
      };
      
      setCheckerTransactions(prev => [...prev, newCheckerTransaction]);

      // Update bundles if needed
      if (transaction.count_type === 'bundle') {
        setCheckerBundles(prev => ({
          ...prev,
          [saveResult.transaction_id]: bundles[transaction.transaction_id] || []
        }));
      }

      // Mark the original counter transaction as verified
      setTransactions(prev => prev.map(t => 
        t.transaction_id === transactionId ? { ...t, verified: true } : t
      ));

      setSuccessMessage('Quick verify completed: Checker transaction created and counter verified!');
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to quick verify transaction');
    } finally {
      // Remove from verifying set
      setVerifyingTransactions(prev => {
        const newSet = new Set(prev);
        newSet.delete(transactionId);
        return newSet;
      });
    }
  };

  const handleFieldChange = (field: keyof Transaction, value: string | number) => {
    if (!editingTransaction) return;
    
    console.log('🔧 Field change:', {
      field,
      value,
      current_checker_count: editingTransaction.checker_count,
      current_qty: editingTransaction.qty
    });
    
    setEditingTransaction({
      ...editingTransaction,
      [field]: value
    });

    if (field === 'count_type' && value === 'bundle' && editingBundles.length === 0) {
      setEditingBundles([{
        id: 0,
        transaction_id: editingTransaction.transaction_id,
        tag_id: editingTransaction.tag_id,
        num_of_bundle: 1,
        bundle_count: 0,
      }]);
    }
  };

  const handleBundleChange = (index: number, field: keyof Bundle, value: number) => {
    const updated = [...editingBundles];
    updated[index] = {...updated[index], [field]: value};
    setEditingBundles(updated);
  };

  const addBundle = () => {
    setEditingBundles([...editingBundles, {
      id: 0,
      transaction_id: editingTransaction?.transaction_id || 0,
      tag_id: editingTransaction?.tag_id || '',
      num_of_bundle: editingBundles.length + 1,
      bundle_count: 0,
    }]);
  };

  const removeBundle = (index: number) => {
    const updated = [...editingBundles];
    updated.splice(index, 1);
    setEditingBundles(updated);
  };

  if (loading) return (
    <Box display="flex" justifyContent="center" p={4}>
      <CircularProgress />
    </Box>
  );

  if (error) return (
    <Alert severity="error" sx={{ m: 2 }}>
      {error} <Button onClick={fetchData}>Retry</Button>
    </Alert>
  );



  const handleAddNewLine = async (payload: any) => {
    try {
      const response = await servicesAPI.addLineItem(payload);
      const result = response.data;
      
      if (result.success) {
        // Track the newly added transaction
        setNewlyAddedTransactions(prev => new Set(prev).add(result.id));
        
        // Refresh transactions
        await fetchData();
        
        setSuccessMessage('New line item added successfully!');
        setTimeout(() => setSuccessMessage(null), 3000);
      } else {
        setError(result.message || 'Failed to add new line item');
      }
    } catch (error) {
      console.error("Error adding new line item:", error);
      setError('Failed to add new line item');
    }
  };

  // Check if all counter transactions are verified
  const areAllCounterTransactionsVerified = () => {
    const counterTransactions = transactions.filter(t => t.role === 'Counter');
    const verifiedCount = counterTransactions.filter(t => t.verified).length;
    const totalCount = counterTransactions.length;
    
    console.log('🔍 Verification check:', {
      totalCounterTransactions: totalCount,
      verifiedCounterTransactions: verifiedCount,
      allVerified: totalCount > 0 && verifiedCount === totalCount
    });
    
    return totalCount > 0 && verifiedCount === totalCount;
  };

  const handleSubmitAll = async () => {
    if (!location_id || !section_id) return;
    
    // Check if all counter transactions are verified before allowing submission
    if (!areAllCounterTransactionsVerified()) {
      setError('All counter transactions must be verified before submitting.');
      return;
    }
    
    setSubmitting(true);
    try {
      const response = await servicesAPI.updateCheckerStatus(location_id, section_id);
      if (response.data.success) {
        setSuccessMessage('Transactions submitted successfully! Location marked as completed.');
        setTimeout(() => setSuccessMessage(null), 3000);
        navigate('/checker');
      } else {
        throw new Error(response.data.message || 'Failed to submit transactions');
      }
    } catch (error) {
      console.error('Failed to submit:', error);
      setError('Failed to submit transactions. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Box sx={{ p: 2 }}>
      {successMessage && (
        <Alert severity="success" sx={{ mb: 2 }}>
          {successMessage}
        </Alert>
      )}
      
      <Box 
        sx={{ 
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          mb: 2,
          gap: 2,
          flexWrap: 'wrap'
        }}
      >
        {/* Left-aligned items */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Button 
            startIcon={<ArrowBack />} 
            onClick={() => navigate(-1)}
            sx={{ minWidth: 'max-content' }}
          >
            Back
          </Button>
        </Box>

        {/* Center-aligned title */}
        <Box sx={{ 
          display: 'flex', 
          alignItems: 'center',
          flexGrow: 1,
          justifyContent: 'center',
          px: 2
        }}>
          <Typography variant="h6" component="div">
            <Badge 
              badgeContent={transactions.filter(t => t.verified).length} 
              color="success"
              anchorOrigin={{
                vertical: 'top',
                horizontal: 'right'
              }}
            >
              Verification
            </Badge>
          </Typography>
        </Box>

        {/* Right-aligned buttons */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Button 
            variant="contained" 
            onClick={() => setAddLineDialogOpen(true)}
            startIcon={<Add />}
            sx={{ minWidth: 'max-content' }}
          >
            Add New Line
          </Button>
          <Button 
            variant="contained" 
            onClick={fetchData} 
            startIcon={<Refresh />}
            sx={{ minWidth: 'max-content' }}
          >
            Refresh
          </Button>
        </Box>
      </Box>

      <TableContainer component={Paper} sx={{ maxHeight: '75vh', overflow: 'auto' }}>
        <Table stickyHeader>
          <TableHead>
            <TableRow>
              <TableCell width="60px">Quick Verify</TableCell>
              <TableCell width="60px">Status</TableCell>
              <TableCell>Tag ID</TableCell>
              <TableCell>Form</TableCell>
              <TableCell>Grade</TableCell>
              <TableCell>Size</TableCell>
              <TableCell>Width</TableCell>
              <TableCell>Finish</TableCell>
              <TableCell>Ext. Finish</TableCell>
              <TableCell>Length</TableCell>
              <TableCell>Type</TableCell>
              <TableCell>Quality</TableCell>
              <TableCell>Comments</TableCell>
              <TableCell>Count Type</TableCell>
              <TableCell align="right">Counter Count</TableCell>
              <TableCell align="right">Checker Count</TableCell>
              <TableCell width="100px">Edit & Check</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {transactions.map((transaction) => {
              const isVerified = transaction.verified || false;
              const isBundle = transaction.count_type === 'bundle';
              const isExpanded = expandedRows[transaction.transaction_id];
              const transactionBundles = bundles[transaction.transaction_id] || [];

              return (
                <React.Fragment key={transaction.transaction_id}>
                  <TableRow hover sx={{ 
                      bgcolor: transaction.verified ? '#f5fff5' : 'inherit',
                      '&:hover': {
                        bgcolor: transaction.verified ? '#e5f5e5' : '#f5f5f5'
                      }
                    }}>
                    <TableCell>
                      {transaction.verified ? (
                        <Box sx={{ display: 'flex', gap: 0.5 }}>
                          <Avatar sx={{ 
                            bgcolor: green[500], 
                            width: 24, 
                            height: 24,
                            color: 'white'
                          }}>
                            ✓
                          </Avatar>
                          <IconButton 
                            size="small" 
                            onClick={() => unverifyTransaction(transaction.transaction_id)}
                            color="error"
                            title="Unverify Transaction"
                            disabled={unverifyingTransactions.has(transaction.transaction_id) || verifyingTransactions.has(transaction.transaction_id)}
                          >
                            {unverifyingTransactions.has(transaction.transaction_id) ? (
                              <CircularProgress size={16} />
                            ) : (
                              <Close fontSize="small" />
                            )}
                          </IconButton>
                        </Box>
                      ) : (
                        <Box sx={{ display: 'flex', gap: 0.5 }}>
                          <IconButton 
                            size="small" 
                            onClick={() => handleQuickVerify(transaction.transaction_id)}
                            color="success"
                            title="Quick Verify (No Edit Required)"
                            disabled={verifyingTransactions.has(transaction.transaction_id) || unverifyingTransactions.has(transaction.transaction_id)}
                          >
                            {verifyingTransactions.has(transaction.transaction_id) ? (
                              <CircularProgress size={16} />
                            ) : (
                              <Check fontSize="small" />
                            )}
                          </IconButton>
                        </Box>
                      )}
                    </TableCell>
                    <TableCell>
                      {isVerified ? (
                        <Avatar sx={{ bgcolor: green[100], width: 24, height: 24 }}>
                          ✓
                        </Avatar>
                      ) : (
                        <Avatar sx={{ bgcolor: orange[100], width: 24, height: 24 }}>
                          !
                        </Avatar>
                      )}
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" fontWeight="medium">
                        {transaction.tag_id}
                      </Typography>
                    </TableCell>
                    <TableCell>{transaction.form}</TableCell>
                    <TableCell>{transaction.grade}</TableCell>
                    <TableCell>{transaction.size}</TableCell>
                    <TableCell>{transaction.width}</TableCell>
                    <TableCell>{transaction.finish}</TableCell>
                    <TableCell>{transaction.ext_finish}</TableCell>
                    <TableCell>{transaction.length}</TableCell>
                    <TableCell>{transaction.type || '-'}</TableCell>
                    <TableCell>{transaction.remarks || '-'}</TableCell>
                    <TableCell>{transaction.ad_cmts || '-'}</TableCell>
                    <TableCell>
                      <Chip 
                        label={transaction.count_type} 
                        size="small" 
                        color={isBundle ? 'primary' : 'default'}
                        variant={isBundle ? 'filled' : 'outlined'}
                      />
                    </TableCell>
                    <TableCell align="right">
                      <Typography fontWeight="medium">
                        {transaction.qty}
                      </Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Typography fontWeight="medium">
                        {transaction.checker_count || '-'}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', gap: 0.5 }}>
                        <IconButton 
                          size="small" 
                          onClick={() => handleEdit(transaction)}
                          color="primary"
                          title="Edit & Verify (Check Required)"
                          disabled={verifyingTransactions.has(transaction.transaction_id) || unverifyingTransactions.has(transaction.transaction_id)}
                        >
                          <Edit fontSize="small" />
                        </IconButton>
                        {isBundle && (
                          <IconButton 
                            size="small" 
                            onClick={() => toggleRowExpand(transaction.transaction_id)}
                            title="View Bundle Details"
                          >
                            {isExpanded ? '▲' : '▼'}
                          </IconButton>
                        )}
                      </Box>
                    </TableCell>
                  </TableRow>
                  
                  {isBundle && isExpanded && (
                    <TableRow>
                      <TableCell colSpan={14} sx={{ p: 0, borderTop: '1px solid #eee' }}>
                        <Collapse in={isExpanded}>
                          <Box sx={{ p: 2, bgcolor: '#f9f9f9' }}>
                            <Typography variant="subtitle2" gutterBottom>
                              Bundle Details - Total: {calculateTotal(transactionBundles)}
                            </Typography>
                            <Table size="small">
                              <TableHead>
                                <TableRow>
                                  <TableCell>Bundle #</TableCell>
                                  <TableCell>Count</TableCell>
                                  <TableCell>Total</TableCell>
                                </TableRow>
                              </TableHead>
                              <TableBody>
                                {transactionBundles.map((bundle, index) => (
                                  <TableRow key={index}>
                                    <TableCell>{bundle.num_of_bundle}</TableCell>
                                    <TableCell>{bundle.bundle_count}</TableCell>
                                    <TableCell>
                                      {bundle.num_of_bundle * bundle.bundle_count}
                                    </TableCell>
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
            })}
          </TableBody>
        </Table>
      </TableContainer>

      <Box sx={{ mt: 2, display: 'flex', justifyContent: 'space-between' }}>
        <Typography variant="body2" color="text.secondary">
          Showing {transactions.length} items ({transactions.filter(t => t.verified).length} verified)
        </Typography>
      </Box>

      <EditTransactionDialog
        open={isEditing}
        transaction={editingTransaction}
        bundles={editingBundles}
        onClose={() => setIsEditing(false)}
        onSave={handleSave}
        onFieldChange={handleFieldChange}
        onBundleChange={handleBundleChange}
        onAddBundle={addBundle}
        onRemoveBundle={removeBundle}
        isSaving={isSaving}
      />

      {/* Checker Transactions Table */}
      {checkerTransactions.length > 0 && (
        <Box sx={{ mt: 4 }}>
          <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
            Checker Updates ({checkerTransactions.length} items)
          </Typography>
          <TableContainer component={Paper} sx={{ maxHeight: 600 }}>
            <Table stickyHeader size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Tag ID</TableCell>
                  <TableCell>Form</TableCell>
                  <TableCell>Grade</TableCell>
                  <TableCell>Size</TableCell>
                  <TableCell>Width</TableCell>
                  <TableCell>Length</TableCell>
                  <TableCell>Finish</TableCell>
                  <TableCell>Ext. Finish</TableCell>
                  <TableCell>Type</TableCell>
                  <TableCell>Quality</TableCell>
                  <TableCell>Comments</TableCell>
                  <TableCell>Count Type</TableCell>
                  <TableCell align="right">Checker Count</TableCell>
                  <TableCell>Physical Inventory</TableCell>
                  <TableCell>Section ID</TableCell>
                  <TableCell>Updated At</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {checkerTransactions.map((transaction, idx) => {
                  const isBundle = transaction.count_type === 'bundle';
                  const transactionBundles = checkerBundles[transaction.transaction_id] || [];
                  const updatedAt = (transaction as Transaction & { updated_at?: string }).updated_at;
                  return (
                    <React.Fragment key={transaction.transaction_id}>
                      <TableRow sx={{ backgroundColor: idx % 2 === 0 ? '#fafbfc' : 'white' }}>
                        <TableCell>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            {transaction.tag_id}
                            {isNewLineItem(transaction.transaction_id) && (
                              <Chip 
                                label="NEW" 
                                size="small" 
                                color="success" 
                                variant="filled"
                                sx={{ fontSize: '0.7rem', height: '20px' }}
                              />
                            )}
                          </Box>
                        </TableCell>
                        <TableCell>{transaction.form}</TableCell>
                        <TableCell>{transaction.grade}</TableCell>
                        <TableCell>{transaction.size}</TableCell>
                        <TableCell>{transaction.width}</TableCell>
                        <TableCell>{transaction.length}</TableCell>
                        <TableCell>{transaction.finish}</TableCell>
                        <TableCell>{transaction.ext_finish}</TableCell>
                        <TableCell>{transaction.type || '-'}</TableCell>
                        <TableCell>{transaction.remarks || '-'}</TableCell>
                        <TableCell>{transaction.ad_cmts || '-'}</TableCell>
                        <TableCell>
                          <Chip label={transaction.count_type} size="small" color={isBundle ? 'primary' : 'default'} />
                        </TableCell>
                        <TableCell align="right">
                          {transaction.qty}
                        </TableCell>
                        <TableCell>{transaction.location_desc || transaction.location_id}</TableCell>
                        <TableCell>{transaction.section_desc || transaction.section_id}</TableCell>
                        <TableCell>{updatedAt ? new Date(updatedAt).toLocaleString() : '-'}</TableCell>
                      </TableRow>
                      {isBundle && transactionBundles.length > 0 && (
                        <TableRow>
                          <TableCell colSpan={16} sx={{ p: 0 }}>
                            <Box sx={{ pl: 4, py: 1, bgcolor: '#f9f9f9' }}>
                              <Typography variant="subtitle2" gutterBottom>
                                Bundle Details
                              </Typography>
                              <Table size="small">
                                <TableHead>
                                  <TableRow>
                                    <TableCell>Bundle #</TableCell>
                                    <TableCell>Count</TableCell>
                                    <TableCell>Total</TableCell>
                                  </TableRow>
                                </TableHead>
                                <TableBody>
                                  {transactionBundles.map((bundle, index) => (
                                    <TableRow key={index}>
                                      <TableCell>{bundle.num_of_bundle}</TableCell>
                                      <TableCell>{bundle.bundle_count}</TableCell>
                                      <TableCell>
                                        {bundle.num_of_bundle * bundle.bundle_count}
                                      </TableCell>
                                    </TableRow>
                                  ))}
                                </TableBody>
                              </Table>
                            </Box>
                          </TableCell>
                        </TableRow>
                      )}
                    </React.Fragment>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
          
          {/* Submit Button */}
          <Box sx={{ mt: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            {!areAllCounterTransactionsVerified() && (
              <Typography variant="body2" color="warning.main" sx={{ fontWeight: 500 }}>
                ⚠️ All counter transactions must be verified before submitting
              </Typography>
            )}
            <Button
              onClick={handleSubmitAll}
              variant="contained"
              color="primary"
              startIcon={<CheckCircle />}
              disabled={submitting || !areAllCounterTransactionsVerified()}
            >
              {submitting ? 'Submitting...' : 'Submit All Transactions'}
            </Button>
          </Box>
        </Box>
      )}
      <AddLineItemDialog
        open={addLineDialogOpen}
        onClose={() => setAddLineDialogOpen(false)}
        onSubmit={handleAddNewLine}
        locationId={location_id || ''}
        teamId={team_id || ''}
      />
    </Box>
  );
};

export default Checker;