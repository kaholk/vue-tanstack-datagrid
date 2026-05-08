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
    mode: {
      type: String as PropType<'create' | 'overwrite'>,
      default: 'create',
    },
    includesFilters: {
      type: Boolean,
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
    onUpdateIncludesFilters: {
      type: Function as PropType<(value: boolean) => void>,
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
          title={props.mode === 'overwrite' ? 'Zapisz widok' : 'Nowy widok'}
          subtitle="Wybierz, czy widok ma zapamietac aktualne filtry."
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
                disabled={props.mode === 'overwrite'}
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
            <label class="data-grid__dialog-checkbox">
              <input
                type="checkbox"
                checked={props.includesFilters}
                onChange={(event) =>
                  props.onUpdateIncludesFilters((event.target as HTMLInputElement).checked)
                }
              />
              <span>Zapisz filtry</span>
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
