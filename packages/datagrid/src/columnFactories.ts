import { h, type VNodeChild } from 'vue'
import type { RowData } from '@tanstack/vue-table'
import type { DataGridColumn, DataGridFilterOption, DataGridFilterOptionsResolver } from './types'

export function createDataGridSelectFilterConfig<TData extends RowData>(filterOptions: DataGridFilterOption[] | DataGridFilterOptionsResolver, options: { includeEmpty?: boolean; emptyLabel?: string } = {}): Partial<DataGridColumn<TData>> {
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

export function createDataGridTextColumn<TData extends RowData>(column: DataGridColumn<TData>): DataGridColumn<TData> {
  return column
}

export type DataGridBaseColumnFactoryOptions<TData extends RowData> = Omit<DataGridColumn<TData>, 'id' | 'accessorKey'> & {
  id: string
  accessorKey?: string
  serverField?: string
}

export function createDataGridDateColumn<TData extends RowData>(
  options: DataGridBaseColumnFactoryOptions<TData> & {
    format?: (value: unknown, row: TData) => VNodeChild
  },
): DataGridColumn<TData> {
  const accessorKey = options.accessorKey ?? options.id

  return {
    ...options,
    accessorKey,
    serverField: options.serverField ?? accessorKey,
    align: options.align ?? 'center',
    cell:
      options.cell ??
      (({ row }) => {
        const value = row.getValue(options.id)
        if (options.format) return options.format(value, row.original)
        if (value === null || value === undefined || value === '') return '-'
        return String(value).split('T')[0]?.split(' ')[0]?.trim() || '-'
      }),
  } as DataGridColumn<TData>
}

export function createDataGridNumberColumn<TData extends RowData>(
  options: DataGridBaseColumnFactoryOptions<TData> & {
    digits?: number
    locale?: Intl.LocalesArgument
    minimumFractionDigits?: number
    format?: (value: number | null, row: TData) => VNodeChild
  },
): DataGridColumn<TData> {
  const accessorKey = options.accessorKey ?? options.id

  return {
    ...options,
    accessorKey,
    serverField: options.serverField ?? accessorKey,
    align: options.align ?? 'end',
    cell:
      options.cell ??
      (({ row }) => {
        const rawValue = row.getValue(options.id)
        const value = typeof rawValue === 'number' ? rawValue : Number(rawValue)
        const normalizedValue = Number.isFinite(value) ? value : null
        if (options.format) return options.format(normalizedValue, row.original)
        if (normalizedValue === null) return '-'
        return normalizedValue.toLocaleString(options.locale, {
          minimumFractionDigits: options.minimumFractionDigits,
          maximumFractionDigits: options.digits ?? 2,
        }).replace(/[\u00a0\u202f]/g, ' ')
      }),
  } as DataGridColumn<TData>
}

export function createDataGridBooleanSelectColumn<TData extends RowData>(
  options: DataGridBaseColumnFactoryOptions<TData> & {
    trueLabel?: string
    falseLabel?: string
    trueValue?: DataGridFilterOption['value']
    falseValue?: DataGridFilterOption['value']
  },
): DataGridColumn<TData> {
  const accessorKey = options.accessorKey ?? options.id
  const trueLabel = options.trueLabel ?? 'Yes'
  const falseLabel = options.falseLabel ?? 'No'

  return {
    ...options,
    accessorKey,
    serverField: options.serverField ?? accessorKey,
    align: options.align ?? 'center',
    ...createDataGridSelectFilterConfig<TData>([
      { label: falseLabel, value: options.falseValue ?? '0' },
      { label: trueLabel, value: options.trueValue ?? '1' },
    ]),
    cell:
      options.cell ??
      (({ row }) => {
        const value = row.getValue(options.id)
        return value === true || value === 1 || value === '1' ? trueLabel : falseLabel
      }),
  } as DataGridColumn<TData>
}

export function createDataGridEditableDateColumn<TData extends RowData>(
  options: DataGridBaseColumnFactoryOptions<TData> & {
    editable: (row: TData) => boolean
    renderEditor: (row: TData) => VNodeChild
    renderDisplay?: (row: TData) => VNodeChild
    renderTrigger: (context: { row: TData; editable: boolean; display: VNodeChild; field: string }) => VNodeChild
  },
): DataGridColumn<TData> {
  return createDataGridDateColumn<TData>({
    ...options,
    cellClass: options.cellClass ?? (({ row }) => (options.editable(row.original) ? 'data-grid__editable-cell' : '')),
    cell: ({ row }) => {
      const editable = options.editable(row.original)
      const display = options.renderDisplay?.(row.original) ?? String(row.getValue(options.id) ?? '-')
      return options.renderTrigger({
        row: row.original,
        editable,
        display,
        field: options.id,
      })
    },
  })
}

export function createDataGridEditableSelectColumn<TData extends RowData>(
  options: DataGridBaseColumnFactoryOptions<TData> & {
    filterOptions?: DataGridFilterOption[] | DataGridFilterOptionsResolver
    includeEmpty?: boolean
    editable: (row: TData) => boolean
    renderEditor: (row: TData) => VNodeChild
    renderDisplay: (row: TData) => VNodeChild
    renderTrigger: (context: { row: TData; editable: boolean; display: VNodeChild; field: string }) => VNodeChild
  },
): DataGridColumn<TData> {
  const accessorKey = options.accessorKey ?? options.id
  const filterConfig = options.filterOptions
    ? createDataGridSelectFilterConfig<TData>(options.filterOptions, {
        includeEmpty: options.includeEmpty,
      })
    : {}

  return {
    ...options,
    ...filterConfig,
    accessorKey,
    serverField: options.serverField ?? accessorKey,
    cellClass: options.cellClass ?? (({ row }) => (options.editable(row.original) ? 'data-grid__editable-cell' : '')),
    cell: ({ row }) =>
      options.renderTrigger({
        row: row.original,
        editable: options.editable(row.original),
        display: options.renderDisplay(row.original),
        field: options.id,
      }),
  } as DataGridColumn<TData>
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

export function createDataGridCommentsColumn<TData extends RowData>({ id = 'comments', accessorKey = 'comments', header = 'Comments', size = 260, serverField = accessorKey, textClass = 'data-grid__comments-cell-text', cellClass = 'data-grid__clickable-cell', renderPreview, onOpen }: DataGridCommentsColumnOptions<TData>): DataGridColumn<TData> {
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
