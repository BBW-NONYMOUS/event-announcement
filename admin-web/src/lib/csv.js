const RISKY_PREFIX = /^[=+\-@\t\r]/

function escapeCell(value) {
  const text = value === null || value === undefined ? '' : String(value)
  // A leading =/+/-/@ is executed as a formula by Excel and Sheets, so break it.
  const safe = RISKY_PREFIX.test(text) ? `'${text}` : text
  return `"${safe.replace(/"/g, '""')}"`
}

/** @param columns {{ header: string, value: (row) => unknown }[]} */
export function toCsv(columns, rows) {
  const lines = [
    columns.map((column) => escapeCell(column.header)).join(','),
    ...rows.map((row) => columns.map((column) => escapeCell(column.value(row))).join(',')),
  ]
  return lines.join('\r\n')
}

export function downloadCsv(filename, csv) {
  // The BOM keeps Excel from mangling non-ASCII names.
  const blob = new Blob(['\uFEFF', csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}

/** Safe for a filename on every OS we care about. */
export function slugify(value, fallback = 'export') {
  const slug = String(value ?? '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
  return slug || fallback
}
