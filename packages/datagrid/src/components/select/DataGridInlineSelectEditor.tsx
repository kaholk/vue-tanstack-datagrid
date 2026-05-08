import {
  computed,
  defineComponent,
  ref,
  watch,
  type PropType,
} from 'vue'

import DataGridDropdownMenu from '../menus/DataGridDropdownMenu'
import DataGridSelectMenuContent, {
  toDataGridSelectOptionKey,
} from './DataGridSelectMenuContent'
import type { DataGridFilterOption, DataGridFilterOptionValue } from '../../types'

export default defineComponent({
  name: 'DataGridInlineSelectEditor',
  props: {
    modelValue: {
      type: [String, Number, Array, null] as PropType<
        DataGridFilterOptionValue | DataGridFilterOptionValue[]
      >,
      default: null,
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
    cancelLabel: {
      type: String,
      default: 'Anuluj',
    },
    saveLabel: {
      type: String,
      default: 'Zapisz',
    },
    minMenuWidth: {
      type: Number,
      default: 180,
    },
    minMenuHeight: {
      type: Number,
      default: 280,
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
    const draftValue = ref<DataGridFilterOptionValue | DataGridFilterOptionValue[]>(
      Array.isArray(props.modelValue) ? [...props.modelValue] : (props.modelValue ?? null),
    )

    watch(
      () => props.modelValue,
      (value) => {
        draftValue.value = Array.isArray(value) ? [...value] : (value ?? null)
      },
      { deep: true },
    )

    const normalizedSelectedValues = computed(() =>
      props.multiple
        ? Array.isArray(draftValue.value)
          ? draftValue.value
          : []
        : [draftValue.value as DataGridFilterOptionValue],
    )
    const selectedValueKeys = computed(
      () => new Set(normalizedSelectedValues.value.map((value) => toDataGridSelectOptionKey(value))),
    )

    function getSelectedCount() {
      return props.multiple
        ? Array.isArray(draftValue.value)
          ? draftValue.value.length
          : 0
        : draftValue.value === null || draftValue.value === undefined || draftValue.value === ''
          ? 0
          : 1
    }

    function getTriggerLabel() {
      if (props.multiple) {
        const selectedValues = Array.isArray(draftValue.value) ? draftValue.value : []
        if (selectedValues.length === 0) {
          return props.emptyLabel
        }

        if (selectedValues.length === 1) {
          const selectedOption = props.options.find(
            (option) =>
              toDataGridSelectOptionKey(option.value) ===
              toDataGridSelectOptionKey(selectedValues[0] ?? null),
          )
          return selectedOption?.label ?? String(selectedValues[0])
        }

        return `${selectedValues.length} wybrane`
      }

      const singleValue = Array.isArray(draftValue.value)
        ? null
        : (draftValue.value ?? null)
      const selectedOption = props.options.find(
        (option) =>
          toDataGridSelectOptionKey(option.value) === toDataGridSelectOptionKey(singleValue),
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
        const currentValues = Array.isArray(draftValue.value) ? draftValue.value : []
        const optionKey = toDataGridSelectOptionKey(optionValue)
        const nextValues = currentValues.filter(
          (value) => toDataGridSelectOptionKey(value) !== optionKey,
        )

        if (!selectedValueKeys.value.has(optionKey)) {
          nextValues.push(optionValue)
        }

        draftValue.value = nextValues
        return
      }

      draftValue.value = optionValue
    }

    function selectAllOptions() {
      if (!props.multiple) {
        return
      }

      draftValue.value = props.options.map((option) => option.value)
    }

    function clearAllOptions() {
      draftValue.value = props.multiple ? [] : null
    }

    function cancelAndClose() {
      draftValue.value = Array.isArray(props.modelValue) ? [...props.modelValue] : (props.modelValue ?? null)
      props.onClose?.()
    }

    function saveAndClose() {
      props.onUpdateModelValue(draftValue.value)
      props.onClose?.()
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
            cancelAndClose()
          }}
        >
          <span class="data-grid__filter-select-label">{getTriggerLabel()}</span>
          <span class="data-grid__filter-select-count">
            {getSelectedCount() > 0 ? String(getSelectedCount()) : ''}
          </span>
        </button>
        <DataGridDropdownMenu
          triggerRef={triggerRef}
          teleport
          menuClass="data-grid__filter-select-menu"
          scopeAttr="data-grid-filter-root"
          minWidth={props.minMenuWidth}
          desiredHeight={props.minMenuHeight + 132 + (props.multiple ? 40 : 0)}
          minAvailableHeight={180}
          chromeHeight={132 + (props.multiple ? 40 : 0)}
          minOptionsHeight={props.minMenuHeight}
          maxOptionsHeightMin={96}
          zIndex={props.zIndex}
          optionsMaxHeightVar="--data-grid-filter-select-options-max-height"
          optionsMinHeightVar="--data-grid-filter-select-options-min-height"
          outsideClickRootAttr="data-grid-inline-select-root"
          onOutsidePointerDown={cancelAndClose}
        >
          <DataGridSelectMenuContent
            searchValue={searchValue.value}
            searchPlaceholder={props.searchPlaceholder}
            options={visibleOptions.value}
            selectedValueKeys={selectedValueKeys.value}
            multiple={props.multiple}
            optionName="data-grid-inline-select-single"
            inlineRootAttr="data-grid-inline-select-root"
            showActions={props.multiple}
            actionsIconOnly
            selectAllLabel={props.selectAllLabel}
            clearLabel={props.clearLabel}
            showFooter
            cancelLabel={props.cancelLabel}
            saveLabel={props.saveLabel}
            onSearchChange={(value) => {
              searchValue.value = value
            }}
            onSelectAll={selectAllOptions}
            onClearAll={clearAllOptions}
            onToggleValue={(optionValue) => toggleOption(optionValue)}
            onCancel={cancelAndClose}
            onSave={saveAndClose}
          />
        </DataGridDropdownMenu>
      </div>
    )
  },
})
