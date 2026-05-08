import { defineComponent, type CSSProperties, type PropType, type VNodeChild } from 'vue'
import { type Cell, type Column, type Row } from '@tanstack/vue-table'
import type { DataGridColumn } from '../../types'
import type { AnyRow, SelectionPreviewMode } from '../../types/internal'

const baseCellClassName = 'data-grid__cell'
const pinnedCellClassName = 'data-grid__cell--pinned'

export default defineComponent({
  name: 'DataGridBodyCell',
  props: {
    cell: {
      type: Object as PropType<Cell<AnyRow, unknown>>,
      required: true,
    },
    row: {
      type: Object as PropType<Row<AnyRow>>,
      required: true,
    },
    column: {
      type: Object as PropType<Column<AnyRow, unknown>>,
      required: true,
    },
    pinnedSide: {
      type: [String, Boolean] as PropType<'left' | 'right' | false>,
      required: true,
    },
    cellStyle: {
      type: Object as PropType<CSSProperties | undefined>,
      default: undefined,
    },
    renderCell: {
      type: Function as PropType<(cell: Cell<AnyRow, unknown>) => VNodeChild>,
      required: true,
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
    const capturedCellSelectionClickEvents = new WeakSet<MouseEvent>()

    function preventNativeCellSelection(event: MouseEvent | PointerEvent) {
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
      onClickCapture: handleCellSelectionClickCapture,
    } as Record<string, unknown>

    function handleCellClick(event: MouseEvent) {
      const columnDef = props.column.columnDef as DataGridColumn<AnyRow>

      if (capturedCellSelectionClickEvents.has(event)) {
        capturedCellSelectionClickEvents.delete(event)
        if (event.defaultPrevented) {
          return
        }

        columnDef.onCellClick?.({ cell: props.cell, row: props.row, event })
        return
      }

      if (props.onCellSelectionClick?.(props.cell, event)) {
        return
      }

      columnDef.onCellClick?.({ cell: props.cell, row: props.row, event })
    }

    function handleCellSelectionClickCapture(event: MouseEvent) {
      capturedCellSelectionClickEvents.add(event)
      if (props.onCellSelectionClick?.(props.cell, event)) {
        event.preventDefault()
        event.stopPropagation()
      }
    }

    function handlePointerEnter(event: PointerEvent) {
      props.onCellSelectionPointerEnter?.(props.cell, event)
    }

    function handlePointerLeave(event: PointerEvent) {
      props.onCellSelectionPointerLeave?.(props.cell, event)
    }

    return () => {
      const columnDef = props.column.columnDef as DataGridColumn<AnyRow>
      const customCellClass =
        typeof columnDef.cellClass === 'function'
          ? columnDef.cellClass({ cell: props.cell, row: props.row })
          : columnDef.cellClass

      if (!props.enableCellSelection) {
        return (
          <div
            class={[
              baseCellClassName,
              props.pinnedSide ? pinnedCellClassName : undefined,
              props.pinnedSide ? `data-grid__cell--${props.pinnedSide}` : undefined,
              customCellClass,
            ]}
            data-grid-column-id={props.column.id}
            style={props.cellStyle}
            onClick={columnDef.onCellClick ? handleCellClick : undefined}
          >
            {props.renderCell(props.cell)}
          </div>
        )
      }

      const isCellSelected = props.isCellSelected?.(props.cell) ?? false
      const isCellSelectionHovered = props.isCellSelectionHovered?.(props.cell) ?? false
      const cellSelectionPreviewMode = props.getCellSelectionPreviewMode?.(props.cell) ?? null
      const isCellSelectionAddPreviewed =
        !isCellSelected &&
        (cellSelectionPreviewMode === 'select' || cellSelectionPreviewMode === 'toggle')
      const isCellSelectionRevertPreviewed =
        isCellSelected &&
        (cellSelectionPreviewMode === 'deselect' || cellSelectionPreviewMode === 'toggle')

      return (
        <div
          class={[
            baseCellClassName,
            props.pinnedSide ? pinnedCellClassName : undefined,
            props.pinnedSide ? `data-grid__cell--${props.pinnedSide}` : undefined,
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
          data-grid-column-id={props.column.id}
          style={props.cellStyle}
          onPointerenter={handlePointerEnter}
          onPointerleave={handlePointerLeave}
          {...nativeCellSelectionHandlers}
          onClick={handleCellClick}
        >
          {props.renderCell(props.cell)}
        </div>
      )
    }
  },
})
