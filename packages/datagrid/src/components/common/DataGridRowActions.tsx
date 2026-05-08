import { defineComponent, type PropType } from 'vue'
import type { DataGridRowAction } from '../../types'

export default defineComponent({
  name: 'DataGridRowActions',
  props: {
    row: {
      type: Object as PropType<any>,
      required: true,
    },
    actions: {
      type: Array as PropType<DataGridRowAction<any>[]>,
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
          const actionClass = typeof action.class === 'function' ? action.class(context) : action.class

          return (
            <button
              key={action.id}
              type="button"
              class={[
                'data-grid__toolbar-button',
                'data-grid__toolbar-button--icon-only',
                'data-grid__row-actions-button',
                actionClass,
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
