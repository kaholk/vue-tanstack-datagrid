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
    const triggerRef = ref<HTMLButtonElement | null>(null)
    const inputRef = ref<HTMLInputElement | null>(null)
    const localValue = ref(props.modelValue ?? '')

    watch(
      () => props.modelValue,
      (value) => {
        localValue.value = value ?? ''
      },
    )

    onMounted(() => {
      nextTick(() => inputRef.value?.focus())
    })

    function submitAndClose() {
      props.onUpdateModelValue(localValue.value.trim() === '' ? null : localValue.value)
      props.onClose?.()
    }

    return () => (
      <div class="data-grid__inline-date-input-wrap" data-grid-inline-select-root="true">
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
          <span class="data-grid__filter-select-label">{localValue.value || 'Data'}</span>
        </button>
        <DataGridDropdownMenu
          triggerRef={triggerRef}
          teleport
          menuClass="data-grid__filter-select-menu data-grid__inline-input-menu"
          scopeAttr="data-grid-filter-root"
          minWidth={260}
          desiredHeight={120}
          zIndex={500}
          outsideClickRootAttr="data-grid-inline-select-root"
          onOutsidePointerDown={() => props.onClose?.()}
        >
            <div class="data-grid__inline-input-panel" data-grid-inline-select-root="true">
              <input
                ref={inputRef}
                class="data-grid__inline-date-input"
                type="date"
                value={localValue.value}
                data-grid-inline-select-root="true"
                onInput={(event) => {
                  localValue.value = (event.target as HTMLInputElement).value
                }}
                onKeydown={(event) => {
                  if (event.key === 'Enter') {
                    event.preventDefault()
                    submitAndClose()
                  }

                  if (event.key === 'Escape') {
                    event.preventDefault()
                    props.onClose?.()
                  }
                }}
              />
              <div class="data-grid__inline-input-actions" data-grid-inline-select-root="true">
                {props.clearable ? (
                  <button
                    type="button"
                    class="data-grid__filter-select-action"
                    data-grid-inline-select-root="true"
                    onClick={(event) => {
                      event.preventDefault()
                      event.stopPropagation()
                      localValue.value = ''
                    }}
                  >
                    Wyczyść
                  </button>
                ) : null}
                <button
                  type="button"
                  class="data-grid__filter-select-action data-grid__filter-select-action--primary"
                  data-grid-inline-select-root="true"
                  onClick={(event) => {
                    event.preventDefault()
                    event.stopPropagation()
                    submitAndClose()
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
