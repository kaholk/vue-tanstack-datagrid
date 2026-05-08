import { defineComponent, type PropType } from 'vue'
import IconDeleteRounded from '~icons/material-symbols/delete-rounded'
import IconSaveRounded from '~icons/material-symbols/save-rounded'
import IconSaveAsOutlineSharp from '~icons/material-symbols/save-as-outline-sharp'
import IconTuneRounded from '~icons/material-symbols/tune-rounded'

import DataGridDropdownMenu from '../menus/DataGridDropdownMenu'
import type { DataGridSavedView } from '../../types'

export default defineComponent({
  name: 'DataGridViewsMenu',
  props: {
    isOpen: {
      type: Boolean,
      required: true,
    },
    activeViewId: {
      type: String,
      required: true,
    },
    savedViews: {
      type: Array as PropType<DataGridSavedView[]>,
      required: true,
    },
    onToggle: {
      type: Function as PropType<() => void>,
      required: true,
    },
    onSelect: {
      type: Function as PropType<(viewId: string) => void>,
      required: true,
    },
    onCreate: {
      type: Function as PropType<() => void>,
      required: true,
    },
    onOverwrite: {
      type: Function as PropType<() => void>,
      required: true,
    },
    onDelete: {
      type: Function as PropType<() => void>,
      required: true,
    },
  },
  setup(props) {
    return () => (
      <div class="data-grid__views" data-grid-view-root="true">
        <button
          type="button"
          class="data-grid__toolbar-button"
          onClick={props.onToggle}
          data-grid-view-root="true"
        >
          <IconTuneRounded class="data-grid__button-icon" />
          <span>Widoki</span>
        </button>
        {props.isOpen ? (
          <DataGridDropdownMenu menuClass="data-grid__views-menu" scopeAttr="data-grid-view-root">
            <label class="data-grid__views-picker">
              <span>Widok</span>
              <select
                value={props.activeViewId}
                onChange={(event) => props.onSelect((event.target as HTMLSelectElement).value)}
              >
                <option value="">Domyslny</option>
                {props.savedViews.map((view) => (
                  <option key={view.id} value={view.id}>
                    {view.name}
                  </option>
                ))}
              </select>
            </label>
            <div class="data-grid__views-actions">
              <button type="button" class="data-grid__toolbar-button" onClick={props.onCreate}>
                <IconSaveRounded class="data-grid__button-icon" />
                <span>Nowy</span>
              </button>
              <button
                type="button"
                class="data-grid__toolbar-button"
                onClick={props.onOverwrite}
                disabled={!props.savedViews.length}
              >
                <IconSaveAsOutlineSharp class="data-grid__button-icon" />
                <span>Zapisz</span>
              </button>
              <button
                type="button"
                class="data-grid__toolbar-button"
                onClick={props.onDelete}
                disabled={!props.activeViewId}
              >
                <IconDeleteRounded class="data-grid__button-icon" />
                <span>Usun</span>
              </button>
            </div>
          </DataGridDropdownMenu>
        ) : null}
      </div>
    )
  },
})
