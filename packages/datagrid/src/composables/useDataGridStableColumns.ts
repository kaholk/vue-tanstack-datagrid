import { shallowRef, watch, type Ref, type WatchSource } from 'vue'
import type { RowData } from '@tanstack/vue-table'
import type { DataGridColumn } from '../types'

export function useDataGridStableColumns<TData extends RowData>(factory: () => DataGridColumn<TData>[], deps: WatchSource[] = []): Ref<DataGridColumn<TData>[]> {
  const columns = shallowRef(factory()) as Ref<DataGridColumn<TData>[]>

  if (deps.length > 0) {
    watch(deps, () => {
      columns.value = factory()
    })
  }

  return columns
}
