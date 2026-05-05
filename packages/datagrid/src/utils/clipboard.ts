export function escapeClipboardCell(value: string) {
  if (value.includes('\t') || value.includes('\n') || value.includes('"')) {
    return `"${value.replace(/"/g, '""')}"`
  }

  return value
}
