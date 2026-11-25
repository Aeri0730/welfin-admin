import type { AliasMap, SiteDataMap, SiteKey } from '@/features/inventory/siteStock';
import { supabase } from '@/lib/supabase';

/** 그날 저장한 사이트 재고 비교 */
export interface SiteStockSnapshot {
  date: string;
  /** null = 전체 창고 */
  warehouseId: number | null;
  warehouseName: string | null;
  sites: SiteDataMap;
  /** 저장할 때의 우리 재고 (제품 id → 수량) */
  ours: Record<string, number>;
  updatedAt: string;
}

function toError(error: { message: string; code?: string }): Error {
  if (error.code === '42P01' || error.code === 'PGRST205') {
    return new Error('사이트 재고 저장 테이블이 없어요. supabase/migrations/0019_site_stock_snapshots.sql 을 실행해주세요');
  }
  if (error.code === '42501') return new Error('권한이 없어요. 관리자에게 문의해주세요');
  return new Error(error.message);
}

/** 그날 저장한 비교 (없으면 null) */
export async function fetchSiteStockSnapshot(date: string): Promise<SiteStockSnapshot | null> {
  const { data, error } = await supabase
    .from('site_stock_snapshots')
    .select('compared_on, warehouse_id, warehouse_name, sites, ours, updated_at')
    .eq('compared_on', date)
    .maybeSingle();
  if (error) throw toError(error);
  if (!data) return null;
  return {
    date: data.compared_on,
    warehouseId: data.warehouse_id,
    warehouseName: data.warehouse_name,
    sites: (data.sites ?? {}) as SiteDataMap,
    ours: (data.ours ?? {}) as Record<string, number>,
    updatedAt: data.updated_at,
  };
}

/** 그날 비교를 저장 (같은 날 다시 저장하면 덮어씀) */
export async function saveSiteStockSnapshot(snapshot: Omit<SiteStockSnapshot, 'updatedAt'>): Promise<void> {
  const { error } = await supabase.from('site_stock_snapshots').upsert(
    {
      compared_on: snapshot.date,
      warehouse_id: snapshot.warehouseId,
      warehouse_name: snapshot.warehouseName,
      sites: snapshot.sites,
      ours: snapshot.ours,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'compared_on' },
  );
  if (error) throw toError(error);
}

/* ---------- 사이트 상품명 ↔ 우리 제품 연결 ---------- */

/** 한 줄의 연결. productId: 제품 id, null = '연결 안 함', undefined = 기억 지우기(자동 추정으로) */
export interface SiteProductLink {
  site: SiteKey;
  nameKey: string;
  productId: number | null | undefined;
}

function linksError(error: { message: string; code?: string }): Error {
  if (error.code === '42P01' || error.code === 'PGRST205') {
    return new Error('제품 연결 테이블이 없어요. supabase/migrations/0020_site_product_links.sql 을 실행해주세요');
  }
  return toError(error);
}

export async function fetchSiteProductLinks(): Promise<AliasMap> {
  const { data, error } = await supabase.from('site_product_links').select('site, name_key, product_id');
  if (error) throw linksError(error);
  const map: AliasMap = { sellmate: {}, ecount: {}, ezadmin: {} };
  for (const row of data as Array<{ site: SiteKey; name_key: string; product_id: number | null }>) {
    if (map[row.site]) map[row.site][row.name_key] = row.product_id;
  }
  return map;
}

/** 여러 연결을 한 번에 저장 (지우기는 하나씩) */
export async function saveSiteProductLinks(links: SiteProductLink[]): Promise<void> {
  const now = new Date().toISOString();
  const upserts = links.filter((l) => l.productId !== undefined);
  const removals = links.filter((l) => l.productId === undefined);
  if (upserts.length > 0) {
    const { error } = await supabase.from('site_product_links').upsert(
      upserts.map((l) => ({ site: l.site, name_key: l.nameKey, product_id: l.productId, updated_at: now })),
      { onConflict: 'site,name_key' },
    );
    if (error) throw linksError(error);
  }
  for (const l of removals) {
    const { error } = await supabase.from('site_product_links').delete().eq('site', l.site).eq('name_key', l.nameKey);
    if (error) throw linksError(error);
  }
}

export const saveSiteProductLink = (link: SiteProductLink) => saveSiteProductLinks([link]);
