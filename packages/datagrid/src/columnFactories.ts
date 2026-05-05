import { h, type VNodeChild } from 'vue'
import type { RowData } from '@tanstack/vue-table'
import type { DataGridColumn, DataGridFilterOption, DataGridFilterOptionsResolver } from './types'

export function createDataGridSelectFilterConfig<TData extends RowData>(
  filterOptions: DataGridFilterOption[] | DataGridFilterOptionsResolver,
  options: { includeEmpty?: boolean; emptyLabel?: string } = {},
): Partial<DataGridColumn<TData>> {
  return {
    filterVariant: 'select',
    filterTextFallback: true,
    filterValueSeparator: '|',
    filterOptions,
    ...(options.includeEmpty
      ? {
          filterIncludeEmptyOption: true,
          filterEmptyOptionLabel: options.emptyLabel ?? '-',
        }
      : {}),
  }
}

export function createDataGridTextColumn<TData extends RowData>(
  column: DataGridColumn<TData>,
): DataGridColumn<TData> {
  return column
}

export type DataGridCommentsColumnOptions<TData extends RowData> = {
  id?: string
  accessorKey?: string
  header?: string
  size?: number
  serverField?: string
  textClass?: string
  cellClass?: string
  renderPreview: (row: TData) => VNodeChild
  onOpen: (row: TData, event: MouseEvent) => void
}

export function createDataGridCommentsColumn<TData extends RowData>({
  id = 'comments',
  accessorKey = 'comments',
  header = 'Comments',
  size = 260,
  serverField = accessorKey,
  textClass = 'data-grid__comments-cell-text',
  cellClass = 'data-grid__clickable-cell',
  renderPreview,
  onOpen,
}: DataGridCommentsColumnOptions<TData>): DataGridColumn<TData> {
  return {
    id,
    accessorKey,
    header,
    size,
    serverField,
    enableSorting: false,
    cellClass,
    onCellClick: ({ row, event }) => {
      event.stopPropagation()
      onOpen(row.original, event)
    },
    cell: ({ row }) => h('span', { class: textClass }, [renderPreview(row.original)]),
  }
}
