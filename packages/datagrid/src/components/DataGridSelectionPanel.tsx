import { defineComponent, onBeforeUnmount, ref, watch, type CSSProperties, type PropType } from 'vue'
import IconContentCopyRounded from '~icons/material-symbols/content-copy-rounded'
import IconCloseRounded from '~icons/material-symbols/close-rounded'
import IconSettingsRounded from '~icons/material-symbols/settings-rounded'

import type { DataGridFloatingPosition, DataGridSelectionPanelPosition } from '../types'

type SumItem = {
  columnId: string
  label: string
  value: string
}

type CopyOptions = {
  includeHeaders: boolean
}

const positions: DataGridSelectionPanelPosition[] = [
  'bottom-right',
  'bottom-left',
  'top-right',
  'top-left',
  'floating',
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
      default: 'Kopiuj z naglowkami',
    },
    copyWithoutHeadersLabel: {
      type: String,
      default: 'Kopiuj bez naglowkow',
    },
    copyLabel: {
      type: String,
      default: 'Kopiuj',
    },
    copyIncludeHeaders: {
      type: Boolean,
      default: false,
    },
    allowPositionChange: {
      type: Boolean,
      default: true,
    },
    floatingPosition: {
      type: Object as PropType<DataGridFloatingPosition | null>,
      default: null,
    },
    onCopyWithHeaders: {
      type: Function as PropType<() => void | Promise<void>>,
      default: undefined,
    },
    onCopyWithoutHeaders: {
      type: Function as PropType<() => void | Promise<void>>,
      default: undefined,
    },
    onCopy: {
      type: Function as PropType<(options: CopyOptions) => void | Promise<void>>,
      default: undefined,
    },
    onClearSelection: {
      type: Function as PropType<() => void>,
      default: undefined,
    },
    onUpdatePosition: {
      type: Function as PropType<(position: DataGridSelectionPanelPosition) => void>,
      default: undefined,
    },
    onUpdateFloatingPosition: {
      type: Function as PropType<(position: DataGridFloatingPosition) => void>,
      default: undefined,
    },
  },
  setup(props) {
    const copiedButton = ref<'copy' | null>(null)
    const includeHeaders = ref(props.copyIncludeHeaders)
    const isSettingsOpen = ref(false)
    const panelRef = ref<HTMLDivElement | null>(null)
    let activePointerId: number | null = null
    let dragOffsetX = 0
    let dragOffsetY = 0
    let resetTimer: ReturnType<typeof setTimeout> | undefined

    watch(
      () => props.copyIncludeHeaders,
      (value) => {
        includeHeaders.value = value
      },
    )

    function showCopiedState() {
      copiedButton.value = 'copy'

      if (resetTimer) {
        clearTimeout(resetTimer)
      }

      resetTimer = setTimeout(() => {
        copiedButton.value = null
      }, 1400)
    }

    async function handleCopy() {
      if (props.onCopy) {
        await props.onCopy({
          includeHeaders: includeHeaders.value,
        })
      } else if (includeHeaders.value) {
        await props.onCopyWithHeaders?.()
      } else {
        await props.onCopyWithoutHeaders?.()
      }

      showCopiedState()
    }

    onBeforeUnmount(() => {
      if (resetTimer) {
        clearTimeout(resetTimer)
      }

      if (typeof window !== 'undefined') {
        window.removeEventListener('pointermove', handlePointerMove)
        window.removeEventListener('pointerup', handlePointerUp)
      }
    })

    function clampFloatingPosition(nextX: number, nextY: number) {
      const panel = panelRef.value
      const parent = panel?.parentElement
      if (!panel || !parent) {
        return {
          x: Math.max(0, nextX),
          y: Math.max(0, nextY),
        }
      }

      const parentRect = parent.getBoundingClientRect()
      const panelRect = panel.getBoundingClientRect()
      const maxX = Math.max(0, parentRect.width - panelRect.width - 8)
      const maxY = Math.max(0, parentRect.height - panelRect.height - 8)

      return {
        x: Math.min(Math.max(0, nextX), maxX),
        y: Math.min(Math.max(0, nextY), maxY),
      }
    }

    function handlePointerMove(event: PointerEvent) {
      if (props.position !== 'floating' || activePointerId !== event.pointerId) {
        return
      }

      const panel = panelRef.value
      const parent = panel?.parentElement
      if (!panel || !parent) {
        return
      }

      const parentRect = parent.getBoundingClientRect()
      const nextPosition = clampFloatingPosition(
        event.clientX - parentRect.left - dragOffsetX,
        event.clientY - parentRect.top - dragOffsetY,
      )

      props.onUpdateFloatingPosition?.(nextPosition)
    }

    function handlePointerUp(event: PointerEvent) {
      if (activePointerId !== event.pointerId) {
        return
      }

      activePointerId = null
      window.removeEventListener('pointermove', handlePointerMove)
      window.removeEventListener('pointerup', handlePointerUp)
    }

    function startDragging(event: PointerEvent) {
      if (props.position !== 'floating') {
        return
      }

      const panel = panelRef.value
      if (!panel) {
        return
      }

      activePointerId = event.pointerId
      const panelRect = panel.getBoundingClientRect()
      dragOffsetX = event.clientX - panelRect.left
      dragOffsetY = event.clientY - panelRect.top

      window.addEventListener('pointermove', handlePointerMove)
      window.addEventListener('pointerup', handlePointerUp)
    }

    function getFloatingStyle(): CSSProperties | undefined {
      if (props.position !== 'floating' || !props.floatingPosition) {
        return undefined
      }

      return {
        left: `${props.floatingPosition.x}px`,
        top: `${props.floatingPosition.y}px`,
      }
    }

    return () => (
      <div
        ref={panelRef}
        class={[
          'data-grid__selection-panel',
          `data-grid__selection-panel--${props.position}`,
        ]}
        style={getFloatingStyle()}
      >
        <div
          class={[
            'data-grid__selection-panel-toolbar',
            props.position === 'floating' ? 'data-grid__selection-panel-toolbar--draggable' : '',
          ]}
          onPointerdown={(event) => {
            if ((event.target as HTMLElement)?.closest('button, input, label')) {
              return
            }

            startDragging(event)
          }}
        >
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
                copiedButton.value === 'copy' ? 'data-grid__selection-panel-button--success' : '',
              ]}
              title={props.copyLabel}
              aria-label={props.copyLabel}
              onClick={() => {
                void handleCopy()
              }}
            >
              <IconContentCopyRounded class="data-grid__icon" />
            </button>
            <button
              type="button"
              class={[
                'data-grid__selection-panel-button',
                'data-grid__selection-panel-button--icon',
              ]}
              title="Wyczysc zaznaczenie"
              aria-label="Wyczysc zaznaczenie"
              onClick={() => {
                props.onClearSelection?.()
              }}
            >
              <IconCloseRounded class="data-grid__icon" />
            </button>
            <div class="data-grid__selection-panel-settings">
              <button
                type="button"
                class={[
                  'data-grid__selection-panel-button',
                  'data-grid__selection-panel-button--icon',
                ]}
                title="Ustawienia kopiowania"
                aria-label="Ustawienia kopiowania"
                onClick={() => {
                  isSettingsOpen.value = !isSettingsOpen.value
                }}
              >
                <IconSettingsRounded class="data-grid__icon" />
              </button>
              {isSettingsOpen.value ? (
                <div class="data-grid__selection-panel-settings-menu">
                    <label class="data-grid__selection-panel-settings-choice">
                      <input
                        type="checkbox"
                        checked={includeHeaders.value}
                        onChange={(event) => {
                          includeHeaders.value = (event.target as HTMLInputElement).checked
                        }}
                      />
                      <span>Kopiuj naglowki</span>
                    </label>
                    {props.allowPositionChange ? (
                      <div class="data-grid__selection-panel-settings-divider" />
                    ) : null}
                  {props.allowPositionChange ? (
                    positions.map((position) => (
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
                      ))
                  ) : null}
                </div>
              ) : null}
            </div>
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
