/**
 * Converts a date string (yyyy-mm-dd or ISO 8601) to dd/mm/yyyy display format.
 * Returns the original value unchanged if it cannot be parsed.
 *
 * @example
 * formatDate('2026-09-30')       // => '30/09/2026'
 * formatDate('2026-09-30T00:00') // => '30/09/2026'
 * formatDate('N/A')              // => 'N/A'
 */
export function formatDate(value: string | undefined | null): string {
  if (!value) return ''

  // Already in dd/mm/yyyy — return as-is
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(value)) return value

  // ISO / yyyy-mm-dd (optionally with time part)
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (match) {
    const [, yyyy, mm, dd] = match
    return `${dd}/${mm}/${yyyy}`
  }

  // Fallback: return original
  return value
}

/**
 * Formats a date with optional time appended.
 * e.g. '2026-09-30 09:30 AM'  =>  '30/09/2026 09:30 AM'
 */
export function formatDateTime(value: string | undefined | null): string {
  if (!value) return ''
  // Split on the first space after the date portion
  const spaceIdx = value.indexOf(' ', 10)
  if (spaceIdx !== -1) {
    return `${formatDate(value.slice(0, spaceIdx))} ${value.slice(spaceIdx + 1)}`
  }
  return formatDate(value)
}
