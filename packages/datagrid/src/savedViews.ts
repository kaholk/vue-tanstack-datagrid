import type {
  DataGridSavedView,
  DataGridSavedViewsDeserialize,
  DataGridSavedViewsPersistence,
  DataGridSavedViewsSerialize,
} from './types'

export const serializeDataGridSavedViews: DataGridSavedViewsSerialize = (views) =>
  JSON.stringify(views)

export const deserializeDataGridSavedViews: DataGridSavedViewsDeserialize = (payload) => {
  const normalizeViews = (views: DataGridSavedView[]) =>
    views.map((view) => ({
      ...view,
      includesFilters: typeof view.includesFilters === 'boolean' ? view.includesFilters : true,
    }))

  if (Array.isArray(payload)) {
    return normalizeViews(payload as DataGridSavedView[])
  }

  if (typeof payload !== 'string' || payload.trim() === '') {
    return []
  }

  try {
    const parsed = JSON.parse(payload)
    return Array.isArray(parsed) ? normalizeViews(parsed as DataGridSavedView[]) : []
  } catch {
    return []
  }
}

export type DataGridSavedViewsPersistenceAdapter = {
  loadViews: () => Promise<{
    views: DataGridSavedView[]
    lastSelectedViewId?: string | null
  }>
  saveViews: (views: DataGridSavedView[]) => Promise<void>
  saveLastSelectedViewId?: (viewId: string | null) => Promise<void>
}

export function createDataGridSavedViewsPersistence(
  adapter: DataGridSavedViewsPersistenceAdapter,
): DataGridSavedViewsPersistence {
  let lastSelectedViewId: string | null = null

  return {
    async load() {
      const response = await adapter.loadViews()
      lastSelectedViewId = response.lastSelectedViewId ?? null
      return response.views
    },

    async save(_payload: unknown, views: DataGridSavedView[]) {
      await adapter.saveViews(views)
    },

    async loadLastSelectedViewId() {
      return lastSelectedViewId
    },

    async saveLastSelectedViewId(viewId: string) {
      lastSelectedViewId = viewId || null
      await adapter.saveLastSelectedViewId?.(lastSelectedViewId)
    },
  }
}
