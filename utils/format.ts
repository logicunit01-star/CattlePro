const numberFormatter = new Intl.NumberFormat('en-PK', {
  maximumFractionDigits: 2,
});

const currencyFormatter = new Intl.NumberFormat('en-PK', {
  maximumFractionDigits: 0,
});

export function formatNumber(value: number | null | undefined, maximumFractionDigits = 2): string {
  const numeric = Number(value ?? 0);
  if (!Number.isFinite(numeric)) return '0';
  if (maximumFractionDigits === 2) return numberFormatter.format(numeric);
  return numeric.toLocaleString('en-PK', { maximumFractionDigits });
}

export function formatCurrency(value: number | null | undefined): string {
  const numeric = Number(value ?? 0);
  return `PKR ${currencyFormatter.format(Number.isFinite(numeric) ? numeric : 0)}`;
}

export function formatQuantity(value: number | null | undefined, unit?: string | null): string {
  return `${formatNumber(value, 2)}${unit ? ` ${unit.toUpperCase()}` : ''}`;
}

export function roundOrderQuantity(value: number, unit?: string | null): number {
  const normalizedUnit = (unit || '').toUpperCase();
  if (['BAG', 'BUNDLE', 'BOTTLE', 'VIAL', 'TABLET'].includes(normalizedUnit)) return Math.ceil(value);
  return Math.ceil(value * 10) / 10;
}

export function periodLabel(period: string): string {
  return ({
    '7_DAYS': 'Last 7 days',
    '30_DAYS': 'Last 30 days',
    '90_DAYS': 'Last 90 days',
    THIS_MONTH: 'This month',
    LAST_MONTH: 'Last month',
    ALL: 'All time',
  } as Record<string, string>)[period] || period.replace(/_/g, ' ').toLowerCase();
}
