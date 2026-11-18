/** 로컬 시간 기준 YYYY-MM-DD */
export function toDateString(date: Date): string {
  return date.toLocaleDateString('sv-SE');
}

export function today(): string {
  return toDateString(new Date());
}

export function addDays(dateString: string, days: number): string {
  const date = new Date(`${dateString}T00:00:00`);
  date.setDate(date.getDate() + days);
  return toDateString(date);
}

const numberFormatter = new Intl.NumberFormat('ko-KR');

export function formatNumber(value: number): string {
  return numberFormatter.format(value);
}

export function formatSigned(value: number): string {
  if (value > 0) return `+${formatNumber(value)}`;
  return formatNumber(value);
}

const dateLabelFormatter = new Intl.DateTimeFormat('ko-KR', {
  month: 'long',
  day: 'numeric',
  weekday: 'short',
});

export function formatDateLabel(dateString: string): string {
  return dateLabelFormatter.format(new Date(`${dateString}T00:00:00`));
}
