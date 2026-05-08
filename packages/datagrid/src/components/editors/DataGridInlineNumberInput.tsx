import {
  defineComponent,
  nextTick,
  onMounted,
  ref,
  watch,
  type PropType,
} from 'vue'

import DataGridDropdownMenu from '../menus/DataGridDropdownMenu'

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
    decimalSeparator: {
      type: String as PropType<'.' | ',' | 'both'>,
      default: 'both',
    },
    onUpdateModelValue: {
      type: Function as PropType<(value: string) => void>,
      required: true,
    },
    onEnter: {
      type: Function as PropType<(value: string) => void>,
      default: undefined,
    },
    onClose: {
      type: Function as PropType<() => void>,
      default: undefined,
    },
  },
  setup(props) {
    const triggerRef = ref<HTMLButtonElement | null>(null)
    const inputRef = ref<HTMLInputElement | null>(null)
    const localValue = ref(String(props.modelValue ?? ''))

    watch(
      () => props.modelValue,
      (value) => {
        localValue.value = String(value ?? '')
      },
    )

    onMounted(() => {
      nextTick(() => inputRef.value?.focus())
    })

    function normalizeValue(value: string) {
      return props.decimalSeparator === ',' || props.decimalSeparator === 'both'
        ? value.replace(',', '.')
        : value
    }

    function saveAndClose() {
      const normalizedValue = normalizeValue(localValue.value)
      localValue.value = normalizedValue
      props.onUpdateModelValue(normalizedValue)
      if (props.onEnter) {
        props.onEnter(localValue.value)
      }

      props.onClose?.()
    }

    return () => (
      <div class="data-grid__inline-number-input-wrap" data-grid-inline-select-root="true">
        <button
          ref={triggerRef}
          type="button"
          class="data-grid__filter-select-trigger data-grid__filter-select-trigger--active"
          data-grid-inline-select-root="true"
          onClick={(event) => {
            event.stopPropagation()
            props.onClose?.()
          }}
        >
          <span class="data-grid__filter-select-label">{localValue.value || '-'}</span>
        </button>
        <DataGridDropdownMenu
          triggerRef={triggerRef}
          teleport
          menuClass="data-grid__filter-select-menu data-grid__inline-input-menu"
          scopeAttr="data-grid-filter-root"
          minWidth={220}
          desiredHeight={112}
          zIndex={500}
          outsideClickRootAttr="data-grid-inline-select-root"
          onOutsidePointerDown={() => props.onClose?.()}
        >
            <div class="data-grid__inline-input-panel" data-grid-inline-select-root="true">
              <input
                ref={inputRef}
                class={[
                  'data-grid__inline-number-input',
                  props.loading ? 'data-grid__inline-number-input--loading' : '',
                ]}
                type={props.decimalSeparator === ',' || props.decimalSeparator === 'both' ? 'text' : props.type}
                inputmode="decimal"
                step={props.step}
                min={props.min}
                value={localValue.value}
                data-grid-inline-select-root="true"
                onInput={(event) => {
                  localValue.value = (event.target as HTMLInputElement).value.replace(',', '.')
                }}
                onKeydown={(event) => {
                  if (event.key === 'Enter') {
                    event.preventDefault()
                    saveAndClose()
                  }

                  if (event.key === 'Escape') {
                    event.preventDefault()
                    props.onClose?.()
                  }
                }}
              />
              <div class="data-grid__inline-input-actions" data-grid-inline-select-root="true">
                <button
                  type="button"
                  class="data-grid__filter-select-action"
                  data-grid-inline-select-root="true"
                  onClick={(event) => {
                    event.preventDefault()
                    event.stopPropagation()
                    props.onClose?.()
                  }}
                >
                  Anuluj
                </button>
                <button
                  type="button"
                  class="data-grid__filter-select-action data-grid__filter-select-action--primary"
                  data-grid-inline-select-root="true"
                  onClick={(event) => {
                    event.preventDefault()
                    event.stopPropagation()
                    saveAndClose()
                  }}
                >
                  Zapisz
                </button>
              </div>
            </div>
        </DataGridDropdownMenu>
      </div>
    )
  },
})
