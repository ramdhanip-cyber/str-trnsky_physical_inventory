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
  Chip,
  TextField,
  InputAdornment,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  alpha,
  useTheme
} from "@mui/material";
import { styled } from "@mui/material/styles";
import {
  KeyboardArrowDown,
  KeyboardArrowUp,
  Close,
  Search,
  Edit,
  Save,
  Cancel,
  Add,
  History,
  Summarize,
  ViewColumn
} from "@mui/icons-material";
import Menu from "@mui/material/Menu";
import Checkbox from "@mui/material/Checkbox";
import FormControlLabel from "@mui/material/FormControlLabel";

const COUNT_TYPES = {
  PIECES: "pcs",
  BUNDLES: "bundle",
} as const;

type CountType = typeof COUNT_TYPES[keyof typeof COUNT_TYPES];

interface Transaction {
  id?: number;
  tag_id: number;
  sys_tag_no?: string;
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
  page_number?: string;
  serial_number?: string;
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
  onCompleteLocation: () => Promise<void>;
}

type ColumnId = "expand" | "tag_no" | "form" | "grade" | "size" | "finish" | "ext_finish" | "width" | "length" | "mill" | "heat" | "count_type" | "type" | "qty" | "remarks" | "ad_cmts" | "page_number" | "serial_number" | "actions";

const COLUMNS: { id: ColumnId; label: string; align?: "left" | "right" | "center"; alwaysVisible?: boolean }[] = [
  { id: "expand", label: "", alwaysVisible: true },
  { id: "tag_no", label: "Tag No" },
  { id: "form", label: "Form" },
  { id: "grade", label: "Grade" },
  { id: "size", label: "Size" },
  { id: "finish", label: "Finish" },
  { id: "ext_finish", label: "Ext. Finish" },
  { id: "width", label: "Width" },
  { id: "length", label: "Length" },
  { id: "mill", label: "Mill" },
  { id: "heat", label: "Heat" },
  { id: "count_type", label: "Count Type" },
  { id: "type", label: "Type" },
  { id: "qty", label: "Qty", align: "right" },
  { id: "remarks", label: "Quality" },
  { id: "ad_cmts", label: "Comments" },
  { id: "page_number", label: "Page" },
  { id: "serial_number", label: "Line #" },
  { id: "actions", label: "Actions", align: "center", alwaysVisible: true },
];

const ModalCard = styled(Paper)(({ theme }) => ({
  width: "98%",
  maxWidth: "1800px",
  maxHeight: "95vh",
  borderRadius: 20,
  overflow: "hidden",
  boxShadow: `0 24px 80px ${alpha(theme.palette.common.black, 0.2)}`,
  display: "flex",
  flexDirection: "column",
  border: `1px solid ${alpha(theme.palette.primary.main, 0.12)}`,
}));

