import * as XLSX from 'xlsx';
import { Transaction, Bundle } from '../types';

export const exportCountData = (transactions: Record<number, Transaction[]>, locationId: string) => {
  const allTransactions = Object.values(transactions).flat();
  
  // Prepare main transaction data
  const mainData = allTransactions.map(({ transaction_id, tag_id, count_type, quantity, created_at, location_id, section_id, team_id }) => ({
    transaction_id,
    tag_id,
    count_type,
    quantity,
    created_at,
    location_id,
    section_id,
    team_id
  }));

  // Prepare bundle data if any
  const bundleData = allTransactions
    .filter(t => t.count_type === 'bundle')
    .flatMap(transaction => {
      const bundles = (transaction as unknown as { bundles?: Bundle[] }).bundles;
      return bundles?.map((bundle) => ({
        transaction_id: transaction.transaction_id,
        bundle_id: bundle.bundle_id,
        tag_id: bundle.tag_id,
        quantity: bundle.quantity
      })) || [];
    });

  // Create workbook
  const wb = XLSX.utils.book_new();

  // Add main sheet
  const mainWs = XLSX.utils.json_to_sheet(mainData);
  XLSX.utils.book_append_sheet(wb, mainWs, "Inventory Count");

  // Add bundle sheet if there are bundles
  if (bundleData.length > 0) {
    const bundleWs = XLSX.utils.json_to_sheet(bundleData);
    XLSX.utils.book_append_sheet(wb, bundleWs, "Bundle Details");
  }

  // Generate file name
  const fileName = `Inventory_Count_Location_${locationId}_${new Date().toISOString().slice(0,10)}.xlsx`;

  // Download the file
  XLSX.writeFile(wb, fileName);
};