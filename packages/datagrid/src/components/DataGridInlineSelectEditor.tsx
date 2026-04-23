import {
  Teleport,
  computed,
  defineComponent,
  onBeforeUnmount,
  onMounted,
  ref,
  type CSSProperties,
  type PropType,
} from 'vue'

import DataGridDropdownMenu from './DataGridDropdownMenu'
import type { DataGridFilterOption, DataGridFilterOptionValue } from '../types'

function toOptionKey(value: DataGridFilterOptionValue) {
  return value === null ? '__data_grid_null__' : String(value)
}

export default defineComponent({
  name: 'DataGridInlineSelectEditor',
  props: {
    modelValue: {
      type: [String, Number, Array] as PropType<
        DataGridFilterOptionValue | DataGridFilterOptionValue[]
      >,
      required: true,
    },
    options: {
      type: Array as PropType<DataGridFilterOption[]>,
      required: true,
    },
    multiple: {
      type: Boolean,
      default: false,
    },
    emptyLabel: {
      type: String,
      default: 'Wybierz',
    },
    searchPlaceholder: {
      type: String,
      default: 'Szukaj opcji',
    },
    selectAllLabel: {
      type: String,
      default: 'Zaznacz wszystko',
    },
    clearLabel: {
      type: String,
      default: 'Wyczysc',
    },
    minMenuWidth: {
      type: Number,
      default: 180,
    },
    zIndex: {
      type: Number,
      default: 500,
    },
    onUpdateModelValue: {
      type: Function as PropType<
        (value: DataGridFilterOptionValue | DataGridFilterOptionValue[]) => void
      >,
      required: true,
    },
    onClose: {
      type: Function as PropType<() => void>,
      default: undefined,
    },
  },
  setup(props) {
    const triggerRef = ref<HTMLButtonElement | null>(null)
    const searchValue = ref('')
    const menuStyle = ref<CSSProperties>({
      position: 'fixed',
      top: '0',
      left: '0',
      width: `${props.minMenuWidth}px`,
      zIndex: props.zIndex,
    })

    const normalizedSelectedValues = computed(() =>
      props.multiple
        ? Array.isArray(props.modelValue)
          ? props.modelValue
          : []
        : [props.modelValue as DataGridFilterOptionValue],
    )
    const selectedValueKeys = computed(
      () => new Set(normalizedSelectedValues.value.map((value) => toOptionKey(value))),
    )

    function updateMenuPosition() {
      const trigger = triggerRef.value
      if (!trigger) {
        return
      }

      const rect = trigger.getBoundingClientRect()
      const desiredWidth = Math.max(rect.width, props.minMenuWidth)
      const viewportWidth = window.innerWidth
      const left = Math.min(rect.left, viewportWidth - desiredWidth - 12)

      menuStyle.value = {
        position: 'fixed',
        top: `${rect.bottom + 4}px`,
        left: `${Math.max(12, left)}px`,
        width: `${desiredWidth}px`,
        zIndex: props.zIndex,
      }
    }

    function handleDocumentPointerDown(event: PointerEvent) {
      const target = event.target
      if (!(target instanceof HTMLElement)) {
        return
      }

      if (target.closest('[data-grid-inline-select-root="true"]')) {
        return
      }

      props.onClose?.()
    }

    onMounted(() => {
      updateMenuPosition()
      window.addEventListener('resize', updateMenuPosition)
      window.addEventListener('scroll', updateMenuPosition, true)
      document.addEventListener('pointerdown', handleDocumentPointerDown)
    })

    onBeforeUnmount(() => {
      window.removeEventListener('resize', updateMenuPosition)
      window.removeEventListener('scroll', updateMenuPosition, true)
      document.removeEventListener('pointerdown', handleDocumentPointerDown)
    })

    function getSelectedCount() {
      return props.multiple
        ? Array.isArray(props.modelValue)
          ? props.modelValue.length
          : 0
        : props.modelValue === null || props.modelValue === undefined || props.modelValue === ''
          ? 0
          : 1
    }

    function getTriggerLabel() {
      if (props.multiple) {
        const selectedValues = Array.isArray(props.modelValue) ? props.modelValue : []
        if (selectedValues.length === 0) {
          return props.emptyLabel
        }

        if (selectedValues.length === 1) {
          const selectedOption = props.options.find(
            (option) => toOptionKey(option.value) === toOptionKey(selectedValues[0] ?? null),
          )
          return selectedOption?.label ?? String(selectedValues[0])
        }

        return `${selectedValues.length} wybrane`
      }

      const singleValue = Array.isArray(props.modelValue)
        ? null
        : (props.modelValue ?? null)
      const selectedOption = props.options.find(
        (option) => toOptionKey(option.value) === toOptionKey(singleValue),
      )
      return selectedOption?.label ?? String(singleValue ?? props.emptyLabel)
    }

    const visibleOptions = computed(() => {
      const searchTerm = searchValue.value.trim().toLocaleLowerCase()
      if (!searchTerm) {
        return props.options
      }

      return props.options.filter((option) => option.label.toLocaleLowerCase().includes(searchTerm))
    })

    function toggleOption(optionValue: DataGridFilterOptionValue) {
      if (props.multiple) {
        const currentValues = Array.isArray(props.modelValue) ? props.modelValue : []
        const optionKey = toOptionKey(optionValue)
        const nextValues = currentValues.filter((value) => toOptionKey(value) !== optionKey)

        if (!selectedValueKeys.value.has(optionKey)) {
          nextValues.push(optionValue)
        }

        props.onUpdateModelValue(nextValues)
        return
      }

      props.onUpdateModelValue(optionValue)
      props.onClose?.()
    }

    function selectAllOptions() {
      if (!props.multiple) {
        return
      }

      props.onUpdateModelValue(props.options.map((option) => option.value))
    }

    function clearAllOptions() {
      props.onUpdateModelValue(props.multiple ? [] : '')

      if (!props.multiple) {
        props.onClose?.()
      }
    }

    return () => (
      <div
        class="data-grid__filter-select"
        data-grid-filter-root="true"
        data-grid-inline-select-root="true"
      >
        <button
          ref={triggerRef}
          type="button"
          class={[
            'data-grid__filter-select-trigger',
            'data-grid__filter-select-trigger--active',
          ]}
          onClick={(event) => {
            event.stopPropagation()
            updateMenuPosition()
          }}
        >
          <span class="data-grid__filter-select-label">{getTriggerLabel()}</span>
          <span class="data-grid__filter-select-count">
            {getSelectedCount() > 0 ? String(getSelectedCount()) : ''}
          </span>
        </button>
        <Teleport to="body">
          <DataGridDropdownMenu
            menuClass="data-grid__filter-select-menu"
            scopeAttr="data-grid-filter-root"
            style={menuStyle.value}
          >
            <div class="data-grid__filter-select-options" data-grid-inline-select-root="true">
              <input
                class="data-grid__filter-select-search"
                value={searchValue.value}
                placeholder={props.searchPlaceholder}
                data-grid-inline-select-root="true"
                onClick={(event) => event.stopPropagation()}
                onInput={(event) => {
                  searchValue.value = (event.target as HTMLInputElement).value
                }}
              />
              {props.multiple ? (
                <div class="data-grid__filter-select-actions" data-grid-inline-select-root="true">
                  <button
                    type="button"
                    class="data-grid__filter-select-action"
                    data-grid-inline-select-root="true"
                    onClick={(event) => {
                      event.stopPropagation()
                      selectAllOptions()
                    }}
                  >
                    {props.selectAllLabel}
                  </button>
                  <button
                    type="button"
                    class="data-grid__filter-select-action"
                    data-grid-inline-select-root="true"
                    onClick={(event) => {
                      event.stopPropagation()
                      clearAllOptions()
                    }}
                  >
                    {props.clearLabel}
                  </button>
                </div>
              ) : null}
              {visibleOptions.value.length > 0 ? (
                visibleOptions.value.map((option) => (
                  <label
                    key={toOptionKey(option.value)}
                    class="data-grid__filter-select-option"
                    data-grid-inline-select-root="true"
                    onClick={(event) => event.stopPropagation()}
                  >
                    <input
                      type="checkbox"
                      checked={selectedValueKeys.value.has(toOptionKey(option.value))}
                      data-grid-inline-select-root="true"
                      onChange={() => toggleOption(option.value)}
                    />
                    <span>{option.label}</span>
                  </label>
                ))
              ) : (
                <div class="data-grid__filter-select-empty" data-grid-inline-select-root="true">
                  Brak opcji
                </div>
              )}
            </div>
          </DataGridDropdownMenu>
        </Teleport>
      </div>
    )
  },
})
