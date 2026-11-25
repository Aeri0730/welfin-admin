/**
 * Supabase(PostgREST) 는 한 번에 최대 1000줄까지만 준다. 넘으면 말없이 잘리므로
 * 1000줄씩 끝까지 이어서 읽는다.
 */
const PAGE_SIZE = 1000;
/** 혹시 모를 무한 반복 방지 (이보다 많으면 기간을 좁혀 달라고 알린다) */
const MAX_ROWS = 50_000;

type PageResult = { data: unknown; error: { message: string; code?: string } | null };

export async function readAllPages<T>(
  readPage: (from: number, to: number) => PromiseLike<PageResult>,
): Promise<{ rows: T[]; error: PageResult['error'] }> {
  const rows: T[] = [];
  for (let from = 0; from < MAX_ROWS; from += PAGE_SIZE) {
    const { data, error } = await readPage(from, from + PAGE_SIZE - 1);
    if (error) return { rows, error };
    const page = (data ?? []) as T[];
    rows.push(...page);
    if (page.length < PAGE_SIZE) return { rows, error: null };
  }
  return { rows, error: { message: `${MAX_ROWS.toLocaleString()}줄이 넘어요. 기간을 좁혀서 다시 봐주세요` } };
}
