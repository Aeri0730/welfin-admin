/** 띄어쓰기·대소문자 무시하고 비교하려고 정리 */
const squash = (text: string) => text.toLowerCase().replace(/\s+/g, '');

/**
 * 검색어가 비었거나, 주어진 칸 중 하나에 검색어가 들어 있으면 true.
 * 띄어쓰기와 대소문자는 무시한다 ("에어 히터" = "에어히터").
 */
export function matchesKeyword(keyword: string, fields: (string | number | null | undefined)[]): boolean {
  const q = squash(keyword);
  if (!q) return true;
  return fields.some((field) => field !== null && field !== undefined && squash(String(field)).includes(q));
}
