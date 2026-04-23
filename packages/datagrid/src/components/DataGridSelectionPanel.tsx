import { defineComponent, onBeforeUnmount, ref, type PropType } from 'vue'
import IconContentCopyRounded from '~icons/material-symbols/content-copy-rounded'
import IconTableRowsRounded from '~icons/material-symbols/table-rows-rounded'
import IconSettingsRounded from '~icons/material-symbols/settings-rounded'

import type { DataGridSelectionPanelPosition } from '../types'

type SumItem = {
  columnId: string
  label: string
  value: string
}

const positions: DataGridSelectionPanelPosition[] = [
  'bottom-right',
  'bottom-left',
  'top-right',
  'top-left',
]

export default defineComponent({
  name: 'DataGridSelectionPanel',
  props: {
    position: {
      type: String as PropType<DataGridSelectionPanelPosition>,
      required: true,
    },
    selectedRowsCount: {
      type: Number,
      required: true,
    },
    selectedRowsLabel: {
      type: String,
      required: true,
    },
    sums: {
      type: Array as PropType<SumItem[]>,
      required: true,
    },
    copyWithHeadersLabel: {
      type: String,
      required: true,
    },
    copyWithoutHeadersLabel: {
      type: String,
      required: true,
    },
    allowPositionChange: {
      type: Boolean,
      default: true,
    },
    onCopyWithHeaders: {
      type: Function as PropType<() => void | Promise<void>>,
      required: true,
    },
    onCopyWithoutHeaders: {
      type: Function as PropType<() => void | Promise<void>>,
      required: true,
    },
    onUpdatePosition: {
      type: Function as PropType<(position: DataGridSelectionPanelPosition) => void>,
      default: undefined,
    },
  },
  setup(props) {
    const copiedButton = ref<'withHeaders' | 'withoutHeaders' | null>(null)
    const isSettingsOpen = ref(false)
    let resetTimer: ReturnType<typeof setTimeout> | undefined

    function showCopiedState(target: 'withHeaders' | 'withoutHeaders') {
      copiedButton.value = target

      if (resetTimer) {
        clearTimeout(resetTimer)
      }

      resetTimer = setTimeout(() => {
        copiedButton.value = null
      }, 1400)
    }

    async function handleCopy(target: 'withHeaders' | 'withoutHeaders') {
      if (target === 'withHeaders') {
        await props.onCopyWithHeaders()
      } else {
        await props.onCopyWithoutHeaders()
      }

      showCopiedState(target)
    }

    onBeforeUnmount(() => {
      if (resetTimer) {
        clearTimeout(resetTimer)
      }
    })

    return () => (
      <div
        class={[
          'data-grid__selection-panel',
          `data-grid__selection-panel--${props.position}`,
        ]}
      >
        <div class="data-grid__selection-panel-toolbar">
          <div class="data-grid__selection-panel-count-group">
            <span class="data-grid__selection-panel-count">
              {props.selectedRowsLabel}: {props.selectedRowsCount}
            </span>
          </div>

          <div class="data-grid__selection-panel-actions">
            <button
              type="button"
              class={[
                'data-grid__selection-panel-button',
                'data-grid__selection-panel-button--icon',
                copiedButton.value === 'withHeaders'
                  ? 'data-grid__selection-panel-button--success'
                  : '',
              ]}
              title={props.copyWithHeadersLabel}
              aria-label={props.copyWithHeadersLabel}
              onClick={() => {
                void handleCopy('withHeaders')
              }}
            >
              <IconTableRowsRounded class="data-grid__icon" />
            </button>
            <button
              type="button"
              class={[
                'data-grid__selection-panel-button',
                'data-grid__selection-panel-button--icon',
                copiedButton.value === 'withoutHeaders'
                  ? 'data-grid__selection-panel-button--success'
                  : '',
              ]}
              title={props.copyWithoutHeadersLabel}
              aria-label={props.copyWithoutHeadersLabel}
              onClick={() => {
                void handleCopy('withoutHeaders')
              }}
            >
              <IconContentCopyRounded class="data-grid__icon" />
            </button>
            {props.allowPositionChange ? (
              <div class="data-grid__selection-panel-settings">
                <button
                  type="button"
                  class={[
                    'data-grid__selection-panel-button',
                    'data-grid__selection-panel-button--icon',
                  ]}
                  title="Pozycja panelu"
                  aria-label="Pozycja panelu"
                  onClick={() => {
                    isSettingsOpen.value = !isSettingsOpen.value
                  }}
                >
                  <IconSettingsRounded class="data-grid__icon" />
                </button>
                {isSettingsOpen.value ? (
                  <div class="data-grid__selection-panel-settings-menu">
                    {positions.map((position) => (
                      <button
                        key={position}
                        type="button"
                        class={[
                          'data-grid__selection-panel-settings-option',
                          position === props.position
                            ? 'data-grid__selection-panel-settings-option--active'
                            : '',
                        ]}
                        onClick={() => {
                          props.onUpdatePosition?.(position)
                          isSettingsOpen.value = false
                        }}
                      >
                        {position}
                      </button>
                    ))}
                  </div>
                ) : null}
              </div>
            ) : null}
          </div>
        </div>

        {props.sums.length > 0 ? (
          <div class="data-grid__selection-panel-sums">
            {props.sums.map((sum) => (
              <div key={sum.columnId} class="data-grid__selection-panel-sum">
                <span class="data-grid__selection-panel-sum-label">{sum.label}</span>
                <span class="data-grid__selection-panel-sum-value">{sum.value}</span>
              </div>
            ))}
          </div>
        ) : null}
      </div>
    )
  },
})
