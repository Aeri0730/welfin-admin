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

const dateTimeFormatter = new Intl.DateTimeFormat('ko-KR', {
  month: 'numeric',
  day: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
});

/** ISO 시각 → "11. 24. 14:05" (비었으면 빈 글자, 못 읽으면 원래 글자) */
export function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return '';
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? iso : dateTimeFormatter.format(date);
}
