import { defineComponent, type CSSProperties, type PropType, type VNodeChild } from 'vue'
import { type Cell, type Column, type Row } from '@tanstack/vue-table'
import type { DataGridColumn } from '../types'

type AnyRow = Record<string, unknown>
type SelectionPreviewMode = 'select' | 'deselect' | 'toggle' | null

type RenderedRowSequenceItem =
  | { type: 'spacer'; key: string; width: number }
  | { type: 'item'; key: string; item: Column<AnyRow, unknown>; column: Column<AnyRow, unknown> }

export default defineComponent({
  name: 'DataGridBodyRow',
  props: {
    row: {
      type: Object as PropType<Row<AnyRow>>,
      required: true,
    },
    rowStart: {
      type: Number,
      required: true,
    },
    rowSize: {
      type: Number,
      required: true,
    },
    rowSequence: {
      type: Array as PropType<RenderedRowSequenceItem[]>,
      required: true,
    },
    visibleColumnIndexById: {
      type: Object as PropType<Map<string, number>>,
      required: true,
    },
    cellStylesByColumnId: {
      type: Object as PropType<Map<string, CSSProperties>>,
      required: true,
    },
    getPinnedSide: {
      type: Function as PropType<(columnId: string) => 'left' | 'right' | false>,
      required: true,
    },
    renderCell: {
      type: Function as PropType<(cell: Cell<AnyRow, unknown>) => VNodeChild>,
      required: true,
    },
    isSelectionPreviewed: {
      type: Boolean,
      default: false,
    },
    isSelectionRevertPreviewed: {
      type: Boolean,
      default: false,
    },
    enableCellSelection: {
      type: Boolean,
      default: true,
    },
    isCellSelected: {
      type: Function as PropType<(cell: Cell<AnyRow, unknown>) => boolean>,
      default: undefined,
    },
    isCellSelectionHovered: {
      type: Function as PropType<(cell: Cell<AnyRow, unknown>) => boolean>,
      default: undefined,
    },
    getCellSelectionPreviewMode: {
      type: Function as PropType<(cell: Cell<AnyRow, unknown>) => SelectionPreviewMode>,
      default: undefined,
    },
    onCellSelectionPointerEnter: {
      type: Function as PropType<(cell: Cell<AnyRow, unknown>, event: PointerEvent) => void>,
      default: undefined,
    },
    onCellSelectionPointerLeave: {
      type: Function as PropType<(cell: Cell<AnyRow, unknown>, event: PointerEvent) => void>,
      default: undefined,
    },
    onCellSelectionClick: {
      type: Function as PropType<(cell: Cell<AnyRow, unknown>, event: MouseEvent) => boolean | void>,
      default: undefined,
    },
  },
  setup(props) {
    return () => {
      const row = props.row
      const isSelected = row.getIsSelected()
      const visibleCells = row.getVisibleCells()
      const preventNativeCellSelection = (event: MouseEvent | PointerEvent) => {
        if (!event.ctrlKey && !event.shiftKey && !event.altKey) {
          return
        }

        event.preventDefault()
        event.stopPropagation()
        window.getSelection()?.removeAllRanges()
      }

      return (
        <div
          class={[
            'data-grid__row',
            isSelected ? 'data-grid__row--selected' : '',
            !isSelected && props.isSelectionPreviewed ? 'data-grid__row--selection-preview' : '',
            isSelected && props.isSelectionRevertPreviewed ? 'data-grid__row--selection-revert-preview' : '',
          ]}
          aria-selected={isSelected ? 'true' : 'false'}
          style={{
            height: `${props.rowSize}px`,
            transform: `translateY(${props.rowStart}px)`,
          }}
        >
          {props.rowSequence.map((entry) => {
            if (entry.type === 'spacer') {
              return (
                <div
                  key={entry.key}
                  class="data-grid__cell-spacer"
                  style={{ width: `${entry.width}px` }}
                />
              )
            }

            const cellIndex = props.visibleColumnIndexById.get(entry.column.id)
            const cell = typeof cellIndex === 'number' ? visibleCells[cellIndex] : undefined
            if (!cell) {
              return null
            }

            const pinnedSide = props.getPinnedSide(entry.column.id)
            const columnDef = entry.column.columnDef as DataGridColumn<AnyRow>
            const customCellClass =
              typeof columnDef.cellClass === 'function'
                ? columnDef.cellClass({ cell, row })
                : columnDef.cellClass
            const isCellSelected = props.enableCellSelection
              ? (props.isCellSelected?.(cell) ?? false)
              : false
            const isCellSelectionHovered = props.enableCellSelection
              ? (props.isCellSelectionHovered?.(cell) ?? false)
              : false
            const cellSelectionPreviewMode = props.enableCellSelection
              ? (props.getCellSelectionPreviewMode?.(cell) ?? null)
              : null
            const isCellSelectionAddPreviewed =
              !isCellSelected &&
              (cellSelectionPreviewMode === 'select' || cellSelectionPreviewMode === 'toggle')
            const isCellSelectionRevertPreviewed =
              isCellSelected &&
              (cellSelectionPreviewMode === 'deselect' || cellSelectionPreviewMode === 'toggle')
            const cellSelectionHandlers = props.enableCellSelection
              ? ({
                  onPointerenter: (event: PointerEvent) => {
                    props.onCellSelectionPointerEnter?.(cell, event)
                  },
                  onPointerleave: (event: PointerEvent) => {
                    props.onCellSelectionPointerLeave?.(cell, event)
                  },
                  onPointerdownCapture: preventNativeCellSelection,
                  onMousedownCapture: preventNativeCellSelection,
                  onClickCapture: (event: MouseEvent) => {
                    if (props.onCellSelectionClick?.(cell, event)) {
                      event.preventDefault()
                      event.stopPropagation()
                    }
                  },
                } as Record<string, unknown>)
              : {}

            return (
              <div
                key={cell.id}
                class={[
                  'data-grid__cell',
                  pinnedSide ? 'data-grid__cell--pinned' : '',
                  pinnedSide ? `data-grid__cell--${pinnedSide}` : '',
                  isCellSelected ? 'data-grid__cell--selected-cell' : '',
                  isCellSelected && isCellSelectionHovered
                    ? 'data-grid__cell--selection-revert-hover'
                    : '',
                  isCellSelectionRevertPreviewed
                    ? 'data-grid__cell--selection-revert-preview'
                    : '',
                  isCellSelectionAddPreviewed
                    ? 'data-grid__cell--selection-range-preview'
                    : '',
                  !isCellSelected && isCellSelectionHovered
                    ? 'data-grid__cell--selection-hover'
                    : '',
                  customCellClass ?? '',
                ]}
                data-grid-column-id={entry.column.id}
                style={props.cellStylesByColumnId.get(entry.column.id)}
                {...cellSelectionHandlers}
                onClick={(event) => {
                  if (props.enableCellSelection && props.onCellSelectionClick?.(cell, event)) {
                    return
                  }

                  columnDef.onCellClick?.({ cell, row, event })
                }}
              >
                {props.renderCell(cell)}
              </div>
            )
          })}
        </div>
      )
    }
  },
})
