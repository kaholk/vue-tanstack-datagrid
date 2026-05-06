import { onBeforeUnmount, ref, watch, type Ref, type ShallowRef } from 'vue'
import type { ColumnFiltersState, ColumnSort, PaginationState } from '@tanstack/vue-table'

import type { DataGridFetchParams, DataGridFetchResult, DataGridLocaleText } from '../types'
import type { DataGridRequestState } from './useDataGridRows'

type AnyRow = Record<string, unknown>

type LoadDataOptions = {
  force?: boolean
}

type UseDataGridDataLoadingOptions<TData extends AnyRow> = {
  requestState: ShallowRef<DataGridRequestState<TData>>
  isLoading: Ref<boolean>
  errorMessage: Ref<string>
  enabled?: Ref<boolean>
  pagination: Ref<PaginationState>
  sorting: Ref<ColumnSort[]>
  columnFilters: Ref<ColumnFiltersState>
  globalFilter: Ref<string>
  requestedServerColumnsKey: Ref<string>
  localeText: Ref<Required<DataGridLocaleText>>
  keepRowsOnError?: () => boolean
  fetchPage: () => (params: DataGridFetchParams, signal?: AbortSignal) => Promise<DataGridFetchResult<TData>>
  fetchDebounceMs: () => number
  onLoaded?: () => void
}

function normalizeRequestValue(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(normalizeRequestValue)
  }

  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([key, entry]) => [key, normalizeRequestValue(entry)]),
    )
  }

  return value
}

const stableRequestPartCache = new WeakMap<object, string>()

function stableRequestPart(value: unknown) {
  if (value && typeof value === 'object') {
    const cached = stableRequestPartCache.get(value)
    if (cached) {
      return cached
    }

    const stable = JSON.stringify(normalizeRequestValue(value))
    stableRequestPartCache.set(value, stable)
    return stable
  }

  return JSON.stringify(normalizeRequestValue(value))
}

function createRequestKey(params: DataGridFetchParams) {
  return [
    params.pageIndex,
    params.pageSize,
    stableRequestPart(params.sorting),
    stableRequestPart(params.filters),
    params.search ?? '',
    [...(params.include_columns ?? [])].sort().join('|'),
  ].join('::')
}

export function useDataGridDataLoading<TData extends AnyRow>(options: UseDataGridDataLoadingOptions<TData>) {
  let debounceTimer: ReturnType<typeof setTimeout> | undefined
  let activeController: AbortController | null = null
  let activeRequestKey = ''
  let loadedRequestKey = ''
  let activeRequestId = 0
  let isUnmounted = false

  async function loadData(loadOptions: LoadDataOptions = {}) {
    const params: DataGridFetchParams = {
      pageIndex: options.pagination.value.pageIndex,
      pageSize: options.pagination.value.pageSize,
      sorting: options.sorting.value,
      filters: options.columnFilters.value,
      search: options.globalFilter.value.trim() || undefined,
      include_columns: options.requestedServerColumnsKey.value ? options.requestedServerColumnsKey.value.split('|').filter(Boolean).sort() : [],
    }
    const requestKey = createRequestKey(params)

    if (!loadOptions.force && (requestKey === activeRequestKey || requestKey === loadedRequestKey)) {
      return
    }

    if (activeController) {
      activeController.abort()
    }

    const requestId = activeRequestId + 1
    activeRequestId = requestId
    const controller = new AbortController()
    activeController = controller
    activeRequestKey = requestKey
    options.isLoading.value = true
    options.errorMessage.value = ''

    try {
      const response = await options.fetchPage()(params, controller.signal)

      if (isUnmounted || requestId !== activeRequestId) {
        return
      }

      options.requestState.value = {
        rows: response.rows,
        totalRows: response.totalRows,
        pageCount: response.pageCount,
        meta: response.meta,
      }

      options.onLoaded?.()
      loadedRequestKey = requestKey
    } catch (error) {
      if (isUnmounted || requestId !== activeRequestId || controller.signal.aborted || (error instanceof DOMException && error.name === 'AbortError') || (error instanceof Error && error.name === 'AbortError')) {
        return
      }

      options.errorMessage.value = error instanceof Error ? error.message : (options.localeText.value.fetchErrorMessage ?? 'Fetch failed.')
      if (!options.keepRowsOnError?.()) {
        options.requestState.value = {
          rows: [],
          totalRows: 0,
          pageCount: 0,
          meta: undefined,
        }
      }
    } finally {
      if (activeController === controller) {
        activeController = null
      }

      if (activeRequestKey === requestKey) {
        activeRequestKey = ''
      }

      if (!isUnmounted && requestId === activeRequestId) {
        options.isLoading.value = false
      }
    }
  }

  function refreshData() {
    if (options.enabled && !options.enabled.value) {
      return
    }

    if (debounceTimer) {
      clearTimeout(debounceTimer)
    }

    void loadData({ force: true })
  }

  watch(
    [
      options.enabled ?? ref(true),
      options.pagination,
      options.sorting,
      options.columnFilters,
      options.globalFilter,
      options.requestedServerColumnsKey,
    ],
    () => {
      if (options.enabled && !options.enabled.value) {
        return
      }

      if (debounceTimer) {
        clearTimeout(debounceTimer)
      }

      debounceTimer = setTimeout(
        () => {
          void loadData()
        },
        Math.max(0, options.fetchDebounceMs()),
      )
    },
    { immediate: true },
  )

  onBeforeUnmount(() => {
    isUnmounted = true
    activeRequestId += 1

    if (debounceTimer) {
      clearTimeout(debounceTimer)
    }

    if (activeController) {
      activeController.abort()
    }
  })

  return {
    loadData,
    refreshData,
  }
}
