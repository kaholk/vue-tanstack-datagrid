import { h } from 'vue'
import type { Cell, HeaderContext } from '@tanstack/vue-table'
import IconCheckSmallRounded from '~icons/material-symbols/check-small-rounded'

import type { DataGridColumn, DataGridColumnAlign, DataGridRowSelectionConfig } from '../types'

type AnyRow = Record<string, unknown>

type CellRenderProps = {
  table: ReturnType<Cell<AnyRow, unknown>['getContext']>['table']
  column: ReturnType<Cell<AnyRow, unknown>['getContext']>['column']
  row: ReturnType<Cell<AnyRow, unknown>['getContext']>['row']
  cell: ReturnType<Cell<AnyRow, unknown>['getContext']>['cell']
  getValue: ReturnType<Cell<AnyRow, unknown>['getContext']>['getValue']
  renderValue: ReturnType<Cell<AnyRow, unknown>['getContext']>['renderValue']
  align: DataGridColumnAlign
}

export const defaultRowSelectionColumnId = '__select'
export const defaultRowSelectionPreset = 'default'

function renderSelectionCheckbox(
  checked: boolean,
  onToggle: (nextChecked: boolean, event: MouseEvent | KeyboardEvent) => void,
  options?: {
    ariaLabel?: string
    indeterminate?: boolean
    onPointerEnter?: (event: PointerEvent) => void
    onPointerLeave?: (event: PointerEvent) => void
  },
) {
  return h(
    'button',
    {
      type: 'button',
      role: 'checkbox',
      'aria-checked': options?.indeterminate ? 'mixed' : checked ? 'true' : 'false',
      'aria-label': options?.ariaLabel,
      class: ['data-grid__select-checkbox', checked ? 'data-grid__select-checkbox--checked' : '', options?.indeterminate ? 'data-grid__select-checkbox--indeterminate' : ''],
      onClick: (event: MouseEvent) => {
        event.stopPropagation()
        onToggle(!checked, event)
      },
      onKeydown: (event: KeyboardEvent) => {
        if (event.key !== ' ' && event.key !== 'Enter') {
          return
        }

        event.stopPropagation()
        event.preventDefault()
        onToggle(!checked, event)
      },
      onPointerenter: options?.onPointerEnter,
      onPointerleave: options?.onPointerLeave,
    },
    [checked ? h(IconCheckSmallRounded, { class: 'data-grid__select-checkbox-icon' }) : options?.indeterminate ? h('span', { class: 'data-grid__select-checkbox-dash' }) : null],
  )
}

export function buildDataGridRowSelectionColumn(
  config: DataGridRowSelectionConfig<AnyRow>,
  options?: {
    onToggleAll?: (nextChecked: boolean, context: { table: HeaderContext<AnyRow, unknown>['table'] }, event: MouseEvent | KeyboardEvent) => void
    onToggleRow?: (
      nextChecked: boolean,
      context: {
        row: CellRenderProps['row']
        table: CellRenderProps['table']
      },
      event: MouseEvent | KeyboardEvent,
    ) => void
    onPreviewRowSelection?: (
      context: {
        row: CellRenderProps['row']
        table: CellRenderProps['table']
      },
      event: PointerEvent,
    ) => void
    onClearRowSelectionPreview?: () => void
  },
): DataGridColumn<AnyRow> {
  const columnId = config.columnId?.trim() || defaultRowSelectionColumnId
  const columnOverrides = config.column ?? {}
  const preset = config.preset ?? defaultRowSelectionPreset
  const presetColumn: Partial<DataGridColumn<AnyRow>> =
    preset === 'compact-left' || preset === 'compact-right'
      ? {
          size: 44,
          minSize: 44,
          maxSize: 44,
          pickerLabel: 'Select',
        }
      : {
          size: 52,
          minSize: 52,
          maxSize: 52,
          pickerLabel: 'Select',
        }
  const defaultLabel = (typeof columnOverrides.pickerLabel === 'string' && columnOverrides.pickerLabel.trim()) || 'Select'
  const baseColumn: DataGridColumn<AnyRow> = {
    id: columnId,
    ...presetColumn,
    header: defaultLabel,
    align: 'center',
    localKind: 'action',
    enableSorting: false,
    showFilter: false,
    pickerLabel: defaultLabel,
    headerControl: ({ table }) =>
      renderSelectionCheckbox(table.getIsAllPageRowsSelected(), (checked, event) => options?.onToggleAll?.(checked, { table }, event) ?? table.toggleAllPageRowsSelected(checked), {
        ariaLabel: 'Zaznacz wszystkie wiersze na stronie',
        indeterminate: table.getIsSomePageRowsSelected() && !table.getIsAllPageRowsSelected(),
      }),
    cell: ({ row, table }) =>
      renderSelectionCheckbox(row.getIsSelected(), (checked, event) => options?.onToggleRow?.(checked, { row, table }, event) ?? row.toggleSelected(checked), {
        ariaLabel: 'Zaznacz wiersz',
        onPointerEnter: (event) => options?.onPreviewRowSelection?.({ row, table }, event),
        onPointerLeave: () => options?.onClearRowSelectionPreview?.(),
      }),
  }

  return {
    ...baseColumn,
    ...columnOverrides,
    id: columnId,
    localKind: columnOverrides.localKind ?? 'action',
    enableSorting: columnOverrides.enableSorting ?? false,
    showFilter: columnOverrides.showFilter ?? false,
    pickerLabel: columnOverrides.pickerLabel ?? defaultLabel,
    headerControl: columnOverrides.headerControl ?? baseColumn.headerControl,
  }
}
