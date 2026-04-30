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

import DataGridDropdownMenu from './DataGridDropdownMenu'

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
      type: Function as PropType<(value: string | number | null) => void>,
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

    async function runSearch(query: string) {
      const currentRequestId = ++requestId.value
      loading.value = true

      try {
        const result = await props.loadOptions(query)
        if (currentRequestId !== requestId.value) {
          return
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
      }, 250)
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

      selectedOption.value = await props.loadSelectedOption(props.modelValue)
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
          outsideClickRootAttr="data-grid-inline-select-root"
          onOutsidePointerDown={() => props.onClose?.()}
        >
            <div
              class="data-grid__inline-async-select-content"
              data-grid-inline-select-root="true"
            >
              <div class="data-grid__inline-async-select-toolbar" data-grid-inline-select-root="true">
                <input
                  ref={searchRef}
                  class="data-grid__filter-select-search"
                  value={searchValue.value}
                  placeholder={props.searchPlaceholder}
                  data-grid-inline-select-root="true"
                  onClick={(event) => event.stopPropagation()}
                  onInput={(event) => {
                    searchValue.value = (event.target as HTMLInputElement).value
                    scheduleSearch(searchValue.value)
                  }}
                />
                <button
                  type="button"
                  class="data-grid__filter-select-action"
                  data-grid-inline-select-root="true"
                  onClick={(event) => {
                    event.preventDefault()
                    event.stopPropagation()
                    selectedOption.value = null
                    searchValue.value = ''
                    props.onUpdateModelValue(null)
                    props.onClose?.()
                  }}
                >
                  {props.clearLabel}
                </button>
              </div>
              <div class="data-grid__inline-async-select-options" data-grid-inline-select-root="true">
                {loading.value ? (
                  <div class="data-grid__inline-async-select-state" data-grid-inline-select-root="true">
                    {props.loadingLabel}
                  </div>
                ) : null}
                {!loading.value && mergedOptions.value.length === 0 ? (
                  <div class="data-grid__inline-async-select-state" data-grid-inline-select-root="true">
                    {props.noOptionsLabel}
                  </div>
                ) : null}
                {!loading.value
                  ? mergedOptions.value.map((option) => (
                      <button
                        key={String(option.value ?? '__null__')}
                        type="button"
                        class={[
                          'data-grid__inline-async-select-option',
                          option.value === props.modelValue
                            ? 'data-grid__inline-async-select-option--active'
                            : '',
                        ]}
                        data-grid-inline-select-root="true"
                        onClick={() => {
                          props.onUpdateModelValue(option.value)
                          props.onClose?.()
                        }}
                      >
                        <span class="data-grid__inline-async-select-copy">
                          <span class="data-grid__inline-async-select-label">{option.label}</span>
                          {option.description ? (
                            <span class="data-grid__inline-async-select-description">
                              {option.description}
                            </span>
                          ) : null}
                        </span>
                      </button>
                    ))
                  : null}
              </div>
            </div>
        </DataGridDropdownMenu>
      </div>
    )
  },
})
