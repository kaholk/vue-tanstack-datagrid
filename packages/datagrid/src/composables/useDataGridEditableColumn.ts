import { h, type Ref, type VNodeChild } from 'vue'
import type { RowData } from '@tanstack/vue-table'
import DataGridEditableCellTrigger from '../components/editors/DataGridEditableCellTrigger'
import type { DataGridInlineEditCell } from './useDataGridInlineEdit'

type EditableCellAlign = 'start' | 'center' | 'end'

type RenderInlineEditStatus<TData extends RowData> = (
  content: VNodeChild,
  row: TData,
  field: string,
  opts?: { align?: EditableCellAlign },
) => VNodeChild

export type DataGridEditableColumnOptions<TData extends RowData> = {
  editingCell: Ref<DataGridInlineEditCell | null>
  getRowId?: (row: TData) => string | number
  renderInlineEditStatus?: RenderInlineEditStatus<TData>
}

export type DataGridRenderEditableCellOptions<TData extends RowData> = {
  row: TData
  field: string
  editable: boolean
  title?: string
  align?: EditableCellAlign
  truncate?: boolean
  renderEditor: () => VNodeChild
  renderDisplay: () => VNodeChild
  onStartEditing: (row: TData, field: string) => void
}

export function useDataGridEditableColumn<TData extends RowData>(
  options: DataGridEditableColumnOptions<TData>,
) {
  const getRowId = options.getRowId ?? ((row: TData) => (row as { id?: string | number }).id ?? '')

  const isEditing = (row: TData, field: string) =>
    options.editingCell.value?.id === getRowId(row) && options.editingCell.value?.field === field

  const renderEditableCell = ({
    row,
    field,
    editable,
    title,
    align,
    truncate,
    renderEditor,
    renderDisplay,
    onStartEditing,
  }: DataGridRenderEditableCellOptions<TData>): VNodeChild => {
    if (isEditing(row, field)) {
      return renderEditor()
    }

    const content = h(
      DataGridEditableCellTrigger,
      {
        editable,
        title,
        align,
        truncate,
        onTrigger: () => onStartEditing(row, field),
      },
      { default: renderDisplay },
    )

    return options.renderInlineEditStatus
      ? options.renderInlineEditStatus(content, row, field, align ? { align } : undefined)
      : content
  }

  return {
    isEditing,
    renderEditableCell,
  }
}
