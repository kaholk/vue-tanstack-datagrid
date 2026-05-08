import { ref, type Ref } from 'vue'
import { type ColumnFiltersState, type ColumnOrderState, type ColumnPinningState, type ColumnSizingState, type ColumnSort, type PaginationState, type RowSelectionState } from '@tanstack/vue-table'

import { deserializeDataGridSavedViews, serializeDataGridSavedViews } from '../savedViews'
import type {
  DataGridColumnVisibilityState,
  DataGridInitialState,
  DataGridSavedView,
  DataGridSavedViewsPersistence,
  DataGridSavedViewState,
} from '../types'

type UseDataGridSavedViewsOptions = {
  viewStorageKey: string
  savedViewsPersistence?: DataGridSavedViewsPersistence
  initialState: DataGridInitialState
  sorting: Ref<ColumnSort[]>
  columnOrder: Ref<ColumnOrderState>
  columnSizing: Ref<ColumnSizingState>
  columnVisibility: Ref<DataGridColumnVisibilityState>
  columnPinning: Ref<ColumnPinningState>
  columnFilters: Ref<ColumnFiltersState>
  globalFilter: Ref<string>
  pagination: Ref<PaginationState>
  rowSelection: Ref<RowSelectionState>
  onAfterApplyViewState: () => void
  onOpenSaveViewDialog: () => void
  onPersistenceError: (error: unknown) => void
  createViewId: () => string
  cloneViewState: (state: DataGridSavedViewState) => DataGridSavedViewState
}

