import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  Chip,
  CircularProgress,
  Button,
  Grid,
  Collapse,
  TextField,
  InputAdornment,
  IconButton,
  Tooltip,
  useTheme,
  alpha,
  Menu,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  ListItemIcon,
  ListItemText,
  Avatar,
  Badge
} from '@mui/material';
import { 
  ExpandMore, 
  ChevronLeft, 
  ListAlt, 
  ExpandLess, 
  Info, 
  Search,
  Refresh,
  FilterList,
  LocationOn,
  AssignmentInd,
  CheckCircle,
  PendingActions,
  MoreVert,
  Download,
  Merge,
  Numbers,
  Inventory,
  Group,
  Person
} from '@mui/icons-material';
import { useParams, useNavigate } from 'react-router-dom';
import { servicesAPI } from '../config/api';
import ConsolidatedView from '../components/ConsolidatedView';
import * as XLSX from 'xlsx';
import { Transaction, ConsolidatedItem } from '../types/common';

interface Section {
  section_id: number;
  section_desc: string;
  warehouse: string;
  branch: string;
  location_desc: string;
  status: string;
  team_name?: string; // Team assigned to count this section
  checker_assigned?: string;
}

const statusColors = {
  'Count Completed': 'success',
  'In Progress': 'warning',
  'Not Started': 'error'
};

const statusIcons = {
  'Count Completed': <CheckCircle fontSize="small" />,
  'In Progress': <PendingActions fontSize="small" />,
  'Not Started': <AssignmentInd fontSize="small" />
};

