import React, { useState, useEffect, useMemo } from 'react';
import {
  Box,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Button,
  IconButton,
  Chip,
  Avatar,
  Grid,
  Card,
  CardContent,
  TextField,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  useTheme,
  alpha,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Checkbox,
  Menu,
  ListItemIcon,
  ListItemText,
} from '@mui/material';
import {
  ChevronLeft,
  CompareArrows,
  Refresh,
  Download,
  Search,
  ListAlt,
  KeyboardArrowDown,
  KeyboardArrowUp,
  Edit,
  Save,
  Cancel,
  MoreVert,
} from '@mui/icons-material';
import { useNavigate, useParams } from 'react-router-dom';
import { useSnackbar } from 'notistack';
import { servicesAPI } from '../config/api';
import { ReconciliationData } from '../types/reconciliation';
import { Transaction } from '../types/index';
import { AxiosError } from 'axios';
import * as XLSX from 'xlsx';

const formatDateMMDDYYYY = (dateString: string): string => {
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return 'N/A';
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const year = date.getFullYear();
  return `${month}/${day}/${year}`;
};

const getTransactionQty = (transaction: Transaction): number => {
  if (transaction.count_type === 'bundle') {
    return transaction.bundles?.reduce(
      (total, bundle) => total + (bundle.num_of_bundle * bundle.bundle_count),
      0
    ) || 0;
  }
  return transaction.qty || 0;
};

interface Section {
  section_id: number;
  section_desc: string;
  warehouse: string;
  branch: string;
  location_desc: string;
  status: string;
  team_name?: string;
  checker_assigned?: string;
}

interface FilterState {
  searchTerm: string;
  sectionFilter: string;
  teamFilter: string;
  statusFilter: string;
  formFilter: string;
  gradeFilter: string;
  countTypeFilter: string;
  hasChangesFilter: string;
}

