import { defineComponent, ref, watch, type PropType } from 'vue'

type ValidationRule = {
  validate: (value: number) => boolean
  message: string
}

function isIntegerString(value: string) {
  return /^\d+$/.test(value)
}

export default defineComponent({
  name: 'DataGridValidatedNumberInput',
  props: {
    modelValue: {
      type: Number,
      required: true,
    },
    min: {
      type: Number as PropType<number | undefined>,
      default: undefined,
    },
    max: {
      type: Number as PropType<number | undefined>,
      default: undefined,
    },
    rules: {
      type: Array as PropType<ValidationRule[]>,
      default: () => [],
    },
    required: {
      type: Boolean,
      default: true,
    },
    onCommit: {
      type: Function as PropType<(value: number) => void>,
      required: true,
    },
  },
  setup(props) {
    const rawValue = ref(String(props.modelValue))
    const errorMessage = ref('')

    watch(
      () => props.modelValue,
      (value) => {
        rawValue.value = String(value)
        errorMessage.value = ''
      },
    )

    function validateValue(value: string) {
      const trimmedValue = value.trim()

      if (!trimmedValue) {
        return props.required ? 'To pole jest wymagane.' : ''
      }

      if (!isIntegerString(trimmedValue)) {
        return 'Wpisz liczbe calkowita.'
      }

      const parsedValue = Number(trimmedValue)

      if (typeof props.min === 'number' && parsedValue < props.min) {
        return `Minimalna wartosc to ${props.min}.`
      }

      if (typeof props.max === 'number' && parsedValue > props.max) {
        return `Maksymalna wartosc to ${props.max}.`
      }

      for (const rule of props.rules) {
        if (!rule.validate(parsedValue)) {
          return rule.message
        }
      }

      return ''
    }

    function commitValue() {
      const nextErrorMessage = validateValue(rawValue.value)
      errorMessage.value = nextErrorMessage

      if (nextErrorMessage) {
        rawValue.value = String(props.modelValue)
        errorMessage.value = ''
        return
      }

      const parsedValue = Number(rawValue.value.trim())
      props.onCommit(parsedValue)
      rawValue.value = String(parsedValue)
    }

    return () => (
      <div class="data-grid__validated-number">
        <input
          type="text"
          inputmode="numeric"
          class={[
            'data-grid__dialog-input',
            errorMessage.value ? 'data-grid__dialog-input--invalid' : '',
          ]}
          value={rawValue.value}
          aria-invalid={errorMessage.value ? 'true' : 'false'}
          onInput={(event) => {
            rawValue.value = (event.target as HTMLInputElement).value
            errorMessage.value = validateValue(rawValue.value)
          }}
          onBlur={commitValue}
          onKeydown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault()
              commitValue()
            }
          }}
        />
        {errorMessage.value ? (
          <span class="data-grid__dialog-input-error">{errorMessage.value}</span>
        ) : null}
      </div>
    )
  },
})
