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
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Collapse,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Checkbox,
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
  FilterList,
  ExpandMore,
  Clear,
  Refresh,
  Edit,
  CheckCircleOutline,
  CompareArrows,
  Visibility,
  VisibilityOff,
  KeyboardArrowDown
} from '@mui/icons-material';
import * as XLSX from 'xlsx';
import { useSnackbar } from 'notistack';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import type { ReconciliationData } from '../types/reconciliation';
import { servicesAPI } from '../config/api';

const ReconciliationPage: React.FC = () => {
  const { location_id } = useParams<{ location_id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const theme = useTheme();
  const { enqueueSnackbar } = useSnackbar();

  const [reconciliationData, setReconciliationData] = useState<ReconciliationData | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isExporting, setIsExporting] = useState(false);
  const [checkerData, setCheckerData] = useState<any[]>([]);
  const [orphanedCheckerData, setOrphanedCheckerData] = useState<any[]>([]);
  const [loadingChecker, setLoadingChecker] = useState(false);
  const [showComparison, setShowComparison] = useState(false);
  const [showOrphanedData, setShowOrphanedData] = useState(false);

  const [selectedItems, setSelectedItems] = useState<Set<number>>(new Set());
  const [recheckItems, setRecheckItems] = useState<any[]>([]);
  const [loadingRecheck, setLoadingRecheck] = useState(false);
  const [showRecheckDialog, setShowRecheckDialog] = useState(false);
  const [recheckReason, setRecheckReason] = useState('');
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [editCheckerQty, setEditCheckerQty] = useState('');
  const [savingEdit, setSavingEdit] = useState(false);
  const [exportMenuAnchor, setExportMenuAnchor] = useState<null | HTMLElement>(null);

  
  // Filter states
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    form: '',
    grade: '',
    size: '',
    finish: '',
    ext_finish: '',
    width: '',
    length: '',
    inv_type: '',
    inv_quality: '',
    branch: '',
    warehouse: '',
    status: ''
  });

  useEffect(() => {
    if (location_id) {
      console.log('Reconciliation page loaded:', { location_id, hasStateData: !!location.state?.reconciliationData });
      
      // Check if data was passed via navigation state
      const stateData = location.state?.reconciliationData;
      if (stateData) {
        console.log('Using state data');
        setReconciliationData(stateData);
      setLoading(false);
      } else {
        console.log('No state data found');
        setLoading(false);
      }
    }
  }, [location_id, location.state]);

  // Check for existing reconciliation data
  const checkExistingData = async () => {
    if (!location_id || !reconciliationData) return false;
    
    try {
      const warehouse = reconciliationData.summary.warehouse;
      const branch = reconciliationData.summary.branch;
      
      const response = await servicesAPI.checkExistingReconciliation({
        location_id,
        warehouse,
        branch
      });
      
      if (response.data.exists) {
        const choice = window.confirm(
          `Existing reconciliation data found for ${branch}/${warehouse}.\n\n` +
          `Record: ${response.data.record.record_name}\n` +
          `Created: ${new Date(response.data.record.created_at).toLocaleString()}\n\n` +
          `Click OK to use existing data, or Cancel to create new data (will delete old record).`
        );
        
        if (choice) {
          // User chose to use existing data
          const success = await loadExistingData(response.data.record);
          return success; // Return whether data was successfully loaded
        } else {
          // User chose to create new data - delete the old record
          await deleteExistingRecord(response.data.record.id);
          return false; // Indicate that no data was loaded, proceed with new generation
        }
      }
      
      return false; // Indicate that no data was loaded
    } catch (error) {
      console.error('Error checking existing data:', error);
      return false;
    }
  };

  // Delete existing reconciliation record
  const deleteExistingRecord = async (recordId: number) => {
    try {
      const response = await servicesAPI.deleteReconciliationRecord(recordId.toString());
      if (response.data.success) {
        enqueueSnackbar('Old reconciliation record deleted successfully', { variant: 'info' });
      }
    } catch (error) {
      console.error('Error deleting existing record:', error);
      enqueueSnackbar('Failed to delete old record, but proceeding with new data', { variant: 'warning' });
    }
  };

  // Load existing reconciliation data
  const loadExistingData = async (record: any): Promise<boolean> => {
    try {
      setLoadingChecker(true);
      
      console.log('Loading existing data for record:', record);
      
      // Call the API to load the full reconciliation data
      const response = await servicesAPI.loadReconciliationData(record.id.toString());
      
      console.log('Load response:', response.data);
      
      if (response.data.success) {
        const loadedRecord = response.data.record;
        
        console.log('Loaded record:', loadedRecord);
        
        // Set the reconciliation data
        console.log('Setting reconciliation data - summary:', loadedRecord.summary);
        console.log('Setting reconciliation data - items sample:', loadedRecord.items?.[0]);
        setReconciliationData({
          summary: loadedRecord.summary,
          items: loadedRecord.items
        });
        
        // Set checker data if available
        if (loadedRecord.checker_data && loadedRecord.checker_data.length > 0) {
          console.log('Setting checker data:', loadedRecord.checker_data);
          console.log('Sample checker item structure:', loadedRecord.checker_data[0]);
          setCheckerData(loadedRecord.checker_data);
          setShowComparison(true);
        } else {
          console.log('No checker data found in loaded record');
        }
        
        // Check if items have comparison data (enhanced items_data approach)
        if (loadedRecord.items && loadedRecord.items.length > 0) {
          const hasComparisonData = loadedRecord.items.some((item: any) => item.has_comparison);
          if (hasComparisonData) {
            console.log('Found items with comparison data - enhanced items_data approach');
            setShowComparison(true);
          } else {
            console.log('No comparison data found in loaded items');
          }
        }
        
        // Set orphaned data if available
        if (loadedRecord.orphaned_checker_data && loadedRecord.orphaned_checker_data.length > 0) {
          console.log('Setting orphaned data:', loadedRecord.orphaned_checker_data);
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
        console.log('Loaded recheck items:', response.data.items);
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
        console.log('Found matching recheck item:', {
          item: { form: itemForm, grade: itemGrade, size: itemSize },
          recheckItem: { form: recheckForm, grade: recheckGrade, size: recheckSize }
        });
      }
      
      return isMatch;
    });
    
    return isMarked;
  };

  // Handle item selection for recheck
  const handleItemSelection = (index: number) => {
    const newSelected = new Set(selectedItems);
    if (newSelected.has(index)) {
      newSelected.delete(index);
    } else {
      newSelected.add(index);
    }
    setSelectedItems(newSelected);
  };

  // Mark selected items for recheck
  const markItemsForRecheck = async () => {
    if (selectedItems.size === 0) {
      enqueueSnackbar('Please select items to mark for recheck', { variant: 'warning' });
      return;
    }

    try {
      setLoadingRecheck(true);
      
      const itemsToMark = Array.from(selectedItems).map(index => {
        const item = filteredData[index];
        return {
          form: item.form,
          grade: item.grade,
          size: item.size,
          finish: item.finish,
          ext_finish: item.ext_finish,
          width: item.width,
          length: item.length,
          system_qty: item.system_qty,
          counted_qty: showComparison ? 
            (findMatchingCheckerData(item)?.qty || 0) : 0,
          variance: showComparison ? 
            ((findMatchingCheckerData(item)?.qty || 0) - (item.system_qty || 0)) : 0
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

  // Edit checker quantity
  const handleEditCheckerQty = (item: any) => {
    const matchingChecker = findMatchingCheckerData(item);
    setEditingItem(item);
    setEditCheckerQty(matchingChecker ? matchingChecker.qty.toString() : '0');
    setShowEditDialog(true);
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

      // Check if this item is marked for recheck
      const recheckItem = recheckItems.find(item => 
        item.form === editingItem.form &&
        item.grade === editingItem.grade &&
        item.size === editingItem.size &&
        item.finish === editingItem.finish &&
        item.ext_finish === editingItem.ext_finish &&
        item.width === editingItem.width &&
        item.length === editingItem.length
      );

      if (recheckItem) {
        // This is a recheck item - complete the recheck workflow
        console.log('Completing recheck for item:', recheckItem);
        
        const response = await servicesAPI.completeRecheckItem(recheckItem.id.toString(), {
          new_counted_qty: newQty,
          recheck_reason: 'Quantity updated during reconciliation',
          location_id: location_id
        });

        if (response.data.success) {
          // Update the checker data with new quantity
          const updatedCheckerData = checkerData.map(checker => {
            const isMatch = findMatchingCheckerData(editingItem) === checker;
            if (isMatch) {
              console.log('Found matching checker item, updating quantity from', checker.qty, 'to', newQty);
              return { ...checker, qty: newQty };
            }
            return checker;
          });

          setCheckerData(updatedCheckerData);
          
          // Update reconciliation data items if they have comparison data
          if (reconciliationData?.items) {
            const updatedItems = reconciliationData.items.map(item => {
              const isMatch = findMatchingCheckerData(editingItem) === findMatchingCheckerData(item);
              if (isMatch && item.has_comparison) {
                const newVariance = newQty - (item.system_qty || 0);
                const newStatus = (newQty === item.system_qty ? 'Match' : 
                                 newQty > item.system_qty ? 'Overcount' : 'Undercount') as 'Match' | 'Overcount' | 'Undercount';
                
                console.log('Updating items_data - found matching item, updating quantity from', item.checker_qty, 'to', newQty);
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
          
          // Refresh recheck items to remove the completed item
          await loadRecheckItems();
          
          // Refresh reconciliation data to show updated values
          await refreshReconciliationData();
          
          enqueueSnackbar('Recheck completed successfully - item removed from recheck queue and data saved', { variant: 'success' });
        } else {
          enqueueSnackbar('Failed to complete recheck', { variant: 'error' });
        }
      } else {
        // Regular item - update the checker data
        const updatedCheckerData = checkerData.map(checker => {
          const isMatch = findMatchingCheckerData(editingItem) === checker;
          if (isMatch) {
            console.log('Found matching checker item, updating quantity from', checker.qty, 'to', newQty);
            return { ...checker, qty: newQty };
          }
          return checker;
        });

        setCheckerData(updatedCheckerData);
        
        // Update reconciliation data items if they have comparison data
        if (reconciliationData?.items) {
          const updatedItems = reconciliationData.items.map(item => {
            const isMatch = findMatchingCheckerData(editingItem) === findMatchingCheckerData(item);
            if (isMatch && item.has_comparison) {
              const newVariance = newQty - (item.system_qty || 0);
              const newStatus = (newQty === item.system_qty ? 'Match' : 
                               newQty > item.system_qty ? 'Overcount' : 'Undercount') as 'Match' | 'Overcount' | 'Undercount';
              
              console.log('Updating items_data - found matching item, updating quantity from', item.checker_qty, 'to', newQty);
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
        
        enqueueSnackbar('Checker quantity updated successfully and data saved', { variant: 'success' });
      }

      setShowEditDialog(false);
      setEditingItem(null);
      setEditCheckerQty('');
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

  // Debug effect to monitor showComparison changes
  useEffect(() => {
    console.log('showComparison changed to:', showComparison);
    console.log('checkerData length:', checkerData.length);
    console.log('orphanedCheckerData length:', orphanedCheckerData.length);
  }, [showComparison, checkerData, orphanedCheckerData]);

  // Save reconciliation data with comparison
  const saveReconciliationData = async () => {
    if (!location_id || !reconciliationData) return;
    
    try {
      
      const warehouse = reconciliationData.summary.warehouse;
      const branch = reconciliationData.summary.branch;
      
      const saveData = {
        location_id,
        warehouse,
        branch,
        summary_data: reconciliationData.summary,
        items_data: reconciliationData.items,
        checker_data: showComparison ? checkerData : [],
        orphaned_checker_data: showOrphanedData ? orphanedCheckerData : [],
        notes: 'Auto-saved during comparison'
      };
      
      const response = await servicesAPI.saveReconciliationWithComparison(saveData);
      
      if (response.data.success) {
        enqueueSnackbar('Reconciliation data saved successfully', { variant: 'success' });
      }
    } catch (error) {
      console.error('Error saving reconciliation data:', error);
      enqueueSnackbar('Failed to save reconciliation data', { variant: 'error' });
    } finally {
      // Cleanup
    }
  };

  // Fetch checker data and create comparison
  const fetchCheckerDataAndCompare = async () => {
    if (!location_id || !reconciliationData) return;
    
    try {
      setLoadingChecker(true);
      
      // Check for existing data first
      const dataLoaded = await checkExistingData();
      if (dataLoaded) {
        // Data was loaded from existing record, ensure comparison is shown
        setShowComparison(true);
        return; // Data was loaded from existing record
      }
      
      // Fetch sections first
      const sectionsResponse = await servicesAPI.getSections(location_id);
      const sections = sectionsResponse.data;
      
      if (sections.length === 0) {
        enqueueSnackbar('No sections found for this location', { variant: 'error' });
        return;
      }
      
      // Fetch all checker transactions from all sections
      const allCheckerTransactions: any[] = [];
      
      for (const section of sections) {
        try {
          const checkerResponse = await servicesAPI.getReviewTransactionsForChecker(location_id, section.section_id.toString());
          const checkerTransactions = checkerResponse.data.map((t: any) => ({
            ...t,
            section_id: section.section_id,
            section_desc: section.section_desc,
            location_desc: section.location_desc,
            warehouse: section.warehouse,
            branch: section.branch
          }));
          allCheckerTransactions.push(...checkerTransactions);
        } catch (error) {
          console.error(`Error fetching checker transactions for section ${section.section_id}:`, error);
        }
      }
      
      // Consolidate checker data by specified fields
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
        const normalizedType = String(transaction.type || '').trim();
        const normalizedRemarks = String(transaction.remarks || '').trim();
        
        const key = `${normalizedForm}|${normalizedGrade}|${normalizedSize}|${normalizedFinish}|${normalizedExtFinish}|${normalizedWidth}|${normalizedLength}|${normalizedType}|${normalizedRemarks}`;
        
        console.log('Consolidating checker transaction:', {
          original: {
            form: transaction.form,
            grade: transaction.grade,
            size: transaction.size,
            finish: transaction.finish,
            ext_finish: transaction.ext_finish,
            width: transaction.width,
            length: transaction.length,
            type: transaction.type,
            remarks: transaction.remarks,
            qty: transaction.qty
          },
          normalized: {
            form: normalizedForm,
            grade: normalizedGrade,
            size: normalizedSize,
            finish: normalizedFinish,
            ext_finish: normalizedExtFinish,
            width: normalizedWidth,
            length: normalizedLength,
            type: normalizedType,
            remarks: normalizedRemarks
          }
        });
        
        if (consolidated.has(key)) {
          const existing = consolidated.get(key)!;
          existing.qty += transaction.qty || 0;
          existing.transaction_count += 1;
        } else {
          consolidated.set(key, {
            form: normalizedForm,
            grade: normalizedGrade,
            size: normalizedSize,
            finish: normalizedFinish,
            ext_finish: normalizedExtFinish,
            width: normalizedWidth,
            length: normalizedLength,
            type: normalizedType,
            remarks: normalizedRemarks,
            qty: transaction.qty || 0,
            transaction_count: 1
          });
        }
      });
      
      const consolidatedCheckerData = Array.from(consolidated.values());
      
      console.log('Consolidated checker data:', consolidatedCheckerData);
      console.log('System data sample:', reconciliationData.items.slice(0, 3));
      
      // Show sample normalized data for debugging
      if (consolidatedCheckerData.length > 0) {
        console.log('Sample normalized checker item:', {
          form: consolidatedCheckerData[0].form,
          grade: consolidatedCheckerData[0].grade,
          size: consolidatedCheckerData[0].size,
          finish: consolidatedCheckerData[0].finish,
          ext_finish: consolidatedCheckerData[0].ext_finish,
          width: consolidatedCheckerData[0].width,
          length: consolidatedCheckerData[0].length,
          type: consolidatedCheckerData[0].type,
          quality_standard: consolidatedCheckerData[0].quality_standard,
          qty: consolidatedCheckerData[0].qty
        });
      }
      
      setCheckerData(consolidatedCheckerData);
      
      // Find orphaned checker data (checker items that don't match any system data)
      const orphanedData = findOrphanedCheckerData(consolidatedCheckerData);
      setOrphanedCheckerData(orphanedData);
      
      setShowComparison(true);
      enqueueSnackbar(
        `Checker data loaded successfully - ${consolidatedCheckerData.length} consolidated items, ${orphanedData.length} orphaned items`, 
        { variant: 'success' }
      );
      
      // Automatically save the reconciliation data
      await saveReconciliationData();
      
    } catch (error) {
      console.error('Error fetching checker data:', error);
      enqueueSnackbar('Failed to fetch checker data', { variant: 'error' });
    } finally {
      setLoadingChecker(false);
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
    
          const match = checkerData.find(checkerItem => {
        // Handle field type mismatches by converting to strings for comparison
        // Remove trailing spaces and normalize data
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
        
        // Handle numeric fields - convert to numbers and back to strings to normalize
        const systemWidth = String(Number(systemItem.width || 0)).trim();
        const checkerWidth = String(Number(checkerItem.width || 0)).trim();
        
        const systemLength = String(Number(systemItem.length || 0)).trim();
        const checkerLength = String(Number(checkerItem.length || 0)).trim();
        
        // Map field names correctly
        const systemType = String(systemItem.inv_type || '').trim();
        const checkerType = String(checkerItem.type || '').trim();
        
        const systemQuality = String(systemItem.inv_quality || '').trim();
        const checkerQuality = String(checkerItem.remarks || '').trim();
        
        // Debug: Log the comparison for troubleshooting
        console.log('Comparing:', {
          system: {
            form: systemForm,
            grade: systemGrade,
            size: systemSize,
            finish: systemFinish,
            ext_finish: systemExtFinish,
            width: systemWidth,
            length: systemLength,
            type: systemType,
            quality: systemQuality
          },
          checker: {
            form: checkerForm,
            grade: checkerGrade,
            size: checkerSize,
            finish: checkerFinish,
            ext_finish: checkerExtFinish,
            width: checkerWidth,
            length: checkerLength,
            type: checkerType,
            quality: checkerQuality
          }
        });
        
        const isMatch = (
          systemForm === checkerForm &&
          systemGrade === checkerGrade &&
          systemSize === checkerSize &&
          systemFinish === checkerFinish &&
          systemExtFinish === checkerExtFinish &&
          systemWidth === checkerWidth &&
          systemLength === checkerLength &&
          systemType === checkerType &&
          systemQuality === checkerQuality
        );
      
      // Debug logging for first few items
      if (checkerData.length > 0 && checkerData.indexOf(checkerItem) < 3) {
        console.log('Matching attempt:', {
          system: {
            form: systemForm,
            grade: systemGrade,
            size: systemSize,
            finish: systemFinish,
            ext_finish: systemExtFinish,
            width: systemWidth,
            length: systemLength,
            type: systemType,
            quality: systemQuality
          },
          checker: {
            form: checkerForm,
            grade: checkerGrade,
            size: checkerSize,
            finish: checkerFinish,
            ext_finish: checkerExtFinish,
            width: checkerWidth,
            length: checkerLength,
            type: checkerType,
            quality: checkerQuality
          },
          isMatch
        });
      }
      
      return isMatch;
    });
    
    return match;
  };



  // Get unique values for filter dropdowns
  const uniqueValues = useMemo(() => {
    if (!reconciliationData?.items) return {};
    
    const items = reconciliationData.items;
    return {
      form: [...new Set(items.map((item: any) => item.form).filter(Boolean))].sort(),
      grade: [...new Set(items.map((item: any) => item.grade).filter(Boolean))].sort(),
      size: [...new Set(items.map((item: any) => item.size).filter(Boolean))].sort(),
      finish: [...new Set(items.map((item: any) => item.finish).filter(Boolean))].sort(),
      ext_finish: [...new Set(items.map((item: any) => item.ext_finish).filter(Boolean))].sort(),
      width: [...new Set(items.map((item: any) => item.width).filter(Boolean))].sort(),
      length: [...new Set(items.map((item: any) => item.length).filter(Boolean))].sort(),
      inv_type: [...new Set(items.map((item: any) => item.inv_type).filter(Boolean))].sort(),
      inv_quality: [...new Set(items.map((item: any) => item.inv_quality).filter(Boolean))].sort(),
      branch: [...new Set(items.map((item: any) => item.branch).filter(Boolean))].sort(),
      warehouse: [...new Set(items.map((item: any) => item.warehouse).filter(Boolean))].sort(),
      status: showComparison ? [...new Set(items.map((item: any) => {
        const checkerItem = findMatchingCheckerData(item);
        if (!checkerItem) return 'Counted Not In System';
        const variance = (checkerItem.qty || 0) - (item.system_qty || 0);
        if (variance === 0) return 'Match';
        if (variance > 0) return 'Overcount';
        return 'Undercount';
      }).filter(Boolean))].sort() : []
    };
  }, [reconciliationData?.items, showComparison]);

  // Filter data based on search term and filters
  const filteredData = useMemo(() => {
    if (!reconciliationData?.items) return [];
    
    return reconciliationData.items.filter((item: any) => {
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
          item.weight?.toString().toLowerCase().includes(searchLower) ||
          item.inv_type?.toLowerCase().includes(searchLower) ||
          item.inv_quality?.toLowerCase().includes(searchLower) ||
          item.branch?.toLowerCase().includes(searchLower) ||
          item.warehouse?.toLowerCase().includes(searchLower) ||
          item.system_qty?.toString().includes(searchLower) ||
          item.prd_ohd_mat_val?.toString().includes(searchLower) ||
          item.prd_ohd_mat_cst?.toString().includes(searchLower)
        );
        if (!searchMatch) return false;
      }
      
      // Column filters
      if (filters.form && item.form !== filters.form) return false;
      if (filters.grade && item.grade !== filters.grade) return false;
      if (filters.size && item.size !== filters.size) return false;
      if (filters.finish && item.finish !== filters.finish) return false;
      if (filters.ext_finish && item.ext_finish !== filters.ext_finish) return false;
      if (filters.width && item.width !== filters.width) return false;
      if (filters.length && item.length !== filters.length) return false;
      if (filters.inv_type && item.inv_type !== filters.inv_type) return false;
      if (filters.inv_quality && item.inv_quality !== filters.inv_quality) return false;
      if (filters.branch && item.branch !== filters.branch) return false;
      if (filters.warehouse && item.warehouse !== filters.warehouse) return false;
      
      // Status filter (only when comparison is shown)
      if (showComparison && filters.status) {
        const checkerItem = findMatchingCheckerData(item);
        if (!checkerItem) {
          if (filters.status !== 'Counted Not In System') return false;
        } else {
          const variance = (checkerItem.qty || 0) - (item.system_qty || 0);
          let itemStatus = 'Match';
          if (variance > 0) itemStatus = 'Overcount';
          else if (variance < 0) itemStatus = 'Undercount';
          
          if (filters.status !== itemStatus) return false;
        }
      }
      
      return true;
    });
  }, [reconciliationData?.items, searchTerm, filters, showComparison]);

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
      inv_type: '',
      inv_quality: '',
      branch: '',
      warehouse: '',
      status: ''
    });
    setSearchTerm('');
  };

  // Export to Excel
  const handleExport = async () => {
    if (!reconciliationData) return;

    setIsExporting(true);
    try {
      // Prepare system data with all requested columns
      const systemData = filteredData.map(item => {
        // Get comparison data if available
        const checkerQty = item.has_comparison ? (item.checker_qty || 0) : 
                          (showComparison ? (findMatchingCheckerData(item)?.qty || 0) : 0);
        const variance = item.has_comparison ? (item.variance || 0) : 
                        (showComparison ? ((findMatchingCheckerData(item)?.qty || 0) - (item.system_qty || 0)) : 0);
        const status = item.has_comparison ? (item.status || 'Counted Not In System') : 
                      (showComparison ? 
                        (findMatchingCheckerData(item) ? 
                          (checkerQty === item.system_qty ? 'Match' : 
                           checkerQty > item.system_qty ? 'Overcount' : 'Undercount') : 
                          'Counted Not In System') : 
                        'Counted Not In System');

        return {
          'Form': item.form,
          'Grade': item.grade,
          'Size': item.size,
          'Finish': item.finish,
          'Extended Finish': item.ext_finish,
          'Width': item.width,
          'Length': item.length,
          'Weight': item.weight,
          'Inventory Type': item.inv_type,
          'Quality Standards': item.inv_quality,
          'Branch': item.branch,
          'Warehouse': item.warehouse,
          'System Quantity': item.system_qty,
          'Checker Qty': checkerQty,
          'Variance': variance,
          'Status': status,
          'Total Amount': item.prd_ohd_mat_val,
          'Unit Cost': item.prd_ohd_mat_cst
        };
      });

      // Prepare orphaned data
      const orphanedData = orphanedCheckerData.map(item => ({
        'Form': item.form,
        'Grade': item.grade,
        'Size': item.size,
        'Finish': item.finish,
        'Extended Finish': item.ext_finish,
        'Width': item.width,
        'Length': item.length,
        'Weight': '-',
        'Inventory Type': item.type,
        'Quality Standards': item.remarks,
        'Branch': '-',
        'Warehouse': '-',
        'System Quantity': 0,
        'Checker Qty': item.qty,
        'Variance': item.qty,
        'Status': 'Not in System',
        'Total Amount': '-',
        'Unit Cost': '-'
      }));

      // Combine system data and orphaned data
      const allData = [...systemData, ...orphanedData];

      // Calculate summary data
      const overallCoverageDollars = systemData.reduce((sum, item) => sum + (Number(item['Total Amount']) || 0), 0);
      const overallCoveragePieces = systemData.reduce((sum, item) => sum + (Number(item['System Quantity']) || 0), 0);
      
      // Count overcounts and undercounts
      const overcounts = systemData.filter(item => item['Status'] === 'Overcount').length;
      const undercounts = systemData.filter(item => item['Status'] === 'Undercount').length;
      
      // Calculate $ Value Gain (sum of all overcounts variance * unit cost)
      const valueGain = systemData
        .filter(item => item['Status'] === 'Overcount')
        .reduce((sum, item) => {
          const variance = Math.abs(Number(item['Variance']) || 0);
          const unitCost = Number(item['Unit Cost']) || 0;
          return sum + (variance * unitCost);
        }, 0);
      
      // Calculate $ Value Loss (sum of all undercounts variance * unit cost)
      const valueLoss = systemData
        .filter(item => item['Status'] === 'Undercount')
        .reduce((sum, item) => {
          const variance = Math.abs(Number(item['Variance']) || 0);
          const unitCost = Number(item['Unit Cost']) || 0;
          return sum + (variance * unitCost);
        }, 0);
      
      // Calculate Total Value
      const totalValue = valueGain - valueLoss + overallCoverageDollars;

      // Create summary data
      const summaryData = [{
        'Physical Inventory Number': `INV-${location_id}-${new Date().toISOString().slice(0, 10)}`,
        'Branch': reconciliationData.summary.branch || '-',
        'Warehouse': reconciliationData.summary.warehouse || '-',
        'Overall Coverage $': overallCoverageDollars.toFixed(2),
        'Overall Coverage Pieces': overallCoveragePieces,
        'Overcount': overcounts,
        'Undercounts': undercounts,
        '$ Value Gain': valueGain.toFixed(2),
        '$ Value Loss': valueLoss.toFixed(2),
        'Total Value': totalValue.toFixed(2)
      }];

      // Create workbook with both sheets
      const wb = XLSX.utils.book_new();
      
      // Add reconciliation data sheet
      const wsData = XLSX.utils.json_to_sheet(allData);
      XLSX.utils.book_append_sheet(wb, wsData, 'Reconciliation Data');
      
      // Add summary sheet
      const wsSummary = XLSX.utils.json_to_sheet(summaryData);
      XLSX.utils.book_append_sheet(wb, wsSummary, 'Reconciliation Summary');
      
      const fileName = `Reconciliation_Data_${location_id}_${new Date().toISOString().slice(0, 10)}.xlsx`;
      XLSX.writeFile(wb, fileName);
      
      enqueueSnackbar(`Data exported successfully! ${systemData.length} system items, ${orphanedData.length} orphaned items`, { variant: 'success' });
    } catch (error) {
      console.error('Export error:', error);
      enqueueSnackbar('Failed to export data', { variant: 'error' });
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
        'Grade': item.grade,
        'Size': item.size,
        'Finish': item.finish,
        'Extended Finish': item.ext_finish,
        'Width': item.width,
        'Length': item.length,
        'Mill': item.mill,
        'Heat': item.heat,
        'System Quantity': item.system_qty,
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
            
            {/* Compare Button */}
            <Button
              variant="contained"
              color="primary"
              onClick={fetchCheckerDataAndCompare}
              disabled={loadingChecker}
              startIcon={loadingChecker ? <CircularProgress size={20} /> : <CompareArrows />}
              sx={{ 
                minWidth: '180px',
                height: '40px',
                fontWeight: 600,
                boxShadow: 2
              }}
            >
              {loadingChecker ? 'Loading...' : 'Compare with Checker'}
            </Button>

            {/* Secondary Actions - Only show when comparison is active */}
            {showComparison && (
              <>
                {/* Visual separator */}
                <Box sx={{ width: '1px', height: '32px', bgcolor: 'divider' }} />
                
                {/* Orphaned Button */}
                {orphanedCheckerData.length > 0 && (
                  <Button
                    variant="outlined"
                    color="warning"
                    onClick={() => setShowOrphanedData(!showOrphanedData)}
                    startIcon={showOrphanedData ? <VisibilityOff /> : <Visibility />}
                    sx={{ 
                      minWidth: '140px',
                      height: '40px',
                      borderColor: 'warning.main',
                      '&:hover': { borderColor: 'warning.dark' }
                    }}
                  >
                    {showOrphanedData ? 'Hide' : 'Show'} Orphaned ({orphanedCheckerData.length})
                  </Button>
                )}
                
                {/* Recheck Button */}
                <Button
                  variant="outlined"
                  color="info"
                  onClick={() => setShowRecheckDialog(true)}
                  disabled={selectedItems.size === 0}
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
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button
              variant="outlined"
              startIcon={<FilterList />}
              onClick={() => setShowFilters(!showFilters)}
            >
              {showFilters ? 'Hide Filters' : 'Show Filters'}
            </Button>
            <Button
              variant="outlined"
              startIcon={<Clear />}
              onClick={clearAllFilters}
              disabled={!searchTerm && Object.values(filters).every(v => !v)}
            >
              Clear All
            </Button>
          </Box>
        </Box>

        {/* Filter Accordion */}
        <Collapse in={showFilters}>
          <Accordion defaultExpanded sx={{ boxShadow: 'none', border: '1px solid', borderColor: 'divider' }}>
            <AccordionSummary expandIcon={<ExpandMore />}>
              <Typography variant="h6">Column Filters</Typography>
            </AccordionSummary>
            <AccordionDetails>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6} md={3}>
                  <FormControl fullWidth size="small">
                    <InputLabel>Form</InputLabel>
                    <Select
                      value={filters.form}
                      onChange={(e) => handleFilterChange('form', e.target.value)}
                      label="Form"
                    >
                      <MenuItem value="">All</MenuItem>
                      {uniqueValues.form?.map((value: string) => (
                        <MenuItem key={value} value={value}>{value}</MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <FormControl fullWidth size="small">
                    <InputLabel>Grade</InputLabel>
                    <Select
                      value={filters.grade}
                      onChange={(e) => handleFilterChange('grade', e.target.value)}
                      label="Grade"
                    >
                      <MenuItem value="">All</MenuItem>
                      {uniqueValues.grade?.map((value: string) => (
                        <MenuItem key={value} value={value}>{value}</MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <FormControl fullWidth size="small">
                    <InputLabel>Size</InputLabel>
                    <Select
                      value={filters.size}
                      onChange={(e) => handleFilterChange('size', e.target.value)}
                      label="Size"
                    >
                      <MenuItem value="">All</MenuItem>
                      {uniqueValues.size?.map((value: string) => (
                        <MenuItem key={value} value={value}>{value}</MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <FormControl fullWidth size="small">
                    <InputLabel>Finish</InputLabel>
                    <Select
                      value={filters.finish}
                      onChange={(e) => handleFilterChange('finish', e.target.value)}
                      label="Finish"
                    >
                      <MenuItem value="">All</MenuItem>
                      {uniqueValues.finish?.map((value: string) => (
                        <MenuItem key={value} value={value}>{value}</MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <FormControl fullWidth size="small">
                    <InputLabel>Extended Finish</InputLabel>
                    <Select
                      value={filters.ext_finish}
                      onChange={(e) => handleFilterChange('ext_finish', e.target.value)}
                      label="Extended Finish"
                    >
                      <MenuItem value="">All</MenuItem>
                      {uniqueValues.ext_finish?.map((value: string) => (
                        <MenuItem key={value} value={value}>{value}</MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <FormControl fullWidth size="small">
                    <InputLabel>Width</InputLabel>
                    <Select
                      value={filters.width}
                      onChange={(e) => handleFilterChange('width', e.target.value)}
                      label="Width"
                    >
                      <MenuItem value="">All</MenuItem>
                      {uniqueValues.width?.map((value: string) => (
                        <MenuItem key={value} value={value}>{value}</MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <FormControl fullWidth size="small">
                    <InputLabel>Length</InputLabel>
                    <Select
                      value={filters.length}
                      onChange={(e) => handleFilterChange('length', e.target.value)}
                      label="Length"
                    >
                      <MenuItem value="">All</MenuItem>
                      {uniqueValues.length?.map((value: string) => (
                        <MenuItem key={value} value={value}>{value}</MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <FormControl fullWidth size="small">
                    <InputLabel>Inventory Type</InputLabel>
                    <Select
                      value={filters.inv_type}
                      onChange={(e) => handleFilterChange('inv_type', e.target.value)}
                      label="Inventory Type"
                    >
                      <MenuItem value="">All</MenuItem>
                      {uniqueValues.inv_type?.map((value: string) => (
                        <MenuItem key={value} value={value}>{value}</MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <FormControl fullWidth size="small">
                    <InputLabel>Quality Standards</InputLabel>
                    <Select
                      value={filters.inv_quality}
                      onChange={(e) => handleFilterChange('inv_quality', e.target.value)}
                      label="Quality Standards"
                    >
                      <MenuItem value="">All</MenuItem>
                      {uniqueValues.inv_quality?.map((value: string) => (
                        <MenuItem key={value} value={value}>{value}</MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <FormControl fullWidth size="small">
                    <InputLabel>Branch</InputLabel>
                    <Select
                      value={filters.branch}
                      onChange={(e) => handleFilterChange('branch', e.target.value)}
                      label="Branch"
                    >
                      <MenuItem value="">All</MenuItem>
                      {uniqueValues.branch?.map((value: string) => (
                        <MenuItem key={value} value={value}>{value}</MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <FormControl fullWidth size="small">
                    <InputLabel>Warehouse</InputLabel>
                    <Select
                      value={filters.warehouse}
                      onChange={(e) => handleFilterChange('warehouse', e.target.value)}
                      label="Warehouse"
                    >
                      <MenuItem value="">All</MenuItem>
                      {uniqueValues.warehouse?.map((value: string) => (
                        <MenuItem key={value} value={value}>{value}</MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
                {showComparison && (
                  <Grid item xs={12} sm={6} md={3}>
                    <FormControl fullWidth size="small">
                      <InputLabel>Status</InputLabel>
                      <Select
                        value={filters.status}
                        onChange={(e) => handleFilterChange('status', e.target.value)}
                        label="Status"
                      >
                        <MenuItem value="">All</MenuItem>
                        {uniqueValues.status?.map((value: string) => (
                          <MenuItem key={value} value={value}>{value}</MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Grid>
                )}
              </Grid>
            </AccordionDetails>
          </Accordion>
        </Collapse>
        
        {/* Active Filters Summary */}
        {(searchTerm || Object.values(filters).some(v => v)) && (
          <Box sx={{ mt: 2, p: 1, backgroundColor: alpha(theme.palette.info.main, 0.1), borderRadius: 1 }}>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
              Active Filters:
            </Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
              {searchTerm && (
                <Chip 
                  label={`Search: "${searchTerm}"`} 
                  size="small" 
                  onDelete={() => setSearchTerm('')}
                  color="primary"
                />
              )}
              {Object.entries(filters).map(([key, value]) => 
                value && (
                  <Chip 
                    key={key}
                    label={`${key.replace('_', ' ').toUpperCase()}: ${value}`} 
                    size="small" 
                    onDelete={() => handleFilterChange(key, '')}
                    color="secondary"
                  />
                )
              )}
            </Box>
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
                    indeterminate={selectedItems.size > 0 && selectedItems.size < filteredData.length}
                    checked={selectedItems.size > 0 && selectedItems.size === filteredData.length}
                    onChange={(event) => {
                      if (event.target.checked) {
                        setSelectedItems(new Set(filteredData.map((_, index) => index)));
                      } else {
                        setSelectedItems(new Set());
                      }
                    }}
                  />
                </TableCell>
              )}
              <TableCell>Form</TableCell>
              <TableCell>Grade</TableCell>
              <TableCell>Size</TableCell>
              <TableCell>Finish</TableCell>
              <TableCell>Extended Finish</TableCell>
              <TableCell>Width</TableCell>
              <TableCell>Length</TableCell>
              <TableCell>Weight</TableCell>
              <TableCell>Inventory Type</TableCell>
              <TableCell>Quality Standards</TableCell>
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
                <TableCell colSpan={showComparison ? 19 : 15} align="center" sx={{ py: 3 }}>
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
                                (matchingChecker ? (matchingChecker.qty - item.system_qty) : 0);
                const status = item.has_comparison ? (item.status || 'Counted Not In System') :
                              (matchingChecker ?
                                (matchingChecker.qty === item.system_qty ? 'Match' :
                                 matchingChecker.qty > item.system_qty ? 'Overcount' : 'Undercount') :
                                'Counted Not In System');
                
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
                  }
                  
                  return alpha(theme.palette.background.default, 0.8);
                };
                
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
                    {showComparison && (
                      <TableCell padding="checkbox">
                        <Checkbox
                          checked={selectedItems.has(index)}
                          onChange={() => handleItemSelection(index)}
                          disabled={isMarkedForRecheck}
                        />
                      </TableCell>
                    )}
                    <TableCell>{item.form}</TableCell>
                    <TableCell>{item.grade}</TableCell>
                    <TableCell>{item.size}</TableCell>
                    <TableCell>{item.finish}</TableCell>
                    <TableCell>{item.ext_finish || '-'}</TableCell>
                    <TableCell>{item.width || '-'}</TableCell>
                    <TableCell>{item.length || '-'}</TableCell>
                    <TableCell>{item.weight || '-'}</TableCell>
                    <TableCell>{item.inv_type || '-'}</TableCell>
                    <TableCell>{item.inv_quality || '-'}</TableCell>
                    <TableCell>{item.branch}</TableCell>
                    <TableCell>{item.warehouse}</TableCell>
                    <TableCell align="right">{item.system_qty}</TableCell>
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
                              return (
                                <Chip 
                                  label={matchingChecker.qty}
                                  color="primary"
                                  variant="outlined"
                                  size="small"
                                  sx={{ fontWeight: 600 }}
                                />
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
                            if (item.has_comparison && item.status) {
                              return (
                                <Chip 
                                  label={item.status}
                                  color={
                                    item.status === 'Match' ? 'success' :
                                    item.status === 'Overcount' ? 'warning' :
                                    item.status === 'Undercount' ? 'error' : 
                                    item.status === 'Counted Not In System' ? 'default' : 'info'
                                  }
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
                                  status === 'Counted Not In System' ? 'default' : 'info'
                                }
                                size="small"
                              />
                            );
                          })()}
                        </TableCell>
                      </>
                    )}
                    <TableCell align="right">{item.prd_ohd_mat_val ? Number(item.prd_ohd_mat_val).toFixed(2) : '-'}</TableCell>
                    <TableCell align="right">{item.prd_ohd_mat_cst ? Number(item.prd_ohd_mat_cst).toFixed(2) : '-'}</TableCell>
                    <TableCell>
                      {showComparison && (
                        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                          {isMarkedForRecheck ? (
                            <>
                              <Tooltip title="Edit checker quantity - Complete recheck">
                                <IconButton
                                  size="small"
                                  onClick={() => handleEditCheckerQty(item)}
                                  color="warning"
                                  sx={{ 
                                    backgroundColor: alpha(theme.palette.warning.main, 0.1),
                                    '&:hover': {
                                      backgroundColor: alpha(theme.palette.warning.main, 0.2)
                                    }
                                  }}
                                >
                                  <Edit />
                                </IconButton>
                              </Tooltip>
                              <Chip 
                                label="Recheck Required" 
                                color="warning" 
                                size="small"
                                variant="filled"
                                sx={{ fontWeight: 600 }}
                              />
                            </>
                          ) : (
                            <Tooltip title="Mark for recheck">
                              <IconButton
                                size="small"
                                onClick={() => {
                                  setSelectedItems(new Set([index]));
                                  setShowRecheckDialog(true);
                                }}
                                color="info"
                                sx={{ 
                                  backgroundColor: alpha(theme.palette.info.main, 0.1),
                                  '&:hover': {
                                    backgroundColor: alpha(theme.palette.info.main, 0.2)
                                  }
                                }}
                              >
                                <Refresh />
                              </IconButton>
                            </Tooltip>
                          )}
                        </Box>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
        </Box>
      </Paper>

      {/* Orphaned Checker Data Table */}
      {showOrphanedData && orphanedCheckerData.length > 0 && (
        <Paper sx={{ overflow: 'hidden', mt: 3 }}>
          <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
            <Typography variant="h6" color="warning.main" sx={{ fontWeight: 600 }}>
              Orphaned Checker Data ({orphanedCheckerData.length} items)
            </Typography>
            <Typography variant="body2" color="text.secondary">
              These items were counted by checkers but don't exist in the system inventory
            </Typography>
          </Box>
          <Box sx={{ maxHeight: '40vh', overflow: 'auto' }}>
            <Table size="small" sx={{ minWidth: 1200 }}>
              <TableHead>
                <TableRow sx={{ 
                  backgroundColor: alpha(theme.palette.warning.main, 0.1),
                  '& th': { 
                    fontWeight: 600,
                    whiteSpace: 'nowrap',
                    color: theme.palette.text.primary,
                    position: 'sticky',
                    top: 0,
                    zIndex: 1
                  }
                }}>
                  <TableCell>Form</TableCell>
                  <TableCell>Grade</TableCell>
                  <TableCell>Size</TableCell>
                  <TableCell>Finish</TableCell>
                  <TableCell>Extended Finish</TableCell>
                  <TableCell>Width</TableCell>
                  <TableCell>Length</TableCell>
                  <TableCell>Type</TableCell>
                  <TableCell>Quality Standard</TableCell>
                  <TableCell align="right">Checker Quantity</TableCell>
                  <TableCell>Status</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {orphanedCheckerData.map((item, index) => (
                  <TableRow 
                    key={index} 
                    hover
                    sx={{ 
                      backgroundColor: alpha(theme.palette.warning.main, 0.05),
                      '&:hover': {
                        backgroundColor: alpha(theme.palette.warning.main, 0.1)
                      }
                    }}
                  >
                    <TableCell>{item.form}</TableCell>
                    <TableCell>{item.grade}</TableCell>
                    <TableCell>{item.size}</TableCell>
                    <TableCell>{item.finish}</TableCell>
                    <TableCell>{item.ext_finish || '-'}</TableCell>
                    <TableCell>{item.width || '-'}</TableCell>
                    <TableCell>{item.length || '-'}</TableCell>
                    <TableCell>{item.type || '-'}</TableCell>
                    <TableCell>{item.remarks || '-'}</TableCell>
                    <TableCell align="right">
                      <Chip 
                        label={item.qty}
                        color="warning"
                        variant="outlined"
                        size="small"
                        sx={{ fontWeight: 600 }}
                      />
                    </TableCell>
                    <TableCell>
                      <Chip 
                        label="Not in System"
                        color="warning"
                        size="small"
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Box>
        </Paper>
      )}

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
      <Dialog open={showEditDialog} onClose={() => setShowEditDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          {editingItem ? (isItemMarkedForRecheck(editingItem) ? 'Complete Recheck' : 'Edit Checker Quantity') : 'Edit Checker Quantity'}
        </DialogTitle>
        <DialogContent>
          {editingItem && (
            <>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                {editingItem && isItemMarkedForRecheck(editingItem) 
                  ? 'Update the quantity and complete the recheck process. This will remove the item from the recheck queue and save the updated data.'
                  : 'Edit the checker quantity for this item. Changes will be saved to the reconciliation record.'
                }
              </Typography>
              <Box sx={{ mb: 2, p: 2, backgroundColor: alpha(theme.palette.grey[100], 0.5), borderRadius: 1 }}>
                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                  {editingItem.form} - {editingItem.grade} - {editingItem.size}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  System Qty: {editingItem.system_qty}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Current Checker Qty: {findMatchingCheckerData(editingItem)?.qty || 0}
                </Typography>
                {editingItem && isItemMarkedForRecheck(editingItem) && (
                  <Chip 
                    label="Recheck Required" 
                    color="warning" 
                    size="small"
                    variant="filled"
                    sx={{ mt: 1, fontWeight: 600 }}
                  />
                )}
              </Box>
              <TextField
                fullWidth
                label="New Checker Quantity"
                type="number"
                value={editCheckerQty}
                onChange={(e) => setEditCheckerQty(e.target.value)}
                inputProps={{ min: 0, step: 0.01 }}
                sx={{ mt: 1 }}
                helperText="Enter the corrected quantity from recheck"
              />
              {editCheckerQty && (
                <Box sx={{ mt: 2, p: 2, backgroundColor: alpha(theme.palette.info.main, 0.1), borderRadius: 1 }}>
                  <Typography variant="body2" color="text.secondary">
                    <strong>Variance:</strong> {parseFloat(editCheckerQty) - (editingItem.system_qty || 0)}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    <strong>Status:</strong> {
                      parseFloat(editCheckerQty) === editingItem.system_qty ? 'Match' :
                      parseFloat(editCheckerQty) > editingItem.system_qty ? 'Overcount' : 'Undercount'
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
            color={editingItem && isItemMarkedForRecheck(editingItem) ? 'warning' : 'primary'}
          >
            {savingEdit ? 'Saving...' : (editingItem && isItemMarkedForRecheck(editingItem) ? 'Complete Recheck' : 'Save Changes')}
          </Button>
        </DialogActions>
      </Dialog>

    </Box>
  );
};

export default ReconciliationPage; 