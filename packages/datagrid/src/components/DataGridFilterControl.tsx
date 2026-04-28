import {
  defineComponent,
  ref,
  watch,
  type PropType,
} from 'vue'

import DataGridSelectFilterMenu from './DataGridSelectFilterMenu'
import type { DataGridFilterConfig, DataGridFilterOption } from '../types'

export default defineComponent({
  name: 'DataGridFilterControl',
  props: {
    config: {
      type: Object as PropType<DataGridFilterConfig>,
      required: true,
    },
    isToolbar: {
      type: Boolean,
      default: false,
    },
    isOpen: {
      type: Boolean,
      default: false,
    },
    inputValue: {
      type: String,
      default: '',
    },
    buttonLabel: {
      type: String,
      default: 'Filtr',
    },
    selectedCount: {
      type: Number,
      default: 0,
    },
    selectedValueKeys: {
      type: Object as PropType<Set<string>>,
      default: undefined,
    },
    visibleOptions: {
      type: Array as PropType<DataGridFilterOption[]>,
      default: () => [],
    },
    searchValue: {
      type: String,
      default: '',
    },
    onToggleMenu: {
      type: Function as PropType<(event: MouseEvent) => void>,
      default: undefined,
    },
    onInput: {
      type: Function as PropType<(value: string) => void>,
      default: undefined,
    },
    onSearchChange: {
      type: Function as PropType<(value: string) => void>,
      default: undefined,
    },
    onSelectAll: {
      type: Function as PropType<() => void>,
      default: undefined,
    },
    onClearAll: {
      type: Function as PropType<() => void>,
      default: undefined,
    },
    onToggleValue: {
      type: Function as PropType<
        (optionValue: DataGridFilterOption['value'], checked: boolean) => void
      >,
      default: undefined,
    },
  },
  setup(props) {
    const triggerRef = ref<HTMLButtonElement | null>(null)
    const draftValue = ref(props.inputValue)

    watch(
      () => props.inputValue,
      (value) => {
        draftValue.value = value
      },
    )

    const commitInputValue = () => {
      props.onInput?.(draftValue.value)
    }

    const resetInputValue = () => {
      draftValue.value = props.inputValue
    }

    return () => {
      if (props.config.variant === 'select' || props.config.variant === 'radio') {
        return (
          <div
            class={[
              'data-grid__filter-select',
              props.isToolbar ? 'data-grid__filter-select--toolbar' : '',
            ]}
            data-grid-filter-root="true"
          >
            <button
              ref={triggerRef}
              type="button"
              class={[
                'data-grid__filter-select-trigger',
                props.selectedCount > 0 ? 'data-grid__filter-select-trigger--active' : '',
              ]}
              onClick={(event) => {
                props.onToggleMenu?.(event)
              }}
            >
              <span class="data-grid__filter-select-label">{props.buttonLabel}</span>
              <span class="data-grid__filter-select-count">
                {props.selectedCount > 0 ? String(props.selectedCount) : ''}
              </span>
            </button>
            {props.isOpen ? (
              <DataGridSelectFilterMenu
                config={props.config}
                searchValue={props.searchValue}
                visibleOptions={props.visibleOptions}
                selectedValueKeys={props.selectedValueKeys ?? new Set<string>()}
                triggerRef={triggerRef}
                onSearchChange={(value) => props.onSearchChange?.(value)}
                onSelectAll={() => props.onSelectAll?.()}
                onClearAll={() => props.onClearAll?.()}
                onToggleValue={(optionValue, checked) => props.onToggleValue?.(optionValue, checked)}
              />
            ) : null}
          </div>
        )
      }

      return (
        <input
          class={[
            'data-grid__filter-input',
            props.isToolbar ? 'data-grid__filter-input--toolbar' : '',
          ]}
          value={draftValue.value}
          placeholder={props.config.placeholder ?? 'Filtr'}
          onInput={(event) => {
            draftValue.value = (event.target as HTMLInputElement).value
          }}
          onKeydown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault()
              commitInputValue()
              return
            }

            if (event.key === 'Escape') {
              event.preventDefault()
              resetInputValue()
            }
          }}
        />
      )
    }
  },
})
