import {
  computed,
  defineComponent,
  nextTick,
  onBeforeUnmount,
  onMounted,
  ref,
  watch,
  type PropType,
} from 'vue'

import DataGridDropdownMenu from '../menus/DataGridDropdownMenu'
import DataGridSelectMenuContent, {
  toDataGridSelectOptionKey,
} from './DataGridSelectMenuContent'

export type DataGridAsyncSelectOption = {
  label: string
  value: string | number | null
  description?: string
}

export default defineComponent({
  name: 'DataGridInlineAsyncSelectEditor',
  props: {
    modelValue: {
      type: [String, Number] as PropType<string | number | null>,
      default: null,
    },
    emptyLabel: {
      type: String,
      default: 'Wybierz',
    },
    searchPlaceholder: {
      type: String,
      default: 'Szukaj',
    },
    loadingLabel: {
      type: String,
      default: 'Ladowanie...',
    },
    noOptionsLabel: {
      type: String,
      default: 'Brak wynikow',
    },
    clearLabel: {
      type: String,
      default: 'Wyczysc',
    },
    minMenuWidth: {
      type: Number,
      default: 260,
    },
    zIndex: {
      type: Number,
      default: 500,
    },
    searchDebounceMs: {
      type: Number,
      default: 250,
    },
    cacheOptions: {
      type: Boolean,
      default: true,
    },
    loadOptions: {
      type: Function as PropType<(query: string) => Promise<DataGridAsyncSelectOption[]>>,
      required: true,
    },
    loadSelectedOption: {
      type: Function as PropType<
        (value: string | number) => Promise<DataGridAsyncSelectOption | null>
      >,
      default: undefined,
    },
    onUpdateModelValue: {
      type: Function as PropType<
        (value: string | number | null, option?: DataGridAsyncSelectOption | null) => void
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
    const searchRef = ref<HTMLInputElement | null>(null)
    const searchValue = ref('')
    const loading = ref(false)
    const options = ref<DataGridAsyncSelectOption[]>([])
    const selectedOption = ref<DataGridAsyncSelectOption | null>(null)
    const requestId = ref(0)
    let searchTimer: ReturnType<typeof window.setTimeout> | null = null
    const optionsCache = new Map<string, DataGridAsyncSelectOption[]>()
    const selectedOptionCache = new Map<string, DataGridAsyncSelectOption | null>()

    const mergedOptions = computed(() => {
      if (!selectedOption.value) {
        return options.value
      }

      return options.value.some((option) => option.value === selectedOption.value?.value)
        ? options.value
        : [selectedOption.value, ...options.value]
    })

    const triggerLabel = computed(() => {
      if (selectedOption.value?.label) {
        return selectedOption.value.label
      }

      return props.emptyLabel
    })
    const selectedValueKeys = computed(() =>
      props.modelValue === null || props.modelValue === undefined || props.modelValue === ''
        ? new Set<string>()
        : new Set([toDataGridSelectOptionKey(props.modelValue)]),
    )

    async function runSearch(query: string) {
      const currentRequestId = ++requestId.value
      const cacheKey = query.trim()

      if (props.cacheOptions && optionsCache.has(cacheKey)) {
        options.value = optionsCache.get(cacheKey) ?? []
        loading.value = false
        return
      }

      loading.value = true

      try {
        const result = await props.loadOptions(cacheKey)
        if (currentRequestId !== requestId.value) {
          return
        }

        if (props.cacheOptions) {
          optionsCache.set(cacheKey, result)
        }
        options.value = result
      } finally {
        if (currentRequestId === requestId.value) {
          loading.value = false
        }
      }
    }

    function scheduleSearch(query: string) {
      if (searchTimer !== null) {
        window.clearTimeout(searchTimer)
      }

      searchTimer = window.setTimeout(() => {
        void runSearch(query)
      }, Math.max(0, props.searchDebounceMs))
    }

    function clearValue() {
      selectedOption.value = null
      searchValue.value = ''
      props.onUpdateModelValue(null, null)
      props.onClose?.()
    }

    function selectOption(optionValue: string | number | null) {
      const selected = mergedOptions.value.find(
        (option) =>
          toDataGridSelectOptionKey(option.value) === toDataGridSelectOptionKey(optionValue),
      ) ?? null

      selectedOption.value = selected
      props.onUpdateModelValue(optionValue, selected)
      props.onClose?.()
    }

    async function ensureSelectedOption() {
      if (
        props.modelValue === null ||
        props.modelValue === undefined ||
        props.modelValue === '' ||
        !props.loadSelectedOption
      ) {
        selectedOption.value = null
        return
      }

      const cacheKey = String(props.modelValue)
      if (props.cacheOptions && selectedOptionCache.has(cacheKey)) {
        selectedOption.value = selectedOptionCache.get(cacheKey) ?? null
        return
      }

      const loadedOption = await props.loadSelectedOption(props.modelValue)
      if (props.cacheOptions) {
        selectedOptionCache.set(cacheKey, loadedOption)
      }
      selectedOption.value = loadedOption
    }

    onMounted(() => {
      void ensureSelectedOption()
      void runSearch('')
      void nextTick(() => searchRef.value?.focus())
    })

    onBeforeUnmount(() => {
      if (searchTimer !== null) {
        window.clearTimeout(searchTimer)
      }
    })

    watch(
      () => props.modelValue,
      () => {
        void ensureSelectedOption()
      },
    )

    return () => (
      <div class="data-grid__filter-select" data-grid-inline-select-root="true">
        <button
          ref={triggerRef}
          type="button"
          class={[
            'data-grid__filter-select-trigger',
            'data-grid__filter-select-trigger--active',
          ]}
          onClick={(event) => {
            event.stopPropagation()
            props.onClose?.()
          }}
        >
          <span class="data-grid__filter-select-label">{triggerLabel.value}</span>
        </button>
        <DataGridDropdownMenu
          triggerRef={triggerRef}
          teleport
          menuClass="data-grid__filter-select-menu"
          scopeAttr="data-grid-filter-root"
          minWidth={props.minMenuWidth}
          desiredHeight={320}
          minAvailableHeight={160}
          chromeHeight={72}
          maxOptionsHeightMin={88}
          zIndex={props.zIndex}
          menuMaxHeightVar="--data-grid-filter-select-menu-max-height"
          optionsMaxHeightVar="--data-grid-filter-select-options-max-height"
          optionsMinHeightVar="--data-grid-filter-select-options-min-height"
          outsideClickRootAttr="data-grid-inline-select-root"
          onOutsidePointerDown={() => props.onClose?.()}
        >
          <DataGridSelectMenuContent
            searchInputRef={searchRef}
            searchValue={searchValue.value}
            searchPlaceholder={props.searchPlaceholder}
            options={mergedOptions.value}
            selectedValueKeys={selectedValueKeys.value}
            multiple={false}
            optionName="data-grid-inline-async-select-single"
            inlineRootAttr="data-grid-inline-select-root"
            showActions
            showFooter={false}
            clearLabel={props.clearLabel}
            emptyLabel={props.noOptionsLabel}
            loading={loading.value}
            loadingLabel={props.loadingLabel}
            onSearchChange={(value) => {
              searchValue.value = value
              scheduleSearch(value)
            }}
            onClearAll={clearValue}
            onToggleValue={(optionValue, checked) => {
              if (checked) {
                selectOption(optionValue)
              }
            }}
          />
        </DataGridDropdownMenu>
      </div>
    )
  },
})
