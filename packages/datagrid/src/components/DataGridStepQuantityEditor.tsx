import {
  Teleport,
  defineComponent,
  onBeforeUnmount,
  onMounted,
  ref,
  watch,
  type CSSProperties,
  type PropType,
} from 'vue'

import DataGridDropdownMenu from './DataGridDropdownMenu'

import IconSaveRounded from '~icons/material-symbols/save-rounded';

export default defineComponent({
  name: 'DataGridStepQuantityEditor',
  props: {
    modelValue: {
      type: Number,
      required: true,
    },
    label: {
      type: String,
      default: '',
    },
    readonly: {
      type: Boolean,
      default: false,
    },
    onUpdateModelValue: {
      type: Function as PropType<(value: number) => void>,
      required: true,
    },
  },
  setup(props) {
    const instanceId = `step-editor-${Math.random().toString(36).slice(2, 10)}`
    const triggerRef = ref<HTMLButtonElement | null>(null)
    const quantityValue = ref(props.modelValue >= 1 ? String(props.modelValue) : '1')
    const menuOpen = ref(false)
    const menuStyle = ref<CSSProperties>({
      position: 'fixed',
      top: '0',
      left: '0',
      width: '260px',
      zIndex: 520,
    })

    watch(
      () => props.modelValue,
      (value) => {
        if (!menuOpen.value) {
          quantityValue.value = value >= 1 ? String(value) : '1'
        }
      },
    )

    function updateMenuPosition() {
      const trigger = triggerRef.value
      if (!trigger) {
        return
      }

      const rect = trigger.getBoundingClientRect()
      const desiredWidth = Math.max(rect.width + 240, 308)
      const viewportWidth = window.innerWidth
      const left = Math.min(rect.left, viewportWidth - desiredWidth - 12)

      menuStyle.value = {
        position: 'fixed',
        top: `${rect.bottom + 4}px`,
        left: `${Math.max(12, left)}px`,
        width: `${desiredWidth}px`,
        zIndex: 520,
      }
    }

    function closeMenu() {
      menuOpen.value = false
    }

    function quickToggle() {
      if (props.readonly) {
        return
      }

      if (props.modelValue === 0) {
        props.onUpdateModelValue(-1)
        return
      }

      if (props.modelValue === -1 || props.modelValue === -2) {
        props.onUpdateModelValue(0)
        return
      }

      props.onUpdateModelValue(-1)
    }

    function openMenu() {
      if (props.readonly) {
        return
      }

      if (typeof window !== 'undefined') {
        window.dispatchEvent(
          new CustomEvent('data-grid-step-editor-open', {
            detail: { instanceId },
          }),
        )
      }

      quantityValue.value = props.modelValue >= 1 ? String(props.modelValue) : '1'
      menuOpen.value = true
      updateMenuPosition()
    }

    function handleStepEditorOpen(event: Event) {
      const customEvent = event as CustomEvent<{ instanceId?: string }>
      if (customEvent.detail?.instanceId === instanceId) {
        return
      }

      closeMenu()
    }

    function handleDocumentPointerDown(event: PointerEvent) {
      const target = event.target
      if (!(target instanceof HTMLElement)) {
        return
      }

      if (target.closest('[data-grid-inline-select-root="true"]')) {
        return
      }

      closeMenu()
    }

    function submitQuantity() {
      const parsed = Number.parseInt(quantityValue.value, 10)
      const nextValue = Number.isFinite(parsed) && parsed > 0 ? parsed : 1
      props.onUpdateModelValue(nextValue)
      closeMenu()
    }

    onMounted(() => {
      document.addEventListener('pointerdown', handleDocumentPointerDown)
      window.addEventListener('data-grid-step-editor-open', handleStepEditorOpen as EventListener)
      window.addEventListener('resize', updateMenuPosition)
      window.addEventListener('scroll', updateMenuPosition, true)
    })

    onBeforeUnmount(() => {
      document.removeEventListener('pointerdown', handleDocumentPointerDown)
      window.removeEventListener('data-grid-step-editor-open', handleStepEditorOpen as EventListener)
      window.removeEventListener('resize', updateMenuPosition)
      window.removeEventListener('scroll', updateMenuPosition, true)
    })

    return () => (
      <div class="data-grid__step-editor" data-grid-inline-select-root="true">
        <button
          ref={triggerRef}
          type="button"
          class={[
            'data-grid__step-editor-trigger',
            props.readonly ? 'data-grid__step-editor-trigger--readonly' : '',
          ]}
          title={props.label || 'Step'}
          onClick={(event) => {
            event.stopPropagation()
            quickToggle()
          }}
          onContextmenu={(event) => {
            event.preventDefault()
            event.stopPropagation()
            openMenu()
          }}
        >
          {props.modelValue === -1 ? (
            <span class="data-grid__step-editor-dot data-grid__step-editor-dot--done">{'\u2713'}</span>
          ) : null}
          {props.modelValue === -2 ? (
            <span class="data-grid__step-editor-dot data-grid__step-editor-dot--blocked">{'\u2715'}</span>
          ) : null}
          {props.modelValue >= 1 ? (
            <span class="data-grid__step-editor-dot data-grid__step-editor-dot--partial">
              <span class="data-grid__step-editor-badge">{props.modelValue}</span>
            </span>
          ) : null}
          {props.modelValue === 0 ? (
            <span class="data-grid__step-editor-dot data-grid__step-editor-dot--empty">{'\u25cb'}</span>
          ) : null}
        </button>
        {menuOpen.value ? (
          <Teleport to="body">
            <DataGridDropdownMenu
              menuClass="data-grid__step-editor-menu"
              scopeAttr="data-grid-filter-root"
              style={menuStyle.value}
            >
              <div class="data-grid__step-editor-panel" data-grid-inline-select-root="true">
                <div class="data-grid__step-editor-title">{props.label || 'Step'}</div>
                <div class="data-grid__step-editor-actions">
                  <button
                    type="button"
                    class="data-grid__step-editor-action data-grid__step-editor-action--done"
                    onClick={() => {
                      props.onUpdateModelValue(-1)
                      closeMenu()
                    }}
                  >
                    <span class="data-grid__step-editor-action-icon">{'\u2713'}</span>
                    <span>Ukonczone</span>
                  </button>
                  <button
                    type="button"
                    class="data-grid__step-editor-action data-grid__step-editor-action--neutral"
                    onClick={() => {
                      props.onUpdateModelValue(0)
                      closeMenu()
                    }}
                  >
                    <span class="data-grid__step-editor-action-icon">{'\u2715'}</span>
                    <span>Nie</span>
                  </button>
                  <button
                    type="button"
                    class="data-grid__step-editor-action data-grid__step-editor-action--blocked"
                    onClick={() => {
                      props.onUpdateModelValue(-2)
                      closeMenu()
                    }}
                  >
                    <span class="data-grid__step-editor-action-icon">{'\u2298'}</span>
                    <span>Blokada</span>
                  </button>
                </div>
                <div class="data-grid__step-editor-quantity">
                  <label class="data-grid__step-editor-field-label">Ilosc (pomaranczowe)</label>
                  <input
                    class="data-grid__step-editor-input"
                    type="number"
                    min="1"
                    step="1"
                    value={quantityValue.value}
                    onInput={(event) => {
                      quantityValue.value = (event.target as HTMLInputElement).value
                    }}
                    onKeydown={(event) => {
                      if (event.key === 'Enter') {
                        event.preventDefault()
                        submitQuantity()
                      }

                      if (event.key === 'Escape') {
                        event.preventDefault()
                        closeMenu()
                      }
                    }}
                  />
                </div>
                <div class="data-grid__step-editor-footer">
                  <button
                    type="button"
                    class="data-grid__step-editor-cancel"
                    onClick={closeMenu}
                  >
                    Anuluj
                  </button>
                  <button
                    type="button"
                    class="data-grid__step-editor-save"
                    onClick={submitQuantity}
                  >
                    <span class="data-grid__step-editor-save-icon">
                      <IconSaveRounded />
                    </span>
                    <span>Zapisz ilosc</span>
                  </button>
                </div>
              </div>
            </DataGridDropdownMenu>
          </Teleport>
        ) : null}
      </div>
    )
  },
})
