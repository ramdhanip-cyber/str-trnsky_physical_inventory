export interface ReconciliationItem {
  form: string;
  grade: string;
  size: string;
  finish: string;
  ext_finish: string;
  width: string | number;
  length: string | number;
  weight?: string | number;
  mill: string;
  heat: string;
  section_desc: string;
  section_id?: number;
  section_ids?: number[];
  section_details?: Array<{
    section_id: number;
    section_desc: string;
    location_desc: string;
    qty: number;
  }>;
  system_qty: number;
  counted_qty: number;
  variance: number;
  status: 'Match' | 'Overcount' | 'Undercount' | 'Not Counted' | 'Counted Not In System' | 'Rechecking in Progress' | 'Rechecked';
  transaction_count?: number;
  teams?: string;
  counters?: string;
  count_type?: string;
  branch?: string;
  warehouse?: string;
  prd_ohd_mat_val?: number;
  prd_ohd_mat_cst?: number;
  is_recheck_item?: boolean;
  recheck_reason?: string;
  marked_by?: string;
  marked_at?: string;
  sections?: string;
  // Additional properties for export functionality
  transaction_id?: string;
  tag_id?: string;
  remarks?: string;
  qty?: number;
  quantity?: number;
  location_id?: string;
  counted_by?: string;
  created_at?: string;
  team_id?: string;
  updated_at?: string;
  checker_count?: string;
  ad_cmts?: string;
  role?: string;
  verified?: string;
  // Quality standards properties
  invt_typ?: string;
  invt_qlty?: string;
  inv_type?: string;
  inv_quality?: string;
  type_description?: string;
  quality_description?: string;
}

export interface RecheckItem {
  id?: number;
  location_id: number;
  form: string;
  grade: string;
  size: string;
  finish: string;
  ext_finish: string;
  width: string | number;
  length: string | number;
  mill: string;
  heat: string;
  system_qty: number;
  counted_qty: number;
  variance: number;
  status: 'Rechecking in Progress' | 'Rechecked';
  recheck_reason?: string;
  marked_by?: number;
  marked_at?: string;
  rechecked_by?: number;
  rechecked_at?: string;
  recheck_count?: number;
  original_transaction_ids?: string;
}

export interface ReconciliationSummary {
  total_system_items: number;
  total_system_quantity: number;
  total_counted_items?: number;
  total_reconciliation_items?: number;
  items_matched?: number;
  overcounts?: number;
  undercounts?: number;
  not_counted?: number;
  counted_not_in_system?: number;
  rechecking_in_progress?: number;
  rechecked?: number;
  branch?: string;
  warehouse?: string;
  location_id?: string;
  record_date?: string;
}

export interface ReconciliationData {
  summary: ReconciliationSummary;
  items: ReconciliationItem[];
} 