const HeaderBar = styled(Box)(({ theme }) => ({
  background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${alpha(theme.palette.primary.dark, 0.9)} 100%)`,
  color: theme.palette.primary.contrastText,
  padding: theme.spacing(2, 3),
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  flexShrink: 0,
}));

const SearchBar = styled(Box)(({ theme }) => ({
  padding: theme.spacing(2, 3),
  display: "flex",
  gap: theme.spacing(2),
  alignItems: "center",
  flexWrap: "wrap",
  flexShrink: 0,
  background: alpha(theme.palette.primary.main, 0.03),
  borderBottom: `1px solid ${alpha(theme.palette.divider, 0.6)}`,
}));

const StyledTableContainer = styled(TableContainer)(({ theme }) => ({
  borderRadius: 12,
  border: `1px solid ${alpha(theme.palette.divider, 0.5)}`,
  flex: 1,
  minHeight: 0,
  maxHeight: "100%",
  overflow: "auto",
  scrollbarGutter: "stable",
  "& .MuiTableHead-root .MuiTableCell-root": {
    fontWeight: 600,
    fontSize: "0.75rem",
    textTransform: "uppercase",
    letterSpacing: "0.05em",
    color: theme.palette.text.secondary,
    background: alpha(theme.palette.primary.main, 0.06),
    borderBottom: `2px solid ${alpha(theme.palette.primary.main, 0.2)}`,
    padding: theme.spacing(1.5, 1.25),
    whiteSpace: "nowrap",
  },
  "& .MuiTableHead-root .MuiTableCell-root.MuiTableCell-stickyHeader": {
    background: alpha(theme.palette.primary.main, 0.08),
    zIndex: 2,
  },
  "& .MuiTableBody-root .MuiTableRow-root": {
    transition: "background-color 0.15s ease",
    "&:hover": {
      backgroundColor: alpha(theme.palette.primary.main, 0.04),
    },
    "&.editing-row": {
      backgroundColor: alpha(theme.palette.primary.main, 0.08),
    },
  },
  "& .MuiTableBody-root .MuiTableCell-root": {
    padding: theme.spacing(1.25, 1.25),
    fontSize: "0.8125rem",
    borderBottom: `1px solid ${alpha(theme.palette.divider, 0.4)}`,
    whiteSpace: "nowrap",
  },
}));

const FooterBar = styled(Box)(({ theme }) => ({
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  padding: theme.spacing(2, 3),
  borderTop: `1px solid ${alpha(theme.palette.divider, 0.5)}`,
  background: alpha(theme.palette.grey[50], 0.8),
  flexShrink: 0,
}));

const TransactionsTableModal: React.FC<TableModalProps> = ({
  open,
  onClose,
  data,
  onSubmitAll,
  onUpdateTransaction,
  onCompleteLocation,
}) => {
  const theme = useTheme();
  const [expandedRows, setExpandedRows] = useState<Record<number, boolean>>({});
  const [searchTerm, setSearchTerm] = useState("");
  const [searchBy, setSearchBy] = useState<"tag_id" | "counted_by">("tag_id");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [editingBundles, setEditingBundles] = useState<Bundle[]>([]);
  const [openBundleDialog, setOpenBundleDialog] = useState(false);
  const [columnsMenuAnchor, setColumnsMenuAnchor] = useState<null | HTMLElement>(null);
  const [columnsMenuPosition, setColumnsMenuPosition] = useState<{ top: number; left: number } | null>(null);
  const toggleableColumnIds = COLUMNS.filter((c) => !c.alwaysVisible).map((c) => c.id);
  const [visibleColumns, setVisibleColumns] = useState<Record<string, boolean>>(() =>
    toggleableColumnIds.reduce((acc, id) => ({ ...acc, [id]: true }), {})
  );

  const isColumnVisible = (id: ColumnId) => {
    const col = COLUMNS.find((c) => c.id === id);
    return col?.alwaysVisible || !!visibleColumns[id];
  };

  const visibleColumnList = COLUMNS.filter((c) => isColumnVisible(c.id));
  const visibleCount = visibleColumnList.length;
  const tableMinWidth = Math.max(visibleCount * 96, 960);

  const setColumnVisible = (id: string, visible: boolean) => {
    setVisibleColumns((prev) => ({ ...prev, [id]: visible }));
  };

  const showAllColumns = () => {
    setVisibleColumns(toggleableColumnIds.reduce((acc, id) => ({ ...acc, [id]: true }), {}));
  };

  const hideAllColumns = () => {
    setVisibleColumns(toggleableColumnIds.reduce((acc, id) => ({ ...acc, [id]: false }), {}));
  };

  const filteredData = useMemo(() => {
    if (!searchTerm) return data;
    return data.filter((transaction) => {
      const fieldValue =
        searchBy === "tag_id"
          ? transaction.tag_id.toString()
          : transaction.counted_by.toString();
      return fieldValue.includes(searchTerm);
    });
  }, [data, searchTerm, searchBy]);

  const toggleRow = (id: number) => {
    setExpandedRows((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handleEdit = (transaction: Transaction) => {
    const rowId = transaction.id || transaction.tag_id;
    setEditingId(Number(rowId));
    setEditingTransaction({ ...transaction });
    if (transaction.count_type === COUNT_TYPES.BUNDLES && transaction.bundles) {
      setEditingBundles([...transaction.bundles]);
    }
  };

  const handleSave = () => {
    if (editingTransaction) {
      const transactionToUpdate = {
        ...editingTransaction,
        bundles:
          editingTransaction.count_type === COUNT_TYPES.BUNDLES
            ? editingBundles
            : editingTransaction.bundles,
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
      setEditingTransaction({ ...editingTransaction, [field]: value });
    }
  };

  const handleBundleChange = (index: number, field: keyof Bundle, value: number) => {
    const updatedBundles = [...editingBundles];
    updatedBundles[index] = { ...updatedBundles[index], [field]: value };
    setEditingBundles(updatedBundles);
  };

  const handleAddBundle = () => {
    setEditingBundles([
      ...editingBundles,
      {
        num_of_bundle: 0,
        bundle_count: 0,
        tag_id: editingTransaction?.tag_id,
      },
    ]);
  };

  const handleRemoveBundle = (index: number) => {
    const updatedBundles = [...editingBundles];
    updatedBundles.splice(index, 1);
    setEditingBundles(updatedBundles);
  };

  const handleSubmitAll = async () => {
    try {
      onSubmitAll();
      await onCompleteLocation();
    } catch (error) {
      console.error("Error completing location:", error);
    }
  };

  const typeLabels: Record<string, string> = {
    D: "D - Drop",
    F: "F - Finished",
    M: "M - Master",
    R: "R - Reject",
    S: "S - Scrap",
    W: "W - Work in Process",
  };

  const renderCell = (columnId: ColumnId, transaction: Transaction, rowId: number) => {
    const isEditing = editingId === rowId;
    switch (columnId) {
      case "expand":
        return (
          <TableCell key="expand" sx={{ py: 0.5, verticalAlign: "middle" }}>
            {transaction.count_type === "bundle" && (
              <IconButton
                size="small"
                onClick={() => toggleRow(rowId)}
                sx={{
                  bgcolor: alpha(theme.palette.primary.main, 0.08),
                  "&:hover": { bgcolor: alpha(theme.palette.primary.main, 0.15) },
                }}
              >
                {expandedRows[rowId] ? <KeyboardArrowUp /> : <KeyboardArrowDown />}
              </IconButton>
            )}
          </TableCell>
        );
      case "tag_no":
        return (
          <TableCell key="tag_no">
            <Typography variant="body2" fontWeight={500}>
              {transaction.sys_tag_no || "-"}
            </Typography>
          </TableCell>
        );
      case "form":
        return (
          <TableCell key="form">
            {isEditing ? (
              <TextField size="small" fullWidth value={editingTransaction?.form || ""} onChange={(e) => handleTransactionChange("form", e.target.value)} sx={{ "& .MuiInputBase-input": { py: 0.5 } }} />
            ) : (
              transaction.form
            )}
          </TableCell>
        );
      case "grade":
        return (
          <TableCell key="grade">
            {isEditing ? (
              <TextField size="small" fullWidth value={editingTransaction?.grade || ""} onChange={(e) => handleTransactionChange("grade", e.target.value)} sx={{ "& .MuiInputBase-input": { py: 0.5 } }} />
            ) : (
              transaction.grade
            )}
          </TableCell>
        );
      case "size":
        return (
          <TableCell key="size">
            {isEditing ? (
              <TextField size="small" fullWidth value={editingTransaction?.size || ""} onChange={(e) => handleTransactionChange("size", e.target.value)} sx={{ "& .MuiInputBase-input": { py: 0.5 } }} />
            ) : (
              transaction.size
            )}
          </TableCell>
        );
      case "finish":
        return (
          <TableCell key="finish">
            {isEditing ? (
              <TextField size="small" fullWidth value={editingTransaction?.finish || ""} onChange={(e) => handleTransactionChange("finish", e.target.value)} sx={{ "& .MuiInputBase-input": { py: 0.5 } }} />
            ) : (
              transaction.finish || "-"
            )}
          </TableCell>
        );
      case "ext_finish":
        return (
          <TableCell key="ext_finish">
            {isEditing ? (
              <TextField size="small" fullWidth value={editingTransaction?.ext_finish || ""} onChange={(e) => handleTransactionChange("ext_finish", e.target.value)} sx={{ "& .MuiInputBase-input": { py: 0.5 } }} />
            ) : (
              transaction.ext_finish || "-"
            )}
          </TableCell>
        );
      case "width":
        return (
          <TableCell key="width">
            {isEditing ? (
              <TextField size="small" fullWidth value={editingTransaction?.width || ""} onChange={(e) => handleTransactionChange("width", e.target.value)} sx={{ "& .MuiInputBase-input": { py: 0.5 } }} />
            ) : (
              transaction.width || "-"
            )}
          </TableCell>
        );
      case "length":
        return (
          <TableCell key="length">
            {isEditing ? (
              <TextField size="small" fullWidth value={editingTransaction?.length || ""} onChange={(e) => handleTransactionChange("length", e.target.value)} sx={{ "& .MuiInputBase-input": { py: 0.5 } }} />
            ) : (
              transaction.length || "-"
            )}
          </TableCell>
        );
      case "mill":
        return (
          <TableCell key="mill">
            {isEditing ? (
              <TextField size="small" fullWidth value={editingTransaction?.mill || ""} onChange={(e) => handleTransactionChange("mill", e.target.value)} sx={{ "& .MuiInputBase-input": { py: 0.5 } }} />
            ) : (
              transaction.mill || "-"
            )}
          </TableCell>
        );
      case "heat":
        return (
          <TableCell key="heat">
            {isEditing ? (
              <TextField size="small" fullWidth value={editingTransaction?.heat || ""} onChange={(e) => handleTransactionChange("heat", e.target.value)} sx={{ "& .MuiInputBase-input": { py: 0.5 } }} />
            ) : (
              transaction.heat || "-"
            )}
          </TableCell>
        );
      case "count_type":
        return (
          <TableCell key="count_type">
            {isEditing ? (
              <FormControl size="small" fullWidth>
                <Select value={editingTransaction?.count_type || ""} onChange={(e) => handleTransactionChange("count_type", e.target.value)}>
                  <MenuItem value={COUNT_TYPES.PIECES}>Pieces</MenuItem>
                  <MenuItem value={COUNT_TYPES.BUNDLES}>Bundles</MenuItem>
                </Select>
              </FormControl>
            ) : (
              <Chip
                label={transaction.count_type}
                size="small"
                sx={{
                  fontWeight: 600,
                  borderRadius: 1.5,
                  backgroundColor: transaction.count_type === COUNT_TYPES.BUNDLES ? alpha(theme.palette.primary.main, 0.15) : alpha(theme.palette.secondary.main, 0.15),
                  color: transaction.count_type === COUNT_TYPES.BUNDLES ? theme.palette.primary.main : theme.palette.secondary.main,
                }}
              />
            )}
          </TableCell>
        );
      case "type":
        return (
          <TableCell key="type">
            {isEditing ? (
              <FormControl size="small" fullWidth>
                <Select value={editingTransaction?.type || ""} onChange={(e) => handleTransactionChange("type", e.target.value)}>
                  {Object.entries(typeLabels).map(([value, label]) => (
                    <MenuItem key={value} value={value}>{label}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            ) : (
              typeLabels[transaction.type] || transaction.type || "-"
            )}
          </TableCell>
        );
      case "qty":
        return (
          <TableCell key="qty" align="right">
            {isEditing ? (
              <TextField size="small" type="number" value={editingTransaction?.qty ?? 0} onChange={(e) => handleTransactionChange("qty", parseInt(e.target.value) || 0)} sx={{ width: 72, "& .MuiInputBase-input": { py: 0.5 } }} />
            ) : (
              <Typography variant="body2" fontWeight={600}>{transaction.qty}</Typography>
            )}
          </TableCell>
        );
      case "remarks":
        return (
          <TableCell key="remarks" sx={{ maxWidth: 160 }}>
            {isEditing ? (
              <TextField size="small" fullWidth value={editingTransaction?.remarks || ""} onChange={(e) => handleTransactionChange("remarks", e.target.value)} sx={{ "& .MuiInputBase-input": { py: 0.5 } }} />
            ) : (
              <Box sx={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{transaction.remarks || "Conforms to Std"}</Box>
            )}
          </TableCell>
        );
      case "ad_cmts":
        return (
          <TableCell key="ad_cmts" sx={{ maxWidth: 140 }}>
            {isEditing ? (
              <TextField size="small" fullWidth value={editingTransaction?.ad_cmts || ""} onChange={(e) => handleTransactionChange("ad_cmts", e.target.value)} sx={{ "& .MuiInputBase-input": { py: 0.5 } }} />
            ) : (
              <Box sx={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{transaction.ad_cmts || "-"}</Box>
            )}
          </TableCell>
        );
      case "page_number":
        return (
          <TableCell key="page_number">
            {isEditing ? (
              <TextField size="small" fullWidth value={editingTransaction?.page_number || ""} onChange={(e) => handleTransactionChange("page_number", e.target.value)} sx={{ "& .MuiInputBase-input": { py: 0.5 } }} />
            ) : (
              transaction.page_number || "-"
            )}
          </TableCell>
        );
      case "serial_number":
        return (
          <TableCell key="serial_number">
            {isEditing ? (
              <TextField size="small" fullWidth value={editingTransaction?.serial_number || ""} onChange={(e) => handleTransactionChange("serial_number", e.target.value)} sx={{ "& .MuiInputBase-input": { py: 0.5 } }} />
            ) : (
              transaction.serial_number || "-"
            )}
          </TableCell>
        );
      case "actions":
        return (
          <TableCell key="actions" align="center">
            {isEditing ? (
              <Box sx={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 0.5 }}>
                <IconButton size="small" onClick={handleSave} color="primary" sx={{ bgcolor: alpha(theme.palette.primary.main, 0.1) }}>
                  <Save fontSize="small" />
                </IconButton>
                <IconButton size="small" onClick={handleCancel} sx={{ bgcolor: alpha(theme.palette.error.main, 0.1), color: theme.palette.error.main }}>
                  <Cancel fontSize="small" />
                </IconButton>
                {editingTransaction?.count_type === COUNT_TYPES.BUNDLES && (
                  <Button size="small" variant="outlined" startIcon={<Edit />} onClick={() => setOpenBundleDialog(true)} sx={{ ml: 0.5 }}>Bundles</Button>
                )}
              </Box>
            ) : (
              <IconButton size="small" onClick={() => handleEdit(transaction)} sx={{ bgcolor: alpha(theme.palette.primary.main, 0.08), "&:hover": { bgcolor: alpha(theme.palette.primary.main, 0.18) } }}>
                <Edit fontSize="small" />
              </IconButton>
            )}
          </TableCell>
        );
      default:
        return null;
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      aria-labelledby="transaction-table-modal"
      sx={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        p: 2,
      }}
    >
      <ModalCard>
        <HeaderBar>
          <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
            <Box
              sx={{
                width: 44,
                height: 44,
                borderRadius: 2,
                background: alpha(theme.palette.common.white, 0.2),
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <History sx={{ fontSize: 26 }} />
            </Box>
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 700, letterSpacing: "-0.02em" }}>
                Transaction History
              </Typography>
              <Typography variant="body2" sx={{ opacity: 0.9 }}>
                View and edit counted transactions
              </Typography>
            </Box>
          </Box>
          <IconButton
            onClick={onClose}
            sx={{
              color: "inherit",
              "&:hover": { background: alpha(theme.palette.common.white, 0.15) },
            }}
          >
            <Close />
          </IconButton>
        </HeaderBar>

        <SearchBar>
          <FormControl size="small" sx={{ minWidth: 140 }}>
            <InputLabel>Search by</InputLabel>
            <Select
              value={searchBy}
              label="Search by"
              onChange={(e) => setSearchBy(e.target.value as "tag_id" | "counted_by")}
            >
              <MenuItem value="tag_id">Tag ID</MenuItem>
              <MenuItem value="counted_by">User ID</MenuItem>
            </Select>
          </FormControl>
          <TextField
            size="small"
            placeholder={`Search by ${searchBy === "tag_id" ? "Tag ID" : "User ID"}...`}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            sx={{
              flex: 1,
              minWidth: 220,
              "& .MuiOutlinedInput-root": {
                borderRadius: 2,
                backgroundColor: theme.palette.background.paper,
              },
            }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Search color="action" />
                </InputAdornment>
              ),
            }}
          />
          <Chip
            icon={<Summarize />}
            label={`${filteredData.length} of ${data.length} records`}
            size="small"
            sx={{
              borderRadius: 2,
              fontWeight: 600,
              background: alpha(theme.palette.primary.main, 0.1),
              color: theme.palette.primary.main,
            }}
          />
          <Button
            variant="outlined"
            size="small"
            startIcon={<ViewColumn />}
            onClick={(e) => {
              const target = e.currentTarget;
              const rect = target.getBoundingClientRect();
              setColumnsMenuAnchor(target);
              setColumnsMenuPosition({ top: rect.bottom + 8, left: rect.left });
            }}
            sx={{ borderRadius: 2, textTransform: "none", fontWeight: 600 }}
          >
            Columns ({visibleCount})
          </Button>
          <Menu
            open={!!columnsMenuAnchor}
            onClose={() => { setColumnsMenuAnchor(null); setColumnsMenuPosition(null); }}
            anchorReference="anchorPosition"
            anchorPosition={columnsMenuPosition ? { top: columnsMenuPosition.top, left: columnsMenuPosition.left } : undefined}
            anchorEl={columnsMenuAnchor}
            disableScrollLock
            PaperProps={{
              sx: {
                minWidth: 220,
                borderRadius: 2,
                boxShadow: `0 8px 32px ${alpha(theme.palette.common.black, 0.12)}`,
              },
            }}
          >
            <Box sx={{ px: 2, py: 1, borderBottom: `1px solid ${alpha(theme.palette.divider, 0.5)}` }}>
              <Typography variant="subtitle2" fontWeight={600} color="text.secondary">
                Show / hide columns
              </Typography>
            </Box>
            <Box sx={{ py: 1, maxHeight: 360, overflowY: "auto" }}>
              {toggleableColumnIds.map((id) => {
                const col = COLUMNS.find((c) => c.id === id);
                if (!col) return null;
                return (
                  <FormControlLabel
                    key={id}
                    control={
                      <Checkbox
                        checked={!!visibleColumns[id]}
                        onChange={(_, checked) => setColumnVisible(id, checked)}
                        size="small"
                      />
                    }
                    label={col.label}
                    sx={{ display: "block", mx: 2, my: 0.25 }}
                  />
                );
              })}
            </Box>
            <Box sx={{ px: 2, py: 1, borderTop: `1px solid ${alpha(theme.palette.divider, 0.5)}`, display: "flex", gap: 1 }}>
              <Button size="small" onClick={showAllColumns} sx={{ textTransform: "none" }}>
                Show all
              </Button>
              <Button size="small" onClick={hideAllColumns} sx={{ textTransform: "none" }}>
                Hide all
              </Button>
            </Box>
          </Menu>
        </SearchBar>

        <Box
          sx={{
            p: 2,
            flex: 1,
            minHeight: 0,
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
          }}
        >
          <StyledTableContainer>
            <Table stickyHeader size="small" sx={{ minWidth: tableMinWidth }}>
              <TableHead>
                <TableRow>
                  {visibleColumnList.map((col) => (
                    <TableCell
                      key={col.id}
                      align={col.align}
                      sx={
                        col.id === "expand"
                          ? { width: 48 }
                          : col.id === "actions"
                          ? { width: 100 }
                          : undefined
                      }
                    >
                      {col.label}
                    </TableCell>
                  ))}
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
                        <TableRow className={isEditing ? "editing-row" : ""}>
                          {visibleColumnList.map((col) => renderCell(col.id, transaction, rowId))}
                        </TableRow>

                        {transaction.count_type === "bundle" && transaction.bundles && (
                          <TableRow>
                            <TableCell colSpan={visibleColumnList.length} sx={{ p: 0, borderTop: 0, borderBottom: 0 }}>
                              <Collapse in={isExpanded} timeout="auto" unmountOnExit>
                                <Box
                                  sx={{
                                    backgroundColor: alpha(theme.palette.primary.main, 0.04),
                                    p: 2,
                                    borderLeft: `4px solid ${theme.palette.primary.main}`,
                                    mx: 2,
                                    mb: 1,
                                    borderRadius: 2,
                                  }}
                                >
                                  <Typography variant="subtitle2" fontWeight={600} gutterBottom color="text.secondary">
                                    Bundle details · Tag {transaction.sys_tag_no || transaction.tag_id}
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
                                        <TableRow key={bundle.id ?? index}>
                                          <TableCell>{index + 1}</TableCell>
                                          <TableCell>{bundle.num_of_bundle}</TableCell>
                                          <TableCell>{bundle.bundle_count}</TableCell>
                                          <TableCell align="right">{bundle.num_of_bundle * bundle.bundle_count}</TableCell>
                                          <TableCell>{bundle.tag_id ?? "-"}</TableCell>
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
                    <TableCell colSpan={visibleColumnList.length} align="center" sx={{ py: 8 }}>
                      <Box sx={{ textAlign: "center" }}>
                        <Search sx={{ fontSize: 48, color: "text.disabled", mb: 1 }} />
                        <Typography variant="body1" color="text.secondary" fontWeight={500}>
                          No transactions match your search
                        </Typography>
                        <Typography variant="body2" color="text.disabled" sx={{ mt: 0.5 }}>
                          Try a different {searchBy === "tag_id" ? "Tag ID" : "User ID"} or clear the search
                        </Typography>
                      </Box>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </StyledTableContainer>
        </Box>

        <Dialog
          open={openBundleDialog}
          onClose={() => setOpenBundleDialog(false)}
          maxWidth="sm"
          fullWidth
          PaperProps={{
            sx: {
              borderRadius: 3,
              boxShadow: `0 16px 48px ${alpha(theme.palette.common.black, 0.12)}`,
            },
          }}
        >
          <DialogTitle sx={{ fontWeight: 600, borderBottom: `1px solid ${alpha(theme.palette.divider, 0.5)}` }}>
            Edit bundles
          </DialogTitle>
          <DialogContent sx={{ pt: 2 }}>
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>#</TableCell>
                    <TableCell>Number of bundles</TableCell>
                    <TableCell>Count per bundle</TableCell>
                    <TableCell align="right">Total</TableCell>
                    <TableCell />
                  </TableRow>
                </TableHead>
                <TableBody>
                  {editingBundles.map((bundle, index) => (
                    <TableRow key={index}>
                      <TableCell>{index + 1}</TableCell>
                      <TableCell>
                        <TextField
                          size="small"
                          type="number"
                          value={bundle.num_of_bundle}
                          onChange={(e) => handleBundleChange(index, "num_of_bundle", parseInt(e.target.value) || 0)}
                          sx={{ width: 100 }}
                        />
                      </TableCell>
                      <TableCell>
                        <TextField
                          size="small"
                          type="number"
                          value={bundle.bundle_count}
                          onChange={(e) => handleBundleChange(index, "bundle_count", parseInt(e.target.value) || 0)}
                          sx={{ width: 100 }}
                        />
                      </TableCell>
                      <TableCell align="right">{bundle.num_of_bundle * bundle.bundle_count}</TableCell>
                      <TableCell>
                        <IconButton size="small" onClick={() => handleRemoveBundle(index)} color="error">
                          <Close fontSize="small" />
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
              sx={{ mt: 2, borderRadius: 2 }}
            >
              Add bundle
            </Button>
          </DialogContent>
          <DialogActions sx={{ px: 3, py: 2, borderTop: `1px solid ${alpha(theme.palette.divider, 0.5)}` }}>
            <Button onClick={() => setOpenBundleDialog(false)}>Cancel</Button>
            <Button
              variant="contained"
              onClick={() => {
                setOpenBundleDialog(false);
                if (editingTransaction) {
                  const totalQuantity = editingBundles.reduce(
                    (sum, bundle) => sum + bundle.num_of_bundle * bundle.bundle_count,
                    0
                  );
                  handleTransactionChange("qty", totalQuantity);
                }
              }}
            >
              Save bundles
            </Button>
          </DialogActions>
        </Dialog>

        <FooterBar>
          <Box>
            <Typography variant="body2" color="text.secondary" fontWeight={500}>
              Showing {filteredData.length} of {data.length} transactions
            </Typography>
            <Typography variant="caption" color="text.disabled">
              Scroll vertically for more rows and horizontally when columns exceed the view
            </Typography>
          </Box>
          <Box sx={{ display: "flex", gap: 2 }}>
            <Button variant="outlined" onClick={onClose} sx={{ borderRadius: 2, textTransform: "none", fontWeight: 600 }}>
              Close
            </Button>
            <Button
              variant="contained"
              onClick={handleSubmitAll}
              disabled={data.length === 0}
              sx={{ borderRadius: 2, textTransform: "none", fontWeight: 600, px: 3 }}
            >
              Submit all transactions
            </Button>
          </Box>
        </FooterBar>
      </ModalCard>
    </Modal>
  );
};

export default TransactionsTableModal;