const TransactionRow = ({ transaction }: { transaction: Transaction }) => {
  const [expanded, setExpanded] = useState(false);
  const theme = useTheme();

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const totalQuantity = transaction.count_type === 'bundle' 
    ? transaction.bundles?.reduce((total, bundle) => total + (bundle.num_of_bundle * bundle.bundle_count), 0)
    : transaction.qty;

  return (
    <>
      <TableRow hover sx={{ 
        '&:last-child td, &:last-child th': { border: 0 },
        '&:hover': {
          backgroundColor: alpha(theme.palette.primary.light, 0.05)
        }
      }}>
        <TableCell>
          <Badge 
            badgeContent={transaction.tag_id} 
            color="primary"
            overlap="circular"
            anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
            max={9999}
          >
            <Avatar sx={{ 
              bgcolor: alpha(theme.palette.primary.main, 0.1),
              color: theme.palette.primary.dark,
              width: 32,
              height: 32
            }}>
              <Numbers fontSize="small" />
            </Avatar>
          </Badge>
        </TableCell>
        <TableCell>
          <Chip 
            label={transaction.form} 
            size="small" 
            variant="outlined"
            sx={{ fontWeight: 500 }}
          />
        </TableCell>
        <TableCell>{transaction.grade}</TableCell>
        <TableCell>{transaction.size}</TableCell>
        <TableCell>{transaction.finish}</TableCell>
        <TableCell>{transaction.ext_finish || '-'}</TableCell>
        <TableCell>{transaction.width || '-'}</TableCell>
        <TableCell>{transaction.length || '-'}</TableCell>
        <TableCell sx={{ maxWidth: 200 }}>
          {transaction.remarks ? (
            <Tooltip title={transaction.remarks}>
              <Typography variant="body2" noWrap>
                {transaction.remarks}
              </Typography>
            </Tooltip>
          ) : '-'}
        </TableCell>
        <TableCell>
          <Chip 
            label={totalQuantity}
            color={transaction.count_type === 'bundle' ? 'primary' : 'default'}
            variant="outlined"
            size="small"
            sx={{ 
              fontWeight: 600,
              minWidth: 40
            }}
          />
        </TableCell>
        <TableCell>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <Avatar sx={{ 
              width: 24, 
              height: 24, 
              mr: 1,
              fontSize: '0.75rem',
              bgcolor: alpha(theme.palette.secondary.main, 0.1),
              color: theme.palette.secondary.dark
            }}>
              {transaction.counted_by?.charAt(0) || '?'}
            </Avatar>
            {transaction.counted_by || 'Unknown'}
          </Box>
        </TableCell>
        <TableCell>
          <Chip 
            label={transaction.team_name} 
            size="small" 
            sx={{ fontWeight: 500 }}
          />
        </TableCell>
        <TableCell>
          <Tooltip title={transaction.created_at ? formatDate(transaction.created_at) : 'No date available'}>
            <Typography variant="body2" noWrap>
              {transaction.created_at ? new Date(transaction.created_at).toLocaleDateString() : 'N/A'}
            </Typography>
          </Tooltip>
        </TableCell>
        <TableCell>
          {transaction.count_type === 'bundle' && (
            <Button 
              size="small" 
              onClick={() => setExpanded(!expanded)}
              startIcon={<Info />}
              endIcon={expanded ? <ExpandLess /> : <ExpandMore />}
              sx={{ 
                minWidth: 120,
                backgroundColor: expanded ? alpha(theme.palette.primary.main, 0.1) : 'transparent',
                fontWeight: 500
              }}
            >
              {expanded ? 'Hide' : 'Details'}
            </Button>
          )}
        </TableCell>
      </TableRow>
      {transaction.count_type === 'bundle' && (
        <TableRow>
          <TableCell colSpan={14} sx={{ p: 0, backgroundColor: alpha(theme.palette.primary.light, 0.05) }}>
            <Collapse in={expanded} timeout="auto" unmountOnExit>
              <Box sx={{ p: 3 }}>
                <Typography variant="subtitle1" gutterBottom sx={{ 
                  display: 'flex', 
                  alignItems: 'center',
                  fontWeight: 600,
                  color: theme.palette.text.secondary
                }}>
                  <FilterList sx={{ mr: 1 }} /> Bundle Breakdown
                </Typography>
                <Table size="small" sx={{ 
                  backgroundColor: 'background.paper',
                  borderRadius: 1,
                  boxShadow: theme.shadows[1],
                  '& th': {
                    fontWeight: 600,
                    backgroundColor: alpha(theme.palette.primary.light, 0.1)
                  }
                }}>
                  <TableHead>
                    <TableRow>
                      <TableCell>Bundles</TableCell>
                      <TableCell>Count</TableCell>
                      <TableCell>Total</TableCell>
                      <TableCell>Created At</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {transaction.bundles?.map((bundle, index) => (
                      <TableRow key={index} hover>
                        <TableCell>{bundle.num_of_bundle}</TableCell>
                        <TableCell>{bundle.bundle_count}</TableCell>
                        <TableCell>
                          <strong>{bundle.num_of_bundle * bundle.bundle_count}</strong>
                        </TableCell>
                        <TableCell>{formatDate(bundle.created_at)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Box>
            </Collapse>
          </TableCell>
        </TableRow>
      )}
    </>
  );
};

const CountReviewPage = () => {
  const { location_id } = useParams<{ location_id: string }>();
  const navigate = useNavigate();
  const theme = useTheme();
  const [sections, setSections] = useState<Section[]>([]);
  const [filteredSections, setFilteredSections] = useState<Section[]>([]);
  const [transactions, setTransactions] = useState<Record<number, Transaction[]>>({});
  const [loading, setLoading] = useState({
    sections: true,
    transactions: false
  });
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [expandedSection, setExpandedSection] = useState<number | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [consolidatedData, setConsolidatedData] = useState<ConsolidatedItem[]>([]);
  const [openConsolidateDialog, setOpenConsolidateDialog] = useState(false);
  const open = Boolean(anchorEl);
  const [exporting, setExporting] = useState(false);
  const [checkerDialogOpen, setCheckerDialogOpen] = useState(false);
  const [selectedSection, setSelectedSection] = useState<Section | null>(null);
  const [users, setUsers] = useState<any[]>([]);
  const [selectedUser, setSelectedUser] = useState<string>('');
  const [existingCheckerDialogOpen, setExistingCheckerDialogOpen] = useState(false);
  const [existingCheckerInfo, setExistingCheckerInfo] = useState<{userName: string, teamName: string} | null>(null);

  useEffect(() => {
    if (location_id) {
      fetchSections();
    }
  }, [location_id]);

  // Auto-load transactions when sections are loaded
  useEffect(() => {
    if (sections.length > 0) {
      // Load transactions for all sections automatically
      setLoading(prev => ({ ...prev, transactions: true }));
      setLoadingProgress(0);
      
      const loadAllTransactions = async () => {
        for (let i = 0; i < sections.length; i++) {
          const section = sections[i];
          await fetchTransactions(section.section_id);
          setLoadingProgress(((i + 1) / sections.length) * 100);
        }
        setLoading(prev => ({ ...prev, transactions: false }));
      };
      
      loadAllTransactions();
    }
  }, [sections]);

  useEffect(() => {
    if (searchTerm) {
      const filtered = sections.filter(section =>
        section.section_desc.toLowerCase().includes(searchTerm.toLowerCase()) ||
        section.location_desc.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredSections(filtered);
    } else {
      setFilteredSections(sections);
    }
  }, [searchTerm, sections]);

  const handleMenuClick = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleDownloadCount = async () => {
    handleMenuClose();
    setExporting(true);
    
    try {
      const allTransactions = Object.values(transactions).flat();
      const data = allTransactions.map(transaction => {
        const section = sections.find(s => 
          transactions[s.section_id]?.some(t => t.tag_id === transaction.tag_id)
        );
  
        return {
          'Tag ID': transaction.tag_id,
          'Form': transaction.form,
          'Grade': transaction.grade,
          'Size': transaction.size,
          'Finish': transaction.finish,
          'Ext Finish': transaction.ext_finish || '',
          'Width': transaction.width || '',
          'Length': transaction.length || '',
          'Total Qty': transaction.count_type === 'bundle' 
            ? transaction.bundles?.reduce((total, bundle) => total + (bundle.num_of_bundle * bundle.bundle_count), 0)
            : transaction.qty,
          'Location Description': section?.location_desc || '',
          'Section Description': section?.section_desc || '',
          'Remarks': transaction.remarks || '',
          'Count Type': transaction.count_type,
          'Counted By': transaction.counted_by,
          'Team': transaction.team_name,
          'Counted At': transaction.created_at ? new Date(transaction.created_at).toLocaleString() : 'N/A'
        };
      });
  
      const ws = XLSX.utils.json_to_sheet(data, {
        header: [
          'Tag ID',
          'Form',
          'Grade',
          'Size',
          'Finish',
          'Ext Finish',
          'Width',
          'Length',
          'Total Qty',
          'Location Description',
          'Section Description'
        ]
      });
  
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Inventory Count");
  
      const fileName = `Inventory_Count_Location_${location_id}_${new Date().toISOString().slice(0,10)}.xlsx`;
      XLSX.writeFile(wb, fileName);
    } catch (error) {
      console.error('Error exporting data:', error);
      alert('Failed to export data. Please try again.');
    } finally {
      setExporting(false);
    }
  };

  const handleConsolidate = () => {
    handleMenuClose();
    consolidateItems();
  };

  const consolidateItems = () => {
    const allTransactions = Object.values(transactions).flat();
    const consolidated: Record<string, ConsolidatedItem> = {};

    allTransactions.forEach(transaction => {
      const key = `${transaction.form}-${transaction.grade}-${transaction.size}-${transaction.finish}-${transaction.ext_finish}-${transaction.width}-${transaction.length}`;
      
      if (!consolidated[key]) {
        consolidated[key] = {
          form: transaction.form,
          grade: transaction.grade,
          size: transaction.size,
          finish: transaction.finish,
          ext_finish: transaction.ext_finish,
          width: transaction.width,
          length: transaction.length,
          total_qty: transaction.count_type === 'bundle' 
            ? (transaction.bundles?.reduce((total, bundle) => total + (bundle.num_of_bundle * bundle.bundle_count), 0) || 0 ): (transaction.qty || 0),
          count_type: transaction.count_type,
          items: [transaction]
        };
      } else {
        consolidated[key].total_qty += transaction.count_type === 'bundle'
          ? (transaction.bundles?.reduce((total, bundle) => total + (bundle.num_of_bundle * bundle.bundle_count), 0) || 0)
          : (transaction.qty || 0);
        consolidated[key].items.push(transaction);
      }
    });

    setConsolidatedData(Object.values(consolidated));
    setOpenConsolidateDialog(true);
  };

  const handleCloseConsolidateDialog = () => {
    setOpenConsolidateDialog(false);
  };

  const fetchSections = async () => {
    try {
      setLoading(prev => ({ ...prev, sections: true }));
      const response = await servicesAPI.getSections(location_id?.toString() || '');
      setSections(response.data);
      setFilteredSections(response.data);
    } catch (error) {
      console.error('Error fetching sections:', error);
    } finally {
      setLoading(prev => ({ ...prev, sections: false }));
    }
  };

  const fetchTransactions = async (sectionId: number) => {
    try {
      const response = await servicesAPI.getReviewTransactionsForCounter(
        location_id?.toString() || '',
        sectionId.toString()
      );
      setTransactions(prev => ({
        ...prev,
        [sectionId]: response.data
      }));
    } catch (error) {
      console.error('Error fetching transactions:', error);
    }
  };

  const handleSectionExpand = (sectionId: number) => {
    setExpandedSection(expandedSection === sectionId ? null : sectionId);
    // Transactions are already loaded automatically, no need to fetch again
  };

  const handleRefresh = () => {
    fetchSections();
    setTransactions({});
    setExpandedSection(null);
    setSearchTerm('');
  };

  const fetchUsers = async () => {
    try {
      const response = await servicesAPI.getUsers();
      setUsers(response.data);
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  };

  const checkExistingChecker = async (userId: string, locationId: string, sectionId: number) => {
    try {
      const response = await servicesAPI.checkExistingChecker({
        user_id: userId,
        location_id: locationId,
        section_id: sectionId
      });
      return response.data;
    } catch (error) {
      console.error('Error checking existing checker:', error);
      return null;
    }
  };

  const assignChecker = async () => {
    if (!selectedSection || !selectedUser) return;
    try {
      await servicesAPI.assignChecker({
        location_id,
        section_id: selectedSection.section_id,
        user_id: selectedUser
      });
      setCheckerDialogOpen(false);
      setSelectedUser('');
      fetchSections(); // Refresh the list
    } catch (error) {
      alert('Failed to assign checker');
    }
  };

  const handleEnableChecker = (sectionId: number) => {
    const section = sections.find(s => s.section_id === sectionId) || null;
    setSelectedSection(section);
    setCheckerDialogOpen(true);
    fetchUsers();
  };

  const totalItems = Object.values(transactions).flat().length;

  const SearchAndFilterSection = () => (
    <Paper sx={{ 
      p: 2, 
      mb: 3,
      borderRadius: 2,
      boxShadow: theme.shadows[1],
      border: `1px solid ${alpha(theme.palette.divider, 0.1)}`
    }}>
      <Grid container spacing={2} alignItems="center">
        <Grid item xs={12} md={8}>
          <TextField
            fullWidth
            variant="outlined"
            size="small"
            placeholder="Search sections or locations..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Search color="primary" />
                </InputAdornment>
              ),
              sx: { 
                borderRadius: 2,
                backgroundColor: 'background.paper'
              }
            }}
          />
        </Grid>
        <Grid item xs={12} md={4}>
          <Box sx={{ 
            display: 'flex', 
            justifyContent: 'flex-end',
            alignItems: 'center',
            gap: 1
          }}>
            <Tooltip title="Total sections">
              <Chip 
                icon={<Inventory fontSize="small" />}
                label={`${filteredSections.length} section${filteredSections.length !== 1 ? 's' : ''}`} 
                color="primary"
                variant="outlined"
                sx={{ fontWeight: 600 }}
              />
            </Tooltip>
            
            <Tooltip title="Total items counted">
              <Chip 
                icon={<Numbers fontSize="small" />}
                label={`${totalItems} item${totalItems !== 1 ? 's' : ''}`} 
                color="secondary"
                variant="outlined"
                sx={{ fontWeight: 600 }}
              />
            </Tooltip>
            
            <IconButton
              aria-label="more"
              aria-controls="long-menu"
              aria-haspopup="true"
              onClick={handleMenuClick}
              sx={{
                backgroundColor: alpha(theme.palette.primary.main, 0.1),
                '&:hover': {
                  backgroundColor: alpha(theme.palette.primary.main, 0.2)
                }
              }}
            >
              <MoreVert />
            </IconButton>
            
            <Menu
              id="long-menu"
              anchorEl={anchorEl}
              keepMounted
              open={open}
              onClose={handleMenuClose}
              PaperProps={{
                style: {
                  width: '250px',
                },
              }}
            >
              <MenuItem onClick={handleDownloadCount} disabled={exporting}>
                <ListItemIcon>
                  {exporting ? <CircularProgress size={20} /> : <Download fontSize="small" />}
                </ListItemIcon>
                <ListItemText 
                  primary={exporting ? 'Exporting...' : 'Download Count'} 
                  secondary="Excel format"
                />
              </MenuItem>
              <MenuItem onClick={handleConsolidate} disabled={exporting}>
                <ListItemIcon>
                  <Merge fontSize="small" />
                </ListItemIcon>
                <ListItemText 
                  primary="Consolidate & Download" 
                  secondary="Grouped by product"
                />
              </MenuItem>
            </Menu>
          </Box>
        </Grid>
      </Grid>
    </Paper>
  );

  return (
    <Box sx={{ p: 3, maxWidth: '100%', overflowX: 'hidden' }}>
      {/* Header Section */}
      <Paper sx={{ 
        p: 3, 
        mb: 3, 
        borderRadius: 2,
        background: `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.05)}, ${alpha(theme.palette.secondary.main, 0.05)})`,
        border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
        position: 'relative',
        overflow: 'hidden',
        '&:before': {
          content: '""',
          position: 'absolute',
          top: 0,
          right: 0,
          width: '30%',
          height: '100%',
          background: `linear-gradient(to left, ${alpha(theme.palette.primary.main, 0.1)}, transparent)`,
          zIndex: 0
        }
      }}>
        <Box sx={{ position: 'relative', zIndex: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
            <Button 
              variant="outlined" 
              onClick={() => navigate(-1)}
              startIcon={<ChevronLeft />}
              sx={{ 
                mr: 2,
                borderRadius: 2,
                fontWeight: 600
              }}
            >
              Back
            </Button>
            <Typography variant="h4" sx={{ 
              flexGrow: 1,
              fontWeight: 700,
              color: theme.palette.primary.dark,
              display: 'flex',
              alignItems: 'center'
            }}>
              <Avatar sx={{ 
                mr: 2,
                bgcolor: alpha(theme.palette.primary.main, 0.1),
                color: theme.palette.primary.main
              }}>
                <ListAlt />
              </Avatar>
              Counter Review
            </Typography>
            
            <Tooltip title="Refresh all data">
              <IconButton 
                onClick={handleRefresh} 
                color="primary"
                sx={{ 
                  backgroundColor: alpha(theme.palette.primary.main, 0.1),
                  '&:hover': {
                    backgroundColor: alpha(theme.palette.primary.main, 0.2)
                  },
                  borderRadius: 2,
                  p: 1.5
                }}
              >
                <Refresh />
              </IconButton>
            </Tooltip>
          </Box>

          <Box sx={{ 
            display: 'flex', 
            alignItems: 'center', 
            ml: 6,
            gap: 2
          }}>
            <Chip 
              icon={<LocationOn fontSize="small" />}
              label={`Location ID: ${location_id}`}
              variant="outlined"
              color="info"
              size="small"
              sx={{ fontWeight: 500 }}
            />
            
            {loading.sections && (
              <Box sx={{ display: 'flex', alignItems: 'center', ml: 1 }}>
                <CircularProgress size={16} thickness={5} sx={{ mr: 1 }} />
                <Typography variant="body2" color="text.secondary">
                  Loading sections...
                </Typography>
              </Box>
            )}
            {loading.transactions && (
              <Box sx={{ display: 'flex', alignItems: 'center', ml: 1 }}>
                <CircularProgress size={16} thickness={5} sx={{ mr: 1 }} />
                <Typography variant="body2" color="text.secondary">
                  Loading transactions... {Math.round(loadingProgress)}%
                </Typography>
              </Box>
            )}
          </Box>
        </Box>
      </Paper>

      {/* Search and Filter Section */}
      <SearchAndFilterSection />

      {/* Loading State */}
      {loading.sections ? (
        <Box sx={{ 
          display: 'flex', 
          justifyContent: 'center', 
          p: 4,
          minHeight: 300,
          alignItems: 'center',
          flexDirection: 'column',
          gap: 2
        }}>
          <CircularProgress size={60} thickness={4} />
          <Typography variant="body1" color="text.secondary">
            Loading inventory sections...
          </Typography>
        </Box>
      ) : filteredSections.length === 0 ? (
        <Paper sx={{ 
          p: 4, 
          textAlign: 'center',
          borderRadius: 2,
          backgroundColor: alpha(theme.palette.action.disabledBackground, 0.05),
          border: `1px dashed ${alpha(theme.palette.divider, 0.2)}`
        }}>
          <Typography variant="h6" gutterBottom sx={{ fontWeight: 500 }}>
            {searchTerm ? 'No matching sections found' : 'No sections available'}
          </Typography>
          <Typography variant="body1" color="text.secondary">
            {searchTerm 
              ? 'Try adjusting your search query' 
              : 'This location currently has no sections assigned for counting'}
          </Typography>
          <Button 
            variant="outlined" 
            onClick={handleRefresh}
            startIcon={<Refresh />}
            sx={{ mt: 2 }}
          >
            Refresh Data
          </Button>
        </Paper>
      ) : (
        <Box>
          {filteredSections.map((section) => (
            <Accordion 
              key={section.section_id}
              expanded={expandedSection === section.section_id}
              onChange={() => handleSectionExpand(section.section_id)}
              sx={{ 
                mb: 2,
                borderRadius: 2,
                overflow: 'hidden',
                boxShadow: theme.shadows[1],
                border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
                '&:before': { display: 'none' },
                transition: 'all 0.2s ease',
                '&:hover': {
                  boxShadow: theme.shadows[2],
                  transform: 'translateY(-1px)'
                }
              }}
            >
              <AccordionSummary 
                expandIcon={<ExpandMore />}
                sx={{
                  backgroundColor: expandedSection === section.section_id 
                    ? alpha(theme.palette.primary.light, 0.05)
                    : 'background.paper',
                  borderLeft: `4px solid`,
                  '&:hover': {
                    backgroundColor: alpha(theme.palette.primary.light, 0.05)
                  },
                  minHeight: '64px !important'
                }}
              >
                <Box sx={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  width: '100%',
                  pr: 2
                }}>
                  <Box sx={{
                    p: 1,
                    borderRadius: 1,
                    mr: 2,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    {statusIcons[section.status as keyof typeof statusIcons]}
                  </Box>
                  <Box sx={{ flexGrow: 1 }}>
                    <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                      {section.section_desc}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {section.warehouse} • {section.branch}
                    </Typography>
                    <Box sx={{ display: 'flex', gap: 2, mt: 0.5 }}>
                      {section.team_name && (
                        <Tooltip title="Counting Team">
                          <Chip
                            icon={<Group fontSize="small" />}
                            label={section.team_name}
                            size="small"
                            variant="outlined"
                            color="info"
                            sx={{ 
                              fontSize: '0.75rem',
                              height: 24
                            }}
                          />
                        </Tooltip>
                      )}
                      
                      {section.checker_assigned && (
                        <Tooltip title="Assigned Checker">
                          <Chip
                            icon={<Person fontSize="small" />}
                            label={section.checker_assigned}
                            size="small"
                            variant="outlined"
                            color="secondary"
                            sx={{ 
                              fontSize: '0.75rem',
                              height: 24
                            }}
                          />
                        </Tooltip>
                      )}
                    </Box>
                  </Box>
                  <Box sx={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: 1,
                    flexWrap: 'wrap',
                    justifyContent: 'flex-end'
                  }}>
                    <Chip 
                      icon={statusIcons[section.status as keyof typeof statusIcons]}
                      label={section.status}
                      size="small"
                      color={statusColors[section.status as keyof typeof statusColors] as any}
                      variant="outlined"
                      sx={{ fontWeight: 600 }}
                    />
                    <Chip 
                      icon={<Numbers fontSize="small" />}
                      label={`${transactions[section.section_id]?.length || 0}`} 
                      size="small"
                      color="default"
                      variant="outlined"
                      sx={{ fontWeight: 600 }}
                    />
                    <Button
                      variant="outlined"
                      size="small"
                      color="primary"
                      disabled={section.status !== 'Count Completed'}
                      onClick={e => {
                        e.stopPropagation();
                        handleEnableChecker(section.section_id);
                      }}
                      sx={{
                        minWidth: '140px',
                        fontWeight: '600',
                        textTransform: 'none',
                        borderRadius: 2
                      }}
                      startIcon={<CheckCircle fontSize="small" />}
                    >
                      Enable Checker
                    </Button>
                  </Box>
                </Box>
              </AccordionSummary>
              <AccordionDetails sx={{ 
                p: 0,
                borderTop: `1px solid ${alpha(theme.palette.divider, 0.1)}`
              }}>
                {loading.transactions ? (
                  <Box sx={{ 
                    display: 'flex', 
                    justifyContent: 'center', 
                    p: 4,
                    minHeight: 200,
                    alignItems: 'center',
                    flexDirection: 'column',
                    gap: 2
                  }}>
                    <CircularProgress size={40} />
                    <Typography variant="body1" color="text.secondary">
                      Loading transactions...
                    </Typography>
                  </Box>
                ) : transactions[section.section_id]?.length ? (
                  <Box sx={{ overflowX: 'auto' }}>
                    <Table size="small" stickyHeader>
                      <TableHead>
                        <TableRow>
                          <TableCell sx={{ width: 60 }}>Tag</TableCell>
                          <TableCell>Form</TableCell>
                          <TableCell>Grade</TableCell>
                          <TableCell>Size</TableCell>
                          <TableCell>Finish</TableCell>
                          <TableCell>Ext Finish</TableCell>
                          <TableCell>Width</TableCell>
                          <TableCell>Length</TableCell>
                          <TableCell>Remarks</TableCell>
                          <TableCell>Qty</TableCell>
                          <TableCell>Counted By</TableCell>
                          <TableCell>Team</TableCell>
                          <TableCell>Date</TableCell>
                          <TableCell>Details</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {transactions[section.section_id].map((transaction, index) => (
                          <TransactionRow key={index} transaction={transaction} />
                        ))}
                      </TableBody>
                    </Table>
                  </Box>
                ) : (
                  <Box sx={{ 
                    p: 3,
                    textAlign: 'center',
                    backgroundColor: alpha(theme.palette.action.disabledBackground, 0.05)
                  }}>
                    <Typography variant="body1" color="text.secondary">
                      No transactions found for this section
                    </Typography>
                    <Button 
                      variant="text" 
                      size="small" 
                      onClick={() => fetchTransactions(section.section_id)}
                      sx={{ mt: 1 }}
                    >
                      Retry
                    </Button>
                  </Box>
                )}
              </AccordionDetails>
            </Accordion>
          ))}
        </Box>
      )}

      <ConsolidatedView
        open={openConsolidateDialog}
        onClose={handleCloseConsolidateDialog}
        data={consolidatedData}
        locationId={location_id || ''}
        sections={sections}
        transactions={transactions}
      />

      <Dialog open={checkerDialogOpen} onClose={() => setCheckerDialogOpen(false)}>
        <DialogTitle>Assign Checker</DialogTitle>
        <DialogContent>
          <TextField
            select
            label="Select User"
            value={selectedUser}
            onChange={e => setSelectedUser(e.target.value)}
            fullWidth
            margin="normal"
          >
            {users.map(user => (
              <MenuItem key={user.user_id} value={user.user_id}>
                {user.full_name || user.user_name}
              </MenuItem>
            ))}
          </TextField>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCheckerDialogOpen(false)}>Cancel</Button>
          <Button
            onClick={async () => {
              if (!selectedSection || !selectedUser) return;
              
              // Check if user is already assigned as checker
              const existingChecker = await checkExistingChecker(selectedUser, location_id || '', selectedSection.section_id);
              
              if (existingChecker && existingChecker.isAssigned) {
                // Show confirmation dialog for existing checker
                setExistingCheckerInfo({
                  userName: existingChecker.userName,
                  teamName: existingChecker.teamName
                });
                setExistingCheckerDialogOpen(true);
              } else {
                // Proceed with assignment
                await assignChecker();
              }
            }}
            disabled={!selectedUser}
            variant="contained"
          >
            Assign
          </Button>
        </DialogActions>
      </Dialog>

      {/* Confirmation Dialog for Existing Checker */}
      <Dialog open={existingCheckerDialogOpen} onClose={() => setExistingCheckerDialogOpen(false)}>
        <DialogTitle>User Already Has Checker Role</DialogTitle>
        <DialogContent>
          <Typography variant="body1" sx={{ mb: 2 }}>
            The user <strong>{existingCheckerInfo?.userName}</strong> already has the checker role in team <strong>{existingCheckerInfo?.teamName}</strong>
          </Typography>
          <Typography variant="body2" color="text.secondary">
            The user will retain their existing roles and the checker functionality will be enabled for this section.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setExistingCheckerDialogOpen(false)}>Cancel</Button>
          <Button
            onClick={async () => {
              setExistingCheckerDialogOpen(false);
              await assignChecker();
            }}
            variant="contained"
            color="warning"
          >
            Yes, Proceed
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default CountReviewPage;