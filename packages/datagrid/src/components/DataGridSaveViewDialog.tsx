import { defineComponent, type PropType } from 'vue'

import DataGridDialog from './DataGridDialog'

export default defineComponent({
  name: 'DataGridSaveViewDialog',
  props: {
    isOpen: {
      type: Boolean,
      required: true,
    },
    viewName: {
      type: String,
      required: true,
    },
    onClose: {
      type: Function as PropType<() => void>,
      required: true,
    },
    onSave: {
      type: Function as PropType<() => void>,
      required: true,
    },
    onUpdateViewName: {
      type: Function as PropType<(value: string) => void>,
      required: true,
    },
  },
  setup(props) {
    return () => {
      if (!props.isOpen) {
        return null
      }

      return (
        <DataGridDialog
          title="Zapisz widok"
          subtitle="Podaj nazwe dla aktualnego ukladu kolumn i filtrow."
          ariaLabel="Zapisz widok"
          surfaceClass="data-grid__dialog--compact"
          onClose={props.onClose}
        >
          <div class="data-grid__dialog-form">
            <label class="data-grid__dialog-field">
              <span>Nazwa widoku</span>
              <input
                value={props.viewName}
                placeholder="Np. Moj widok"
                autofocus
                onInput={(event) =>
                  props.onUpdateViewName((event.target as HTMLInputElement).value)
                }
                onKeydown={(event) => {
                  if (event.key === 'Enter') {
                    event.preventDefault()
                    props.onSave()
                  }
                }}
              />
            </label>
          </div>

          <div class="data-grid__dialog-footer">
            <button type="button" class="data-grid__dialog-close" onClick={props.onClose}>
              Anuluj
            </button>
            <button
              type="button"
              class="data-grid__dialog-close"
              onClick={props.onSave}
              disabled={!props.viewName.trim()}
            >
              Zapisz
            </button>
          </div>
        </DataGridDialog>
      )
    }
  },
})
