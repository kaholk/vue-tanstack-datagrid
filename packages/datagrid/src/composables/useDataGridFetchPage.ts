import { onBeforeUnmount } from 'vue'
import type { RowData } from '@tanstack/vue-table'
import type { DataGridFetchParams, DataGridFetchResult } from '../types'

export type DataGridFetchPageHandler<TData extends RowData> = (
  params: DataGridFetchParams,
  signal?: AbortSignal,
) => Promise<DataGridFetchResult<TData>>

export type DataGridFetchPageOptions<TData extends RowData> = {
  fetchPage: DataGridFetchPageHandler<TData>
  normalizeError?: (error: unknown) => Error
}

export function useDataGridFetchPage<TData extends RowData>(
  options: DataGridFetchPageOptions<TData>,
): DataGridFetchPageHandler<TData> {
  const controllers = new Set<AbortController>()

  onBeforeUnmount(() => {
    controllers.forEach((controller) => controller.abort())
    controllers.clear()
  })

  return async (params, signal) => {
    const controller = new AbortController()
    controllers.add(controller)

    const abort = () => controller.abort()
    signal?.addEventListener('abort', abort, { once: true })

    try {
      return await options.fetchPage(params, controller.signal)
    } catch (error) {
      throw options.normalizeError?.(error) ?? error
    } finally {
      signal?.removeEventListener('abort', abort)
      controllers.delete(controller)
    }
  }
}
