import { defineComponent, type CSSProperties, type PropType, type VNodeChild } from 'vue'
import { type Cell, type Column, type Row } from '@tanstack/vue-table'
import type { DataGridColumn } from '../types'
import type { AnyRow, SelectionPreviewMode } from '../types/internal'

type RenderedRowSequenceItem =
  | { type: 'spacer'; key: string; width: number }
  | { type: 'item'; key: string; item: Column<AnyRow, unknown>; column: Column<AnyRow, unknown> }

const baseCellClassName = 'data-grid__cell'
const pinnedCellClassName = 'data-grid__cell--pinned'

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
    const preventNativeCellSelection = (event: MouseEvent | PointerEvent) => {
      if (!event.ctrlKey && !event.shiftKey && !event.altKey) {
        return
      }

      event.preventDefault()
      event.stopPropagation()
      window.getSelection()?.removeAllRanges()
    }
    const nativeCellSelectionHandlers = {
      onPointerdownCapture: preventNativeCellSelection,
      onMousedownCapture: preventNativeCellSelection,
    } as Record<string, unknown>
    const capturedCellSelectionClickEvents = new WeakSet<MouseEvent>()

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
            const baseCellClass = [
              baseCellClassName,
              pinnedSide ? 'data-grid__cell--pinned' : undefined,
              pinnedSide ? `data-grid__cell--${pinnedSide}` : undefined,
              customCellClass,
            ]
            if (!props.enableCellSelection) {
              return (
                <div
                  key={cell.id}
                  class={baseCellClass}
                  data-grid-column-id={entry.column.id}
                  style={props.cellStylesByColumnId.get(entry.column.id)}
                  onClick={columnDef.onCellClick
                    ? (event) => {
                        columnDef.onCellClick?.({ cell, row, event })
                      }
                    : undefined}
                >
                  {props.renderCell(cell)}
                </div>
              )
            }

            const isCellSelected = props.isCellSelected?.(cell) ?? false
            const isCellSelectionHovered = props.isCellSelectionHovered?.(cell) ?? false
            const cellSelectionPreviewMode = props.getCellSelectionPreviewMode?.(cell) ?? null
            const isCellSelectionAddPreviewed =
              !isCellSelected &&
              (cellSelectionPreviewMode === 'select' || cellSelectionPreviewMode === 'toggle')
            const isCellSelectionRevertPreviewed =
              isCellSelected &&
              (cellSelectionPreviewMode === 'deselect' || cellSelectionPreviewMode === 'toggle')
            const cellSelectionClickCaptureHandler = {
              onClickCapture: (event: MouseEvent) => {
                capturedCellSelectionClickEvents.add(event)
                if (props.onCellSelectionClick?.(cell, event)) {
                  event.preventDefault()
                  event.stopPropagation()
                }
              },
            } as Record<string, unknown>
            return (
              <div
                key={cell.id}
                class={[
                  baseCellClassName,
                  pinnedSide ? pinnedCellClassName : undefined,
                  pinnedSide ? `data-grid__cell--${pinnedSide}` : undefined,
                  isCellSelected ? 'data-grid__cell--selected-cell' : undefined,
                  isCellSelected && isCellSelectionHovered
                    ? 'data-grid__cell--selection-revert-hover'
                    : undefined,
                  isCellSelectionRevertPreviewed
                    ? 'data-grid__cell--selection-revert-preview'
                    : undefined,
                  isCellSelectionAddPreviewed
                    ? 'data-grid__cell--selection-range-preview'
                    : undefined,
                  !isCellSelected && isCellSelectionHovered
                    ? 'data-grid__cell--selection-hover'
                    : undefined,
                  customCellClass,
                ]}
                data-grid-column-id={entry.column.id}
                style={props.cellStylesByColumnId.get(entry.column.id)}
                onPointerenter={(event) => {
                  props.onCellSelectionPointerEnter?.(cell, event)
                }}
                onPointerleave={(event) => {
                  props.onCellSelectionPointerLeave?.(cell, event)
                }}
                {...nativeCellSelectionHandlers}
                {...cellSelectionClickCaptureHandler}
                onClick={(event) => {
                  if (capturedCellSelectionClickEvents.has(event)) {
                    capturedCellSelectionClickEvents.delete(event)
                    if (event.defaultPrevented) {
                      return
                    }

                    columnDef.onCellClick?.({ cell, row, event })
                    return
                  }

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
