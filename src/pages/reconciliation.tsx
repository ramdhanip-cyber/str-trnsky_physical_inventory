import React, { useState, useEffect, useMemo } from 'react';
import {
  Box,
  Typography,
  Paper,
  TextField,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  Button,
  useTheme,
  alpha,
  Grid,
  Card,
  CardContent,
  CircularProgress,
  Breadcrumbs,
  Link,
  Chip,
  MenuItem,
  Checkbox,
  FormControl,
  InputLabel,
  Select,
  IconButton,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Menu,
  ListItemIcon,
  ListItemText
} from '@mui/material';
import {
  Search,
  Download,
  ChevronLeft,
  Home,
  LocationOn,
  Refresh,
  Edit,
  CheckCircleOutline,
  CompareArrows,
  KeyboardArrowDown,
  Tune,
  ExpandMore,
  Clear
} from '@mui/icons-material';
import * as XLSX from 'xlsx';
import { useSnackbar } from 'notistack';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import type { ReconciliationData } from '../types/reconciliation';
import { servicesAPI } from '../config/api';

const ReconciliationPage: React.FC = () => {
  console.log('Regular ReconciliationPage loaded!');
  const { location_id } = useParams<{ location_id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const theme = useTheme();
  const { enqueueSnackbar } = useSnackbar();

  // Detect role from URL path
  const currentPath = location.pathname;
  const pageRole = currentPath.includes('/reconciliation/counter/') ? 'counter' : 
                   currentPath.includes('/reconciliation/checker/') ? 'checker' : 'counter';

  const [reconciliationData, setReconciliationData] = useState<ReconciliationData | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isExporting, setIsExporting] = useState(false);
  const [checkerData, setCheckerData] = useState<any[]>([]);
  const [orphanedCheckerData, setOrphanedCheckerData] = useState<any[]>([]);
  const [loadingChecker, setLoadingChecker] = useState(false);
  const [showComparison, setShowComparison] = useState(false);

  const [selectedItems, setSelectedItems] = useState<Set<number | string>>(new Set());
  const [recheckItems, setRecheckItems] = useState<any[]>([]);
  const [loadingRecheck, setLoadingRecheck] = useState(false);
  const [showRecheckDialog, setShowRecheckDialog] = useState(false);
  const [recheckReason, setRecheckReason] = useState('');
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [editCheckerQty, setEditCheckerQty] = useState('');
  const [editForm, setEditForm] = useState('');
  const [editGrade, setEditGrade] = useState('');
  const [editSize, setEditSize] = useState('');
  const [editFinish, setEditFinish] = useState('');
  const [editExtFinish, setEditExtFinish] = useState('');
  const [editWidth, setEditWidth] = useState('');
  const [editLength, setEditLength] = useState('');
  const [editMill, setEditMill] = useState('');
  const [editHeat, setEditHeat] = useState('');
  const [editLocation, setEditLocation] = useState('');
  const [editQualityType, setEditQualityType] = useState('');
  const [editType, setEditType] = useState('');
  const [savingEdit, setSavingEdit] = useState(false);
  const [exportMenuAnchor, setExportMenuAnchor] = useState<null | HTMLElement>(null);
  const [expandedItems, setExpandedItems] = useState<Set<number>>(new Set());

  
  // Filter states (kept for internal filtering logic, but UI removed)
  const [filters, setFilters] = useState({
    form: '',
    grade: '',
    size: '',
    finish: '',
    ext_finish: '',
    width: '',
    length: '',
    location: '',
    inv_type: '',
    inv_quality: '',
    branch: '',
    warehouse: '',
    status: ''
  });

  useEffect(() => {
    if (location_id) {
      // Check if data was passed via navigation state
      const stateData = location.state?.reconciliationData;
      if (stateData) {
        setReconciliationData(stateData);
      setLoading(false);
      } else {
        setLoading(false);
      }
    }
  }, [location_id, location.state]);


  // Delete existing reconciliation record - Commented out as feature is disabled
  /* const deleteExistingRecord = async (recordId: number) => {
    try {
      const response = await servicesAPI.deleteReconciliationRecord(recordId.toString());
      if (response.data.success) {
        enqueueSnackbar('Old reconciliation record deleted successfully', { variant: 'info' });
      }
    } catch (error) {
      console.error('Error deleting existing record:', error);
      enqueueSnackbar('Failed to delete old record, but proceeding with new data', { variant: 'warning' });
    }
  }; */

  // Load existing reconciliation data
  const loadExistingData = async (record: any): Promise<boolean> => {
    try {
      setLoadingChecker(true);
      
      // Call the API to load the full reconciliation data
      const response = await servicesAPI.loadReconciliationData(record.id.toString());
      
      if (response.data.success) {
        const loadedRecord = response.data.record;
        
        // Set the reconciliation data
        setReconciliationData({
          summary: loadedRecord.summary,
          items: loadedRecord.items
        });
        
        // Set checker data if available
        if (loadedRecord.checker_data && loadedRecord.checker_data.length > 0) {
          setCheckerData(loadedRecord.checker_data);
          setShowComparison(true);
        }
        
        // Check if items have comparison data (enhanced items_data approach)
        if (loadedRecord.items && loadedRecord.items.length > 0) {
          const hasComparisonData = loadedRecord.items.some((item: any) => item.has_comparison);
          if (hasComparisonData) {
            setShowComparison(true);
          }
        }
        
        // Set orphaned data if available
        if (loadedRecord.orphaned_checker_data && loadedRecord.orphaned_checker_data.length > 0) {
          setOrphanedCheckerData(loadedRecord.orphaned_checker_data);
        }
        
        // Force UI update by ensuring comparison is shown if we have any comparison data
        if (loadedRecord.checker_data?.length > 0 || loadedRecord.orphaned_checker_data?.length > 0) {
          setShowComparison(true);
          
          // Force a re-render by updating the state in a batch
          setTimeout(() => {
            setShowComparison(true);
            if (loadedRecord.checker_data?.length > 0) {
              setCheckerData([...loadedRecord.checker_data]);
            }
            if (loadedRecord.orphaned_checker_data?.length > 0) {
              setOrphanedCheckerData([...loadedRecord.orphaned_checker_data]);
            }
          }, 50);
        }
        
        // Force a small delay to ensure state updates are processed
        setTimeout(() => {
          enqueueSnackbar('Existing reconciliation data loaded successfully', { variant: 'success' });
        }, 100);
        
        return true; // Indicate successful loading
      } else {
        enqueueSnackbar('Failed to load existing data', { variant: 'error' });
        return false;
      }
    } catch (error) {
      console.error('Error loading existing data:', error);
      enqueueSnackbar('Failed to load existing data', { variant: 'error' });
      return false;
    } finally {
      setLoadingChecker(false);
    }
  };

  // Load recheck items for this location
  const loadRecheckItems = async () => {
    if (!location_id) return;
    
    try {
      setLoadingRecheck(true);
      const response = await servicesAPI.getRecheckItems(location_id);
      if (response.data.success) {
        setRecheckItems(response.data.items);
      }
    } catch (error) {
      console.error('Error loading recheck items:', error);
    } finally {
      setLoadingRecheck(false);
    }
  };

  // Check if an item is marked for recheck
  const isItemMarkedForRecheck = (item: any) => {
    if (!item || !recheckItems.length) return false;
    
    const isMarked = recheckItems.some(recheckItem => {
      // Normalize the fields to handle type mismatches
      const itemForm = String(item.form || '').trim();
      const recheckForm = String(recheckItem.form || '').trim();
      
      const itemGrade = String(item.grade || '').trim();
      const recheckGrade = String(recheckItem.grade || '').trim();
      
      const itemSize = String(item.size || '').trim();
      const recheckSize = String(recheckItem.size || '').trim();
      
      const itemFinish = String(item.finish || '').trim();
      const recheckFinish = String(recheckItem.finish || '').trim();
      
      const itemExtFinish = String(item.ext_finish || '').trim();
      const recheckExtFinish = String(recheckItem.ext_finish || '').trim();
      
      const itemWidth = String(Number(item.width || 0)).trim();
      const recheckWidth = String(Number(recheckItem.width || 0)).trim();
      
      const itemLength = String(Number(item.length || 0)).trim();
      const recheckLength = String(Number(recheckItem.length || 0)).trim();
      
      const isMatch = (
        itemForm === recheckForm &&
        itemGrade === recheckGrade &&
        itemSize === recheckSize &&
        itemFinish === recheckFinish &&
        itemExtFinish === recheckExtFinish &&
        itemWidth === recheckWidth &&
        itemLength === recheckLength
      );
      
      if (isMatch) {
        return true;
      }
      
      return isMatch;
    });
    
    return isMarked;
  };

  // Handle item selection for recheck
  const handleItemSelection = (index: number | string) => {
    const newSelected = new Set(selectedItems);
    if (newSelected.has(index)) {
      newSelected.delete(index);
    } else {
      newSelected.add(index);
    }
    setSelectedItems(newSelected);
  };

  // Check if an item can be marked for recheck (only reconciled items and orphaned items)
  const canMarkForRecheck = (item: any) => {
    if (!showComparison) return false;
    
    // For orphaned items, they can always be marked for recheck
    if (item.is_orphaned) return true;
    
    // For system items, only if they have matching checker data (reconciled)
    const matchingChecker = findMatchingCheckerData(item);
    return matchingChecker !== null;
  };

  // Check if an item can be selected for adjustment (all items can be adjusted)
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const canSelectForAdjustment = (_item: any) => {
    return showComparison; // All items can be selected for adjustment when comparison is shown
  };

  // Mark selected items for recheck
  const markItemsForRecheck = async () => {
    if (selectedItems.size === 0) {
      enqueueSnackbar('Please select items to mark for recheck', { variant: 'warning' });
      return;
    }

    try {
      setLoadingRecheck(true);
      
      const itemsToMark = Array.from(selectedItems)
        .filter(index => typeof index === 'number') // Only process main items, not sections
        .map(index => {
          const item = filteredData[index];
          
          // Handle orphaned items
          if (item.is_orphaned) {
            return {
              form: item.form,
              grade: item.grade,
              size: item.size,
              finish: item.finish,
              ext_finish: item.ext_finish,
              width: item.width,
              length: item.length,
              system_qty: 0, // Orphaned items have no system quantity
              counted_qty: item.qty,
              variance: item.qty, // Full quantity is variance for orphaned items
              unit_cost: 0,
              total_cost: 0,
              prd_ohd_mat_val: 0,
              prd_ohd_mat_cst: 0,
              branch: item.branch,
              warehouse: item.warehouse,
              location: item.location,
              type: item.type,
              remarks: item.remarks,
              tag_id: item.tag_id,
              transaction_id: item.transaction_id
            };
          }
          
          // Handle regular system items
          const matchingChecker = findMatchingCheckerData(item);
          return {
            form: item.form,
            grade: item.grade,
            size: item.size,
            finish: item.finish,
            ext_finish: item.ext_finish,
            width: item.width,
            length: item.length,
            system_qty: item.total_qty,
            counted_qty: showComparison ? 
              (matchingChecker?.qty || 0) : 0,
            variance: showComparison ? 
              ((matchingChecker?.qty || 0) - (item.total_qty || 0)) : 0,
            unit_cost: (item as any).unit_cost || 0,
            total_cost: (item as any).total_cost || 0,
            prd_ohd_mat_val: item.prd_ohd_mat_val,
            prd_ohd_mat_cst: item.prd_ohd_mat_cst,
            branch: item.branch,
            warehouse: item.warehouse,
            location: item.location,
            type: (item as any).type || '',
            remarks: item.remarks,
            tag_id: matchingChecker?.tag_id, // Use checker's tag_id
            transaction_id: matchingChecker?.transaction_id // Use checker's transaction_id
          };
        });

      const response = await servicesAPI.markItemsForRecheck({
        location_id,
        items: itemsToMark,
        recheck_reason: recheckReason || 'Marked for recheck during reconciliation'
      });

      if (response.data.success) {
        enqueueSnackbar(response.data.message, { variant: 'success' });
        setSelectedItems(new Set());
        setRecheckReason('');
        setShowRecheckDialog(false);
        
        // Refresh recheck items
        await loadRecheckItems();
        
        // Save current reconciliation data to ensure recheck items are tracked
        if (reconciliationData) {
          await saveReconciliationData();
        }
        
        enqueueSnackbar(`${selectedItems.size} items marked for recheck successfully`, { variant: 'success' });
      }
    } catch (error) {
      console.error('Error marking items for recheck:', error);
      enqueueSnackbar('Failed to mark items for recheck', { variant: 'error' });
    } finally {
      setLoadingRecheck(false);
    }
  };

  // Toggle expanded state for consolidated items
  const toggleExpanded = (index: number) => {
    setExpandedItems(prev => {
      const newSet = new Set(prev);
      if (newSet.has(index)) {
        newSet.delete(index);
      } else {
        newSet.add(index);
      }
      return newSet;
    });
  };

  // Remove item from recheck
  const handleRemoveFromRecheck = async (item: any) => {
    if (!item || !recheckItems.length) return;
    
    try {
      // Find the recheck item
      const recheckItem = recheckItems.find(recheckItem => {
        return recheckItem.form === item.form &&
               recheckItem.grade === item.grade &&
               recheckItem.size === item.size &&
               recheckItem.finish === item.finish &&
               recheckItem.ext_finish === item.ext_finish &&
               recheckItem.width === item.width &&
               recheckItem.length === item.length;
      });
      
      if (!recheckItem) {
        enqueueSnackbar('Recheck item not found', { variant: 'error' });
        return;
      }
      
      // Call API to remove from recheck
      const response = await servicesAPI.removeFromRecheck(recheckItem.id);
      
      if (response.data.success) {
        enqueueSnackbar('Item removed from recheck successfully', { variant: 'success' });
        // Refresh recheck items
        await loadRecheckItems();
      } else {
        enqueueSnackbar('Failed to remove item from recheck', { variant: 'error' });
      }
    } catch (error) {
      console.error('Error removing item from recheck:', error);
      enqueueSnackbar('Failed to remove item from recheck', { variant: 'error' });
    }
  };

  // Handle adjust items navigation
  const handleAdjustItems = () => {
    if (selectedItems.size === 0) {
      enqueueSnackbar('Please select items to adjust', { variant: 'warning' });
      return;
    }

    // Get selected items data with matching checker information
    const selectedItemsData = filteredData.filter((_, index) => 
      selectedItems.has(index)
    ).map(item => {
      const matchingChecker = showComparison ? findMatchingCheckerData(item) : null;
      
      // For orphaned items, use the item's own data
      if (item.is_orphaned) {
        return {
          ...item,
          section_desc: item.section_desc,
          tag_id: item.tag_id,
          tag_ids: item.tag_ids || (item.tag_id ? [item.tag_id] : [])
        };
      }
      
      // For system items, use matching checker data if available
      if (matchingChecker) {
        return {
          ...item,
          section_desc: matchingChecker.sections && matchingChecker.sections.length > 0 
            ? matchingChecker.sections[0].section_desc 
            : item.section_desc,
          tag_id: matchingChecker.tag_id,
          tag_ids: matchingChecker.tag_ids || (matchingChecker.tag_id ? [matchingChecker.tag_id] : [])
        };
      }
      
      // Fallback to item's own data
      return {
        ...item,
        section_desc: item.section_desc,
        tag_id: item.tag_id,
        tag_ids: item.tag_ids || (item.tag_id ? [item.tag_id] : [])
      };
    });

    console.log('Selected items data for adjustment:', selectedItemsData);

    // Navigate to adjustment page with selected items
    navigate('/adjustment', { 
      state: { 
        selectedItems: selectedItemsData,
        location_id: location_id,
        branch: reconciliationData?.summary?.branch,
        warehouse: reconciliationData?.summary?.warehouse
      } 
    });
  };

  const saveEditCheckerQty = async () => {
    if (!editingItem || !editCheckerQty) return;

    setSavingEdit(true);
    try {
      const newQty = parseFloat(editCheckerQty);
      if (isNaN(newQty) || newQty < 0) {
        enqueueSnackbar('Please enter a valid quantity', { variant: 'error' });
        return;
      }

      // Get the matching checker data to find the transaction_id
      const matchingChecker = findMatchingCheckerData(editingItem);
      if (!matchingChecker) {
        enqueueSnackbar('No matching checker data found', { variant: 'error' });
        return;
      }

      // Update the actual transaction in the database
      const updateTransactionData = {
        tag_id: matchingChecker.tag_id,
        form: editForm,
        type: editType,
        grade: editGrade,
        size: editSize,
        width: editWidth,
        finish: editFinish,
        ext_finish: editExtFinish,
        length: editLength,
        count_type: matchingChecker.count_type || 'piece',
        checker_count: newQty,
        location_id: location_id,
        section_id: matchingChecker.section_id,
        location: editLocation,
        mill: editMill,
        heat: editHeat,
        remarks: matchingChecker.remarks || '',
        ad_cmts: matchingChecker.ad_cmts || ''
      };

      const updateResponse = await servicesAPI.updateCheckerTransaction(updateTransactionData);

      if (!updateResponse.data.success) {
        enqueueSnackbar('Failed to update transaction in database', { variant: 'error' });
        return;
      }

      // Re-reconcile after transaction update to re-match items
      await reReconcileAfterUpdate();


      // Update the checker data with new values
      const updatedCheckerData = checkerData.map(checker => {
        const isMatch = findMatchingCheckerData(editingItem) === checker;
        if (isMatch) {
          return { 
            ...checker, 
            qty: newQty,
            form: editForm,
            grade: editGrade,
            size: editSize,
            finish: editFinish,
            ext_finish: editExtFinish,
            width: editWidth,
            length: editLength,
            mill: editMill,
            heat: editHeat,
            location: editLocation,
            quality_type: editQualityType,
            type: editType
          };
        }
        return checker;
      });

      setCheckerData(updatedCheckerData);
      
      // Update reconciliation data items if they have comparison data
      if (reconciliationData?.items) {
        const updatedItems = reconciliationData.items.map(item => {
          const isMatch = findMatchingCheckerData(editingItem) === findMatchingCheckerData(item);
          if (isMatch && item.has_comparison) {
            const newVariance = newQty - (item.total_qty || 0);
            const newStatus = (newQty === item.total_qty ? 'Match' : 
                             newQty > item.total_qty ? 'Overcount' : 'Undercount') as 'Match' | 'Overcount' | 'Undercount';
            
            return { 
              ...item, 
              checker_qty: newQty,
              variance: newVariance,
              status: newStatus
            };
          }
          return item;
        });
        
        setReconciliationData(prev => prev ? {
          ...prev,
          items: updatedItems
        } : null);
      }
      
      // Save the updated reconciliation data to database
      await saveReconciliationData();
      
      // Refresh reconciliation data to show updated values
      await refreshReconciliationData();
      
      enqueueSnackbar('Transaction updated successfully, items re-matched, and data saved', { variant: 'success' });

      setShowEditDialog(false);
      setEditingItem(null);
      setEditCheckerQty('');
      setEditForm('');
      setEditGrade('');
      setEditSize('');
      setEditFinish('');
      setEditExtFinish('');
      setEditWidth('');
      setEditLength('');
      setEditMill('');
      setEditHeat('');
      setEditLocation('');
      setEditQualityType('');
      setEditType('');
    } catch (error) {
      console.error('Error updating checker quantity:', error);
      enqueueSnackbar('Failed to update checker quantity', { variant: 'error' });
    } finally {
      setSavingEdit(false);
    }
  };

  // Load recheck items when component mounts
  useEffect(() => {
    if (location_id) {
      loadRecheckItems();
    }
  }, [location_id]);

  // Function to refresh reconciliation data after edits
  const refreshReconciliationData = async () => {
    if (!location_id || !reconciliationData) return;
    
    try {
      // Check for existing reconciliation record and reload data
      const warehouse = reconciliationData.summary.warehouse;
      const branch = reconciliationData.summary.branch;
      
      const response = await servicesAPI.checkExistingReconciliation({
        location_id,
        warehouse,
        branch
      });
      
      if (response.data.exists) {
        await loadExistingData(response.data.record);
      }
    } catch (error) {
      console.error('Error refreshing reconciliation data:', error);
    }
  };


  // Save reconciliation data with comparison
  const saveReconciliationData = async () => {
    if (!location_id || !reconciliationData) return;
    
    try {
      // Skip auto-save - feature not yet implemented
      console.log('Skipping auto-save of reconciliation data');
      return;
      
      /* Commented out until backend endpoint is implemented
      const warehouse = reconciliationData.summary.warehouse;
      const branch = reconciliationData.summary.branch;
      
      const saveData = {
        location_id,
        warehouse,
        branch,
        summary_data: reconciliationData.summary,
        items_data: reconciliationData.items,
        checker_data: showComparison ? checkerData : [],
        orphaned_checker_data: orphanedCheckerData,
        notes: 'Auto-saved during comparison'
      };
      
      const response = await servicesAPI.saveReconciliationWithComparison(saveData);
      
      if (response.data.success) {
        enqueueSnackbar('Reconciliation data saved successfully', { variant: 'success' });
      }
      */
    } catch (error) {
      console.error('Error saving reconciliation data:', error);
      enqueueSnackbar('Failed to save reconciliation data', { variant: 'error' });
    } finally {
      // Cleanup
    }
  };


  // Function to re-reconcile after transaction update
  const reReconcileAfterUpdate = async () => {
    if (!location_id || !reconciliationData) return;
    
    try {
      // Fetch sections first
      const sectionsResponse = await servicesAPI.getSections(location_id);
      const sections = sectionsResponse.data;
      
      if (sections.length === 0) {
        return;
      }
      
      // Fetch all transactions from all sections (based on pageRole)
      const allCheckerTransactions: any[] = [];
      
      for (const section of sections) {
        try {
          // Use the correct endpoint based on page role
          const transactionResponse = pageRole === 'checker' 
            ? await servicesAPI.getReviewTransactionsForChecker(location_id, section.section_id.toString())
            : await servicesAPI.getReviewTransactionsForCounter(location_id, section.section_id.toString());
            
          const transactions = transactionResponse.data
            .filter((t: any) => pageRole !== 'checker' || t.verified === true)
            .map((t: any) => ({
            ...t,
            section_id: section.section_id,
            section_desc: section.section_desc,
            location_desc: section.location_desc,
            warehouse: section.warehouse,
            branch: section.branch
            }));
          allCheckerTransactions.push(...transactions);
        } catch (error: any) {
          if (error?.response?.status === 404) {
            console.log(`Section ${section.section_id}: No ${pageRole} transactions found during re-reconciliation`);
          } else {
            console.error(`Error fetching ${pageRole} transactions for section ${section.section_id}:`, error);
          }
        }
      }
      
      if (allCheckerTransactions.length === 0) {
        console.log(`No ${pageRole} transactions found during re-reconciliation`);
        return;
      }
      
      // Consolidate checker data by specified fields (same logic as fetchCheckerDataAndCompare)
      const consolidated = new Map<string, any>();
      
      allCheckerTransactions.forEach(transaction => {
        // Normalize the key fields to match system data format
        const normalizedForm = String(transaction.form || '').trim();
        const normalizedGrade = String(transaction.grade || '').trim();
        const normalizedSize = String(transaction.size || '').trim();
        const normalizedFinish = String(transaction.finish || '').trim();
        const normalizedExtFinish = String(transaction.ext_finish || '').trim();
        const normalizedWidth = String(Number(transaction.width || 0)).trim();
        const normalizedLength = String(Number(transaction.length || 0)).trim();
        const normalizedLocation = String(transaction.location || '').trim();
        const normalizedType = String(transaction.type || '').trim();
        const normalizedRemarks = String(transaction.remarks || '').trim();
        
        const key = `${normalizedForm}|${normalizedGrade}|${normalizedSize}|${normalizedFinish}|${normalizedExtFinish}|${normalizedWidth}|${normalizedLength}|${normalizedLocation}|${normalizedType}|${normalizedRemarks}`;
        
        if (consolidated.has(key)) {
          const existing = consolidated.get(key)!;
          existing.qty += transaction.qty || 0;
          existing.transaction_count += 1;
          
          // Collect all tag_ids for this consolidated item
          if (!existing.tag_ids) {
            existing.tag_ids = [existing.tag_id].filter(Boolean);
          }
          if (transaction.tag_id && !existing.tag_ids.includes(transaction.tag_id)) {
            existing.tag_ids.push(transaction.tag_id);
          }
          
          // Add section information if not already present
          if (!existing.sections) {
            existing.sections = [];
          }
          
          // Check if this section is already in the list
          const existingSection = existing.sections.find((s: any) => s.section_id === transaction.section_id);
          if (existingSection) {
            existingSection.qty += transaction.qty || 0;
            existingSection.transaction_count += 1;
            
            // Collect tag_ids for this specific section
            if (!existingSection.tag_ids) {
              existingSection.tag_ids = [];
            }
            if (transaction.tag_id && !existingSection.tag_ids.includes(transaction.tag_id)) {
              existingSection.tag_ids.push(transaction.tag_id);
            }
          } else {
            existing.sections.push({
              section_id: transaction.section_id,
              section_desc: transaction.section_desc,
              qty: transaction.qty || 0,
              transaction_count: 1,
              tag_ids: transaction.tag_id ? [transaction.tag_id] : []
            });
          }
        } else {
          // Create new consolidated item
          consolidated.set(key, {
            tag_id: transaction.tag_id,
            form: normalizedForm,
            grade: normalizedGrade,
            size: normalizedSize,
            finish: normalizedFinish,
            ext_finish: normalizedExtFinish,
            width: normalizedWidth,
            length: normalizedLength,
            location: normalizedLocation,
            type: normalizedType,
            remarks: normalizedRemarks,
            qty: transaction.qty || 0,
            transaction_count: 1,
            tag_ids: transaction.tag_id ? [transaction.tag_id] : [],
            sections: [{
              section_id: transaction.section_id,
              section_desc: transaction.section_desc,
              qty: transaction.qty || 0,
              transaction_count: 1,
              tag_ids: transaction.tag_id ? [transaction.tag_id] : []
            }],
            branch: transaction.branch,
            warehouse: transaction.warehouse,
            count_type: transaction.count_type,
            mill: transaction.mill,
            heat: transaction.heat,
            ad_cmts: transaction.ad_cmts
          });
        }
      });
      
      const consolidatedCheckerData = Array.from(consolidated.values()).sort((a: any, b: any) => {
        // Primary sort: Form
        const formA = (a.form || '').toString().toLowerCase();
        const formB = (b.form || '').toString().toLowerCase();
        if (formA !== formB) {
          return formA.localeCompare(formB);
        }

        // Secondary sort: Size (numeric, with fallback for non-numeric)
        const sizeA = parseFloat(a.size || '0') || 999999999;
        const sizeB = parseFloat(b.size || '0') || 999999999;
        if (sizeA !== sizeB) {
          return sizeA - sizeB;
        }
        // If numeric values are equal, sort alphabetically
        return (a.size || '').localeCompare(b.size || '');
      });
      
      // Update the checker data
      setCheckerData(consolidatedCheckerData);
      
      // Find orphaned checker data (checker items that don't match any system data)
      const orphanedData = findOrphanedCheckerData(consolidatedCheckerData);
      setOrphanedCheckerData(orphanedData);
      
      // Save the updated reconciliation data
      await saveReconciliationData();
      
    } catch (error) {
      console.error('Error during re-reconciliation:', error);
    }
  };

  // Function to find orphaned checker data (checker items that don't match any system data)
  const findOrphanedCheckerData = (checkerItems: any[]) => {
    if (!reconciliationData?.items || !checkerItems.length) return [];
    
    return checkerItems.filter(checkerItem => {
      // Check if this checker item matches any system item
      const hasMatch = reconciliationData.items.some((systemItem: any) => {
        // Use the same matching logic as findMatchingCheckerData
        const systemForm = String(systemItem.form || '').trim();
        const checkerForm = String(checkerItem.form || '').trim();
        
        const systemGrade = String(systemItem.grade || '').trim();
        const checkerGrade = String(checkerItem.grade || '').trim();
        
        const systemSize = String(systemItem.size || '').trim();
        const checkerSize = String(checkerItem.size || '').trim();
        
        const systemFinish = String(systemItem.finish || '').trim();
        const checkerFinish = String(checkerItem.finish || '').trim();
        
        const systemExtFinish = String(systemItem.ext_finish || '').trim();
        const checkerExtFinish = String(checkerItem.ext_finish || '').trim();
        
        const systemWidth = String(Number(systemItem.width || 0)).trim();
        const checkerWidth = String(Number(checkerItem.width || 0)).trim();
        
        const systemLength = String(Number(systemItem.length || 0)).trim();
        const checkerLength = String(Number(checkerItem.length || 0)).trim();
        
        const systemLocation = String(systemItem.location || '').trim();
        const checkerLocation = String(checkerItem.location || '').trim();
        
        const systemType = String(systemItem.inv_type || '').trim();
        const checkerType = String(checkerItem.type || '').trim();
        
        const systemQuality = String(systemItem.inv_quality || '').trim();
        const checkerQuality = String(checkerItem.remarks || '').trim();
        
        return (
          systemForm === checkerForm &&
          systemGrade === checkerGrade &&
          systemSize === checkerSize &&
          systemFinish === checkerFinish &&
          systemExtFinish === checkerExtFinish &&
          systemWidth === checkerWidth &&
          systemLength === checkerLength &&
          systemLocation === checkerLocation &&
          systemType === checkerType &&
          systemQuality === checkerQuality
        );
      });
      
      // Return true if NO match was found (this item is orphaned)
      return !hasMatch;
    });
  };

  // Function to find matching checker data for a system item
  const findMatchingCheckerData = (systemItem: any) => {
    if (!checkerData.length) return null;
    
    // Normalize numeric values for width and length to handle "0.0000" vs "0" and "612.0000" vs "612"
    const normalizeNumeric = (value: unknown): string => {
      if (value === null || value === undefined || value === '') {
        return '';
      }
      const numValue = parseFloat(String(value));
      if (isNaN(numValue)) {
        return String(value).trim();
      }
      // Normalize: 0 becomes "0", other numbers to 4 decimal places
      return numValue === 0 ? '0' : numValue.toFixed(4);
    };
    
    // Normalize quality value for comparison - uses the shared normalization function
    const normalizeQuality = normalizeQualityForComparison;
    
    const match = checkerData.find(checkerItem => {
      // Tag Number - get from various possible field names
      const systemTagId = String(systemItem.tag_no || systemItem.prd_tag_no || systemItem.sys_tag_no || systemItem.sys_tag_id || '').trim().toLowerCase();
      const checkerTagId = String(checkerItem.tag_no || checkerItem.prd_tag_no || checkerItem.sys_tag_no || checkerItem.sys_tag_id || '').trim().toLowerCase();
      
      // Form
      const systemForm = String(systemItem.form || '').trim().toLowerCase();
      const checkerForm = String(checkerItem.form || '').trim().toLowerCase();
      
      // Grade
      const systemGrade = String(systemItem.grade || '').trim().toLowerCase();
      const checkerGrade = String(checkerItem.grade || '').trim().toLowerCase();
      
      // Size
      const systemSize = String(systemItem.size || '').trim().toLowerCase();
      const checkerSize = String(checkerItem.size || '').trim().toLowerCase();
      
      // Finish
      const systemFinish = String(systemItem.finish || '').trim().toLowerCase();
      const checkerFinish = String(checkerItem.finish || '').trim().toLowerCase();
      
      // Ext. Finish
      const systemExtFinish = String(systemItem.ext_finish || '').trim().toLowerCase();
      const checkerExtFinish = String(checkerItem.ext_finish || '').trim().toLowerCase();
      
      // Width and Length - normalized numeric values
      const systemWidth = normalizeNumeric(systemItem.width);
      const checkerWidth = normalizeNumeric(checkerItem.width);
      
      const systemLength = normalizeNumeric(systemItem.length);
      const checkerLength = normalizeNumeric(checkerItem.length);
      
      // Location
      const systemLocation = String(systemItem.location || '').trim().toLowerCase();
      const checkerLocation = String(checkerItem.location || '').trim().toLowerCase();
      
      // Mill
      const systemMill = String(systemItem.mill || '').trim().toLowerCase();
      const checkerMill = String(checkerItem.mill || '').trim().toLowerCase();
      
      // Heat
      const systemHeat = String(systemItem.heat || '').trim().toLowerCase();
      const checkerHeat = String(checkerItem.heat || '').trim().toLowerCase();
      
      // Type
      const systemType = String(systemItem.inv_type || '').trim().toLowerCase();
      const checkerType = String(checkerItem.type || '').trim().toLowerCase();
      
      // Quality - normalized
      const systemQuality = normalizeQuality(systemItem.inv_quality);
      const checkerQuality = normalizeQuality(checkerItem.remarks);
      
      // Compare all 13 fields
      const isMatch = (
        systemTagId === checkerTagId &&
        systemForm === checkerForm &&
        systemGrade === checkerGrade &&
        systemSize === checkerSize &&
        systemFinish === checkerFinish &&
        systemExtFinish === checkerExtFinish &&
        systemWidth === checkerWidth &&
        systemLength === checkerLength &&
        systemLocation === checkerLocation &&
        systemMill === checkerMill &&
        systemHeat === checkerHeat &&
        systemType === checkerType &&
        systemQuality === checkerQuality
      );
      
      return isMatch;
    });
    
    return match;
  };



  // Get unique values for filter dropdowns (including orphaned items)
  const uniqueValues = useMemo(() => {
    // Get system items (default to empty array if not available)
    const systemItems = reconciliationData?.items || [];
    
    // Get orphaned items
    const orphanedItems = orphanedCheckerData || [];
    
    // Combine all items for unique values
    const allItems = [
      ...systemItems,
      ...orphanedItems.map((item: any) => ({
        ...item,
        total_qty: 0,
        system_qty: 0,
        checker_qty: item.qty,
        variance: item.qty,
        status: 'Not In System',
        is_orphaned: true,
        branch: '-',
        warehouse: '-',
        prd_ohd_mat_val: 0,
        prd_ohd_mat_cst: 0
      }))
    ];
    
    return {
      form: [...new Set(allItems.map((item: any) => item.form).filter(Boolean))].sort(),
      grade: [...new Set(allItems.map((item: any) => item.grade).filter(Boolean))].sort(),
      size: [...new Set(allItems.map((item: any) => item.size).filter(Boolean))].sort(),
      finish: [...new Set(allItems.map((item: any) => item.finish).filter(Boolean))].sort(),
      ext_finish: [...new Set(allItems.map((item: any) => item.ext_finish).filter(Boolean))].sort(),
      width: [...new Set(allItems.map((item: any) => item.width).filter(Boolean))].sort(),
      length: [...new Set(allItems.map((item: any) => item.length).filter(Boolean))].sort(),
      location: [...new Set(allItems.map((item: any) => item.location).filter(Boolean))].sort(),
      inv_type: [...new Set(allItems.map((item: any) => item.inv_type).filter(Boolean))].sort(),
      inv_quality: [...new Set(allItems.map((item: any) => item.inv_quality).filter(Boolean))].sort(),
      branch: [...new Set(allItems.map((item: any) => item.branch).filter(Boolean))].sort(),
      warehouse: [...new Set(allItems.map((item: any) => item.warehouse).filter(Boolean))].sort(),
      status: showComparison ? [...new Set([
        ...allItems.map((item: any) => {
          const checkerItem = findMatchingCheckerData(item);
          if (!checkerItem) return 'Counted Not In System';
          const variance = (checkerItem.qty || 0) - (item.total_qty || 0);
          if (variance === 0) return 'Match';
          if (variance > 0) return 'Overcount';
          return 'Undercount';
        }),
        ...(orphanedCheckerData.length > 0 ? ['Not In System'] : [])
      ].filter(Boolean))].sort() : []
    };
  }, [reconciliationData?.items, orphanedCheckerData, showComparison]);

  // Filter data based on search term and filters
  const filteredData = useMemo(() => {
    // Get system items (default to empty array if not available)
    const systemItems = reconciliationData?.items || [];
    
    // Sort orphaned items before adding them
    const sortedOrphanedItems = orphanedCheckerData.sort((a: any, b: any) => {
      // Primary sort: Form
      const formA = (a.form || '').toString().toLowerCase();
      const formB = (b.form || '').toString().toLowerCase();
      if (formA !== formB) {
        return formA.localeCompare(formB);
      }

      // Secondary sort: Size (numeric, with fallback for non-numeric)
      const sizeA = parseFloat(a.size || '0') || 999999999;
      const sizeB = parseFloat(b.size || '0') || 999999999;
      if (sizeA !== sizeB) {
        return sizeA - sizeB;
      }
      // If numeric values are equal, sort alphabetically
      return (a.size || '').localeCompare(b.size || '');
    });

    // Combine system items with orphaned items
    const allItems = [
      ...systemItems,
      ...sortedOrphanedItems.map((item: any) => ({
        ...item,
        total_qty: 0,
        system_qty: 0,
        checker_qty: item.qty,
        variance: item.qty,
        status: 'Not In System',
        is_orphaned: true,
        branch: '-',
        warehouse: '-',
        prd_ohd_mat_val: 0,
        prd_ohd_mat_cst: 0
      }))
    ];
    
    return allItems.filter((item: any) => {
      // Search term filter
      if (searchTerm) {
        const searchLower = searchTerm.toLowerCase();
        const searchMatch = (
          item.form?.toLowerCase().includes(searchLower) ||
          item.grade?.toLowerCase().includes(searchLower) ||
          item.size?.toLowerCase().includes(searchLower) ||
          item.finish?.toLowerCase().includes(searchLower) ||
          item.ext_finish?.toLowerCase().includes(searchLower) ||
          item.width?.toString().toLowerCase().includes(searchLower) ||
          item.length?.toString().toLowerCase().includes(searchLower) ||
          item.location?.toLowerCase().includes(searchLower) ||
          item.weight?.toString().toLowerCase().includes(searchLower) ||
          item.inv_type?.toLowerCase().includes(searchLower) ||
          item.inv_quality?.toLowerCase().includes(searchLower) ||
          item.branch?.toLowerCase().includes(searchLower) ||
          item.warehouse?.toLowerCase().includes(searchLower) ||
          item.total_qty?.toString().includes(searchLower) ||
          item.prd_ohd_mat_val?.toString().includes(searchLower) ||
          item.prd_ohd_mat_cst?.toString().includes(searchLower)
        );
        if (!searchMatch) return false;
      }
      
      // Column filters - EXACT MATCH ONLY (with normalization)
      if (filters.form) {
        const itemForm = String(item.form || '').trim();
        const filterForm = String(filters.form).trim();
        if (itemForm !== filterForm) return false;
      }
      if (filters.grade) {
        const itemGrade = String(item.grade || '').trim();
        const filterGrade = String(filters.grade).trim();
        if (itemGrade !== filterGrade) return false;
      }
      if (filters.size) {
        const itemSize = String(item.size || '').trim();
        const filterSize = String(filters.size).trim();
        if (itemSize !== filterSize) return false;
      }
      if (filters.finish) {
        const itemFinish = String(item.finish || '').trim();
        const filterFinish = String(filters.finish).trim();
        if (itemFinish !== filterFinish) return false;
      }
      if (filters.ext_finish) {
        const itemExtFinish = String(item.ext_finish || '').trim();
        const filterExtFinish = String(filters.ext_finish).trim();
        if (itemExtFinish !== filterExtFinish) return false;
      }
      if (filters.width) {
        // Normalize numeric values for exact comparison
        const itemWidth = item.width !== null && item.width !== undefined 
          ? (typeof item.width === 'number' ? item.width.toFixed(4) : parseFloat(String(item.width)).toFixed(4))
          : '';
        const filterWidthStr = String(filters.width);
        const filterWidthNum = parseFloat(filterWidthStr);
        const filterWidth = !isNaN(filterWidthNum) ? filterWidthNum.toFixed(4) : filterWidthStr.trim();
        if (itemWidth !== filterWidth) return false;
      }
      if (filters.length) {
        // Normalize numeric values for exact comparison
        const itemLength = item.length !== null && item.length !== undefined 
          ? (typeof item.length === 'number' ? item.length.toFixed(4) : parseFloat(String(item.length)).toFixed(4))
          : '';
        const filterLengthStr = String(filters.length);
        const filterLengthNum = parseFloat(filterLengthStr);
        const filterLength = !isNaN(filterLengthNum) ? filterLengthNum.toFixed(4) : filterLengthStr.trim();
        if (itemLength !== filterLength) return false;
      }
      if (filters.location) {
        const itemLocation = String(item.location || '').trim();
        const filterLocation = String(filters.location).trim();
        if (itemLocation !== filterLocation) return false;
      }
      if (filters.inv_type) {
        const itemInvType = String(item.inv_type || '').trim();
        const filterInvType = String(filters.inv_type).trim();
        if (itemInvType !== filterInvType) return false;
      }
      if (filters.inv_quality) {
        const itemInvQuality = String(item.inv_quality || '').trim();
        const filterInvQuality = String(filters.inv_quality).trim();
        if (itemInvQuality !== filterInvQuality) return false;
      }
      if (filters.branch) {
        const itemBranch = String(item.branch || '').trim();
        const filterBranch = String(filters.branch).trim();
        if (itemBranch !== filterBranch) return false;
      }
      if (filters.warehouse) {
        const itemWarehouse = String(item.warehouse || '').trim();
        const filterWarehouse = String(filters.warehouse).trim();
        if (itemWarehouse !== filterWarehouse) return false;
      }
      
      // Status filter (only when comparison is shown)
      if (showComparison && filters.status) {
        // Handle orphaned items
        if (item.is_orphaned) {
          if (filters.status !== 'Not In System') return false;
        } else {
          const checkerItem = findMatchingCheckerData(item);
          if (!checkerItem) {
            if (filters.status !== 'Counted Not In System') return false;
          } else {
            const variance = (checkerItem.qty || 0) - (item.total_qty || 0);
            let itemStatus = 'Match';
            if (variance > 0) itemStatus = 'Overcount';
            else if (variance < 0) itemStatus = 'Undercount';
            
            if (filters.status !== itemStatus) return false;
          }
        }
      }
      
      return true;
    }).sort((a: any, b: any) => {
      // Primary sort: Form
      const formA = (a.form || '').toString().toLowerCase();
      const formB = (b.form || '').toString().toLowerCase();
      if (formA !== formB) {
        return formA.localeCompare(formB);
      }

      // Secondary sort: Size (numeric, with fallback for non-numeric)
      const sizeA = parseFloat(a.size || '0') || 999999999;
      const sizeB = parseFloat(b.size || '0') || 999999999;
      if (sizeA !== sizeB) {
        return sizeA - sizeB;
      }
      // If numeric values are equal, sort alphabetically
      return (a.size || '').localeCompare(b.size || '');
    });
  }, [reconciliationData?.items, orphanedCheckerData, searchTerm, filters, showComparison]);

  // Handle filter changes
  const handleFilterChange = (field: string, value: string) => {
    setFilters(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // Clear all filters
  const clearAllFilters = () => {
    setFilters({
      form: '',
      grade: '',
      size: '',
      finish: '',
      ext_finish: '',
      width: '',
      length: '',
      location: '',
      inv_type: '',
      inv_quality: '',
      branch: '',
      warehouse: '',
      status: ''
    });
  };

  // Export to Excel
  const handleExport = async () => {
    if (!reconciliationData) return;

    setIsExporting(true);
    try {
      const workbook = XLSX.utils.book_new();
      
      // Enhanced Summary Sheet with professional formatting
      const summaryData = [
        ['INVENTORY RECONCILIATION REPORT'],
        [''],
        ['Report Generated:', new Date().toLocaleString()],
        ['Location ID:', location_id],
        ['Branch:', reconciliationData.summary.branch || '-'],
        ['Warehouse:', reconciliationData.summary.warehouse || '-'],
        [''],
        ['SUMMARY STATISTICS'],
        ['Total System Items', reconciliationData.summary.total_system_items],
        ['Total Counted Items', reconciliationData.summary.total_counted_items],
        ['Items Matched', reconciliationData.summary.items_matched],
        ['Overcounts', reconciliationData.summary.overcounts],
        ['Undercounts', reconciliationData.summary.undercounts],
        ['Not Counted', reconciliationData.summary.not_counted],
        [''],
        ['VARIANCE ANALYSIS'],
        ['Total System Quantity', filteredData.reduce((sum, item) => sum + (item.total_qty || 0), 0)],
        ['Total Checker Quantity', filteredData.reduce((sum, item) => {
          const checkerQty = item.has_comparison ? (item.checker_qty || 0) : 
                            (showComparison ? (findMatchingCheckerData(item)?.qty || 0) : 0);
          return sum + checkerQty;
        }, 0)],
        ['Total Variance', filteredData.reduce((sum, item) => {
          const checkerQty = item.has_comparison ? (item.checker_qty || 0) : 
                            (showComparison ? (findMatchingCheckerData(item)?.qty || 0) : 0);
          return sum + (checkerQty - (item.total_qty || 0));
        }, 0)],
        ['Total Value', filteredData.reduce((sum, item) => sum + (item.prd_ohd_mat_val || 0), 0)]
      ];

      // Create detailed reconciliation summary data (like the image shows)
      const overallCoverageDollars = filteredData.reduce((sum, item) => sum + (Number(item.prd_ohd_mat_val) || 0), 0);
      const overallCoveragePieces = filteredData.reduce((sum, item) => sum + (Number(item.total_qty) || 0), 0);
      
      const overcountItems = filteredData.filter(item => {
        const checkerQty = item.has_comparison ? (Number(item.checker_qty) || 0) : 
                          (showComparison ? (Number(findMatchingCheckerData(item)?.qty) || 0) : 0);
        return checkerQty > (Number(item.total_qty) || 0);
      });
      
      const undercountItems = filteredData.filter(item => {
        const checkerQty = item.has_comparison ? (Number(item.checker_qty) || 0) : 
                          (showComparison ? (Number(findMatchingCheckerData(item)?.qty) || 0) : 0);
        return checkerQty < (Number(item.total_qty) || 0);
      });
      
      const valueGain = overcountItems.reduce((sum, item) => {
        const checkerQty = item.has_comparison ? (Number(item.checker_qty) || 0) : 
                          (showComparison ? (Number(findMatchingCheckerData(item)?.qty) || 0) : 0);
        const variance = checkerQty - (Number(item.total_qty) || 0);
        const unitCost = (Number(item.total_qty) || 0) > 0 ? (Number(item.prd_ohd_mat_val) || 0) / (Number(item.total_qty) || 0) : 0;
        return sum + (variance * unitCost);
      }, 0);
      
      const valueLoss = undercountItems.reduce((sum, item) => {
        const checkerQty = item.has_comparison ? (Number(item.checker_qty) || 0) : 
                          (showComparison ? (Number(findMatchingCheckerData(item)?.qty) || 0) : 0);
        const variance = Math.abs(checkerQty - (Number(item.total_qty) || 0));
        const unitCost = (Number(item.total_qty) || 0) > 0 ? (Number(item.prd_ohd_mat_val) || 0) / (Number(item.total_qty) || 0) : 0;
        return sum + (variance * unitCost);
      }, 0);
      
      const totalValue = overallCoverageDollars + valueGain - valueLoss;

      const reconciliationSummaryData = [{
        'Physical Inventory Number': `INV-${location_id}-${new Date().toISOString().slice(0, 10)}`,
        'Branch': reconciliationData.summary.branch || '-',
        'Warehouse': reconciliationData.summary.warehouse || '-',
        'Overall Coverage $': overallCoverageDollars.toFixed(2),
        'Overall Coverage Pieces': overallCoveragePieces,
        'Overcount': overcountItems.length,
        'Undercounts': undercountItems.length,
        '$ Value Gain': valueGain.toFixed(2),
        '$ Value Loss': valueLoss.toFixed(2),
        'Total Value': totalValue.toFixed(2)
      }];
      
      const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);
      
      // Set column widths for summary sheet
      summarySheet['!cols'] = [
        { wch: 25 }, // Column A
        { wch: 15 }  // Column B
      ];
      
      XLSX.utils.book_append_sheet(workbook, summarySheet, 'Summary');

      // Add Reconciliation Summary sheet (like the image shows)
      const reconciliationSummarySheet = XLSX.utils.json_to_sheet(reconciliationSummaryData);
      XLSX.utils.book_append_sheet(workbook, reconciliationSummarySheet, 'Reconciliation Summary');

      // Enhanced Details Sheet with all requested columns
      const exportRows: Array<Record<string, string | number>> = [];

      // Process system data with hierarchical structure
      const systemData: Array<Record<string, string | number>> = [];
      
      filteredData.forEach(item => {
        // Get comparison data if available
        const checkerQty = item.has_comparison ? (item.checker_qty || 0) : 
                          (showComparison ? (findMatchingCheckerData(item)?.qty || 0) : 0);
        const variance = item.has_comparison ? (item.variance || 0) : 
                        (showComparison ? ((findMatchingCheckerData(item)?.qty || 0) - (item.total_qty || 0)) : 0);
        const status = item.is_orphaned ? 'Not In System' :
                      (item.has_comparison ? (item.status || 'Counted Not In System') : 
                      (showComparison ? 
                        (findMatchingCheckerData(item) ? 
                          (checkerQty === item.total_qty ? 'Match' : 
                           checkerQty > item.total_qty ? 'Overcount' : 'Undercount') : 
                          'Counted Not In System') : 
                        'Counted Not In System'));

        const matchingChecker = showComparison ? findMatchingCheckerData(item) : null;
        const totalValue = item.prd_ohd_mat_val || 0;
        // const unitCost = (item.total_qty || 0) > 0 ? totalValue / (item.total_qty || 0) : 0;
        const unitCost = item.prd_ohd_mat_cst || 0;

        // Base item data
        const baseItem = {
          'Form': item.form || '',
          'Size': item.size || '',
          'Grade': item.grade || '',
          'Finish': item.finish || '',
          'Extended Finish': item.ext_finish || '',
          'Width': item.width || '',
          'Length': item.length || '',
          'Location': item.location || '',
          'Weight': item.weight || '',
          'Inventory Type': item.inv_type || '',
          'Quality Standards': item.inv_quality || '',
          'Quality Standards Code': getQualityStandardCode(item.inv_quality || ''),
          'Branch': item.branch || '',
          'Warehouse': item.warehouse || '',
          'Total Amount': totalValue,
          'Unit Cost': unitCost
        };

        // If there are multiple sections, show each section individually
        if (matchingChecker?.sections && matchingChecker.sections.length > 1) {
          matchingChecker.sections.forEach((section: any, index: number) => {
            systemData.push({
              ...baseItem,
              'System Qty': index === 0 ? (item.total_qty || 0) : '', // Only show system qty on first row
              'Checker Qty': section.qty || 0,
              'Section Breakdown': `  └─ ${section.section_desc || '-'}`,
              'Tag ID': section.tag_ids && section.tag_ids.length > 0 ? section.tag_ids.join(', ') : '-',
              'Variance': '', // No variance for individual sections
              'Status': '' // No status for individual sections
            });
          });

          // Add consolidated row with totals
          systemData.push({
            ...baseItem,
            'System Qty': item.total_qty || 0,
            'Checker Qty': checkerQty,
            'Section Breakdown': 'TOTAL',
            'Tag ID': '', // No tag ID for total row
            'Variance': variance,
            'Status': status
          });
        } else {
          // Single section or no sections - show as single row
          const sectionDesc = matchingChecker?.sections?.[0]?.section_desc || item.section_desc || '-';
          const tagId = matchingChecker?.tag_ids ? matchingChecker.tag_ids.join(', ') : 
                       (matchingChecker?.tag_id || item.tag_id || '-');

          systemData.push({
            ...baseItem,
            'System Qty': item.total_qty || 0,
            'Checker Qty': checkerQty,
            'Section Breakdown': sectionDesc,
            'Tag ID': tagId,
            'Variance': variance,
            'Status': status
          });
        }
      });

      // Process orphaned data with hierarchical structure
      const orphanedData: Array<Record<string, string | number>> = [];
      
      // Sort orphaned data by Form then Size
      const sortedOrphanedData = orphanedCheckerData.sort((a: any, b: any) => {
        // Primary sort: Form
        const formA = (a.form || '').toString().toLowerCase();
        const formB = (b.form || '').toString().toLowerCase();
        if (formA !== formB) {
          return formA.localeCompare(formB);
        }

        // Secondary sort: Size (numeric, with fallback for non-numeric)
        const sizeA = parseFloat(a.size || '0') || 999999999;
        const sizeB = parseFloat(b.size || '0') || 999999999;
        if (sizeA !== sizeB) {
          return sizeA - sizeB;
        }
        // If numeric values are equal, sort alphabetically
        return (a.size || '').localeCompare(b.size || '');
      });
      
      sortedOrphanedData.forEach(item => {
        // Base item data for orphaned items
        const baseItem = {
          'Form': item.form || '',
          'Size': item.size || '',
          'Grade': item.grade || '',
          'Finish': item.finish || '',
          'Extended Finish': item.ext_finish || '',
          'Width': item.width || '',
          'Length': item.length || '',
          'Location': item.location || '',
          'Weight': '',
          'Inventory Type': item.type || '',
          'Quality Standards': item.remarks || '',
          'Quality Standards Code': getQualityStandardCode(item.remarks || ''),
          'Branch': '',
          'Warehouse': '',
          'System Qty': 0,
          'Total Amount': 0,
          'Unit Cost': 0
        };

        // If there are multiple sections, show each section individually
        if (item.sections && item.sections.length > 1) {
          item.sections.forEach((section: any) => {
            orphanedData.push({
              ...baseItem,
              'Checker Qty': section.qty || 0,
              'Section Breakdown': `  └─ ${section.section_desc || '-'}`,
              'Tag ID': section.tag_ids && section.tag_ids.length > 0 ? section.tag_ids.join(', ') : '-',
              'Variance': '', // No variance for individual sections
              'Status': '' // No status for individual sections
            });
          });

          // Add consolidated row with totals
          orphanedData.push({
            ...baseItem,
            'Checker Qty': item.qty || 0,
            'Section Breakdown': 'TOTAL',
            'Tag ID': '', // No tag ID for total row
            'Variance': item.qty || 0,
            'Status': 'Not In System'
          });
        } else {
          // Single section - show as single row
          const sectionDesc = item.section_desc || '-';
          const tagId = item.tag_ids ? item.tag_ids.join(', ') : (item.tag_id || '-');

          orphanedData.push({
            ...baseItem,
            'Checker Qty': item.qty || 0,
            'Section Breakdown': sectionDesc,
            'Tag ID': tagId,
            'Variance': item.qty || 0,
            'Status': 'Not In System'
          });
        }
      });

      // Combine and add all data
      const allData = [...systemData, ...orphanedData];
      exportRows.push(...allData);

      // Create worksheet with proper headers and formatting
      const ws = XLSX.utils.json_to_sheet(exportRows, {
        header: [
          'Form',
          'Size',
          'Grade',
          'Finish',
          'Extended Finish',
          'Width',
          'Length',
          'Location',
          'Weight',
          'Inventory Type',
          'Quality Standards',
          'Quality Standards Code',
          'Branch',
          'Warehouse',
          'System Qty',
          'Checker Qty',
          'Section Breakdown',
          'Tag ID',
          'Variance',
          'Status',
          'Total Amount',
          'Unit Cost'
        ]
      });
      
      // Style the details sheet for Excel compatibility
      const detailsRange = XLSX.utils.decode_range(ws['!ref'] || 'A1');
      for (let row = detailsRange.s.r; row <= detailsRange.e.r; row++) {
        for (let col = detailsRange.s.c; col <= detailsRange.e.c; col++) {
          const cellAddress = XLSX.utils.encode_cell({ r: row, c: col });
          if (!ws[cellAddress]) continue;
          
          if (row === 0) {
            // Header row
            ws[cellAddress].s = {
              font: { bold: true, size: 11, color: { rgb: "FFFFFF" } },
              fill: { fgColor: { rgb: "1976D2" } },
              alignment: { horizontal: "center", vertical: "center" },
              border: {
                top: { style: "thin", color: { rgb: "000000" } },
                bottom: { style: "thin", color: { rgb: "000000" } },
                left: { style: "thin", color: { rgb: "000000" } },
                right: { style: "thin", color: { rgb: "000000" } }
              }
            };
          } else if (row > 0) {
            // Data rows
            ws[cellAddress].s = {
              font: { size: 10 },
              alignment: { horizontal: "left", vertical: "center" },
              border: {
                top: { style: "thin", color: { rgb: "CCCCCC" } },
                bottom: { style: "thin", color: { rgb: "CCCCCC" } },
                left: { style: "thin", color: { rgb: "CCCCCC" } },
                right: { style: "thin", color: { rgb: "CCCCCC" } }
              }
            };
            
            // Highlight TOTAL rows and section grouping
            if (ws[cellAddress].v === 'TOTAL' && col === 16) { // Section Breakdown column
              ws[cellAddress].s.font = { bold: true, size: 11 };
              ws[cellAddress].s.fill = { fgColor: { rgb: "E3F2FD" } }; // Light blue
            }
            
            // Group section rows with light background
            if (ws[cellAddress].v && typeof ws[cellAddress].v === 'string' && 
                ws[cellAddress].v.startsWith('  └─') && col === 16) { // Section Breakdown column
              ws[cellAddress].s.fill = { fgColor: { rgb: "F8F9FA" } }; // Very light gray
              ws[cellAddress].s.font = { italic: true };
            }
            
            // Add left border for section grouping
            if (ws[cellAddress].v && typeof ws[cellAddress].v === 'string' && 
                (ws[cellAddress].v.startsWith('  └─') || ws[cellAddress].v === 'TOTAL') && col === 0) {
              ws[cellAddress].s.border = {
                ...ws[cellAddress].s.border,
                left: { style: "medium", color: { rgb: "1976D2" } } // Blue left border
              };
            }
            
            // Highlight variance rows
            if (ws[cellAddress].v && typeof ws[cellAddress].v === 'number' && col === 18) { // Variance column
              if (ws[cellAddress].v > 0) {
                ws[cellAddress].s.fill = { fgColor: { rgb: "FFEBEE" } }; // Light red
              } else if (ws[cellAddress].v < 0) {
                ws[cellAddress].s.fill = { fgColor: { rgb: "FFF3E0" } }; // Light orange
              }
            }
            
            // Highlight status column
            if (ws[cellAddress].v && typeof ws[cellAddress].v === 'string' && col === 19) { // Status column
              if (ws[cellAddress].v === 'Overcount') {
                ws[cellAddress].s.font = { color: { rgb: "D32F2F" }, bold: true };
              } else if (ws[cellAddress].v === 'Undercount') {
                ws[cellAddress].s.font = { color: { rgb: "F57C00" }, bold: true };
              } else if (ws[cellAddress].v === 'Match') {
                ws[cellAddress].s.font = { color: { rgb: "388E3C" }, bold: true };
              } else if (ws[cellAddress].v === 'Not In System') {
                ws[cellAddress].s.font = { color: { rgb: "FF9800" }, bold: true };
              }
            }
          }
        }
      }
      
      // Set column widths for better readability
      ws['!cols'] = [
        { wch: 8 },  // Form
        { wch: 12 }, // Grade
        { wch: 10 }, // Size
        { wch: 10 }, // Finish
        { wch: 15 }, // Extended Finish
        { wch: 8 },  // Width
        { wch: 8 },  // Length
        { wch: 15 }, // Location
        { wch: 8 },  // Weight
        { wch: 15 }, // Inventory Type
        { wch: 15 }, // Quality Standards
        { wch: 20 }, // Quality Standards Code
        { wch: 10 }, // Branch
        { wch: 12 }, // Warehouse
        { wch: 12 }, // System Qty
        { wch: 12 }, // Checker Qty
        { wch: 25 }, // Section Breakdown
        { wch: 15 }, // Tag ID
        { wch: 10 }, // Variance
        { wch: 12 }, // Status
        { wch: 15 }, // Total Amount
        { wch: 12 }  // Unit Cost
      ];
      
      XLSX.utils.book_append_sheet(workbook, ws, 'Reconciliation Details');

      const fileName = `Inventory_Reconciliation_Report_${location_id}_${new Date().toISOString().slice(0,10)}.xlsx`;
      XLSX.writeFile(workbook, fileName);
      enqueueSnackbar('Comprehensive reconciliation report exported successfully', { variant: 'success' });
    } catch (error) {
      console.error('Export error:', error);
      enqueueSnackbar('Failed to export report', { variant: 'error' });
    } finally {
      setIsExporting(false);
    }
  };

  // Export recheck items to Excel
  const handleExportRecheckItems = async () => {
    if (!recheckItems.length) {
      enqueueSnackbar('No recheck items to export', { variant: 'warning' });
      return;
    }

    setIsExporting(true);
    try {
      // Prepare recheck items data
      const recheckData = recheckItems.map(item => ({
        'Form': item.form,
        'Size': item.size,
        'Grade': item.grade,
        'Finish': item.finish,
        'Extended Finish': item.ext_finish,
        'Width': item.width,
        'Length': item.length,
        'Location': item.location,
        'Mill': item.mill,
        'Heat': item.heat,
        'System Quantity': item.total_qty,
        'Original Counted Qty': item.counted_qty,
        'Variance': item.variance,
        'Status': item.status,
        'Recheck Reason': item.recheck_reason,
        'Marked By': item.marked_by_name || item.marked_by,
        'Marked At': item.marked_at,
        'Rechecked By': item.rechecked_by_name || item.rechecked_by,
        'Rechecked At': item.rechecked_at,
        'Recheck Count': item.recheck_count
      }));

      // Create summary data for recheck items
      const recheckSummaryData = [{
        'Location ID': location_id,
        'Branch': reconciliationData?.summary?.branch || '-',
        'Warehouse': reconciliationData?.summary?.warehouse || '-',
        'Total Recheck Items': recheckItems.length,
        'Rechecking in Progress': recheckItems.filter(item => item.status === 'Rechecking in Progress').length,
        'Rechecked': recheckItems.filter(item => item.status === 'Rechecked').length,
        'Completed': recheckItems.filter(item => item.status === 'Completed').length,
        'Export Date': new Date().toISOString().slice(0, 19).replace('T', ' ')
      }];

      // Create workbook
      const wb = XLSX.utils.book_new();
      
      // Add recheck items sheet
      const wsRecheckData = XLSX.utils.json_to_sheet(recheckData);
      XLSX.utils.book_append_sheet(wb, wsRecheckData, 'Recheck Items');
      
      // Add recheck summary sheet
      const wsRecheckSummary = XLSX.utils.json_to_sheet(recheckSummaryData);
      XLSX.utils.book_append_sheet(wb, wsRecheckSummary, 'Recheck Summary');
      
      const fileName = `Recheck_Items_${location_id}_${new Date().toISOString().slice(0, 10)}.xlsx`;
      XLSX.writeFile(wb, fileName);
      
      enqueueSnackbar(`Recheck items exported successfully! ${recheckItems.length} items`, { variant: 'success' });
    } catch (error) {
      console.error('Export recheck items error:', error);
      enqueueSnackbar('Failed to export recheck items', { variant: 'error' });
    } finally {
      setIsExporting(false);
    }
  };

  // Quality standards mapping - matches backend normalization
  // Maps codes to descriptions (bidirectional)
  const qualityCodeToDescription: { [key: string]: string } = {
    '-': 'Prime',
    'C': 'Claim',
    'R': 'Reject',
    'S': 'Scrap',
    'Y': 'Secondary',
    'P': 'Processing',
    'X': 'Special Buy',
    'Z': 'Write Down',
    'B': 'Buyout',
    'G': 'BERG Pipe',
    'U': 'Used',
    'J': 'ReJect',
    'M': 'Mill Claim',
    'E': 'Price Protct Ex',
    'A': 'Pre-Bill Collec',
    'T': 'Solar 0 Value',
    'N': 'NZ Write Down',
    'O': 'Over-roll NZ'
  };

  // Reverse mapping - descriptions to codes
  const qualityDescriptionToCode: { [key: string]: string } = {};
  Object.entries(qualityCodeToDescription).forEach(([code, desc]) => {
    qualityDescriptionToCode[desc.toLowerCase()] = code;
    // Handle variations
    if (desc === 'ReJect') {
      qualityDescriptionToCode['reject'] = code;
    }
    if (desc === 'Mill Claim') {
      qualityDescriptionToCode['millclaim'] = code;
      qualityDescriptionToCode['mill claim'] = code;
    }
    if (desc === 'Special Buy') {
      qualityDescriptionToCode['specialbuy'] = code;
      qualityDescriptionToCode['special buy'] = code;
    }
    if (desc === 'Write Down') {
      qualityDescriptionToCode['writedown'] = code;
      qualityDescriptionToCode['write down'] = code;
    }
    if (desc === 'Price Protct Ex') {
      qualityDescriptionToCode['price protct ex'] = code;
      qualityDescriptionToCode['priceprotected'] = code;
    }
    if (desc === 'Pre-Bill Collec') {
      qualityDescriptionToCode['pre-bill collec'] = code;
      qualityDescriptionToCode['prebill'] = code;
    }
    if (desc === 'Solar 0 Value') {
      qualityDescriptionToCode['solar 0 value'] = code;
      qualityDescriptionToCode['solar'] = code;
    }
    if (desc === 'NZ Write Down') {
      qualityDescriptionToCode['nz write down'] = code;
      qualityDescriptionToCode['nzwritedown'] = code;
    }
    if (desc === 'Over-roll NZ') {
      qualityDescriptionToCode['over-roll nz'] = code;
      qualityDescriptionToCode['overroll'] = code;
    }
    // Handle common variations
    if (desc === 'Prime') {
      qualityDescriptionToCode['conforms to std'] = code;
      qualityDescriptionToCode['conforms to standard'] = code;
      qualityDescriptionToCode['conforms'] = code;
      qualityDescriptionToCode['standard'] = code;
      qualityDescriptionToCode['std'] = code;
    }
  });

  // Normalize quality value - converts both codes and descriptions to normalized description format
  // This matches the backend normalization logic
  const normalizeQualityForComparison = (quality: unknown): string => {
    // Handle empty, null, undefined, and dash values - all should normalize to 'prime'
    if (!quality || quality === '' || quality === '-' || quality === null || quality === undefined) {
      return 'prime'; // Default to prime for empty values (lowercase for comparison)
    }
    
    const qualityStr = String(quality).trim();
    
    // If after trimming it's empty or dash, return 'prime'
    if (qualityStr === '' || qualityStr === '-') {
      return 'prime';
    }
    
    // First check if it's a code (single character or '-')
    if (qualityCodeToDescription[qualityStr]) {
      return qualityCodeToDescription[qualityStr].toLowerCase();
    }
    
    // Check if it's a description (case-insensitive)
    const qualityLower = qualityStr.toLowerCase();
    if (qualityDescriptionToCode[qualityLower]) {
      // It's a description, convert to code then back to description for normalization
      const code = qualityDescriptionToCode[qualityLower];
      return qualityCodeToDescription[code].toLowerCase();
    }
    
    // Check for partial matches in descriptions
    for (const [, desc] of Object.entries(qualityCodeToDescription)) {
      const descLower = desc.toLowerCase();
      if (qualityLower.includes(descLower) || descLower.includes(qualityLower)) {
        return descLower; // Return normalized description (lowercase)
      }
    }
    
    // If no match found, return lowercase version
    return qualityLower;
  };

  // Legacy function for backward compatibility (for export functionality)
  const getQualityStandardCode = (quality: string): string => {
    if (!quality) return '-';
    const normalized = normalizeQualityForComparison(quality);
    // Convert back to code for export
    const code = qualityDescriptionToCode[normalized];
    return code || quality;
  };

  if (loading) {
    return (
      <Box sx={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        minHeight: '60vh',
        flexDirection: 'column',
        gap: 2
      }}>
        <CircularProgress size={60} thickness={4} />
        <Typography variant="h6" color="text.secondary">
          Loading reconciliation data...
        </Typography>
      </Box>
    );
  }

  if (!reconciliationData) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography variant="h5" color="error">
          No reconciliation data found
        </Typography>
        <Button 
          variant="contained" 
          onClick={() => navigate(-1)}
          sx={{ mt: 2 }}
        >
          Back to Review
        </Button>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3, maxWidth: '100%' }}>
      {/* Header */}
      <Paper sx={{ p: 3, mb: 2 }}>
        <Breadcrumbs sx={{ mb: 2 }}>
          <Link
            component="button"
            variant="body1"
            onClick={() => navigate('/')}
            sx={{ display: 'flex', alignItems: 'center', textDecoration: 'none' }}
          >
            <Home sx={{ mr: 0.5 }} />
            Home
          </Link>
          <Link
            component="button"
            variant="body1"
              onClick={() => navigate(-1)}
            sx={{ display: 'flex', alignItems: 'center', textDecoration: 'none' }}
          >
            <LocationOn sx={{ mr: 0.5 }} />
            Review
          </Link>
          <Typography color="text.primary">Reconciliation</Typography>
        </Breadcrumbs>

        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 3 }}>
          {/* Left side - Title and status */}
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            <Typography variant="h4" sx={{ fontWeight: 600, color: 'primary.main' }}>
              System Data Reconciliation
            </Typography>
            {showComparison && (
              <Chip 
                label="Comparison Active" 
                color="success" 
                size="small" 
                icon={<CheckCircleOutline />}
                sx={{ alignSelf: 'flex-start' }}
              />
            )}
          </Box>
          
          {/* Right side - All buttons in a single row */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            {/* Export Button with Dropdown */}
            <Box sx={{ position: 'relative' }}>
              <Button 
                variant="outlined" 
                startIcon={<Download />}
                endIcon={<KeyboardArrowDown />}
                onClick={(event) => setExportMenuAnchor(event.currentTarget)}
                disabled={isExporting}
                sx={{ 
                  minWidth: '120px',
                  height: '40px',
                  borderColor: 'primary.main',
                  '&:hover': { borderColor: 'primary.dark' }
                }}
              >
                {isExporting ? 'Exporting...' : 'Export'}
              </Button>
              {recheckItems.length > 0 && (
                <Chip
                  label={recheckItems.length}
                  size="small"
                  color="warning"
                  sx={{
                    position: 'absolute',
                    top: -8,
                    right: -8,
                    minWidth: '20px',
                    height: '20px',
                    fontSize: '0.75rem'
                  }}
                />
              )}
            </Box>
            
            {/* Export Menu */}
            <Menu
              anchorEl={exportMenuAnchor}
              open={Boolean(exportMenuAnchor)}
              onClose={() => setExportMenuAnchor(null)}
              anchorOrigin={{
                vertical: 'bottom',
                horizontal: 'left',
              }}
              transformOrigin={{
                vertical: 'top',
                horizontal: 'left',
              }}
            >
              <MenuItem 
                onClick={() => {
                  setExportMenuAnchor(null);
                  handleExport();
                }}
                disabled={isExporting}
              >
                <ListItemIcon>
                  <Download fontSize="small" />
                </ListItemIcon>
                <ListItemText primary="Export All Data" secondary="Reconciliation data with comparison" />
              </MenuItem>
              <MenuItem 
                onClick={() => {
                  setExportMenuAnchor(null);
                  handleExportRecheckItems();
                }}
                disabled={isExporting || !recheckItems.length}
              >
                <ListItemIcon>
                  <Refresh fontSize="small" />
                </ListItemIcon>
                <ListItemText 
                  primary="Export Recheck Items" 
                  secondary={`${recheckItems.length} items marked for recheck`}
                />
              </MenuItem>
            </Menu>
            
            {/* Compare Button - Shows comparison between System and Counter/Checker data */}
            <Button
              variant="contained"
              color="primary"
              onClick={() => {
                // Simple comparison without field selection dialog
                setShowComparison(true);
                enqueueSnackbar('Comparison enabled', { variant: 'info' });
              }}
              disabled={loadingChecker}
              startIcon={loadingChecker ? <CircularProgress size={20} /> : <CompareArrows />}
              sx={{ 
                minWidth: '180px',
                height: '40px',
                fontWeight: 600,
                boxShadow: 2
              }}
            >
              {loadingChecker ? 'Loading...' : `Compare with ${pageRole.charAt(0).toUpperCase() + pageRole.slice(1)}`}
            </Button>

            {/* Secondary Actions - Only show when comparison is active */}
            {showComparison && (
              <>
                {/* Visual separator */}
                <Box sx={{ width: '1px', height: '32px', bgcolor: 'divider' }} />
                
                
                {/* Recheck Button - Only show if any selected items can be marked for recheck */}
                {selectedItems.size > 0 && filteredData.some((item, index) => 
                  selectedItems.has(index) && canMarkForRecheck(item)
                ) && (
                  <Button
                    variant="outlined"
                    color="info"
                    onClick={() => setShowRecheckDialog(true)}
                    startIcon={<Edit />}
                    sx={{ 
                      minWidth: '140px',
                      height: '40px',
                      borderColor: 'info.main',
                      '&:hover': { borderColor: 'info.dark' }
                    }}
                  >
                    Mark for Recheck ({selectedItems.size})
                  </Button>
                )}
                
                {/* Adjust Items Button */}
                <Button
                  variant="outlined"
                  color="secondary"
                  onClick={handleAdjustItems}
                  disabled={selectedItems.size === 0}
                  startIcon={<Tune />}
                  sx={{ 
                    minWidth: '140px',
                    height: '40px',
                    fontWeight: 600,
                    boxShadow: 1
                  }}
                >
                  Adjust Items ({selectedItems.size})
                </Button>
              </>
            )}

            {/* Visual separator */}
            <Box sx={{ width: '1px', height: '32px', bgcolor: 'divider' }} />
            
            {/* Back Button */}
            <Button
              variant="contained"
              color="secondary"
              startIcon={<ChevronLeft />}
              onClick={() => navigate(-1)}
              sx={{ 
                minWidth: '120px',
                height: '40px',
                fontWeight: 600,
                boxShadow: 2
              }}
            >
              Back to Review
            </Button>
          </Box>
        </Box>

      {/* Summary Cards */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
            <CardContent>
                <Typography variant="h4" color="primary" sx={{ fontWeight: 600 }}>
                  {reconciliationData.summary.total_system_items || 0}
              </Typography>
                <Typography variant="body2" color="text.secondary">
                  Total Items
              </Typography>
            </CardContent>
          </Card>
        </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
            <CardContent>
                <Typography variant="h4" color="primary" sx={{ fontWeight: 600 }}>
                  {reconciliationData.summary.total_system_quantity || 0}
              </Typography>
                <Typography variant="body2" color="text.secondary">
                  Total Quantity
              </Typography>
            </CardContent>
          </Card>
        </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
            <CardContent>
                <Typography variant="h4" color="primary" sx={{ fontWeight: 600 }}>
                  {reconciliationData.summary.branch || '-'}
              </Typography>
                <Typography variant="body2" color="text.secondary">
                  Branch
              </Typography>
            </CardContent>
          </Card>
        </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
            <CardContent>
                <Typography variant="h4" color="primary" sx={{ fontWeight: 600 }}>
                  {reconciliationData.summary.warehouse || '-'}
              </Typography>
                <Typography variant="body2" color="text.secondary">
                  Warehouse
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        </Grid>
      </Paper>



      {/* Search and Filters */}
      <Paper sx={{ p: 2, mb: 2 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <TextField
            placeholder="Search items..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            InputProps={{
              startAdornment: <Search sx={{ mr: 1, color: 'text.secondary' }} />
            }}
            sx={{ maxWidth: 400 }}
          />
          <Button
            variant="outlined"
            size="small"
            onClick={clearAllFilters}
            disabled={Object.values(filters).every(v => !v)}
          >
            Clear Filters
          </Button>
        </Box>
        
        {/* Filter Row */}
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.5, mt: 2 }}>
          <FormControl size="small" sx={{ minWidth: 120 }}>
            <InputLabel>Form</InputLabel>
            <Select
              value={filters.form || ''}
              label="Form"
              onChange={(e) => handleFilterChange('form', e.target.value)}
            >
              <MenuItem value="">All</MenuItem>
              {uniqueValues.form?.map((value) => (
                <MenuItem key={String(value)} value={String(value)}>{String(value)}</MenuItem>
              ))}
            </Select>
          </FormControl>
          
          <FormControl size="small" sx={{ minWidth: 120 }}>
            <InputLabel>Grade</InputLabel>
            <Select
              value={filters.grade || ''}
              label="Grade"
              onChange={(e) => handleFilterChange('grade', e.target.value)}
            >
              <MenuItem value="">All</MenuItem>
              {uniqueValues.grade?.map((value) => (
                <MenuItem key={String(value)} value={String(value)}>{String(value)}</MenuItem>
              ))}
            </Select>
          </FormControl>
          
          <FormControl size="small" sx={{ minWidth: 120 }}>
            <InputLabel>Size</InputLabel>
            <Select
              value={filters.size || ''}
              label="Size"
              onChange={(e) => handleFilterChange('size', e.target.value)}
            >
              <MenuItem value="">All</MenuItem>
              {uniqueValues.size?.map((value: string) => (
                <MenuItem key={value} value={value}>{value}</MenuItem>
              ))}
            </Select>
          </FormControl>
          
          <FormControl size="small" sx={{ minWidth: 120 }}>
            <InputLabel>Finish</InputLabel>
            <Select
              value={filters.finish || ''}
              label="Finish"
              onChange={(e) => handleFilterChange('finish', e.target.value)}
            >
              <MenuItem value="">All</MenuItem>
              {uniqueValues.finish?.map((value: string) => (
                <MenuItem key={value} value={value}>{value}</MenuItem>
              ))}
            </Select>
          </FormControl>
          
          <FormControl size="small" sx={{ minWidth: 140 }}>
            <InputLabel>Location</InputLabel>
            <Select
              value={filters.location || ''}
              label="Location"
              onChange={(e) => handleFilterChange('location', e.target.value)}
            >
              <MenuItem value="">All</MenuItem>
              {uniqueValues.location?.map((value: string) => (
                <MenuItem key={value} value={value}>{value}</MenuItem>
              ))}
            </Select>
          </FormControl>
          
          <FormControl size="small" sx={{ minWidth: 120 }}>
            <InputLabel>Branch</InputLabel>
            <Select
              value={filters.branch || ''}
              label="Branch"
              onChange={(e) => handleFilterChange('branch', e.target.value)}
            >
              <MenuItem value="">All</MenuItem>
              {uniqueValues.branch?.map((value: string) => (
                <MenuItem key={value} value={value}>{value}</MenuItem>
              ))}
            </Select>
          </FormControl>
          
          <FormControl size="small" sx={{ minWidth: 120 }}>
            <InputLabel>Warehouse</InputLabel>
            <Select
              value={filters.warehouse || ''}
              label="Warehouse"
              onChange={(e) => handleFilterChange('warehouse', e.target.value)}
            >
              <MenuItem value="">All</MenuItem>
              {uniqueValues.warehouse?.map((value: string) => (
                <MenuItem key={value} value={value}>{value}</MenuItem>
              ))}
            </Select>
          </FormControl>
          
          {showComparison && (
            <FormControl size="small" sx={{ minWidth: 140 }}>
              <InputLabel>Status</InputLabel>
              <Select
                value={filters.status || ''}
                label="Status"
                onChange={(e) => handleFilterChange('status', e.target.value)}
              >
                <MenuItem value="">All</MenuItem>
                {uniqueValues.status?.map((value: string) => (
                  <MenuItem key={value} value={value}>{value}</MenuItem>
                ))}
              </Select>
            </FormControl>
          )}
        </Box>
        
        {/* Active Filters Display */}
        {Object.values(filters).some(v => v) && (
          <Box sx={{ mt: 2, display: 'flex', flexWrap: 'wrap', gap: 1 }}>
            {Object.entries(filters).map(([key, value]) => 
              value && (
                <Chip 
                  key={key}
                  label={`${key.replace('_', ' ').toUpperCase()}: ${value}`} 
                  size="small" 
                  onDelete={() => handleFilterChange(key, '')}
                  color="primary"
                  variant="outlined"
                />
              )
            )}
          </Box>
        )}
      </Paper>

      {/* Data Table */}
      <Paper sx={{ overflow: 'hidden' }}>
        <Box sx={{ maxHeight: '60vh', overflow: 'auto' }}>
          <Table size="small" sx={{ minWidth: 1200 }}>
          <TableHead>
            <TableRow sx={{ 
              backgroundColor: alpha(theme.palette.primary.main, 0.05),
              '& th': { 
                fontWeight: 600,
                whiteSpace: 'nowrap',
                  color: theme.palette.text.primary,
                  position: 'sticky',
                  top: 0,
                  zIndex: 1
                }
              }}>
              {showComparison && (
                <TableCell padding="checkbox">
                  <Checkbox
                    indeterminate={selectedItems.size > 0 && selectedItems.size < filteredData.filter(item => canSelectForAdjustment(item)).length}
                    checked={selectedItems.size > 0 && selectedItems.size === filteredData.filter(item => canSelectForAdjustment(item)).length}
                    onChange={(event) => {
                      if (event.target.checked) {
                        const selectableItems = new Set<number | string>();
                        // Add all selectable items for adjustment
                        filteredData.forEach((item, index) => {
                          if (canSelectForAdjustment(item)) {
                            selectableItems.add(index);
                          }
                        });
                        setSelectedItems(selectableItems);
                      } else {
                        setSelectedItems(new Set());
                      }
                    }}
                  />
                </TableCell>
              )}
              <TableCell>Serial No.</TableCell>
              <TableCell>Form</TableCell>
              <TableCell>Size</TableCell>
              <TableCell>Grade</TableCell>
              <TableCell>Finish</TableCell>
              <TableCell>Extended Finish</TableCell>
              <TableCell>Width</TableCell>
              <TableCell>Length</TableCell>
              <TableCell>Location</TableCell>
              <TableCell>Weight</TableCell>
              <TableCell>Inventory Type</TableCell>
              <TableCell>Quality Standards Code</TableCell>
              <TableCell>Branch</TableCell>
              <TableCell>Warehouse</TableCell>
              <TableCell align="right">System Quantity</TableCell>
              {showComparison && (
                <>
                  <TableCell align="right">Checker Qty</TableCell>
                  <TableCell align="right">Variance</TableCell>
                  <TableCell>Status</TableCell>
                </>
              )}
              <TableCell align="right">Total Amount</TableCell>
              <TableCell align="right">Unit Cost</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredData.length === 0 ? (
              <TableRow>
                <TableCell colSpan={showComparison ? 23 : 19} align="center" sx={{ py: 3 }}>
                  <Typography variant="body1" color="text.secondary">
                    No items found
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              filteredData.map((item, index) => {
                const matchingChecker = showComparison ? findMatchingCheckerData(item) : null;
                
                
                // Use enhanced item data if available (loaded from database), otherwise calculate from checker data
                const variance = item.has_comparison ? (item.variance || 0) : 
                                (matchingChecker ? (matchingChecker.qty - item.total_qty) : 0);
                const status = item.is_orphaned ? 'Not In System' :
                              (item.has_comparison ? (item.status || 'Counted Not In System') :
                              (matchingChecker ?
                                (matchingChecker.qty === item.total_qty ? 'Match' :
                                 matchingChecker.qty > item.total_qty ? 'Overcount' : 'Undercount') :
                                'Counted Not In System'));
                
                const isMarkedForRecheck = isItemMarkedForRecheck(item);
                
                // Determine row background color based on status and recheck state
                const getRowBackgroundColor = () => {
                  if (!showComparison) return alpha(theme.palette.background.default, 0.5);
                  
                  // If item is marked for recheck, give it a distinct background
                  if (isMarkedForRecheck) {
                    return alpha(theme.palette.info.main, 0.15);
                  }
                  
                  if (status === 'Match') {
                    return alpha(theme.palette.success.main, 0.1);
                  } else if (status === 'Overcount') {
                    return alpha(theme.palette.warning.main, 0.1);
                  } else if (status === 'Undercount') {
                    return alpha(theme.palette.error.main, 0.1);
                  } else if (status === 'Counted Not In System') {
                    return alpha(theme.palette.grey[400], 0.1);
                  } else if (status === 'Not In System') {
                    return alpha(theme.palette.warning.main, 0.2);
                  }
                  
                  return alpha(theme.palette.background.default, 0.5);
                };

                const getRowHoverColor = () => {
                  if (!showComparison) return alpha(theme.palette.background.default, 0.8);
                  
                  // If item is marked for recheck, give it a distinct hover color
                  if (isMarkedForRecheck) {
                    return alpha(theme.palette.info.main, 0.25);
                  }
                  
                  if (status === 'Match') {
                    return alpha(theme.palette.success.main, 0.2);
                  } else if (status === 'Overcount') {
                    return alpha(theme.palette.warning.main, 0.2);
                  } else if (status === 'Undercount') {
                    return alpha(theme.palette.error.main, 0.2);
                  } else if (status === 'Counted Not In System') {
                    return alpha(theme.palette.grey[400], 0.2);
                  } else if (status === 'Not In System') {
                    return alpha(theme.palette.warning.main, 0.3);
                  }
                  
                  return alpha(theme.palette.background.default, 0.8);
                };

                // Check if we need to show section breakdown
                const hasMultipleSections = matchingChecker?.sections && matchingChecker.sections.length > 1;
                
                
                if (hasMultipleSections) {
                  const isExpanded = expandedItems.has(index);
                  
                  // Render consolidated row with dropdown
                  return (
                    <React.Fragment key={`${index}-consolidated`}>
                      {/* Main consolidated row */}
                      <TableRow 
                        key={index} 
                        hover
                        sx={{ 
                          backgroundColor: getRowBackgroundColor(),
                          '&:hover': {
                            backgroundColor: getRowHoverColor()
                          }
                        }}
                      >
                         {showComparison && (
                           <TableCell align="center">
                             <IconButton
                               size="small"
                               onClick={() => toggleExpanded(index)}
                               sx={{ 
                                 transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
                                 transition: 'transform 0.2s ease-in-out'
                               }}
                             >
                               <ExpandMore fontSize="small" />
                             </IconButton>
                           </TableCell>
                         )}
                        <TableCell>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, position: 'relative' }}>
                            {isMarkedForRecheck && (
                              <Chip
                                label="RE"
                                size="small"
                                sx={{
                                  fontSize: '0.65rem',
                                  height: '18px',
                                  fontWeight: 600,
                                  position: 'absolute',
                                  top: '-12px',
                                  left: '-4px',
                                  zIndex: 2,
                                  backgroundColor: theme.palette.error.main,
                                  color: theme.palette.error.contrastText,
                                  '&:hover': {
                                    backgroundColor: theme.palette.error.dark
                                  }
                                }}
                              />
                            )}
                            <Chip 
                              label={`#${item.tag_id || index}`}
                              size="small"
                              color="primary"
                              variant="outlined"
                              sx={{ fontWeight: 600 }}
                            />
                          </Box>
                        </TableCell>
                        <TableCell>{matchingChecker.form}</TableCell>
                        <TableCell>{matchingChecker.size}</TableCell>
                        <TableCell>{matchingChecker.grade}</TableCell>
                        <TableCell>{matchingChecker.finish}</TableCell>
                        <TableCell>{matchingChecker.ext_finish || '-'}</TableCell>
                        <TableCell>{matchingChecker.width || '-'}</TableCell>
                        <TableCell>{matchingChecker.length || '-'}</TableCell>
                        <TableCell>{matchingChecker.location || '-'}</TableCell>
                        <TableCell>{matchingChecker.weight || '-'}</TableCell>
                        <TableCell>{matchingChecker.type}</TableCell>
                        <TableCell>
                          <Tooltip title={matchingChecker.remarks || 'No quality standard specified'} arrow>
                            <span>{getQualityStandardCode(matchingChecker.remarks || '')}</span>
                          </Tooltip>
                        </TableCell>
                        <TableCell>{matchingChecker.branch || '-'}</TableCell>
                        <TableCell>{matchingChecker.warehouse || '-'}</TableCell>
                        <TableCell align="right">{item.total_qty || item.system_qty || '-'}</TableCell>
                        {showComparison && (
                          <>
                            <TableCell align="right">
                              <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 0.5 }}>
                                <Chip 
                                  label={matchingChecker.qty}
                                  color="primary"
                                  variant="outlined"
                                  size="small"
                                  sx={{ fontWeight: 600 }}
                                />
                                <Typography variant="caption" color="primary.main" sx={{ fontSize: '0.7rem', fontWeight: 600 }}>
                                  
                                  {matchingChecker.tag_ids && matchingChecker.tag_ids.length > 0 && (
                                    <span> {matchingChecker.tag_ids.map((tagId: any) => `#${tagId}`).join(', ')}</span>
                                  )}
                                </Typography>
                              </Box>
                            </TableCell>
                            <TableCell align="right">
                              <Chip 
                                label={variance}
                                color={
                                  status === 'Match' ? 'success' :
                                  status === 'Overcount' ? 'warning' :
                                  status === 'Undercount' ? 'error' : 'default'
                                }
                                variant="outlined"
                                size="small"
                                sx={{ fontWeight: 600 }}
                              />
                            </TableCell>
                            <TableCell>
                              <Chip 
                                label={status}
                                color={
                                  status === 'Match' ? 'success' :
                                  status === 'Overcount' ? 'warning' :
                                  status === 'Undercount' ? 'error' : 'default'
                                }
                                size="small"
                              />
                            </TableCell>
                          </>
                        )}
                        <TableCell align="right">{item.prd_ohd_mat_val}</TableCell>
                        <TableCell align="right">{item.prd_ohd_mat_cst}</TableCell>
                        <TableCell>
                          {isItemMarkedForRecheck(item) && (
                            <Tooltip title="Remove from Recheck" arrow>
                              <IconButton
                                size="small"
                                onClick={() => handleRemoveFromRecheck(item)}
                                color="error"
                              >
                                <Clear fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          )}
                        </TableCell>
                      </TableRow>
                      
                      {/* Expanded section breakdown rows */}
                      {isExpanded && matchingChecker.sections.map((section: any) => (
                        <TableRow 
                          key={`${index}-section-${section.section_id}`}
                          hover
                          sx={{ 
                            backgroundColor: alpha(theme.palette.info.main, 0.05),
                            '&:hover': {
                              backgroundColor: alpha(theme.palette.info.main, 0.1)
                            }
                          }}
                        >
                          {showComparison && canSelectForAdjustment(item) && (
                            <TableCell padding="checkbox">
                              <Checkbox
                                checked={selectedItems.has(`${index}-section-${section.section_id}`)}
                                onChange={() => handleItemSelection(`${index}-section-${section.section_id}`)}
                              />
                            </TableCell>
                          )}
                          <TableCell>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <Chip 
                                label={`#${item.tag_id || index}`}
                                size="small"
                                color="info"
                                variant="outlined"
                                sx={{ fontWeight: 600 }}
                              />
                              {/* <Typography variant="caption" color="text.secondary">
                                Section
                              </Typography> */}
                            </Box>
                          </TableCell>
                          {/* <TableCell>{item.tag_id || '-'}</TableCell> */}
                          <TableCell>{matchingChecker.form}</TableCell>
                          <TableCell>{matchingChecker.size}</TableCell>
                          <TableCell>{matchingChecker.grade}</TableCell>
                          <TableCell>{matchingChecker.finish}</TableCell>
                          <TableCell>{matchingChecker.ext_finish || '-'}</TableCell>
                          <TableCell>{matchingChecker.width || '-'}</TableCell>
                          <TableCell>{matchingChecker.length || '-'}</TableCell>
                          <TableCell>{matchingChecker.location || '-'}</TableCell>
                          <TableCell>{matchingChecker.weight || '-'}</TableCell>
                          <TableCell>{matchingChecker.type}</TableCell>
                          <TableCell>
                            <Tooltip title={matchingChecker.remarks || 'No quality standard specified'} arrow>
                              <span>{getQualityStandardCode(matchingChecker.remarks || '')}</span>
                            </Tooltip>
                          </TableCell>
                          <TableCell>{matchingChecker.branch || '-'}</TableCell>
                          <TableCell>{matchingChecker.warehouse || '-'}</TableCell>
                          <TableCell align="right">-</TableCell>
                          {showComparison && (
                            <>
                              <TableCell align="right">
                                <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 0.5 }}>
                                  <Chip 
                                    label={section.qty}
                                    color="info"
                                    variant="outlined"
                                    size="small"
                                    sx={{ fontWeight: 600 }}
                                  />
                                  <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>
                                    {section.section_desc}
                                    {section.tag_ids && section.tag_ids.length > 0 && (
                                      <span> - {section.tag_ids.map((tagId: any) => `#${tagId}`).join(', ')}</span>
                                    )}
                                  </Typography>
                                </Box>
                              </TableCell>
                              <TableCell align="right">-</TableCell>
                              <TableCell>
                                <Chip 
                                  label="Section Count"
                                  color="info"
                                  size="small"
                                />
                              </TableCell>
                            </>
                          )}
                          <TableCell align="right">-</TableCell>
                          <TableCell align="right">-</TableCell>
                          <TableCell>
                            {isItemMarkedForRecheck(item) && (
                              <Tooltip title="Remove from Recheck" arrow>
                                <IconButton
                                  size="small"
                                  onClick={() => handleRemoveFromRecheck(item)}
                                  color="error"
                                >
                                  <Clear fontSize="small" />
                                </IconButton>
                              </Tooltip>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </React.Fragment>
                  );
                } else {
                  // Render single row (no section breakdown needed)
                  return (
                    <TableRow 
                      key={index} 
                      hover
                      sx={{ 
                        backgroundColor: getRowBackgroundColor(),
                        '&:hover': {
                          backgroundColor: getRowHoverColor()
                        }
                      }}
                    >
                      {showComparison && canSelectForAdjustment(item) && (
                        <TableCell padding="checkbox">
                          <Checkbox
                            checked={selectedItems.has(index)}
                            onChange={() => handleItemSelection(index)}
                          />
                        </TableCell>
                      )}
                          <TableCell>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, position: 'relative' }}>
                              {isMarkedForRecheck && (
                                <Chip
                                  label="RE"
                                  size="small"
                                  sx={{
                                    fontSize: '0.65rem',
                                    height: '18px',
                                    fontWeight: 600,
                                    position: 'absolute',
                                    top: '-12px',
                                    left: '-4px',
                                    zIndex: 2,
                                    backgroundColor: theme.palette.error.main,
                                    color: theme.palette.error.contrastText,
                                    '&:hover': {
                                      backgroundColor: theme.palette.error.dark
                                    }
                                  }}
                                />
                              )}
                              <Chip 
                                label={`#${item.tag_id || index}`}
                                size="small"
                                color="primary"
                                variant="outlined"
                                sx={{ fontWeight: 600 }}
                              />
                            </Box>
                          </TableCell>
                      {/* <TableCell>{item.tag_id || '-'}</TableCell> */}
                      <TableCell>{item.form}</TableCell>
                      {/* <TableCell>{item.section_desc}</TableCell> */}
                      <TableCell>{item.size}</TableCell>
                      <TableCell>{item.grade}</TableCell>
                      <TableCell>{item.finish}</TableCell>
                      <TableCell>{item.ext_finish || '-'}</TableCell>
                      <TableCell>{item.width || '-'}</TableCell>
                      <TableCell>{item.length || '-'}</TableCell>
                      <TableCell>{item.location || '-'}</TableCell>
                      <TableCell>{item.weight || '-'}</TableCell>
                      <TableCell>{item.inv_type || '-'}</TableCell>
                      <TableCell>
                        <Tooltip title={item.inv_quality || 'No quality standard specified'} arrow>
                          <span>{getQualityStandardCode(item.inv_quality || '')}</span>
                        </Tooltip>
                      </TableCell>
                      <TableCell>{item.branch}</TableCell>
                      <TableCell>{item.warehouse}</TableCell>
                      <TableCell align="right">{item.total_qty || item.system_qty || '-'}</TableCell>
                      {showComparison && (
                        <>
                          <TableCell align="right">
                            {(() => {
                              // First try to get data from enhanced item data (loaded from database)
                              if (item.has_comparison && item.checker_qty !== undefined) {
                                return (
                                  <Chip 
                                    label={item.checker_qty}
                                    color="primary"
                                    variant="outlined"
                                    size="small"
                                    sx={{ fontWeight: 600 }}
                                  />
                                );
                              }
                              // Fallback to checker data (for new comparisons)
                              if (matchingChecker) {
                                // Get section information for single items
                                const sectionInfo = matchingChecker.sections && matchingChecker.sections.length > 0 
                                  ? matchingChecker.sections[0].section_desc 
                                  : '-';
                                
                                return (
                                  <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 0.5 }}>
                                    <Chip 
                                      label={matchingChecker.qty}
                                      color="primary"
                                      variant="outlined"
                                      size="small"
                                      sx={{ fontWeight: 600 }}
                                    />
                                    <Typography variant="caption" color="primary.main" sx={{ fontSize: '0.7rem' }}>
                                      {sectionInfo}
                                      {matchingChecker.tag_ids && matchingChecker.tag_ids.length > 0 && (
                                        <span> - {matchingChecker.tag_ids.map((tagId: any) => `#${tagId}`).join(', ')}</span>
                                      )}
                                    </Typography>
                                  </Box>
                                );
                              }
                              return (
                                <Chip 
                                  label="No Data"
                                  color="default"
                                  variant="outlined"
                                  size="small"
                                  sx={{ fontWeight: 600 }}
                                />
                              );
                            })()}
                          </TableCell>
                          <TableCell align="right">
                            {(() => {
                              // First try to get data from enhanced item data (loaded from database)
                              if (item.has_comparison && item.variance !== undefined) {
                                return (
                                  <Chip 
                                    label={item.variance}
                                    color={
                                      item.status === 'Match' ? 'success' :
                                      item.status === 'Overcount' ? 'warning' :
                                      item.status === 'Undercount' ? 'error' : 'default'
                                    }
                                    variant="outlined"
                                    size="small"
                                    sx={{ fontWeight: 600 }}
                                  />
                                );
                              }
                              // Fallback to checker data (for new comparisons)
                              if (matchingChecker) {
                                return (
                                  <Chip 
                                    label={variance}
                                    color={
                                      status === 'Match' ? 'success' :
                                      status === 'Overcount' ? 'warning' :
                                      status === 'Undercount' ? 'error' : 'default'
                                    }
                                    variant="outlined"
                                    size="small"
                                    sx={{ fontWeight: 600 }}
                                  />
                                );
                              }
                              return (
                                <Chip 
                                  label="N/A"
                                  color="default"
                                  variant="outlined"
                                  size="small"
                                  sx={{ fontWeight: 600 }}
                                />
                              );
                            })()}
                          </TableCell>
                          <TableCell>
                            {(() => {
                              // First try to get data from enhanced item data (loaded from database)
                              if (item.has_comparison && item.status !== undefined) {
                                return (
                                  <Chip 
                                    label={item.status}
                                    color={
                                      item.status === 'Match' ? 'success' :
                                      item.status === 'Overcount' ? 'warning' :
                                      item.status === 'Undercount' ? 'error' :
                                      item.status === 'Not In System' ? 'warning' : 'default'
                                    }
                                    size="small"
                                  />
                                );
                              }
                              // Handle orphaned items
                              if (item.is_orphaned) {
                                return (
                                  <Chip 
                                    label="Not In System"
                                    color="warning"
                                    size="small"
                                  />
                                );
                              }
                              // Fallback to checker data (for new comparisons)
                              return (
                                <Chip 
                                  label={status}
                                  color={
                                    status === 'Match' ? 'success' :
                                    status === 'Overcount' ? 'warning' :
                                    status === 'Undercount' ? 'error' :
                                    status === 'Not In System' ? 'warning' : 'default'
                                  }
                                  size="small"
                                />
                              );
                            })()}
                          </TableCell>
                        </>
                      )}
                      <TableCell align="right">{item.prd_ohd_mat_val}</TableCell>
                      <TableCell align="right">{item.prd_ohd_mat_cst}</TableCell>
                      <TableCell>
                        {isItemMarkedForRecheck(item) && (
                          <Tooltip title="Remove from Recheck" arrow>
                            <IconButton
                              size="small"
                              onClick={() => handleRemoveFromRecheck(item)}
                              color="error"
                            >
                              <Clear fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                }
              })
            )}
          </TableBody>
        </Table>
        </Box>
      </Paper>


      {/* Recheck Dialog */}
      <Dialog open={showRecheckDialog} onClose={() => setShowRecheckDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Mark Items for Recheck</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Mark selected items for rechecking. These items will be added to the recheck queue.
          </Typography>
          <TextField
            fullWidth
            multiline
            rows={3}
            label="Recheck Reason (Optional)"
            placeholder="Enter reason for rechecking these items..."
            value={recheckReason}
            onChange={(e) => setRecheckReason(e.target.value)}
            sx={{ mt: 1 }}
          />
          <Box sx={{ mt: 2, p: 2, backgroundColor: alpha(theme.palette.info.main, 0.1), borderRadius: 1 }}>
            <Typography variant="body2" color="text.secondary">
              <strong>Items to mark for recheck:</strong> {selectedItems.size}
            </Typography>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowRecheckDialog(false)} disabled={loadingRecheck}>
            Cancel
          </Button>
          <Button 
            onClick={markItemsForRecheck} 
            variant="contained" 
            disabled={loadingRecheck}
            startIcon={loadingRecheck ? <CircularProgress size={20} /> : null}
          >
            {loadingRecheck ? 'Marking...' : 'Mark for Recheck'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Edit Checker Quantity Dialog */}
      <Dialog open={showEditDialog} onClose={() => setShowEditDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          Edit Checker Data
        </DialogTitle>
        <DialogContent>
          {editingItem && (
            <>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Edit the checker data for this item. Changes will be saved to the reconciliation record.
              </Typography>
              <Box sx={{ mb: 2, p: 2, backgroundColor: alpha(theme.palette.grey[100], 0.5), borderRadius: 1 }}>
                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                  {editingItem.form} - {editingItem.size} - {editingItem.grade}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  System Qty: {editingItem.total_qty}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Current Checker Qty: {findMatchingCheckerData(editingItem)?.qty || 0}
                </Typography>
              </Box>
              <Grid container spacing={2} sx={{ mt: 1 }}>
                <Grid item xs={6}>
                  <TextField
                    fullWidth
                    label="Form"
                    value={editForm}
                    onChange={(e) => setEditForm(e.target.value)}
                    size="small"
                  />
                </Grid>
                <Grid item xs={6}>
                  <TextField
                    fullWidth
                    label="Grade"
                    value={editGrade}
                    onChange={(e) => setEditGrade(e.target.value)}
                    size="small"
                  />
                </Grid>
                <Grid item xs={6}>
                  <TextField
                    fullWidth
                    label="Size"
                    value={editSize}
                    onChange={(e) => setEditSize(e.target.value)}
                    size="small"
                  />
                </Grid>
                <Grid item xs={6}>
                  <TextField
                    fullWidth
                    label="Finish"
                    value={editFinish}
                    onChange={(e) => setEditFinish(e.target.value)}
                    size="small"
                  />
                </Grid>
                <Grid item xs={6}>
                  <TextField
                    fullWidth
                    label="Extended Finish"
                    value={editExtFinish}
                    onChange={(e) => setEditExtFinish(e.target.value)}
                    size="small"
                  />
                </Grid>
                <Grid item xs={6}>
                  <TextField
                    fullWidth
                    label="Width"
                    value={editWidth}
                    onChange={(e) => setEditWidth(e.target.value)}
                    size="small"
                  />
                </Grid>
                <Grid item xs={6}>
                  <TextField
                    fullWidth
                    label="Length"
                    value={editLength}
                    onChange={(e) => setEditLength(e.target.value)}
                    size="small"
                  />
                </Grid>
                <Grid item xs={6}>
                  <TextField
                    fullWidth
                    label="Mill"
                    value={editMill}
                    onChange={(e) => setEditMill(e.target.value)}
                    size="small"
                  />
                </Grid>
                <Grid item xs={6}>
                  <TextField
                    fullWidth
                    label="Heat"
                    value={editHeat}
                    onChange={(e) => setEditHeat(e.target.value)}
                    size="small"
                  />
                </Grid>
                <Grid item xs={6}>
                  <TextField
                    fullWidth
                    label="Location"
                    value={editLocation}
                    onChange={(e) => setEditLocation(e.target.value)}
                    size="small"
                  />
                </Grid>
                <Grid item xs={6}>
                  <TextField
                    fullWidth
                    label="Quality Type"
                    value={editQualityType}
                    onChange={(e) => setEditQualityType(e.target.value)}
                    size="small"
                  />
                </Grid>
                <Grid item xs={6}>
                  <TextField
                    fullWidth
                    label="Type"
                    value={editType}
                    onChange={(e) => setEditType(e.target.value)}
                    size="small"
                  />
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Quantity"
                    type="number"
                    value={editCheckerQty}
                    onChange={(e) => setEditCheckerQty(e.target.value)}
                    inputProps={{ min: 0, step: 0.01 }}
                    helperText="Enter the corrected quantity from recheck"
                  />
                </Grid>
              </Grid>
              {editCheckerQty && (
                <Box sx={{ mt: 2, p: 2, backgroundColor: alpha(theme.palette.info.main, 0.1), borderRadius: 1 }}>
                  <Typography variant="body2" color="text.secondary">
                    <strong>Variance:</strong> {parseFloat(editCheckerQty) - (editingItem.total_qty || 0)}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    <strong>Status:</strong> {
                      parseFloat(editCheckerQty) === editingItem.total_qty ? 'Match' :
                      parseFloat(editCheckerQty) > editingItem.total_qty ? 'Overcount' : 'Undercount'
                    }
                  </Typography>
                </Box>
              )}
            </>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowEditDialog(false)} disabled={savingEdit}>
            Cancel
          </Button>
          <Button 
            onClick={saveEditCheckerQty} 
            variant="contained" 
            disabled={savingEdit}
            startIcon={savingEdit ? <CircularProgress size={20} /> : null}
            color="primary"
          >
            {savingEdit ? 'Saving...' : 'Save Changes'}
          </Button>
        </DialogActions>
      </Dialog>

    </Box>
  );
};

export default ReconciliationPage; 