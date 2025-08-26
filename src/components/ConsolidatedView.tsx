import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  Chip,
  CircularProgress
} from '@mui/material';
import { Download, Merge } from '@mui/icons-material';
import * as XLSX from 'xlsx';
import { Section, Transaction, ConsolidatedItem } from '../types/common';

interface ConsolidatedViewProps {
  open: boolean;
  onClose: () => void;
  data: ConsolidatedItem[];
  locationId: string;
  sections: Section[];
  transactions: Record<number, Transaction[]>;
}

const ConsolidatedView: React.FC<ConsolidatedViewProps> = ({ 
  open, 
  onClose, 
  data, 
  locationId,
  sections,
  transactions
}) => {
  const [exporting, setExporting] = React.useState(false);

  const handleDownload = async () => {
    setExporting(true);
    try {
      // Prepare data for export with location and section info
      const exportData = data.map(item => {
        // Get location and section from the first item (assuming all items in group have same location/section)
        const firstItem = item.items[0];
        const section = findSectionForItem(firstItem);
  
        return {
          'Form': item.form,
          'Grade': item.grade,
          'Size': item.size,
          'Finish': item.finish,
          'Ext Finish': item.ext_finish || '',
          'Width': item.width || '',
          'Length': item.length || '',
          'Total Qty': item.total_qty,
          'Location Description': section?.location_desc || '',
          'Section Description': section?.section_desc || '',
          'Count Type': item.count_type,
          'Number of Items': item.items.length
        };
      });
  
      // Create worksheet with only the requested columns
      const ws = XLSX.utils.json_to_sheet(exportData, {
        header: [
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
      XLSX.utils.book_append_sheet(wb, ws, "Consolidated Inventory");
  
      const fileName = `Consolidated_Inventory_Location_${locationId}_${new Date().toISOString().slice(0,10)}.xlsx`;
      XLSX.writeFile(wb, fileName);
    } catch (error) {
      console.error('Error exporting data:', error);
      alert('Failed to export data. Please try again.');
    } finally {
      setExporting(false);
    }
  };

  const findSectionForItem = (firstItem: Transaction) => {
    const section = sections.find((s: Section) =>
      transactions[s.section_id]?.some((t: Transaction) => t.tag_id === firstItem.tag_id)
    );
    return section;
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="lg"
      fullWidth
    >
      <DialogTitle>
        <Merge sx={{ mr: 1, verticalAlign: 'middle' }} />
        Consolidated Inventory Data
      </DialogTitle>
      <DialogContent dividers>
        <Table size="small" stickyHeader>
          <TableHead>
            <TableRow>
              <TableCell>Form</TableCell>
              <TableCell>Grade</TableCell>
              <TableCell>Size</TableCell>
              <TableCell>Finish</TableCell>
              <TableCell>Ext Finish</TableCell>
              <TableCell>Width</TableCell>
              <TableCell>Length</TableCell>
              <TableCell>Total Qty</TableCell>
              <TableCell>Count Type</TableCell>
              <TableCell>Items Count</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {data.map((item, index) => (
              <TableRow key={index} hover>
                <TableCell>{item.form}</TableCell>
                <TableCell>{item.grade}</TableCell>
                <TableCell>{item.size}</TableCell>
                <TableCell>{item.finish}</TableCell>
                <TableCell>{item.ext_finish || '-'}</TableCell>
                <TableCell>{item.width || '-'}</TableCell>
                <TableCell>{item.length || '-'}</TableCell>
                <TableCell>
                  <Chip 
                    label={item.total_qty}
                    color={item.count_type === 'bundle' ? 'primary' : 'default'}
                    variant="outlined"
                    size="small"
                  />
                </TableCell>
                <TableCell>
                  <Chip 
                    label={item.count_type}
                    size="small"
                  />
                </TableCell>
                <TableCell>
                  <Chip 
                    label={item.items.length}
                    color="secondary"
                    size="small"
                  />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={exporting}>
          Close
        </Button>
        <Button 
          onClick={handleDownload}
          variant="contained"
          color="primary"
          startIcon={exporting ? <CircularProgress size={20} /> : <Download />}
          disabled={exporting}
        >
          {exporting ? 'Exporting...' : 'Download Excel'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ConsolidatedView;