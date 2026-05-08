import {
  defineComponent,
  onBeforeUnmount,
  ref,
  watch,
  type PropType,
} from 'vue'

import DataGridSelectFilterMenu from '../select/DataGridSelectFilterMenu'
import type { DataGridFilterConfig, DataGridFilterOption } from '../../types'

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
    optionsLoading: {
      type: Boolean,
      default: false,
    },
    allOptions: {
      type: Array as PropType<DataGridFilterOption[]>,
      default: () => [],
    },
    searchValue: {
      type: String,
      default: '',
    },
    textMode: {
      type: Boolean,
      default: false,
    },
    pending: {
      type: Boolean,
      default: false,
    },
    draftInputDebounceMs: {
      type: Number,
      default: 0,
    },
    selectMenuTeleport: {
      type: Boolean,
      default: true,
    },
    onToggleMenu: {
      type: Function as PropType<(event: MouseEvent) => void>,
      default: undefined,
    },
    onInput: {
      type: Function as PropType<(value: string) => void>,
      default: undefined,
    },
    onDraftInput: {
      type: Function as PropType<(value: string) => void>,
      default: undefined,
    },
    onSearchChange: {
      type: Function as PropType<(value: string) => void>,
      default: undefined,
    },
    onApplySelectFilter: {
      type: Function as PropType<
        (value: string | DataGridFilterOption['value'][], textMode: boolean) => void
      >,
      default: undefined,
    },
    onCommitSelectFilterDraft: {
      type: Function as PropType<
        (value: string | DataGridFilterOption['value'][], textMode: boolean) => void
      >,
      default: undefined,
    },
    onCancelSelectFilter: {
      type: Function as PropType<() => void>,
      default: undefined,
    },
    onResetDraftFilter: {
      type: Function as PropType<() => void>,
      default: undefined,
    },
  },
  setup(props) {
    const triggerRef = ref<HTMLButtonElement | null>(null)
    const draftValue = ref(props.inputValue)
    let draftInputTimer: ReturnType<typeof setTimeout> | undefined

    watch(
      () => props.inputValue,
      (value) => {
        if (draftInputTimer) {
          return
        }

        draftValue.value = value
      },
    )

    onBeforeUnmount(() => {
      if (draftInputTimer) {
        clearTimeout(draftInputTimer)
      }
    })

    const flushDraftInputValue = () => {
      if (draftInputTimer) {
        clearTimeout(draftInputTimer)
        draftInputTimer = undefined
      }

      props.onDraftInput?.(draftValue.value)
    }

    const scheduleDraftInputValue = () => {
      if (draftInputTimer) {
        clearTimeout(draftInputTimer)
        draftInputTimer = undefined
      }

      if (props.draftInputDebounceMs <= 0) {
        props.onDraftInput?.(draftValue.value)
        return
      }

      draftInputTimer = setTimeout(() => {
        draftInputTimer = undefined
        props.onDraftInput?.(draftValue.value)
      }, props.draftInputDebounceMs)
    }

    const commitInputValue = () => {
      flushDraftInputValue()
      props.onInput?.(draftValue.value)
    }

    const resetInputValue = () => {
      if (draftInputTimer) {
        clearTimeout(draftInputTimer)
        draftInputTimer = undefined
      }

      draftValue.value = props.inputValue
      props.onDraftInput?.(props.inputValue)
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
                props.selectedCount > 0 || (props.textMode && draftValue.value)
                  ? 'data-grid__filter-select-trigger--active'
                  : '',
                props.pending ? 'data-grid__filter-select-trigger--pending' : '',
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
                allOptions={props.allOptions}
                visibleOptions={props.visibleOptions}
                optionsLoading={props.optionsLoading}
                selectedValueKeys={props.selectedValueKeys ?? new Set<string>()}
                triggerRef={triggerRef}
                teleport={props.selectMenuTeleport}
                textMode={props.textMode}
                textValue={draftValue.value}
                onSearchChange={(value) => props.onSearchChange?.(value)}
                onApply={(value, textMode) => props.onApplySelectFilter?.(value, textMode)}
                onCommit={(value, textMode) => props.onCommitSelectFilterDraft?.(value, textMode)}
                onCancel={() => props.onCancelSelectFilter?.()}
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
            props.pending ? 'data-grid__filter-input--pending' : '',
          ]}
          value={draftValue.value}
          placeholder={props.config.placeholder ?? 'Filtr'}
          onInput={(event) => {
            draftValue.value = (event.target as HTMLInputElement).value
            scheduleDraftInputValue()
          }}
          onBlur={flushDraftInputValue}
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
