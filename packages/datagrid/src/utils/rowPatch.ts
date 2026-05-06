import type { RowData } from '@tanstack/vue-table'
import type { DataGridRowPatchOptions } from '../types'

export function mergeDataGridRowPatch<TData extends RowData>(
  currentRow: TData,
  patch: Partial<TData>,
  patchOptions: DataGridRowPatchOptions<TData> = {},
): TData {
  const nextPatch: Partial<TData> = {}
  const patchKeys = new Set(Object.keys(patch))
  const currentEntries = Object.entries(currentRow as Record<string, unknown>)
  const preserveMissingKeys =
    patchOptions.preserveMissingKeys === true
      ? new Set(currentEntries.map(([key]) => key))
      : new Set(Array.isArray(patchOptions.preserveMissingKeys) ? patchOptions.preserveMissingKeys : [])

  for (const key of preserveMissingKeys) {
    if (!patchKeys.has(key)) {
      nextPatch[key as keyof TData] = currentRow[key as keyof TData]
    }
  }

  for (const [key, value] of Object.entries(patch) as Array<[Extract<keyof TData, string>, TData[Extract<keyof TData, string>]]>) {
    nextPatch[key] = value
  }

  return { ...(currentRow as Record<string, unknown>), ...nextPatch } as TData
}
