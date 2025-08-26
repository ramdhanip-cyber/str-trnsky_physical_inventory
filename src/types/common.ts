export interface Bundle {
  num_of_bundle: number;
  bundle_count: number;
  created_at: string;
}

export interface Transaction {
  tag_id: number | string;
  form: string;
  grade: string;
  size: string;
  finish: string;
  ext_finish: string;
  width: string;
  length: string;
  remarks?: string;
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