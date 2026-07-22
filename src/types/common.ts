export interface Bundle {
  num_of_bundle: number;
  bundle_count: number;
  created_at: string;
}

export interface Transaction {
  transaction_id?: number;
  tag_id: number | string;
  sys_tag_no?: string;
  form: string;
  grade: string;
  size: string;
  finish: string;
  ext_finish: string;
  width: string;
  length: string;
  mill?: string;
  heat?: string;
  location?: string;
  type?: string;
  remarks?: string;
  ad_cmts?: string;
  page_number?: string;
  serial_number?: string;
  qty?: number;
  quantity?: number;
  count_type: 'bundle' | 'piece';
  created_at?: string;
  team_name?: string;
  counted_by?: string;
  bundles?: Bundle[];
  section_id?: number; // Added to track which section this transaction belongs to
}

export interface Section {
  section_id: number;
  section_desc: string;
  warehouse: string;
  branch: string;
  location_desc: string;
  status: string;
  team_name?: string;
  checker_assigned?: string;
}

export interface ConsolidatedItem {
  form: string;
  grade: string;
  size: string;
  finish: string;
  ext_finish: string;
  width: string;
  length: string;
  total_qty: number;
  count_type: string;
  items: Transaction[];
} 