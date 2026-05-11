import { defineComponent, onBeforeUnmount, ref, watch, type CSSProperties, type PropType } from 'vue'
import IconContentCopyRounded from '~icons/material-symbols/content-copy-rounded'
import IconCloseRounded from '~icons/material-symbols/close-rounded'
import IconSettingsRounded from '~icons/material-symbols/settings-rounded'

import DataGridDialog from '../dialogs/DataGridDialog'
import type { DataGridCopyFormat, DataGridFloatingPosition, DataGridSelectionPanelPosition } from '../../types'

type SumItem = {
  columnId: string
  label: string
  value: string
}

type CopyOptions = {
  includeHeaders: boolean
  format: DataGridCopyFormat
}

type SelectionPanelSection = {
  id: string
  label: string
  count: number
  copyLabel: string
  clearLabel: string
  onCopy: (options: CopyOptions) => void | Promise<void>
  onClear: () => void
}

type SelectionPanelAction = {
  id: string
  label: string
  title?: string
  disabled?: boolean
  onClick: () => void | Promise<void>
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
    secondarySelectedRowsCount: {
      type: Number,
      default: 0,
    },
    secondarySelectedRowsLabel: {
      type: String,
      default: '',
    },
    sums: {
      type: Array as PropType<SumItem[]>,
      required: true,
    },
    sections: {
      type: Array as PropType<SelectionPanelSection[]>,
      default: () => [],
    },
    actions: {
      type: Array as PropType<SelectionPanelAction[]>,
      default: () => [],
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
    copyFormat: {
      type: String as PropType<DataGridCopyFormat>,
      default: 'html',
    },
    copyFormatLabel: {
      type: String,
      default: 'Format kopiowania',
    },
    copyFormatHtmlLabel: {
      type: String,
      default: 'Tabela HTML',
    },
    copyFormatTextLabel: {
      type: String,
      default: 'Tekst TSV',
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
    const copiedTarget = ref<string | null>(null)
    const includeHeaders = ref(props.copyIncludeHeaders)
    const copyFormat = ref<DataGridCopyFormat>(props.copyFormat)
    const isSettingsDialogOpen = ref(false)
    const panelRef = ref<HTMLDivElement | null>(null)
    let activePointerId: number | null = null
    let dragOffsetX = 0
    let dragOffsetY = 0
    let resetTimer: ReturnType<typeof setTimeout> | undefined
    let dragFrame: number | null = null
    let pendingFloatingPosition: DataGridFloatingPosition | null = null

    watch(
      () => props.copyIncludeHeaders,
      (value) => {
        includeHeaders.value = value
      },
    )

    watch(
      () => props.copyFormat,
      (value) => {
        copyFormat.value = value
      },
    )

    function showCopiedState(target: string) {
      copiedTarget.value = target

      if (resetTimer) {
        clearTimeout(resetTimer)
      }

      resetTimer = setTimeout(() => {
        copiedTarget.value = null
      }, 1400)
    }

    async function handleCopy() {
      try {
        if (props.onCopy) {
          await props.onCopy({
            includeHeaders: includeHeaders.value,
            format: copyFormat.value,
          })
        } else if (includeHeaders.value) {
          await props.onCopyWithHeaders?.()
        } else {
          await props.onCopyWithoutHeaders?.()
        }

        showCopiedState('main')
      } catch (error) {
        console.error(error)
      }
    }

    async function handleSectionCopy(section: SelectionPanelSection) {
      try {
        await section.onCopy({
          includeHeaders: includeHeaders.value,
          format: copyFormat.value,
        })
        showCopiedState(`section:${section.id}`)
      } catch (error) {
        console.error(error)
      }
    }

    onBeforeUnmount(() => {
      if (resetTimer) {
        clearTimeout(resetTimer)
      }

      if (typeof window !== 'undefined') {
        window.removeEventListener('pointermove', handlePointerMove)
        window.removeEventListener('pointerup', handlePointerUp)
        if (dragFrame !== null) {
          window.cancelAnimationFrame(dragFrame)
        }
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

    function flushPendingFloatingPosition() {
      dragFrame = null
      if (!pendingFloatingPosition) {
        return
      }

      props.onUpdateFloatingPosition?.(pendingFloatingPosition)
      pendingFloatingPosition = null
    }

    function scheduleFloatingPositionUpdate(position: DataGridFloatingPosition) {
      pendingFloatingPosition = position

      if (typeof window === 'undefined') {
        flushPendingFloatingPosition()
        return
      }

      if (dragFrame !== null) {
        return
      }

      dragFrame = window.requestAnimationFrame(flushPendingFloatingPosition)
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
      scheduleFloatingPositionUpdate(
        clampFloatingPosition(
          event.clientX - parentRect.left - dragOffsetX,
          event.clientY - parentRect.top - dragOffsetY,
        ),
      )
    }

    function handlePointerUp(event: PointerEvent) {
      if (activePointerId !== event.pointerId) {
        return
      }

      activePointerId = null
      if (dragFrame === null) {
        flushPendingFloatingPosition()
      }
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
            if ((event.target as HTMLElement)?.closest('button, input, label, [data-grid-dialog-root]')) {
              return
            }

            startDragging(event)
          }}
        >
          <div class="data-grid__selection-panel-count-group">
            <span class="data-grid__selection-panel-count">
              {props.selectedRowsLabel}: {props.selectedRowsCount}
            </span>
            {props.secondarySelectedRowsLabel && props.secondarySelectedRowsCount > 0 ? (
              <span class="data-grid__selection-panel-count">
                {props.secondarySelectedRowsLabel}: {props.secondarySelectedRowsCount}
              </span>
            ) : null}
          </div>

          <div class="data-grid__selection-panel-actions">
            {props.actions.map((action) => (
              <button
                key={action.id}
                type="button"
                class="data-grid__selection-panel-button"
                title={action.title ?? action.label}
                disabled={action.disabled}
                onClick={() => {
                  void action.onClick()
                }}
              >
                {action.label}
              </button>
            ))}
            <button
              type="button"
              class={[
                'data-grid__selection-panel-button',
                'data-grid__selection-panel-button--icon',
                copiedTarget.value === 'main' ? 'data-grid__selection-panel-button--success' : '',
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
                data-grid-selection-panel-settings-root="true"
                class={[
                  'data-grid__selection-panel-button',
                  'data-grid__selection-panel-button--icon',
                ]}
                title="Ustawienia kopiowania"
                aria-label="Ustawienia kopiowania"
                onClick={() => {
                  isSettingsDialogOpen.value = true
                }}
              >
                <IconSettingsRounded class="data-grid__icon" />
              </button>
              {isSettingsDialogOpen.value ? (
                <DataGridDialog
                  title="Ustawienia kopiowania"
                  ariaLabel="Ustawienia kopiowania"
                  surfaceClass="data-grid__dialog--copy-settings"
                  closeLabel="Zamknij"
                  onClose={() => {
                    isSettingsDialogOpen.value = false
                  }}
                  v-slots={{
                    footer: () => (
                      <button
                        type="button"
                        class="data-grid__dialog-action"
                        onClick={() => {
                          isSettingsDialogOpen.value = false
                        }}
                      >
                        Zamknij
                      </button>
                    ),
                  }}
                >
                  <div class="data-grid__dialog-form">
                    <label class="data-grid__dialog-checkbox">
                    <input
                      data-grid-selection-panel-settings-root="true"
                      type="checkbox"
                      checked={includeHeaders.value}
                      onChange={(event) => {
                        includeHeaders.value = (event.target as HTMLInputElement).checked
                      }}
                    />
                    <span>Kopiuj naglowki</span>
                    </label>

                    <div class="data-grid__dialog-field">
                      <span>{props.copyFormatLabel}</span>
                      <div class="data-grid__dialog-actions">
                        <button
                          type="button"
                          class={[
                            'data-grid__dialog-action',
                            copyFormat.value === 'html' ? 'data-grid__dialog-action--active' : '',
                          ]}
                          onClick={() => {
                            copyFormat.value = 'html'
                          }}
                        >
                          {props.copyFormatHtmlLabel}
                        </button>
                        <button
                          type="button"
                          class={[
                            'data-grid__dialog-action',
                            copyFormat.value === 'text' ? 'data-grid__dialog-action--active' : '',
                          ]}
                          onClick={() => {
                            copyFormat.value = 'text'
                          }}
                        >
                          {props.copyFormatTextLabel}
                        </button>
                      </div>
                    </div>

                    {props.allowPositionChange ? (
                      <div class="data-grid__dialog-field">
                        <span>Pozycja panelu</span>
                        <div class="data-grid__dialog-actions">
                          {positions.map((position) => (
                            <button
                              key={position}
                              type="button"
                              class={[
                                'data-grid__dialog-action',
                                position === props.position ? 'data-grid__dialog-action--active' : '',
                              ]}
                              onClick={() => {
                                props.onUpdatePosition?.(position)
                              }}
                            >
                              {position}
                            </button>
                          ))}
                        </div>
                      </div>
                    ) : null}
                  </div>
                </DataGridDialog>
              ) : null}
            </div>
          </div>
        </div>

        {props.sections.length > 0 ? (
          <div class="data-grid__selection-panel-sections">
            {props.sections.map((section) => (
              <div key={section.id} class="data-grid__selection-panel-section">
                <span class="data-grid__selection-panel-section-label">
                  {section.label}: {section.count}
                </span>
                <div class="data-grid__selection-panel-section-actions">
                  <button
                    type="button"
                    class={[
                      'data-grid__selection-panel-button',
                      'data-grid__selection-panel-button--icon',
                      copiedTarget.value === `section:${section.id}` ? 'data-grid__selection-panel-button--success' : '',
                    ]}
                    title={section.copyLabel}
                    aria-label={section.copyLabel}
                    onClick={() => {
                      void handleSectionCopy(section)
                    }}
                  >
                    <IconContentCopyRounded class="data-grid__icon" />
                  </button>
                  <button
                    type="button"
                    class="data-grid__selection-panel-button data-grid__selection-panel-button--icon"
                    title={section.clearLabel}
                    aria-label={section.clearLabel}
                    onClick={() => section.onClear()}
                  >
                    <IconCloseRounded class="data-grid__icon" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : null}

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
