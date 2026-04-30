import { defineComponent, type CSSProperties, type PropType, type VNodeChild } from 'vue'
import { type Cell, type Column, type Row } from '@tanstack/vue-table'
import type { DataGridColumn } from '../types'

type AnyRow = Record<string, unknown>

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
    isCellSelected: {
      type: Function as PropType<(cell: Cell<AnyRow, unknown>) => boolean>,
      default: undefined,
    },
    isCellSelectionHovered: {
      type: Function as PropType<(cell: Cell<AnyRow, unknown>) => boolean>,
      default: undefined,
    },
    isCellSelectionRangePreviewed: {
      type: Function as PropType<(cell: Cell<AnyRow, unknown>) => boolean>,
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

      return (
        <div
          class={[
            'data-grid__row',
            isSelected ? 'data-grid__row--selected' : '',
            !isSelected && props.isSelectionPreviewed ? 'data-grid__row--selection-preview' : '',
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
            const isCellSelected = props.isCellSelected?.(cell) ?? false
            const isCellSelectionHovered = props.isCellSelectionHovered?.(cell) ?? false
            const isCellSelectionRangePreviewed =
              props.isCellSelectionRangePreviewed?.(cell) ?? false
            const preventNativeCellSelection = (event: MouseEvent | PointerEvent) => {
              if (!event.ctrlKey && !event.shiftKey) {
                return
              }

              event.preventDefault()
              event.stopPropagation()
              window.getSelection()?.removeAllRanges()
            }

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
                  isCellSelected && isCellSelectionRangePreviewed
                    ? 'data-grid__cell--selection-revert-preview'
                    : '',
                  !isCellSelected && isCellSelectionRangePreviewed
                    ? 'data-grid__cell--selection-range-preview'
                    : '',
                  !isCellSelected && isCellSelectionHovered
                    ? 'data-grid__cell--selection-hover'
                    : '',
                  customCellClass ?? '',
                ]}
                data-grid-column-id={entry.column.id}
                style={props.cellStylesByColumnId.get(entry.column.id)}
                onPointerenter={(event) => {
                  props.onCellSelectionPointerEnter?.(cell, event)
                }}
                onPointerleave={(event) => {
                  props.onCellSelectionPointerLeave?.(cell, event)
                }}
                {...({
                  onPointerdownCapture: preventNativeCellSelection,
                  onMousedownCapture: preventNativeCellSelection,
                  onClickCapture: (event: MouseEvent) => {
                    if (props.onCellSelectionClick?.(cell, event)) {
                      event.preventDefault()
                      event.stopPropagation()
                    }
                  },
                } as Record<string, unknown>)}
                onClick={(event) => {
                  if (props.onCellSelectionClick?.(cell, event)) {
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
