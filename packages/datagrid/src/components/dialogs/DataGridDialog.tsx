import { defineComponent, type PropType } from 'vue'

export default defineComponent({
  name: 'DataGridDialog',
  props: {
    title: {
      type: String,
      required: true,
    },
    subtitle: {
      type: String,
      default: '',
    },
    ariaLabel: {
      type: String,
      required: true,
    },
    surfaceClass: {
      type: [String, Array] as PropType<string | string[]>,
      default: '',
    },
    closeLabel: {
      type: String,
      default: 'Close',
    },
    persistent: {
      type: Boolean,
      default: true,
    },
    onClose: {
      type: Function as PropType<() => void>,
      required: true,
    },
  },
  setup(props, { slots }) {
    return () => (
      <div
        class="data-grid__dialog-backdrop"
        data-grid-dialog-root="true"
        onClick={() => {
          if (!props.persistent) {
            props.onClose()
          }
        }}
      >
        <div
          class={['data-grid__dialog', props.surfaceClass]}
          role="dialog"
          aria-modal="true"
          aria-label={props.ariaLabel}
          data-grid-dialog-root="true"
          onClick={(event) => event.stopPropagation()}
        >
          <div class="data-grid__dialog-header">
            <div>
              <h4 class="data-grid__dialog-title">{props.title}</h4>
              {props.subtitle ? <p class="data-grid__dialog-subtitle">{props.subtitle}</p> : null}
            </div>
            <button type="button" class="data-grid__dialog-close" onClick={props.onClose}>
              {props.closeLabel}
            </button>
          </div>

          {slots.default?.()}
          {slots.footer ? <div class="data-grid__dialog-footer">{slots.footer()}</div> : null}
        </div>
      </div>
    )
  },
})
