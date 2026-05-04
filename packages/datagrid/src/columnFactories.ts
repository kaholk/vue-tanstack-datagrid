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
