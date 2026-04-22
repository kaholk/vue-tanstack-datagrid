import { ref, type Ref } from 'vue'
import { type ColumnFiltersState, type ColumnOrderState, type ColumnPinningState, type ColumnSizingState, type PaginationState, type RowSelectionState } from '@tanstack/vue-table'

import type { DataGridColumnVisibilityState, DataGridInitialState, DataGridSavedView, DataGridSavedViewState } from '../types'

type UseDataGridSavedViewsOptions = {
  viewStorageKey: string
  initialState: DataGridInitialState
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
  createViewId: () => string
  cloneViewState: (state: DataGridSavedViewState) => DataGridSavedViewState
}

export function useDataGridSavedViews(options: UseDataGridSavedViewsOptions) {
  const savedViews = ref<DataGridSavedView[]>([])
  const activeViewId = ref('')

  function getCurrentViewState(): DataGridSavedViewState {
    return {
      columnOrder: [...options.columnOrder.value],
      columnSizing: { ...options.columnSizing.value },
      columnVisibility: { ...options.columnVisibility.value },
      columnPinning: {
        left: [...(options.columnPinning.value.left ?? [])],
        right: [...(options.columnPinning.value.right ?? [])],
      },
      columnFilters: options.columnFilters.value.map((filter) => ({
        id: filter.id,
        value: Array.isArray(filter.value) ? [...filter.value] : filter.value,
      })),
      globalFilter: options.globalFilter.value,
    }
  }

  function applyViewState(state: DataGridSavedViewState) {
    const nextState = options.cloneViewState(state)
    options.columnOrder.value = nextState.columnOrder
    options.columnSizing.value = nextState.columnSizing
    options.columnVisibility.value = nextState.columnVisibility
    options.columnPinning.value = nextState.columnPinning
    options.columnFilters.value = nextState.columnFilters
    options.globalFilter.value = nextState.globalFilter
    options.pagination.value = {
      ...options.pagination.value,
      pageIndex: 0,
    }
    options.rowSelection.value = {}
    options.onAfterApplyViewState()
  }

  function getDefaultViewState(): DataGridSavedViewState {
    return {
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

  function loadSavedViews() {
    if (!options.viewStorageKey || typeof window === 'undefined') {
      savedViews.value = []
      return
    }

    try {
      const rawValue = window.localStorage.getItem(options.viewStorageKey)
      if (!rawValue) {
        savedViews.value = []
        return
      }

      const parsed = JSON.parse(rawValue)
      savedViews.value = Array.isArray(parsed) ? (parsed as DataGridSavedView[]) : []
    } catch {
      savedViews.value = []
    }
  }

  function persistSavedViews() {
    if (!options.viewStorageKey || typeof window === 'undefined') {
      return
    }

    window.localStorage.setItem(options.viewStorageKey, JSON.stringify(savedViews.value))
  }

  function selectSavedView(viewId: string) {
    activeViewId.value = viewId

    if (!viewId) {
      applyViewState(getDefaultViewState())
      return
    }

    const selectedView = savedViews.value.find((view) => view.id === viewId)
    if (!selectedView) {
      activeViewId.value = ''
      return
    }

    applyViewState(selectedView.state)
  }

  function createNewView(name: string) {
    const now = new Date().toISOString()
    const nextView: DataGridSavedView = {
      id: options.createViewId(),
      name,
      state: getCurrentViewState(),
      createdAt: now,
      updatedAt: now,
    }

    savedViews.value = [...savedViews.value, nextView]
    activeViewId.value = nextView.id
    persistSavedViews()
  }

  function overwriteActiveView() {
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
            state: getCurrentViewState(),
            updatedAt: new Date().toISOString(),
          }
        : view,
    )
    persistSavedViews()
  }

  function deleteActiveView() {
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
    persistSavedViews()
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
