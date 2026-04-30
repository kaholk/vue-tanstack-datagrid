import {
  defineComponent,
  onBeforeUnmount,
  ref,
  watch,
  type PropType,
} from 'vue'

import DataGridDropdownMenu from './DataGridDropdownMenu'

import IconSaveRounded from '~icons/material-symbols/save-rounded';

let closeActiveStepEditor: (() => void) | null = null

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
    const triggerRef = ref<HTMLButtonElement | null>(null)
    const quantityValue = ref(props.modelValue >= 1 ? String(props.modelValue) : '1')
    const menuOpen = ref(false)

    watch(
      () => props.modelValue,
      (value) => {
        if (!menuOpen.value) {
          quantityValue.value = value >= 1 ? String(value) : '1'
        }
      },
    )

    function closeMenu() {
      menuOpen.value = false
      if (closeActiveStepEditor === closeMenu) {
        closeActiveStepEditor = null
      }
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

      if (closeActiveStepEditor && closeActiveStepEditor !== closeMenu) {
        closeActiveStepEditor()
      }

      quantityValue.value = props.modelValue >= 1 ? String(props.modelValue) : '1'
      menuOpen.value = true
      closeActiveStepEditor = closeMenu
    }

    function submitQuantity() {
      const parsed = Number.parseInt(quantityValue.value, 10)
      const nextValue = Number.isFinite(parsed) && parsed > 0 ? parsed : 1
      props.onUpdateModelValue(nextValue)
      closeMenu()
    }

    onBeforeUnmount(() => {
      if (closeActiveStepEditor === closeMenu) {
        closeActiveStepEditor = null
      }
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
          <DataGridDropdownMenu
            triggerRef={triggerRef}
            teleport
            menuClass="data-grid__step-editor-menu"
            scopeAttr="data-grid-filter-root"
            minWidth={308}
            widthOffset={240}
            desiredHeight={280}
            zIndex={520}
            outsideClickRootAttr="data-grid-inline-select-root"
            onOutsidePointerDown={closeMenu}
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
        ) : null}
      </div>
    )
  },
})
