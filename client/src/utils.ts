export function dateTimeLocal(date: string | Date, includeTime: boolean = true): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  return `${dateObj.toLocaleDateString()} ${includeTime ? dateObj.toLocaleTimeString() : ''}`;
}
