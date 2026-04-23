import { defineComponent, ref, watch, type PropType } from 'vue'

export default defineComponent({
  name: 'DataGridInlineNumberInput',
  props: {
    modelValue: {
      type: [String, Number] as PropType<string | number | null>,
      default: '',
    },
    type: {
      type: String,
      default: 'number',
    },
    step: {
      type: String,
      default: '1',
    },
    min: {
      type: String,
      default: undefined,
    },
    loading: {
      type: Boolean,
      default: false,
    },
    onUpdateModelValue: {
      type: Function as PropType<(value: string) => void>,
      required: true,
    },
    onClose: {
      type: Function as PropType<() => void>,
      default: undefined,
    },
  },
  setup(props) {
    const localValue = ref(String(props.modelValue ?? ''))

    watch(
      () => props.modelValue,
      (value) => {
        localValue.value = String(value ?? '')
      },
    )

    function submit() {
      props.onUpdateModelValue(localValue.value)
    }

    return () => (
      <input
        class={['data-grid__inline-number-input', props.loading ? 'data-grid__inline-number-input--loading' : '']}
        type={props.type}
        step={props.step}
        min={props.min}
        value={localValue.value}
        autofocus
        onInput={(event) => {
          localValue.value = (event.target as HTMLInputElement).value
        }}
        onBlur={submit}
        onKeydown={(event) => {
          if (event.key === 'Enter') {
            event.preventDefault()
            submit()
          }

          if (event.key === 'Escape') {
            event.preventDefault()
            props.onClose?.()
          }
        }}
      />
    )
  },
})
