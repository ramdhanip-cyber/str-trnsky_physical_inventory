import { styled, alpha } from '@mui/material/styles';
import { 
  Box, 
  Paper, 
  Accordion, 
  AccordionSummary,
  Chip,
  Button
} from '@mui/material';

export const StyledAccordion = styled(Accordion)(({ theme }) => ({
  marginBottom: theme.spacing(2),
  borderRadius: '12px !important',
  overflow: 'hidden',
  boxShadow: 'none',
  border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
  transition: 'all 0.3s ease',
  '&:before': {
    display: 'none',
  },
  '&:hover': {
    borderColor: alpha(theme.palette.primary.main, 0.2),
    transform: 'translateY(-2px)',
    boxShadow: `0 4px 20px ${alpha(theme.palette.primary.main, 0.1)}`
  },
  '&.Mui-expanded': {
    margin: theme.spacing(2, 0),
    boxShadow: `0 8px 25px ${alpha(theme.palette.primary.main, 0.15)}`
  }
}));

export const StyledAccordionSummary = styled(AccordionSummary)(({ theme }) => ({
  minHeight: 72,
  padding: theme.spacing(1, 3),
  backgroundColor: theme.palette.background.paper,
  transition: 'all 0.3s ease',
  '& .MuiAccordionSummary-content': {
    margin: theme.spacing(1, 0),
  },
  '&.Mui-expanded': {
    backgroundColor: alpha(theme.palette.primary.main, 0.03),
    borderBottom: `1px solid ${alpha(theme.palette.divider, 0.1)}`
  }
}));

export const StyledTableContainer = styled(Box)(({ theme }) => ({
  overflowX: 'auto',
  '& .MuiTable-root': {
    borderCollapse: 'separate',
    borderSpacing: '0 8px',
  },
  '& .MuiTableHead-root .MuiTableCell-root': {
    backgroundColor: alpha(theme.palette.primary.main, 0.03),
    fontWeight: 600,
    color: theme.palette.text.primary,
    borderBottom: 'none',
    padding: theme.spacing(1.5, 2),
    '&:first-of-type': {
      borderTopLeftRadius: 8,
      borderBottomLeftRadius: 8,
    },
    '&:last-of-type': {
      borderTopRightRadius: 8,
      borderBottomRightRadius: 8,
    }
  },
  '& .MuiTableBody-root .MuiTableRow-root': {
    backgroundColor: theme.palette.background.paper,
    boxShadow: `0 2px 4px ${alpha(theme.palette.common.black, 0.02)}`,
    transition: 'all 0.2s ease',
    '&:hover': {
      backgroundColor: alpha(theme.palette.primary.main, 0.02),
      transform: 'translateY(-1px)',
      boxShadow: `0 4px 12px ${alpha(theme.palette.common.black, 0.05)}`
    }
  }
}));

export const StyledHeaderPaper = styled(Paper)(({ theme }) => ({
  padding: theme.spacing(3),
  marginBottom: theme.spacing(3),
  borderRadius: 16,
  background: `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.05)}, ${alpha(theme.palette.secondary.main, 0.05)})`,
  border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
  position: 'relative',
  overflow: 'hidden'
}));

export const StyledSearchPaper = styled(Paper)(({ theme }) => ({
  padding: theme.spacing(2),
  marginBottom: theme.spacing(3),
  borderRadius: 16,
  boxShadow: 'none',
  border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
  backgroundColor: theme.palette.background.paper,
  transition: 'all 0.3s ease',
  '&:hover': {
    borderColor: alpha(theme.palette.primary.main, 0.2)
  }
}));

export const AnimatedChip = styled(Chip)(({ theme }) => ({
  transition: 'all 0.3s ease',
  '&:hover': {
    transform: 'scale(1.05)',
    boxShadow: `0 4px 12px ${alpha(theme.palette.primary.main, 0.1)}`
  }
}));

export const ActionButton = styled(Button)(({ theme }) => ({
  borderRadius: 8,
  padding: theme.spacing(1, 3),
  fontWeight: 600,
  transition: 'all 0.2s ease',
  '&:hover': {
    transform: 'translateY(-1px)',
    boxShadow: `0 4px 12px ${alpha(theme.palette.primary.main, 0.1)}`
  }
})); 