const CheckerReviewPageImproved: React.FC = () => {
  const navigate = useNavigate();
  const { location_id } = useParams();
  const { enqueueSnackbar } = useSnackbar();
  const theme = useTheme();

  // State management
  const [sections, setSections] = useState<Section[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [recheckItems, setRecheckItems] = useState<any[]>([]);
  const [loading, setLoading] = useState({
    sections: false,
    transactions: false,
    recheckItems: false
  });
  const [selectedTransaction] = useState<Transaction | null>(null);
  const [changeDetailsOpen, setChangeDetailsOpen] = useState(false);
  const [filters, setFilters] = useState<FilterState>({
    searchTerm: '',
    sectionFilter: 'all',
    teamFilter: 'all',
    statusFilter: 'all',
    formFilter: 'all',
    gradeFilter: 'all',
    countTypeFilter: 'all',
    hasChangesFilter: 'all'
  });

  // State for expanded rows
  const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set());

  // State for editing checker transactions
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [transactionIdMap, setTransactionIdMap] = useState<Map<string, number>>(new Map());
  const [reconcileDialogOpen, setReconcileDialogOpen] = useState(false);
  const [reconcileIncludeTag, setReconcileIncludeTag] = useState(true);
  const [reconcileIncludeLocation, setReconcileIncludeLocation] = useState(true);
  const [reconcileIncludeMill, setReconcileIncludeMill] = useState(true);
  const [reconcileIncludeHeat, setReconcileIncludeHeat] = useState(true);
  const [reconcileIncludeType, setReconcileIncludeType] = useState(true);
  const [reconcileIncludeQuality, setReconcileIncludeQuality] = useState(true);
  const [exportMenuAnchor, setExportMenuAnchor] = useState<null | HTMLElement>(null);
  const [exportMenuPosition, setExportMenuPosition] = useState<{ top: number; left: number } | null>(null);
  const [exporting, setExporting] = useState(false);

  const getReconcileCompareFields = (): string[] => {
    const fields: string[] = [];
    if (reconcileIncludeTag) fields.push('sys_tag_no');
    if (reconcileIncludeLocation) fields.push('location');
    if (reconcileIncludeMill) fields.push('mill');
    if (reconcileIncludeHeat) fields.push('heat');
    if (reconcileIncludeType) fields.push('type');
    if (reconcileIncludeQuality) fields.push('quality');
    return fields;
  };

  // Fetch sections
  const fetchSections = async () => {
    try {
      setLoading(prev => ({ ...prev, sections: true }));
      const response = await servicesAPI.getSections(location_id?.toString() || '');
      setSections(response.data);
    } catch (error) {
      console.error('Error fetching sections:', error);
    } finally {
      setLoading(prev => ({ ...prev, sections: false }));
    }
  };

  // Fetch recheck items
  const fetchRecheckItems = async () => {
    if (!location_id) return;
    
    try {
      setLoading(prev => ({ ...prev, recheckItems: true }));
      const response = await servicesAPI.getRecheckItems(location_id);
      if (response.data.success) {
        setRecheckItems(response.data.items);
      }
    } catch (error) {
      console.error('Error fetching recheck items:', error);
    } finally {
      setLoading(prev => ({ ...prev, recheckItems: false }));
    }
  };

  // Helper function to detect changes between checker and counter transactions
  const detectChanges = (checker: any, counter: any): Array<{
    field: string;
    oldValue: any;
    newValue: any;
    type: 'added' | 'modified' | 'removed';
  }> => {
    const changes: Array<{
      field: string;
      oldValue: any;
      newValue: any;
      type: 'added' | 'modified' | 'removed';
    }> = [];

    if (!checker || !counter) {
      return changes;
    }

    // Fields to compare
    const fieldsToCompare = ['qty', 'grade', 'size', 'finish', 'ext_finish', 'width', 'length', 'quality', 'remarks', 'ad_cmts'];

    fieldsToCompare.forEach(field => {
      const checkerValue = checker[field];
      const counterValue = counter[field];

      // Handle null/undefined values
      const normalizedCheckerValue = checkerValue === null || checkerValue === undefined ? '' : String(checkerValue);
      const normalizedCounterValue = counterValue === null || counterValue === undefined ? '' : String(counterValue);

      if (normalizedCheckerValue !== normalizedCounterValue) {
        changes.push({
          field,
          oldValue: counterValue,
          newValue: checkerValue,
          type: 'modified'
        });
      }
    });

    return changes;
  };

  // Fetch all transactions for all sections
  const fetchAllTransactions = async () => {
    try {
      setLoading(prev => ({ ...prev, transactions: true }));
      const allTransactions: Transaction[] = [];
      
      console.log('Fetching transactions for sections:', sections);
      
      for (const section of sections) {
        try {
          console.log(`Fetching transactions for section ${section.section_id}`);
          
          // Fetch both checker and counter transactions
          const [checkerResponse, counterResponse] = await Promise.all([
            servicesAPI.getReviewTransactionsForChecker(location_id?.toString() || '', section.section_id.toString()),
            servicesAPI.getReviewTransactionsForCounter(location_id?.toString() || '', section.section_id.toString())
          ]);
          
          console.log(`Section ${section.section_id} - Checker response:`, checkerResponse.data);
          if (checkerResponse.data.length > 0) {
            console.log('First checker transaction sample:', {
              transaction_id: checkerResponse.data[0].transaction_id,
              tag_id: checkerResponse.data[0].tag_id,
              sys_tag_no: checkerResponse.data[0].sys_tag_no,
              form: checkerResponse.data[0].form,
              role: checkerResponse.data[0].role
            });
            // Log all checker transactions to verify sys_tag_no is present
            checkerResponse.data.forEach((t: any, index: number) => {
              if (!t.sys_tag_no || t.sys_tag_no.trim() === '') {
                console.warn(`Checker transaction ${index} missing sys_tag_no:`, {
                  transaction_id: t.transaction_id,
                  tag_id: t.tag_id,
                  sys_tag_no: t.sys_tag_no
                });
              }
            });
          }
          console.log(`Section ${section.section_id} - Counter response:`, counterResponse.data);
          
          // Create maps for easy lookup
          const checkerMap = new Map();
          const counterMap = new Map();
          
          checkerResponse.data.forEach((t: any) => {
            checkerMap.set(t.tag_id, t);
          });
          
          counterResponse.data.forEach((t: any) => {
            counterMap.set(t.tag_id, t);
          });
          
          // Process checker transactions with changes detection
          const checkerTransactions = checkerResponse.data.map((t: any) => {
            const counterTransaction = counterMap.get(t.tag_id);
            const changes = detectChanges(t, counterTransaction);
            
            return {
              ...t,
              section_id: section.section_id,
              section_desc: section.section_desc,
              location_desc: section.location_desc,
              warehouse: section.warehouse,
              branch: section.branch,
              changes: changes
            };
          });
          
          // Process counter transactions (no changes detection needed)
          const counterTransactions = counterResponse.data.map((t: any) => {
            return {
              ...t,
              section_id: section.section_id,
              section_desc: section.section_desc,
              location_desc: section.location_desc,
              warehouse: section.warehouse,
              branch: section.branch,
              changes: [] // No changes for counter transactions
            };
          });
          
          console.log(`Section ${section.section_id} - Processed checker transactions:`, checkerTransactions.length);
          console.log(`Section ${section.section_id} - Processed counter transactions:`, counterTransactions.length);
          console.log(`Section ${section.section_id} - Transactions with changes:`, 
            [...checkerTransactions, ...counterTransactions].filter(t => t.changes && t.changes.length > 0).length
          );
          
          allTransactions.push(...checkerTransactions, ...counterTransactions);
        } catch (error) {
          console.error(`Error fetching transactions for section ${section.section_id}:`, error);
        }
      }
      
      console.log('Total transactions fetched:', allTransactions.length);
      console.log('Transaction roles:', allTransactions.map(t => ({ tag_id: t.tag_id, role: t.role })));
      console.log('Transactions with changes:', allTransactions.filter(t => t.changes && t.changes.length > 0).length);
      
      setTransactions(allTransactions);
    } catch (error) {
      console.error('Error fetching transactions:', error);
    } finally {
      setLoading(prev => ({ ...prev, transactions: false }));
    }
  };

  // Load data on mount
  useEffect(() => {
    if (location_id) {
      fetchSections();
      fetchRecheckItems();
    }
  }, [location_id]);

  useEffect(() => {
    if (sections.length > 0) {
      fetchAllTransactions();
    }
  }, [sections]);

  // Combined transactions and recheck items
  const allItems = useMemo(() => {
    console.log('allItems useMemo running with:', {
      transactionsCount: transactions.length,
      recheckItemsCount: recheckItems.length,
      location_id
    });
    
    // Mark existing transactions as recheck items if they're in the recheck queue
    const transactionsWithRecheckStatus = transactions.map(transaction => {
      console.log('Processing transaction:', {
        transaction_id: transaction.transaction_id,
        tag_id: transaction.tag_id,
        role: transaction.role
      });
      
      // Check if this transaction is marked for recheck using tag_id and location_id
      const isRecheckItem = recheckItems.some(recheckItem => 
        recheckItem.tag_id === transaction.tag_id && 
        recheckItem.location_id === parseInt(location_id || '0')
      );
      
      return {
        ...transaction,
        isRecheckItem,
        role: isRecheckItem ? 'Recheck' : transaction.role
      };
    });

    console.log('allItems result:', transactionsWithRecheckStatus.length, 'items');
    return transactionsWithRecheckStatus;
  }, [transactions, recheckItems, location_id]);

  // Filtered transactions
  const filteredTransactions = useMemo(() => {
    console.log('filteredTransactions useMemo running with:', {
      allItemsCount: allItems.length,
      filters: filters
    });
    
    const filtered = allItems.filter(transaction => {
      const matchesSearch = !filters.searchTerm || 
        transaction.tag_id.toString().includes(filters.searchTerm) ||
        (transaction.form && transaction.form.toLowerCase().includes(filters.searchTerm.toLowerCase())) ||
        (transaction.grade && transaction.grade.toLowerCase().includes(filters.searchTerm.toLowerCase())) ||
        (transaction.team_name && transaction.team_name.toLowerCase().includes(filters.searchTerm.toLowerCase()));

      const matchesSection = filters.sectionFilter === 'all' || 
        transaction.section_desc === filters.sectionFilter;

      const matchesTeam = filters.teamFilter === 'all' || 
        transaction.team_name === filters.teamFilter;

      const matchesForm = filters.formFilter === 'all' || 
        transaction.form === filters.formFilter;

      const matchesGrade = filters.gradeFilter === 'all' || 
        transaction.grade === filters.gradeFilter;

      const matchesCountType = filters.countTypeFilter === 'all' || 
        transaction.count_type === filters.countTypeFilter;

            const matchesHasChanges = filters.hasChangesFilter === 'all' ||
        (filters.hasChangesFilter === 'yes' && transaction.changes && transaction.changes.length > 0) ||
        (filters.hasChangesFilter === 'no' && (!transaction.changes || transaction.changes.length === 0));

      return matchesSearch && matchesSection && matchesTeam && matchesForm && 
             matchesGrade && matchesCountType && matchesHasChanges;
    });

    // Order by tag_id (numeric)
    const sorted = [...filtered].sort((a, b) => (Number(a.tag_id) || 0) - (Number(b.tag_id) || 0));
    
    console.log('filteredTransactions result:', sorted.length, 'items');
    return sorted;
  }, [allItems, filters]);

  // Summary calculations
  const summary = useMemo(() => {
    const total = filteredTransactions.length;
    
    const withChanges = filteredTransactions.filter(t => t.changes && t.changes.length > 0).length;
    
    const bundleCount = filteredTransactions.filter(t => t.count_type === 'bundle').length;
    const pieceCount = filteredTransactions.filter(t => t.count_type === 'piece').length;
    
    console.log('Summary calculation:', {
      total,
      withChanges,
      bundleCount,
      pieceCount,
      transactionsWithChanges: filteredTransactions.filter(t => t.changes && t.changes.length > 0).map(t => ({
        tag_id: t.tag_id,
        role: t.role,
        changes: t.changes
      }))
    });
    
    return { total, withChanges, bundleCount, pieceCount };
  }, [filteredTransactions]);



  // Group transactions by tag_id
  const getGroupedTransactions = () => {
    const grouped = new Map<string, { checker: Transaction | null; counter: Transaction | null }>();
    
    filteredTransactions.forEach(transaction => {
      const tagId = transaction.tag_id;
      if (!grouped.has(tagId)) {
        grouped.set(tagId, { checker: null, counter: null });
      }
      
      const group = grouped.get(tagId)!;
      if (transaction.role === 'Checker' || transaction.role === 'Recheck') {
        group.checker = transaction;
        // Debug logging for tag_id 504
        if (tagId === '504') {
          console.log('Setting checker for tag_id 504:', {
            transaction_id: transaction.transaction_id,
            tag_id: transaction.tag_id,
            role: transaction.role
          });
        }
      } else if (transaction.role === 'Counter') {
        group.counter = transaction;
      }
    });
    
    const entries = Array.from(grouped.entries()).map(([tagId, group]) => ({
      tagId,
      checker: group.checker,
      counter: group.counter
    }));
    // Order by tag_id (numeric)
    return entries.sort((a, b) => Number(a.tagId) - Number(b.tagId));
  };

  // Handle row expansion
  const handleRowToggle = (tagId: string) => {
    const newExpandedRows = new Set(expandedRows);
    if (newExpandedRows.has(parseInt(tagId))) {
      newExpandedRows.delete(parseInt(tagId));
    } else {
      newExpandedRows.add(parseInt(tagId));
    }
    setExpandedRows(newExpandedRows);
  };

  // Check if a field has differences between checker and counter
  const hasFieldDifference = (field: keyof Transaction, checker: Transaction, counter: Transaction | null) => {
    if (!counter) return false;
    return checker[field] !== counter[field];
  };

  // Get cell background color based on differences
  const getCellBackgroundColor = (field: keyof Transaction, checker: Transaction, counter: Transaction | null) => {
    if (hasFieldDifference(field, checker, counter)) {
      return alpha(theme.palette.warning.main, 0.1);
    }
    return 'transparent';
  };

  const handleRefresh = () => {
    fetchSections();
    setTransactions([]);
  };

  const handleExportMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    const target = event.currentTarget;
    const rect = target.getBoundingClientRect();
    const menuWidth = 280;
    setExportMenuAnchor(target);
    setExportMenuPosition({
      top: rect.bottom + 8,
      left: Math.max(8, rect.right - menuWidth),
    });
  };

  const handleExportMenuClose = () => {
    setExportMenuAnchor(null);
    setExportMenuPosition(null);
  };

  const checkerCountTransactions = useMemo(
    () => filteredTransactions.filter((t) => t.role === 'Checker' || t.role === 'Recheck'),
    [filteredTransactions]
  );

  const handleDownloadCount = async () => {
    handleExportMenuClose();
    setExporting(true);

    try {
      const data = checkerCountTransactions.map((transaction) => ({
        'Tag No': transaction.sys_tag_no?.trim() ? transaction.sys_tag_no : transaction.tag_id,
        'Form': transaction.form || '',
        'Grade': transaction.grade || '',
        'Size': transaction.size || '',
        'Finish': transaction.finish || '',
        'Ext Finish': transaction.ext_finish || '',
        'Width': transaction.width || '',
        'Length': transaction.length || '',
        'Mill': transaction.mill || '',
        'Heat': transaction.heat || '',
        'Total Qty': getTransactionQty(transaction),
        'Count Type': transaction.count_type || '',
        'Type': transaction.type || '',
        'Location': transaction.location || '',
        'Quality': transaction.quality || '',
        'Remarks': transaction.remarks || '',
        'Additional Comments': transaction.ad_cmts || '',
        'Location Description': transaction.location_desc || '',
        'Section Description': transaction.section_desc || '',
        'Warehouse': transaction.warehouse || '',
        'Branch': transaction.branch || '',
        'Team': transaction.team_name || '',
        'Counted By': transaction.counted_by || '',
        'Role': transaction.role || '',
        'Counted At': transaction.created_at ? formatDateMMDDYYYY(transaction.created_at) : 'N/A',
      }));

      const ws = XLSX.utils.json_to_sheet(data);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Checker Count');
      const fileName = `Checker_Count_Location_${location_id}_${new Date().toISOString().slice(0, 10)}.xlsx`;
      XLSX.writeFile(wb, fileName);
      enqueueSnackbar('Checker count exported successfully!', { variant: 'success' });
    } catch (error) {
      console.error('Error exporting checker count:', error);
      enqueueSnackbar('Failed to export checker count. Please try again.', { variant: 'error' });
    } finally {
      setExporting(false);
    }
  };

  const handleExportComparison = () => {
    handleExportMenuClose();
    try {
      // Prepare data for export
      const exportData = getGroupedTransactions().map(({ tagId, checker, counter }) => {
        const baseData = {
          tag_id: tagId,
          section_desc: checker?.section_desc || '',
          location_desc: checker?.location_desc || '',
          warehouse: checker?.warehouse || '',
          branch: checker?.branch || '',
          form: checker?.form || '',
          grade: checker?.grade || '',
          size: checker?.size || '',
          finish: checker?.finish || '',
          ext_finish: checker?.ext_finish || '',
          width: checker?.width || '',
          length: checker?.length || '',
          type: checker?.type || '',
          quality: checker?.quality || '',
          remarks: checker?.remarks || '',
          ad_cmts: checker?.ad_cmts || '',
        };

        return {
          ...baseData,
          // Checker data
          checker_qty: checker?.qty || 0,
          checker_count_type: checker?.count_type || '',
          checker_team: checker?.team_name || '',
          checker_counted_by: checker?.counted_by || '',
          checker_role: checker?.role || '',
          checker_date: checker?.created_at ? new Date(checker.created_at).toLocaleString() : '',
          checker_has_changes: checker?.changes && checker.changes.length > 0 ? 'Yes' : 'No',
          checker_changes_count: checker?.changes?.length || 0,
          checker_changes_details: checker?.changes?.map(c => `${c.field}: ${c.oldValue} → ${c.newValue}`).join('; ') || '',
          
          // Counter data
          counter_qty: counter?.qty || 0,
          counter_count_type: counter?.count_type || '',
          counter_team: counter?.team_name || '',
          counter_counted_by: counter?.counted_by || '',
          counter_role: counter?.role || '',
          counter_date: counter?.created_at ? new Date(counter.created_at).toLocaleString() : '',
          
          // Comparison
          qty_difference: (checker?.qty || 0) - (counter?.qty || 0),
          has_differences: checker?.changes && checker.changes.length > 0 ? 'Yes' : 'No',
        };
      });

      // Create workbook
      const wb = XLSX.utils.book_new();

      // Add main comparison sheet
      const mainWs = XLSX.utils.json_to_sheet(exportData);
      XLSX.utils.book_append_sheet(wb, mainWs, "Checker vs Counter");

      // Add summary sheet
      const summaryData = [
        { metric: 'Total Tags', value: getGroupedTransactions().length },
        { metric: 'Tags with Changes', value: summary.withChanges },
        { metric: 'Bundle Counts', value: summary.bundleCount },
        { metric: 'Piece Counts', value: summary.pieceCount },
        { metric: 'Total Transactions', value: summary.total },
        { metric: 'Export Date', value: new Date().toLocaleString() },
        { metric: 'Location ID', value: location_id },
        { metric: 'Location Description', value: sections[0]?.location_desc || '' },
        { metric: 'Warehouse', value: sections[0]?.warehouse || '' },
        { metric: 'Branch', value: sections[0]?.branch || '' },
      ];
      
      const summaryWs = XLSX.utils.json_to_sheet(summaryData);
      XLSX.utils.book_append_sheet(wb, summaryWs, "Summary");

      // Add detailed changes sheet if there are changes
      const transactionsWithChanges = filteredTransactions.filter(t => t.changes && t.changes.length > 0);
      if (transactionsWithChanges.length > 0) {
        const changesData = transactionsWithChanges.flatMap(transaction => 
          transaction.changes?.map(change => ({
            tag_id: transaction.tag_id,
            role: transaction.role,
            field: change.field,
            old_value: change.oldValue,
            new_value: change.newValue,
            change_type: change.type,
            section_desc: transaction.section_desc,
            team_name: transaction.team_name,
            counted_by: transaction.counted_by,
          })) || []
        );
        
        const changesWs = XLSX.utils.json_to_sheet(changesData);
        XLSX.utils.book_append_sheet(wb, changesWs, "Detailed Changes");
      }

      // Generate file name
      const fileName = `Checker_Review_Location_${location_id}_${new Date().toISOString().slice(0,10)}.xlsx`;

      // Download the file
      XLSX.writeFile(wb, fileName);
      
      enqueueSnackbar('Export completed successfully!', { variant: 'success' });
    } catch (error) {
      console.error('Export error:', error);
      enqueueSnackbar('Export failed. Please try again.', { variant: 'error' });
    }
  };

  const handleReconcile = async (compareFields: string[] = getReconcileCompareFields()) => {
    try {
      setLoading(prev => ({ ...prev, transactions: true }));
      
      // Get warehouse and branch from the first section
      if (sections.length === 0) {
        enqueueSnackbar('No sections found for this location', { variant: 'error' });
        return;
      }
      
      const firstSection = sections[0];
      const warehouse = firstSection.warehouse;
      const branch = firstSection.branch;
      
      console.log('Reconciliation request:', { location_id, warehouse, branch });
      
      // Send payload to backend for reconciliation
      const payload = {
        location_id: location_id,
        warehouse: warehouse,
        branch: branch,
        role: 'Checker',  // Compare with Checker transactions only
        compare_fields: compareFields
      };
  
      // Send to backend for reconciliation
      const response = await servicesAPI.reconcileInventory(payload);
  
      const reconciliationResults = response.data;
      console.log('Reconciliation results:', reconciliationResults);

      // Attempt to auto-save the reconciliation data right away
      try {
        const saveData = {
          location_id: location_id,
          warehouse: warehouse,
          branch: branch,
          summary_data: reconciliationResults.summary,
          items_data: reconciliationResults.items,
          checker_data: reconciliationResults.checker_data || [],
          orphaned_checker_data: reconciliationResults.orphaned_checker_data || [],
          notes: 'Auto-saved during reconciliation from checker review page'
        };
        
        await servicesAPI.saveReconciliationWithComparison(saveData);
        console.log('Reconciliation data successfully auto-saved');
      } catch (saveError) {
        console.error('Auto-save failed:', saveError);
      }

      // Transform the data to match expected format
      const transformedData: ReconciliationData = {
        summary: reconciliationResults.summary,
        items: reconciliationResults.items
      };
      
      enqueueSnackbar('Reconciliation completed successfully', { variant: 'success' });
      setReconcileDialogOpen(false);
      navigate(`/reconciliation/checker/${location_id}`, { 
        state: { reconciliationData: transformedData }
      });
      
    } catch (error) {
      console.error('Reconciliation error:', error);
      enqueueSnackbar(
        error instanceof AxiosError && error.response?.data?.error 
          ? error.response.data.error 
          : 'Failed to reconcile inventory',
        { variant: 'error' }
      );
    } finally {
      setLoading(prev => ({ ...prev, transactions: false }));
    }
  };

  // Edit handler functions
  const handleEdit = async (transaction: Transaction) => {
    console.log('handleEdit called with transaction:', transaction);
    console.log('Transaction ID:', transaction.transaction_id);
    console.log('Transaction location_id:', transaction.location_id);
    console.log('Transaction section_id:', transaction.section_id);
    
    // If transaction_id is missing, fetch it using tag_id and location_id
    if (!transaction.transaction_id) {
      try {
        console.log('Fetching transaction_id for tag_id:', transaction.tag_id, 'location_id:', location_id);
        
        // Query the database to get transaction_id using tag_id and location_id
        const response = await servicesAPI.getTransactionIdByTagAndLocation(
          transaction.tag_id, 
          location_id || ''
        );
        
        if (response.data.success && response.data.transaction_id) {
          console.log('Found transaction_id:', response.data.transaction_id);
          const transactionWithId = {
            ...transaction,
            transaction_id: response.data.transaction_id,
            location_id: String(transaction.location_id || parseInt(location_id || '0')),
            section_id: transaction.section_id
          };
          console.log('Setting editing state with transaction:', transactionWithId);
          
          // Store the transaction_id in the map for future reference
          setTransactionIdMap(prev => {
            const newMap = new Map(prev);
            newMap.set(transaction.tag_id, response.data.transaction_id);
            return newMap;
          });
          
          setEditingId(response.data.transaction_id);
          setEditingTransaction(transactionWithId);
          console.log('Edit state set successfully');
        } else {
          console.error('Could not find transaction_id for tag_id:', transaction.tag_id);
          enqueueSnackbar('Could not find transaction ID. Cannot edit this transaction.', { variant: 'error' });
          return;
        }
      } catch (error) {
        console.error('Error fetching transaction_id:', error);
        enqueueSnackbar('Error fetching transaction ID. Cannot edit this transaction.', { variant: 'error' });
        return;
      }
    } else {
      // Use existing transaction_id
      console.log('Using existing transaction_id:', transaction.transaction_id);
      console.log('Setting editing state with existing transaction:', transaction);
      setEditingId(transaction.transaction_id);
      setEditingTransaction({ 
        ...transaction,
        location_id: String(transaction.location_id || parseInt(location_id || '0')),
        section_id: transaction.section_id
      });
      console.log('Edit state set successfully with existing ID');
    }
  };

  const handleSave = async () => {
    if (!editingTransaction) return;

    console.log('handleSave called with editingTransaction:', editingTransaction);
    console.log('Editing transaction ID:', editingTransaction.transaction_id);
    console.log('Is recheck item:', editingTransaction.isRecheckItem);

    try {
      // Check if this is a recheck item
      const isRecheckItem = editingTransaction.isRecheckItem;
      
      if (isRecheckItem) {
        // For recheck items, update the existing transaction and remove from recheck queue
        // Map the frontend data to backend expected format
        const updateData = {
          transaction_id: editingTransaction.transaction_id,
          tag_id: editingTransaction.tag_id,
          form: editingTransaction.form,
          type: editingTransaction.type,
          grade: editingTransaction.grade,
          size: editingTransaction.size,
          width: editingTransaction.width,
          finish: editingTransaction.finish,
          ext_finish: editingTransaction.ext_finish,
          length: editingTransaction.length,
          count_type: editingTransaction.count_type,
          qty: editingTransaction.qty, // Use qty directly for the new endpoint
          location_id: editingTransaction.location_id,
          section_id: editingTransaction.section_id,
          location: editingTransaction.location,
          mill: editingTransaction.mill,
          heat: editingTransaction.heat,
          remarks: editingTransaction.remarks,
          ad_cmts: editingTransaction.ad_cmts || ''
        };
        
        console.log('Sending update data for recheck item:', updateData);
        console.log('Location ID being sent:', updateData.location_id);
        console.log('Editing transaction ID:', editingTransaction.transaction_id);
        console.log('Editing transaction location_id:', editingTransaction.location_id);
        
        if (!editingTransaction.transaction_id) {
          throw new Error('Transaction ID is missing from editing transaction');
        }
        
        const response = await servicesAPI.updateTransactionById(editingTransaction.transaction_id.toString(), updateData);
        console.log('Update response:', response.data);
        console.log('Response success:', response.data.success);
        console.log('Response message:', response.data.message);
        
        if (response.data.success) {
          // Find the recheck item to remove using tag_id and location_id
          const recheckItem = recheckItems.find(item => 
            item.tag_id === editingTransaction.tag_id && 
            item.location_id === parseInt(location_id || '0')
          );
          
          console.log('Recheck item found for removal:', recheckItem);
          
          if (recheckItem) {
            // Remove from recheck queue
            console.log('Removing recheck item with ID:', recheckItem.id);
            await servicesAPI.removeFromRecheck(recheckItem.id.toString());
            console.log('Recheck item removed successfully');
          } else {
            console.log('No recheck item found to remove for tag_id:', editingTransaction.tag_id);
          }
          
          // Update the transaction in the local state and remove recheck status
          console.log('Updating transaction in state:', editingTransaction.transaction_id);
          setTransactions(prev => {
            const updated = prev.map(transaction => 
              transaction.transaction_id === editingTransaction.transaction_id
                ? { 
                    ...editingTransaction, 
                    changes: detectChanges(editingTransaction, null),
                    isRecheckItem: false,
                    role: 'Checker' as const // Reset role back to Checker
                  }
                : transaction
            );
            console.log('Updated transactions count:', updated.length);
            return updated;
          });
          
          // Refresh recheck items
          await fetchRecheckItems();
          
          enqueueSnackbar('Recheck item updated successfully and removed from recheck queue!', { variant: 'success' });
        } else {
          throw new Error(response.data.message || 'Failed to update recheck item');
        }
      } else {
        // Regular transaction update
        // Map the frontend data to backend expected format
        const updateData = {
          transaction_id: editingTransaction.transaction_id,
          tag_id: editingTransaction.tag_id,
          form: editingTransaction.form,
          type: editingTransaction.type,
          grade: editingTransaction.grade,
          size: editingTransaction.size,
          width: editingTransaction.width,
          finish: editingTransaction.finish,
          ext_finish: editingTransaction.ext_finish,
          length: editingTransaction.length,
          count_type: editingTransaction.count_type,
          qty: editingTransaction.qty, // Use qty directly for the new endpoint
          location_id: editingTransaction.location_id,
          section_id: editingTransaction.section_id,
          location: editingTransaction.location,
          mill: editingTransaction.mill,
          heat: editingTransaction.heat,
          remarks: editingTransaction.remarks,
          ad_cmts: editingTransaction.ad_cmts || ''
        };
        
        console.log('Sending update data for regular transaction:', updateData);
        console.log('Location ID being sent:', updateData.location_id);
        console.log('Editing transaction ID:', editingTransaction.transaction_id);
        console.log('Editing transaction location_id:', editingTransaction.location_id);
        
        if (!editingTransaction.transaction_id) {
          throw new Error('Transaction ID is missing from editing transaction');
        }
        
        const response = await servicesAPI.updateTransactionById(editingTransaction.transaction_id.toString(), updateData);
        console.log('Update response:', response.data);
        console.log('Response success:', response.data.success);
        console.log('Response message:', response.data.message);
        
        if (response.data.success) {
          // Update the transaction in the local state
          console.log('Updating regular transaction in state:', editingTransaction.transaction_id);
          setTransactions(prev => {
            const updated = prev.map(transaction => 
              transaction.transaction_id === editingTransaction.transaction_id 
                ? { ...editingTransaction, changes: detectChanges(editingTransaction, null) }
                : transaction
            );
            console.log('Updated transactions count:', updated.length);
            return updated;
          });
          
          enqueueSnackbar('Transaction updated successfully!', { variant: 'success' });
        } else {
          throw new Error(response.data.message || 'Failed to update transaction');
        }
      }
    } catch (error) {
      console.error('Error updating transaction:', error);
      console.error('Error details:', {
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
        response: (error as any).response?.data || undefined
      });
      enqueueSnackbar(
        `Failed to update transaction: ${error instanceof Error ? error.message : 'Unknown error'}`,
        { variant: 'error' }
      );
    } finally {
      setEditingId(null);
      setEditingTransaction(null);
    }
  };

  const handleCancel = () => {
    setEditingId(null);
    setEditingTransaction(null);
  };

  const handleTransactionChange = (field: keyof Transaction, value: string | number) => {
    if (editingTransaction) {
      setEditingTransaction({
        ...editingTransaction,
        [field]: value
      });
    }
  };

  // Filter component
  const FilterSection = () => (
    <Paper sx={{ p: 2, mb: 2 }}>
      <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <ListAlt /> Filters & Search
      </Typography>
      <Grid container spacing={2}>
        <Grid item xs={12} md={3}>
          <TextField
            fullWidth
            size="small"
            placeholder="Search transactions..."
            value={filters.searchTerm}
            onChange={(e) => setFilters(prev => ({ ...prev, searchTerm: e.target.value }))}
            InputProps={{
              startAdornment: <Search sx={{ mr: 1, color: 'text.secondary' }} />
            }}
          />
        </Grid>
        <Grid item xs={12} md={2}>
          <FormControl fullWidth size="small">
            <InputLabel>Section</InputLabel>
            <Select
              value={filters.sectionFilter}
              onChange={(e) => setFilters(prev => ({ ...prev, sectionFilter: e.target.value }))}
              label="Section"
            >
              <MenuItem value="all">All Sections</MenuItem>
              {Array.from(new Set(allItems.map(t => t.section_desc))).map(section => (
                <MenuItem key={section} value={section}>{section}</MenuItem>
              ))}
            </Select>
          </FormControl>
        </Grid>
        <Grid item xs={12} md={2}>
          <FormControl fullWidth size="small">
            <InputLabel>Team</InputLabel>
            <Select
              value={filters.teamFilter}
              onChange={(e) => setFilters(prev => ({ ...prev, teamFilter: e.target.value }))}
              label="Team"
            >
              <MenuItem value="all">All Teams</MenuItem>
              {Array.from(new Set(allItems.map(t => t.team_name))).map(team => (
                <MenuItem key={team} value={team}>{team}</MenuItem>
              ))}
            </Select>
          </FormControl>
        </Grid>
        <Grid item xs={12} md={2}>
          <FormControl fullWidth size="small">
            <InputLabel>Form</InputLabel>
            <Select
              value={filters.formFilter}
              onChange={(e) => setFilters(prev => ({ ...prev, formFilter: e.target.value }))}
              label="Form"
            >
              <MenuItem value="all">All Forms</MenuItem>
              {Array.from(new Set(allItems.map(t => t.form))).map(form => (
                <MenuItem key={form} value={form}>{form}</MenuItem>
              ))}
            </Select>
          </FormControl>
        </Grid>
        <Grid item xs={12} md={2}>
          <FormControl fullWidth size="small">
            <InputLabel>Grade</InputLabel>
            <Select
              value={filters.gradeFilter}
              onChange={(e) => setFilters(prev => ({ ...prev, gradeFilter: e.target.value }))}
              label="Grade"
            >
              <MenuItem value="all">All Grades</MenuItem>
              {Array.from(new Set(allItems.map(t => t.grade))).map(grade => (
                <MenuItem key={grade} value={grade}>{grade}</MenuItem>
              ))}
            </Select>
          </FormControl>
        </Grid>
        <Grid item xs={12} md={1}>
          <FormControl fullWidth size="small">
            <InputLabel>Type</InputLabel>
            <Select
              value={filters.countTypeFilter}
              onChange={(e) => setFilters(prev => ({ ...prev, countTypeFilter: e.target.value }))}
              label="Type"
            >
              <MenuItem value="all">All</MenuItem>
              <MenuItem value="pcs">Pieces</MenuItem>
              <MenuItem value="bundle">Bundles</MenuItem>
            </Select>
          </FormControl>
        </Grid>
      </Grid>
    </Paper>
  );

  // Summary cards component
  const SummaryCards = () => (
    <Grid container spacing={2} sx={{ mb: 3 }}>
      <Grid item xs={12} sm={6} md={3}>
        <Card sx={{ 
          background: `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.1)}, ${alpha(theme.palette.primary.light, 0.1)})`,
          border: `1px solid ${alpha(theme.palette.primary.main, 0.2)}`
        }}>
          <CardContent>
            <Typography variant="h4" sx={{ fontWeight: 700, color: theme.palette.primary.main }}>
              {summary.total}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Total Transactions
            </Typography>
          </CardContent>
        </Card>
      </Grid>
      <Grid item xs={12} sm={6} md={3}>
        <Card sx={{ 
          background: `linear-gradient(135deg, ${alpha(theme.palette.warning.main, 0.1)}, ${alpha(theme.palette.warning.light, 0.1)})`,
          border: `1px solid ${alpha(theme.palette.warning.main, 0.2)}`
        }}>
          <CardContent>
            <Typography variant="h4" sx={{ fontWeight: 700, color: theme.palette.warning.main }}>
              {summary.withChanges}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              With Changes
            </Typography>
          </CardContent>
        </Card>
      </Grid>
      <Grid item xs={12} sm={6} md={3}>
        <Card sx={{ 
          background: `linear-gradient(135deg, ${alpha(theme.palette.success.main, 0.1)}, ${alpha(theme.palette.success.light, 0.1)})`,
          border: `1px solid ${alpha(theme.palette.success.main, 0.2)}`
        }}>
          <CardContent>
            <Typography variant="h4" sx={{ fontWeight: 700, color: theme.palette.success.main }}>
              {summary.bundleCount}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Bundle Counts
            </Typography>
          </CardContent>
        </Card>
      </Grid>
      <Grid item xs={12} sm={6} md={3}>
        <Card sx={{ 
          background: `linear-gradient(135deg, ${alpha(theme.palette.info.main, 0.1)}, ${alpha(theme.palette.info.light, 0.1)})`,
          border: `1px solid ${alpha(theme.palette.info.main, 0.2)}`
        }}>
          <CardContent>
            <Typography variant="h4" sx={{ fontWeight: 700, color: theme.palette.info.main }}>
              {summary.pieceCount}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Piece Counts
            </Typography>
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  );

  return (
    <Box sx={{ p: 3, maxWidth: '100%' }}>
      {/* Header */}
      <Paper sx={{ p: 3, mb: 2 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <IconButton onClick={() => navigate(-1)}>
              <ChevronLeft />
            </IconButton>
            <Typography variant="h4" sx={{ fontWeight: 600 }}>
              Checker Review - Location {location_id}
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button
              variant="contained"
              color="primary"
              onClick={() => setReconcileDialogOpen(true)}
              disabled={
                loading.transactions || 
                sections.length === 0 || 
                !sections.every(s => s.status === 'Completed')
              }
              startIcon={loading.transactions ? <CircularProgress size={20} /> : <CompareArrows />}
              sx={{ 
                borderRadius: 2,
                fontWeight: 600
              }}
            >
              {loading.transactions ? 'Reconciling...' : 'Reconcile'}
            </Button>
            <Button
              variant="contained"
              startIcon={<Refresh />}
              onClick={handleRefresh}
            >
              Refresh
            </Button>
            <Button
              variant="outlined"
              onClick={handleExportMenuOpen}
              endIcon={<MoreVert />}
              disabled={loading.transactions || filteredTransactions.length === 0 || exporting}
              sx={{ borderRadius: 2, fontWeight: 600, textTransform: 'none' }}
            >
              {exporting ? 'Exporting...' : 'Export'}
            </Button>
            <Menu
              open={!!exportMenuAnchor}
              onClose={handleExportMenuClose}
              anchorReference="anchorPosition"
              anchorPosition={exportMenuPosition ?? undefined}
              anchorEl={exportMenuAnchor}
              disableScrollLock
              PaperProps={{
                sx: {
                  minWidth: 280,
                  borderRadius: 2,
                  boxShadow: `0 8px 24px ${alpha(theme.palette.common.black, 0.12)}`,
                },
              }}
            >
              <MenuItem onClick={handleDownloadCount} disabled={exporting || checkerCountTransactions.length === 0}>
                <ListItemIcon>
                  {exporting ? <CircularProgress size={20} /> : <Download fontSize="small" />}
                </ListItemIcon>
                <ListItemText primary="Download Count" secondary="Checker verified counts (Excel)" />
              </MenuItem>
              <MenuItem onClick={handleExportComparison} disabled={exporting || getGroupedTransactions().length === 0}>
                <ListItemIcon><CompareArrows fontSize="small" /></ListItemIcon>
                <ListItemText primary="Export Comparison" secondary="Checker vs counter with changes" />
              </MenuItem>
            </Menu>
          </Box>
        </Box>
      </Paper>

      {/* Summary Cards */}
      <SummaryCards />

      {/* Filters */}
      <FilterSection />

      {/* Combined Expandable Table */}
      <Paper sx={{ 
        p: 3, 
        borderRadius: 2,
        border: `2px solid ${alpha(theme.palette.primary.main, 0.3)}`,
        background: `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.05)}, ${alpha(theme.palette.primary.light, 0.05)})`
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
          <Avatar sx={{ 
            mr: 2,
            bgcolor: theme.palette.primary.main,
            color: 'white'
          }}>
            <CompareArrows />
          </Avatar>
          <Typography variant="h5" sx={{ 
            fontWeight: 700,
            color: theme.palette.primary.dark
          }}>
            Checker vs Counter Comparison
          </Typography>
          <Chip 
            label={`${getGroupedTransactions().length} Tags`} 
            color="primary" 
            variant="filled"
            sx={{ ml: 'auto', fontWeight: 600 }}
          />
        </Box>
        
        {loading.transactions ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
            <CircularProgress />
          </Box>
        ) : (
          <Box>
            {/* Color Legend */}
            <Box sx={{ 
              display: 'flex', 
              gap: 2, 
              mb: 2, 
              p: 2, 
              bgcolor: alpha(theme.palette.background.paper, 0.5),
              borderRadius: 1,
              flexWrap: 'wrap',
              alignItems: 'center'
            }}>
              <Typography variant="body2" sx={{ fontWeight: 600, mr: 1 }}>
                Color Legend:
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Box 
                  sx={{ 
                    width: 20, 
                    height: 20, 
                    bgcolor: 'inherit', 
                    border: '1px solid',
                    borderColor: theme.palette.divider,
                    borderRadius: 0.5
                  }} 
                />
                <Typography variant="body2">Checker Verified</Typography>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Box 
                  sx={{ 
                    width: 20, 
                    height: 20, 
                    bgcolor: alpha(theme.palette.warning.main, 0.05),
                    border: '1px solid',
                    borderColor: theme.palette.warning.main,
                    borderRadius: 0.5
                  }} 
                />
                <Typography variant="body2">Counter Only (Not Verified)</Typography>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Box 
                  sx={{ 
                    width: 20, 
                    height: 20, 
                    bgcolor: alpha(theme.palette.error.main, 0.1),
                    border: '1px solid',
                    borderColor: theme.palette.error.main,
                    borderRadius: 0.5
                  }} 
                />
                <Typography variant="body2">Recheck Item</Typography>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Box 
                  sx={{ 
                    width: 20, 
                    height: 20, 
                    bgcolor: alpha(theme.palette.info.main, 0.05),
                    border: '1px solid',
                    borderColor: theme.palette.info.main,
                    borderRadius: 0.5
                  }} 
                />
                <Typography variant="body2">Counter (Expanded View)</Typography>
              </Box>
            </Box>
            
            <TableContainer sx={{ maxHeight: '70vh' }}>
              <Table size="small">
                <TableHead>
                <TableRow>
                  <TableCell width="50px"></TableCell>
                  <TableCell>Tag</TableCell>
                  <TableCell>Section</TableCell>
                  <TableCell>Form</TableCell>
                  <TableCell>Grade</TableCell>
                  <TableCell>Size</TableCell>
                  <TableCell>Finish</TableCell>
                  <TableCell>Ext Finish</TableCell>
                  <TableCell>Width</TableCell>
                  <TableCell>Length</TableCell>
                  <TableCell>Mill</TableCell>
                  <TableCell>Heat</TableCell>
                  <TableCell>Qty</TableCell>
                  <TableCell>Count Type</TableCell>
                  <TableCell>Type</TableCell>
                  <TableCell>Location</TableCell>
                  <TableCell>Quality Standard</TableCell>
                  <TableCell>Team</TableCell>
                  <TableCell>Counted By</TableCell>
                  <TableCell>Role</TableCell>
                  <TableCell>Date</TableCell>
                  <TableCell>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {getGroupedTransactions().map(({ tagId, checker, counter }) => {
                  // Show all transactions: checker rows (with or without counter) and counter-only rows
                  const isExpanded = expandedRows.has(parseInt(tagId));
                  const hasCounter = !!counter;
                  const isCounterOnly = !checker && !!counter; // Counter transaction without checker verification
                  
                  // Get transaction_id from map if not available
                  const transactionId = checker 
                    ? (checker.transaction_id || transactionIdMap.get(checker.tag_id))
                    : (counter?.transaction_id || (counter?.tag_id ? transactionIdMap.get(counter.tag_id) : undefined));
                  const isEditing = editingId === transactionId;
                  
                  // Debug logging for edit state
                  if (checker && checker.tag_id === '504') { // Debug for the specific transaction
                    console.log('Edit state debug for tag_id 504:', {
                      editingId,
                      transactionId,
                      isEditing,
                      editingTransaction: editingTransaction ? 'exists' : 'null'
                    });
                  }
                  
                  // If counter-only (no checker verification), render counter row
                  if (isCounterOnly && counter) {
                    return (
                      <TableRow 
                        key={tagId}
                        hover
                        sx={{
                          bgcolor: alpha(theme.palette.warning.main, 0.05),
                          '&:hover': {
                            bgcolor: alpha(theme.palette.warning.main, 0.1)
                          }
                        }}
                      >
                        <TableCell></TableCell>
                        <TableCell>
                          <Chip 
                            label={`#${counter.sys_tag_no || counter.tag_id || tagId}`}
                            size="small"
                            color="warning"
                            variant="outlined"
                            sx={{ fontWeight: 600 }}
                          />
                        </TableCell>
                        <TableCell>
                          <Chip 
                            label={counter.section_desc || '-'} 
                            size="small" 
                            variant="outlined"
                            color="warning"
                          />
                        </TableCell>
                        <TableCell>
                          <Chip 
                            label={counter.form || '-'} 
                            size="small" 
                            variant="outlined"
                            sx={{ fontWeight: 500 }}
                          />
                        </TableCell>
                        <TableCell>{counter.grade || '-'}</TableCell>
                        <TableCell>{counter.size || '-'}</TableCell>
                        <TableCell>{counter.finish || '-'}</TableCell>
                        <TableCell>{counter.ext_finish || '-'}</TableCell>
                        <TableCell>{counter.width || '-'}</TableCell>
                        <TableCell>{counter.length || '-'}</TableCell>
                        <TableCell>{counter.mill || '-'}</TableCell>
                        <TableCell>{counter.heat || '-'}</TableCell>
                        <TableCell>
                          <Chip 
                            label={counter.qty || 0}
                            color={counter.count_type === 'bundle' ? 'primary' : 'default'}
                            variant="outlined"
                            size="small"
                            sx={{ fontWeight: 600 }}
                          />
                        </TableCell>
                        <TableCell>
                          <Chip 
                            label={counter.count_type || '-'}
                            size="small"
                            color={counter.count_type === 'bundle' ? 'primary' : 'secondary'}
                          />
                        </TableCell>
                        <TableCell>{counter.type || '-'}</TableCell>
                        <TableCell>{counter.location || '-'}</TableCell>
                        <TableCell>{counter.remarks || '-'}</TableCell>
                        <TableCell>
                          <Chip 
                            label={counter.team_name || '-'} 
                            size="small" 
                            sx={{ fontWeight: 500 }}
                          />
                        </TableCell>
                        <TableCell>
                          <Box sx={{ display: 'flex', alignItems: 'center' }}>
                            <Avatar sx={{ 
                              width: 24, 
                              height: 24, 
                              mr: 1,
                              fontSize: '0.75rem',
                              bgcolor: alpha(theme.palette.info.main, 0.1),
                              color: theme.palette.info.dark
                            }}>
                              {counter.counted_by ? counter.counted_by.charAt(0) : '?'}
                            </Avatar>
                            {counter.counted_by || '-'}
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Chip 
                            label={counter.role || 'Counter'} 
                            size="small" 
                            color="info"
                            variant="outlined"
                          />
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" noWrap>
                            {counter.created_at ? new Date(counter.created_at).toLocaleDateString() : '-'}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          {/* No edit action for counter-only items */}
                        </TableCell>
                      </TableRow>
                    );
                  }
                  
                  // If checker exists, render checker row (with optional counter expansion)
                  if (!checker) return null;
                  
                  return (
                    <React.Fragment key={tagId}>
                      {/* Main Checker Row */}
                      <TableRow 
                        hover
                        sx={{
                          bgcolor: checker.role === 'Recheck' ? alpha(theme.palette.error.main, 0.1) : 'inherit',
                          '&:hover': {
                            bgcolor: checker.role === 'Recheck' ? alpha(theme.palette.error.main, 0.2) : undefined
                          }
                        }}
                      >
                        <TableCell>
                          {hasCounter && (
                            <IconButton
                              size="small"
                              onClick={() => handleRowToggle(tagId)}
                              sx={{ p: 0 }}
                            >
                              {isExpanded ? <KeyboardArrowUp /> : <KeyboardArrowDown />}
                            </IconButton>
                          )}
                        </TableCell>
                        <TableCell>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, position: 'relative' }}>
                            <Chip 
                              label={`#${checker.sys_tag_no || checker.tag_id || tagId}`}
                              size="small"
                              color="primary"
                              variant="outlined"
                              sx={{ fontWeight: 600 }}
                            />
                            {checker.role === 'Recheck' && (
                              <Chip
                                label="RE"
                                size="small"
                                sx={{ 
                                  backgroundColor: theme.palette.error.main,
                                  color: theme.palette.error.contrastText,
                                  fontSize: '0.65rem',
                                  height: '18px',
                                  minWidth: '24px',
                                  '&:hover': {
                                    backgroundColor: theme.palette.error.dark
                                  }
                                }}
                              />
                            )}
                            {checker.changes && checker.changes.length > 0 && (
                              <Chip
                                label={`${checker.changes.length} changes`}
                                size="small"
                                color="warning"
                                variant="filled"
                                sx={{ 
                                  fontSize: '0.7rem',
                                  height: '20px',
                                  minWidth: 'auto',
                                  px: 0.5
                                }}
                              />
                            )}
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Chip 
                            label={checker.section_desc} 
                            size="small" 
                            variant="outlined"
                            color="info"
                          />
                        </TableCell>
                        <TableCell sx={{ bgcolor: getCellBackgroundColor('form', checker, counter) }}>
                          {isEditing ? (
                            <TextField
                              size="small"
                              value={editingTransaction?.form || ''}
                              onChange={(e) => handleTransactionChange('form', e.target.value)}
                              sx={{ minWidth: 80 }}
                            />
                          ) : (
                            <Chip 
                              label={checker.form} 
                              size="small" 
                              variant="outlined"
                              sx={{ fontWeight: 500 }}
                            />
                          )}
                        </TableCell>
                        <TableCell sx={{ bgcolor: getCellBackgroundColor('grade', checker, counter) }}>
                          {isEditing ? (
                            <TextField
                              size="small"
                              value={editingTransaction?.grade || ''}
                              onChange={(e) => handleTransactionChange('grade', e.target.value)}
                              sx={{ minWidth: 80 }}
                            />
                          ) : (
                            checker.grade || '-'
                          )}
                        </TableCell>
                        <TableCell sx={{ bgcolor: getCellBackgroundColor('size', checker, counter) }}>
                          {isEditing ? (
                            <TextField
                              size="small"
                              value={editingTransaction?.size || ''}
                              onChange={(e) => handleTransactionChange('size', e.target.value)}
                              sx={{ minWidth: 80 }}
                            />
                          ) : (
                            checker.size || '-'
                          )}
                        </TableCell>
                        <TableCell sx={{ bgcolor: getCellBackgroundColor('finish', checker, counter) }}>
                          {isEditing ? (
                            <TextField
                              size="small"
                              value={editingTransaction?.finish || ''}
                              onChange={(e) => handleTransactionChange('finish', e.target.value)}
                              sx={{ minWidth: 80 }}
                            />
                          ) : (
                            checker.finish || '-'
                          )}
                        </TableCell>
                        <TableCell sx={{ bgcolor: getCellBackgroundColor('ext_finish', checker, counter) }}>
                          {isEditing ? (
                            <TextField
                              size="small"
                              value={editingTransaction?.ext_finish || ''}
                              onChange={(e) => handleTransactionChange('ext_finish', e.target.value)}
                              sx={{ minWidth: 80 }}
                            />
                          ) : (
                            checker.ext_finish || '-'
                          )}
                        </TableCell>
                        <TableCell sx={{ bgcolor: getCellBackgroundColor('width', checker, counter) }}>
                          {isEditing ? (
                            <TextField
                              size="small"
                              value={editingTransaction?.width || ''}
                              onChange={(e) => handleTransactionChange('width', e.target.value)}
                              sx={{ minWidth: 80 }}
                            />
                          ) : (
                            checker.width || '-'
                          )}
                        </TableCell>
                        <TableCell sx={{ bgcolor: getCellBackgroundColor('length', checker, counter) }}>
                          {isEditing ? (
                            <TextField
                              size="small"
                              value={editingTransaction?.length || ''}
                              onChange={(e) => handleTransactionChange('length', e.target.value)}
                              sx={{ minWidth: 80 }}
                            />
                          ) : (
                            checker.length || '-'
                          )}
                        </TableCell>
                        <TableCell sx={{ bgcolor: getCellBackgroundColor('mill', checker, counter) }}>
                          {isEditing ? (
                            <TextField
                              size="small"
                              value={editingTransaction?.mill || ''}
                              onChange={(e) => handleTransactionChange('mill', e.target.value)}
                              sx={{ minWidth: 80 }}
                            />
                          ) : (
                            checker.mill || '-'
                          )}
                        </TableCell>
                        <TableCell sx={{ bgcolor: getCellBackgroundColor('heat', checker, counter) }}>
                          {isEditing ? (
                            <TextField
                              size="small"
                              value={editingTransaction?.heat || ''}
                              onChange={(e) => handleTransactionChange('heat', e.target.value)}
                              sx={{ minWidth: 80 }}
                            />
                          ) : (
                            checker.heat || '-'
                          )}
                        </TableCell>
                        <TableCell sx={{ bgcolor: getCellBackgroundColor('qty', checker, counter) }}>
                          {isEditing ? (
                            <TextField
                              size="small"
                              type="text"
                              value={editingTransaction?.qty || 0}
                              onChange={(e) => handleTransactionChange('qty', parseInt(e.target.value) || 0)}
                              sx={{ minWidth: 80 }}
                            />
                          ) : (
                            <Chip 
                              label={checker.qty || 0}
                              color={checker.count_type === 'bundle' ? 'primary' : 'default'}
                              variant="outlined"
                              size="small"
                              sx={{ fontWeight: 600 }}
                            />
                          )}
                        </TableCell>
                        <TableCell sx={{ bgcolor: getCellBackgroundColor('count_type', checker, counter) }}>
                          {isEditing ? (
                            <FormControl size="small" sx={{ minWidth: 100 }}>
                              <Select
                                value={editingTransaction?.count_type || ''}
                                onChange={(e) => handleTransactionChange('count_type', e.target.value)}
                              >
                                <MenuItem value="pcs">Pieces</MenuItem>
                                <MenuItem value="bundle">Bundles</MenuItem>
                              </Select>
                            </FormControl>
                          ) : (
                            <Chip 
                              label={checker.count_type}
                              size="small"
                              color={checker.count_type === 'bundle' ? 'primary' : 'secondary'}
                            />
                          )}
                        </TableCell>
                        <TableCell sx={{ bgcolor: getCellBackgroundColor('type', checker, counter) }}>
                          {isEditing ? (
                            <TextField
                              size="small"
                              value={editingTransaction?.type || ''}
                              onChange={(e) => handleTransactionChange('type', e.target.value)}
                              sx={{ minWidth: 80 }}
                            />
                          ) : (
                            checker.type || '-'
                          )}
                        </TableCell>
                        <TableCell sx={{ bgcolor: getCellBackgroundColor('location', checker, counter) }}>
                          {isEditing ? (
                            <TextField
                              size="small"
                              value={editingTransaction?.location || ''}
                              onChange={(e) => handleTransactionChange('location', e.target.value)}
                              sx={{ minWidth: 100 }}
                            />
                          ) : (
                            checker.location || '-'
                          )}
                        </TableCell>
                        <TableCell sx={{ bgcolor: getCellBackgroundColor('remarks', checker, counter) }}>
                          {isEditing ? (
                            <TextField
                              size="small"
                              value={editingTransaction?.remarks || ''}
                              onChange={(e) => handleTransactionChange('remarks', e.target.value)}
                              sx={{ minWidth: 120 }}
                            />
                          ) : (
                            checker.remarks || '-'
                          )}
                        </TableCell>
                        <TableCell>
                          <Chip 
                            label={checker.team_name || '-'} 
                            size="small" 
                            sx={{ fontWeight: 500 }}
                          />
                        </TableCell>
                        <TableCell>
                          <Box sx={{ display: 'flex', alignItems: 'center' }}>
                            <Avatar sx={{ 
                              width: 24, 
                              height: 24, 
                              mr: 1,
                              fontSize: '0.75rem',
                              bgcolor: alpha(theme.palette.success.main, 0.1),
                              color: theme.palette.success.dark
                            }}>
                              {checker.counted_by ? checker.counted_by.charAt(0) : '?'}
                            </Avatar>
                            {checker.counted_by || '-'}
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Chip 
                            label={checker.role === 'Recheck' ? 'Recheck Item' : (checker.role || '-')} 
                            size="small" 
                            color={checker.role === 'Recheck' ? 'error' : (checker.role === 'Checker' ? 'primary' : 'secondary')}
                            variant={checker.role === 'Recheck' ? 'filled' : 'outlined'}
                          />
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" noWrap>
                            {checker.created_at ? new Date(checker.created_at).toLocaleDateString() : '-'}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          {isEditing ? (
                            <Box sx={{ display: 'flex', gap: 1 }}>
                              <IconButton size="small" onClick={handleSave} color="primary">
                                <Save />
                              </IconButton>
                              <IconButton size="small" onClick={handleCancel} color="error">
                                <Cancel />
                              </IconButton>
                            </Box>
                          ) : (
                            <IconButton 
                              size="small" 
                              onClick={() => handleEdit(checker)}
                              color="primary"
                            >
                              <Edit />
                            </IconButton>
                          )}
                        </TableCell>
                      </TableRow>
                      
                      {/* Expanded Counter Row */}
                      {isExpanded && counter && (
                        <TableRow sx={{ bgcolor: alpha(theme.palette.info.main, 0.05) }}>
                          <TableCell></TableCell>
                          <TableCell>
                            <Chip 
                              label={`#${counter.sys_tag_no || counter.tag_id || tagId}`}
                              size="small"
                              color="info"
                              variant="outlined"
                              sx={{ fontWeight: 600 }}
                            />
                          </TableCell>
                          <TableCell>
                            <Chip 
                              label={counter.section_desc} 
                              size="small" 
                              variant="outlined"
                              color="info"
                            />
                          </TableCell>
                          <TableCell>
                            <Chip 
                              label={counter.form} 
                              size="small" 
                              variant="outlined"
                              sx={{ fontWeight: 500, bgcolor: alpha(theme.palette.info.main, 0.1) }}
                            />
                          </TableCell>
                          <TableCell>{counter.grade || '-'}</TableCell>
                          <TableCell>{counter.size || '-'}</TableCell>
                          <TableCell>{counter.finish || '-'}</TableCell>
                          <TableCell>{counter.ext_finish || '-'}</TableCell>
                          <TableCell>{counter.width || '-'}</TableCell>
                          <TableCell>{counter.length || '-'}</TableCell>
                          <TableCell>{counter.mill || '-'}</TableCell>
                          <TableCell>{counter.heat || '-'}</TableCell>
                          <TableCell>
                            <Chip 
                              label={counter.qty || 0}
                              color={counter.count_type === 'bundle' ? 'primary' : 'default'}
                              variant="outlined"
                              size="small"
                              sx={{ fontWeight: 600 }}
                            />
                          </TableCell>
                          <TableCell>
                            <Chip 
                              label={counter.count_type}
                              size="small"
                              color={counter.count_type === 'bundle' ? 'primary' : 'secondary'}
                            />
                          </TableCell>
                          <TableCell>{counter.type || '-'}</TableCell>
                          <TableCell>{counter.location || '-'}</TableCell>
                          <TableCell>{counter.remarks || '-'}</TableCell>
                          <TableCell>
                            <Chip 
                              label={counter.team_name || '-'} 
                              size="small" 
                              sx={{ fontWeight: 500 }}
                            />
                          </TableCell>
                          <TableCell>
                            <Box sx={{ display: 'flex', alignItems: 'center' }}>
                              <Avatar sx={{ 
                                width: 24, 
                                height: 24, 
                                mr: 1,
                                fontSize: '0.75rem',
                                bgcolor: alpha(theme.palette.info.main, 0.1),
                                color: theme.palette.info.dark
                              }}>
                                {counter.counted_by ? counter.counted_by.charAt(0) : '?'}
                              </Avatar>
                              {counter.counted_by || '-'}
                            </Box>
                          </TableCell>
                          <TableCell>
                            <Chip 
                              label={counter.role || '-'} 
                              size="small" 
                              color={counter.role === 'Counter' ? 'info' : 'secondary'}
                              variant="outlined"
                            />
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2" noWrap>
                              {counter.created_at ? new Date(counter.created_at).toLocaleDateString() : '-'}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            {/* Empty cell for counter row - no edit functionality */}
                          </TableCell>
                        </TableRow>
                      )}
                    </React.Fragment>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
          </Box>
        )}
      </Paper>

      <Dialog
        open={reconcileDialogOpen}
        onClose={() => setReconcileDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Reconcile options</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Choose fields to include when matching Checker counted rows with system rows.
          </Typography>
          {[
            { label: 'Tag / System Tag No', checked: reconcileIncludeTag, setChecked: setReconcileIncludeTag },
            { label: 'Location', checked: reconcileIncludeLocation, setChecked: setReconcileIncludeLocation },
            { label: 'Mill', checked: reconcileIncludeMill, setChecked: setReconcileIncludeMill },
            { label: 'Heat', checked: reconcileIncludeHeat, setChecked: setReconcileIncludeHeat },
            { label: 'Type', checked: reconcileIncludeType, setChecked: setReconcileIncludeType },
            { label: 'Quality', checked: reconcileIncludeQuality, setChecked: setReconcileIncludeQuality }
          ].map((field) => (
            <Box key={field.label} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', py: 0.5 }}>
              <Typography variant="body2">{field.label}</Typography>
              <Checkbox checked={field.checked} onChange={() => field.setChecked((v: boolean) => !v)} />
            </Box>
          ))}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setReconcileDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={() => handleReconcile(getReconcileCompareFields())}>
            Reconcile
          </Button>
        </DialogActions>
      </Dialog>

      {/* Change Details Dialog */}
      <Dialog 
        open={changeDetailsOpen} 
        onClose={() => setChangeDetailsOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <CompareArrows color="warning" />
            <Typography variant="h6">
              Change Details - Tag {selectedTransaction?.tag_id}
            </Typography>
          </Box>
        </DialogTitle>
        <DialogContent>
          {selectedTransaction?.changes && selectedTransaction.changes.length > 0 ? (
            <Box>
              <Alert severity="info" sx={{ mb: 2 }}>
                This transaction has {selectedTransaction.changes.length} field(s) that were modified during counting.
              </Alert>
              {selectedTransaction.changes.map((change, index) => (
                <Card key={index} sx={{ mb: 2 }}>
                  <CardContent>
                    <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 600 }}>
                      {change.field}
                    </Typography>
                    <Grid container spacing={2}>
                      <Grid item xs={6}>
                        <Typography variant="body2" color="text.secondary">
                          Previous Value:
                        </Typography>
                        <Typography variant="body1" sx={{ 
                          textDecoration: 'line-through',
                          color: 'error.main'
                        }}>
                          {change.oldValue || 'N/A'}
                        </Typography>
                      </Grid>
                      <Grid item xs={6}>
                        <Typography variant="body2" color="text.secondary">
                          New Value:
                        </Typography>
                        <Typography variant="body1" sx={{ 
                          color: 'success.main',
                          fontWeight: 600
                        }}>
                          {change.newValue || 'N/A'}
                        </Typography>
                      </Grid>
                    </Grid>
                    <Chip 
                      label={change.type}
                      size="small"
                      color={change.type === 'added' ? 'success' : change.type === 'modified' ? 'warning' : 'error'}
                      sx={{ mt: 1 }}
                    />
                  </CardContent>
                </Card>
              ))}
            </Box>
          ) : (
            <Typography variant="body1" color="text.secondary">
              No changes detected for this transaction.
            </Typography>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setChangeDetailsOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default CheckerReviewPageImproved; 