export function downloadTextFile(
  filename: string,
  content: string,
  mimeType: string,
): void {
  const blob = new Blob([content], { type: mimeType })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.append(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}

export function downloadJson(filename: string, data: unknown): void {
  downloadTextFile(
    filename,
    JSON.stringify(data, null, 2),
    'application/json;charset=utf-8',
  )
}

export function downloadCsv(filename: string, csv: string): void {
  downloadTextFile(filename, csv, 'text/csv;charset=utf-8')
}
