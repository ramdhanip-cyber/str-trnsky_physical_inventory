// User related types
export interface User {
  user_id: string;
  full_name: string;
  email?: string;
  role?: string;
}

// Transaction related types
export interface Transaction {
  transaction_id: number;
  tag_id: string;
  count_type: 'bundle' | 'piece';
  quantity: number;
  created_at: string;
  updated_at?: string;
  location_id: string;
  section_id: string;
  team_id: string;
  role?: 'Counter' | 'Checker' | 'Recheck';
  // Additional fields that might be present
  form?: string;
  type?: string;
  grade?: string;
  size?: string;
  width?: string;
  finish?: string;
  ext_finish?: string;
  length?: string;
  mill?: string;
  heat?: string;
  location?: string;
  remarks?: string;
  ad_cmts?: string;
  qty?: number;
  checker_count?: number;
  counted_by?: string;
  team_name?: string;
  section_desc?: string;
  location_desc?: string;
  warehouse?: string;
  branch?: string;
  bundles?: any[];
  changes?: any[];
  isRecheckItem?: boolean;
  quality?: string;
}

// Location related types
export interface Location {
  location_id: string;
  location_desc: string;
  warehouse: string;
  branch: string;
}

// Section related types
export interface Section {
  section_id: string;
  section_desc: string;
  location_id: string;
}

// Team related types
export interface Team {
  team_id: string;
  team_name: string;
  status: 'active' | 'inactive';
}

// Role related types
export interface Role {
  role_id: string;
  role_desc: string;
}

// Bundle related types
export interface Bundle {
  bundle_id: number;
  transaction_id: number;
  quantity: number;
  tag_id: string;
}

export type CountType = 'pcs' | 'bundle';

// Form data types
export interface FormData {
  form: string;
  grade: string;
  size: string;
  width: string;
  length: string;
  finish: string;
  extendedFinish: string;
  mill: string;
  heat: string;
  quantity: string;
  remarks?: string;
  ad_cmts?: string;
  type?: string;
  location?: string;
  countType: CountType;
  checker_count?: number;
  bundles: BundleItem[];
  tag_id?: number;
}

export interface BundleItem {
  [key: string]: number | string;
  quantity: number;
  tag_id: string;
  num_of_bundle: number;
  bundle_count: number;
}

// Navigation item type
export interface NavigationItem {
  path?: string;
  icon: React.ReactNode;
  text: string;
  onClick?: () => void;
} 