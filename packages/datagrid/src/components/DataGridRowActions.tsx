import { defineComponent, type PropType } from 'vue'
import type { RowData } from '@tanstack/vue-table'
import type { DataGridRowAction } from '../types'

export default defineComponent({
  name: 'DataGridRowActions',
  props: {
    row: {
      type: Object as PropType<RowData>,
      required: true,
    },
    actions: {
      type: Array as PropType<DataGridRowAction<RowData>[]>,
      required: true,
    },
  },
  setup(props) {
    return () => (
      <div class="data-grid__row-actions">
        {props.actions.map((action) => {
          const context = { row: props.row }
          const disabled =
            typeof action.disabled === 'function'
              ? action.disabled(context)
              : Boolean(action.disabled)

          return (
            <button
              key={action.id}
              type="button"
              class={[
                'data-grid__toolbar-button',
                'data-grid__toolbar-button--icon-only',
                'data-grid__row-actions-button',
                action.class,
              ]}
              title={action.title}
              aria-label={action.ariaLabel ?? action.title}
              disabled={disabled}
              onClick={(event) => {
                event.stopPropagation()
                if (!disabled) {
                  void action.onClick({ row: props.row, event })
                }
              }}
            >
              {action.icon(context)}
            </button>
          )
        })}
      </div>
    )
  },
})
