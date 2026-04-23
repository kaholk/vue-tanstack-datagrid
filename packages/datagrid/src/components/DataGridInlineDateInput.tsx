import { defineComponent, ref, watch, type PropType } from 'vue'

export default defineComponent({
  name: 'DataGridInlineDateInput',
  props: {
    modelValue: {
      type: String as PropType<string | null>,
      default: null,
    },
    clearable: {
      type: Boolean,
      default: true,
    },
    onUpdateModelValue: {
      type: Function as PropType<(value: string | null) => void>,
      required: true,
    },
    onClose: {
      type: Function as PropType<() => void>,
      default: undefined,
    },
  },
  setup(props) {
    const localValue = ref(props.modelValue ?? '')

    watch(
      () => props.modelValue,
      (value) => {
        localValue.value = value ?? ''
      },
    )

    function submit(value: string) {
      props.onUpdateModelValue(value.trim() === '' ? null : value)
    }

    return () => (
      <div class="data-grid__inline-date-input-wrap" data-grid-inline-select-root="true">
        <input
          class="data-grid__inline-date-input"
          type="date"
          value={localValue.value}
          autofocus
          onInput={(event) => {
            localValue.value = (event.target as HTMLInputElement).value
          }}
          onBlur={() => {
            submit(localValue.value)
          }}
          onKeydown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault()
              submit(localValue.value)
            }

            if (event.key === 'Escape') {
              event.preventDefault()
              props.onClose?.()
            }
          }}
        />
        {props.clearable ? (
          <button
            type="button"
            class="data-grid__inline-date-clear"
            title="Clear"
            onClick={(event) => {
              event.preventDefault()
              event.stopPropagation()
              localValue.value = ''
              props.onUpdateModelValue(null)
            }}
          >
            ×
          </button>
        ) : null}
      </div>
    )
  },
})
