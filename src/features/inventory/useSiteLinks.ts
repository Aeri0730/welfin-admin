import { useEffect, useRef } from 'react';
import { useSaveSiteProductLinks, useSiteProductLinks } from '@/api/queries';
import {
  clearLegacyAliases,
  EMPTY_ALIASES,
  loadLegacyAliases,
  normalizeName,
  SITE_KEYS,
  type AliasMap,
  type SiteKey,
} from './siteStock';

/** 연결 드롭다운 값: '' = 자동(기억 지우기), 'none' = 연결 안 함, 숫자 = 제품 id */
export type LinkChoice = '' | 'none' | `${number}`;

/**
 * 사이트 상품명 ↔ 우리 제품 연결.
 * 한 번 고르면 DB 에 남아서, 다음에 같은 이름이 올라오면(어느 컴퓨터든) 자동으로 연결된다.
 */
export function useSiteLinks() {
  const links = useSiteProductLinks();
  const save = useSaveSiteProductLinks();
  const aliases: AliasMap = links.data ?? EMPTY_ALIASES;

  // 이 브라우저에만 저장돼 있던 예전 연결을 처음 한 번 DB 로 옮긴다 (DB 에 이미 있는 건 그대로)
  const imported = useRef(false);
  const { mutate } = save;
  useEffect(() => {
    const saved = links.data;
    if (imported.current || !saved) return;
    imported.current = true;
    const legacy = loadLegacyAliases();
    const missing = SITE_KEYS.flatMap((site) =>
      Object.entries(legacy[site] ?? {})
        .filter(([nameKey]) => !(nameKey in saved[site]))
        .map(([nameKey, productId]) => ({ site, nameKey, productId })),
    );
    if (missing.length === 0) {
      clearLegacyAliases();
      return;
    }
    mutate(missing, { onSuccess: clearLegacyAliases });
  }, [links.data, mutate]);

  const setLink = (site: SiteKey, siteName: string, choice: LinkChoice) => {
    const productId = choice === '' ? undefined : choice === 'none' ? null : Number(choice);
    mutate([{ site, nameKey: normalizeName(siteName), productId }]);
  };

  return { aliases, setLink, error: links.error ?? save.error };
}
