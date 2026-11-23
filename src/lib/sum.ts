/** 목록에서 숫자 하나씩 골라 더한다: sumBy(rows, (r) => r.quantity) */
export const sumBy = <T>(list: readonly T[], pick: (item: T) => number): number =>
  list.reduce((sum, item) => sum + pick(item), 0);
