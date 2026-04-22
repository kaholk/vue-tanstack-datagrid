import { defineComponent, type CSSProperties, type PropType, type VNodeChild } from 'vue'
import { type Cell, type Column, type Row } from '@tanstack/vue-table'

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
  },
  setup(props) {
    return () => {
      const row = props.row
      const isSelected = row.getIsSelected()
      const visibleCells = row.getVisibleCells()

      return (
        <div
          class={['data-grid__row', isSelected ? 'data-grid__row--selected' : '']}
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

            return (
              <div
                key={cell.id}
                class={[
                  'data-grid__cell',
                  pinnedSide ? 'data-grid__cell--pinned' : '',
                  pinnedSide ? `data-grid__cell--${pinnedSide}` : '',
                ]}
                style={props.cellStylesByColumnId.get(entry.column.id)}
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
