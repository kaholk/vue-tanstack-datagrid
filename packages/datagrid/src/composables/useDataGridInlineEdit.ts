import { h, ref, type VNodeChild } from 'vue'
import type { RowData } from '@tanstack/vue-table'
import DataGridInlineEditStatus from '../components/DataGridInlineEditStatus'
import {
  useDataGridInlineMutation,
  type DataGridInlineMutationStatus,
} from './useDataGridInlineMutation'

export type DataGridInlineEditCell = {
  id: string | number
  field: string
}

export function useDataGridInlineEdit<TData extends RowData & { id: string | number }>() {
  const editingCell = ref<DataGridInlineEditCell | null>(null)
  const mutations = useDataGridInlineMutation<TData>()

  const stopEditingCell = () => {
    editingCell.value = null
  }

  const renderInlineEditStatus = (
    content: VNodeChild,
    row: TData,
    field: string,
    options: { align?: 'start' | 'center' | 'end'; title?: string } = {},
  ) => {
    const state = mutations.getStatus(row, field)

    return h(
      DataGridInlineEditStatus,
      {
        status: state?.status ?? null,
        message: state?.message ?? '',
        align: options.align ?? 'start',
        title: options.title ?? '',
      },
      { default: () => content },
    )
  }

  return {
    editingCell,
    stopEditingCell,
    statuses: mutations.statuses,
    getInlineEditStatus: mutations.getStatus,
    setInlineEditStatus: mutations.setStatus as (
      row: TData,
      field: string,
      status: DataGridInlineMutationStatus | null,
      message?: string,
    ) => void,
    renderInlineEditStatus,
  }
}