export function useDataGridSavedViews(options: UseDataGridSavedViewsOptions) {
  const savedViews = ref<DataGridSavedView[]>([])
  const activeViewId = ref('')

  async function persistLastSelectedViewId(viewId: string) {
    try {
      await options.savedViewsPersistence?.saveLastSelectedViewId?.(viewId)
    } catch (error) {
      options.onPersistenceError(error)
    }
  }

  function getCurrentViewState(optionsOverride?: { includeFilters?: boolean }): DataGridSavedViewState {
    const includeFilters = optionsOverride?.includeFilters ?? true

    return {
      pagination: {
        pageIndex: 0,
        pageSize: options.pagination.value.pageSize,
      },
      sorting: options.sorting.value.map((sort) => ({ ...sort })),
      columnOrder: [...options.columnOrder.value],
      columnSizing: { ...options.columnSizing.value },
      columnVisibility: { ...options.columnVisibility.value },
      columnPinning: {
        left: [...(options.columnPinning.value.left ?? [])],
        right: [...(options.columnPinning.value.right ?? [])],
      },
      columnFilters: includeFilters
        ? options.columnFilters.value.map((filter) => ({
            id: filter.id,
            value: Array.isArray(filter.value) ? [...filter.value] : filter.value,
          }))
        : [],
      globalFilter: includeFilters ? options.globalFilter.value : '',
    }
  }

  function applyViewState(state: DataGridSavedViewState) {
    const nextState = options.cloneViewState(state)
    options.sorting.value = nextState.sorting
      ? nextState.sorting.map((sort) => ({ ...sort }))
      : (options.initialState.sorting ?? []).map((sort) => ({ ...sort }))
    options.columnOrder.value = nextState.columnOrder
    options.columnSizing.value = nextState.columnSizing
    options.columnVisibility.value = nextState.columnVisibility
    options.columnPinning.value = nextState.columnPinning
    options.columnFilters.value = nextState.columnFilters
    options.globalFilter.value = nextState.globalFilter
    options.pagination.value = {
      ...options.pagination.value,
      pageIndex: 0,
      pageSize: nextState.pagination?.pageSize ?? options.pagination.value.pageSize,
    }
    options.rowSelection.value = {}
    options.onAfterApplyViewState()
  }

  function getDefaultViewState(): DataGridSavedViewState {
    return {
      pagination: options.initialState.pagination
        ? { ...options.initialState.pagination, pageIndex: 0 }
        : undefined,
      sorting: (options.initialState.sorting ?? []).map((sort) => ({ ...sort })),
      columnOrder: [...(options.initialState.columnOrder ?? [])],
      columnSizing: { ...(options.initialState.columnSizing ?? {}) },
      columnVisibility: { ...(options.initialState.columnVisibility ?? {}) },
      columnPinning: {
        left: [...(options.initialState.columnPinning?.left ?? [])],
        right: [...(options.initialState.columnPinning?.right ?? [])],
      },
      columnFilters: (options.initialState.columnFilters ?? []).map((filter) => ({
        id: filter.id,
        value: Array.isArray(filter.value) ? [...filter.value] : filter.value,
      })),
      globalFilter: options.initialState.globalFilter ?? '',
    }
  }

  async function loadSavedViews() {
    try {
      if (options.savedViewsPersistence) {
        const deserialize =
          options.savedViewsPersistence.deserialize ?? deserializeDataGridSavedViews
        const payload = await options.savedViewsPersistence.load()
        savedViews.value = deserialize(payload)
        const lastSelectedViewId = await options.savedViewsPersistence.loadLastSelectedViewId?.()
        const selectedView =
          typeof lastSelectedViewId === 'string'
            ? savedViews.value.find((view) => view.id === lastSelectedViewId)
            : null

        if (selectedView) {
          activeViewId.value = selectedView.id
          applyViewState(selectedView.state)
        }
        return
      }

      if (!options.viewStorageKey || typeof window === 'undefined') {
        savedViews.value = []
        return
      }

      const rawValue = window.localStorage.getItem(options.viewStorageKey)
      if (!rawValue) {
        savedViews.value = []
        return
      }

      savedViews.value = deserializeDataGridSavedViews(rawValue)
    } catch {
      savedViews.value = []
      options.onPersistenceError(new Error('Nie udalo sie zaladowac zapisanych widokow.'))
    }
  }

  async function persistSavedViews(nextViews: DataGridSavedView[] = savedViews.value) {
    try {
      if (options.savedViewsPersistence) {
        const serialize = options.savedViewsPersistence.serialize ?? serializeDataGridSavedViews
        const payload = serialize(nextViews)
        await options.savedViewsPersistence.save(payload, nextViews)
        return
      }

      if (!options.viewStorageKey || typeof window === 'undefined') {
        return
      }

      window.localStorage.setItem(options.viewStorageKey, JSON.stringify(nextViews))
    } catch (error) {
      options.onPersistenceError(error)
    }
  }

  function selectSavedView(viewId: string) {
    activeViewId.value = viewId

    if (!viewId) {
      applyViewState(getDefaultViewState())
      void persistLastSelectedViewId('')
      return
    }

    const selectedView = savedViews.value.find((view) => view.id === viewId)
    if (!selectedView) {
      activeViewId.value = ''
      return
    }

    applyViewState(selectedView.state)
    void persistLastSelectedViewId(viewId)
  }

  async function createNewView(name: string, includeFilters = true) {
    const now = new Date().toISOString()
    const nextView: DataGridSavedView = {
      id: options.createViewId(),
      name,
      includesFilters: includeFilters,
      state: getCurrentViewState({ includeFilters }),
      createdAt: now,
      updatedAt: now,
    }

    savedViews.value = [...savedViews.value, nextView]
    activeViewId.value = nextView.id
    await persistSavedViews(savedViews.value)
    await persistLastSelectedViewId(nextView.id)
  }

  async function overwriteActiveView(includeFilters = true) {
    if (!activeViewId.value) {
      options.onOpenSaveViewDialog()
      return
    }

    const currentView = savedViews.value.find((view) => view.id === activeViewId.value)
    if (!currentView) {
      activeViewId.value = ''
      options.onOpenSaveViewDialog()
      return
    }

    savedViews.value = savedViews.value.map((view) =>
      view.id === activeViewId.value
        ? {
            ...view,
            includesFilters: includeFilters,
            state: getCurrentViewState({ includeFilters }),
            updatedAt: new Date().toISOString(),
          }
        : view,
    )
    await persistSavedViews(savedViews.value)
  }

  async function deleteActiveView() {
    if (!activeViewId.value) {
      return
    }

    const currentView = savedViews.value.find((view) => view.id === activeViewId.value)
    if (!currentView) {
      activeViewId.value = ''
      return
    }

    const confirmed = window.confirm(`Usunac widok "${currentView.name}"?`)
    if (!confirmed) {
      return
    }

    savedViews.value = savedViews.value.filter((view) => view.id !== activeViewId.value)
    activeViewId.value = ''
    await persistSavedViews(savedViews.value)
    selectSavedView('')
  }

  return {
    activeViewId,
    savedViews,
    loadSavedViews,
    selectSavedView,
    createNewView,
    overwriteActiveView,
    deleteActiveView,
  }
}
