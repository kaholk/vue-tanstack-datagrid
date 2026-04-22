import type {
  DataGridSavedView,
  DataGridSavedViewsDeserialize,
  DataGridSavedViewsSerialize,
} from './types'

export const serializeDataGridSavedViews: DataGridSavedViewsSerialize = (views) =>
  JSON.stringify(views)

export const deserializeDataGridSavedViews: DataGridSavedViewsDeserialize = (payload) => {
  if (Array.isArray(payload)) {
    return payload as DataGridSavedView[]
  }

  if (typeof payload !== 'string' || payload.trim() === '') {
    return []
  }

  try {
    const parsed = JSON.parse(payload)
    return Array.isArray(parsed) ? (parsed as DataGridSavedView[]) : []
  } catch {
    return []
  }
}
