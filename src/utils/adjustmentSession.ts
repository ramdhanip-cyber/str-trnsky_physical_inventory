import type { AdjustmentMarkedItem } from '../types/reconciliation';

export type AdjustmentMarkPayload = {
  form: string;
  grade: string;
  size: string;
  finish?: string;
  ext_finish?: string;
  width?: string | number;
  length?: string | number;
  system_qty?: number;
  counted_qty?: number;
  variance?: number;
  status?: string;
  recon_status?: string;
  location?: string;
  mill?: string;
  heat?: string;
  type?: string;
  quality?: string;
  tag_id?: string | null;
  sys_tag_no?: string | null;
  weight?: number | string | null;
  branch?: string | null;
  warehouse?: string | null;
  section_desc?: string | null;
  transaction_id?: number | null;
  section_id?: number | null;
};

const storageKey = (locationId: string) => `adjustment_marked_${locationId}`;

export function toAdjustmentMarkedItems(
  locationId: string | number,
  payloads: AdjustmentMarkPayload[]
): AdjustmentMarkedItem[] {
  const baseId = Date.now();
  return payloads.map((item, idx) => ({
    id: baseId + idx,
    location_id: Number(locationId),
    section_id: item.section_id ?? null,
    form: item.form || '',
    grade: item.grade || '',
    size: item.size || '',
    finish: item.finish || '',
    ext_finish: item.ext_finish,
    width: item.width,
    length: item.length,
    mill: item.mill,
    heat: item.heat,
    location: item.location,
    type: item.type,
    quality: item.quality,
    system_qty: Number(item.system_qty) || 0,
    counted_qty: Number(item.counted_qty) || 0,
    variance: Number(item.variance) || 0,
    status: 'Pending Adjustment',
    recon_status: item.recon_status || item.status,
    tag_id: item.tag_id ?? undefined,
    sys_tag_no: item.sys_tag_no ?? undefined,
    weight: item.weight,
    branch: item.branch ?? undefined,
    warehouse: item.warehouse ?? undefined,
    section_desc: item.section_desc ?? undefined,
    transaction_id: item.transaction_id ?? null,
  }));
}

export function saveAdjustmentItems(locationId: string, items: AdjustmentMarkedItem[]) {
  sessionStorage.setItem(storageKey(locationId), JSON.stringify(items));
}

export function loadAdjustmentItems(locationId: string): AdjustmentMarkedItem[] {
  try {
    const raw = sessionStorage.getItem(storageKey(locationId));
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function clearAdjustmentItems(locationId: string) {
  sessionStorage.removeItem(storageKey(locationId));
}
