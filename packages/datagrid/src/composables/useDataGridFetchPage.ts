import type { RowData } from '@tanstack/vue-table'
import type { DataGridFetchParams, DataGridFetchResult } from '../types'

export type DataGridFetchPageHandler<TData extends RowData> = (params: DataGridFetchParams, signal?: AbortSignal) => Promise<DataGridFetchResult<TData>>

export type DataGridFetchPageOptions<TData extends RowData> = {
  fetchPage: DataGridFetchPageHandler<TData>
  normalizeError?: (error: unknown) => Error
}

export function useDataGridFetchPage<TData extends RowData>(options: DataGridFetchPageOptions<TData>): DataGridFetchPageHandler<TData> {
  return async (params, signal) => {
    try {
      return await options.fetchPage(params, signal)
    } catch (error) {
      throw options.normalizeError?.(error) ?? error
    }
  }
}
