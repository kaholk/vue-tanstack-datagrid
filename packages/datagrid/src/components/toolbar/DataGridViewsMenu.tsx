import { defineComponent, type PropType } from 'vue'
import IconCheckRounded from '~icons/material-symbols/check-rounded'
import IconDeleteRounded from '~icons/material-symbols/delete-rounded'
import IconFilterAltOutline from '~icons/material-symbols/filter-alt-outline'
import IconSaveRounded from '~icons/material-symbols/save-rounded'
import IconSaveAsOutlineSharp from '~icons/material-symbols/save-as-outline-sharp'
import IconTuneRounded from '~icons/material-symbols/tune-rounded'
import IconViewColumnOutlineRounded from '~icons/material-symbols/view-column-outline-rounded'

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
    const renderViewButton = (view: DataGridSavedView) => {
      const Icon = view.includesFilters ? IconFilterAltOutline : IconViewColumnOutlineRounded
      const isActive = props.activeViewId === view.id

      return (
        <button
          key={view.id}
          type="button"
          class={['data-grid__view-option', isActive ? 'data-grid__view-option--active' : '']}
          onClick={() => props.onSelect(view.id)}
          title={view.includesFilters ? 'Widok z filtrami' : 'Widok bez filtrow'}
        >
          <Icon class="data-grid__menu-item-icon" />
          <span>{view.name}</span>
          {isActive ? <IconCheckRounded class="data-grid__menu-item-icon" /> : null}
        </button>
      )
    }

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
            <div class="data-grid__views-picker">
              <span>Widok</span>
              <div class="data-grid__views-list">
                <button
                  type="button"
                  class={[
                    'data-grid__view-option',
                    props.activeViewId === '' ? 'data-grid__view-option--active' : '',
                  ]}
                  onClick={() => props.onSelect('')}
                >
                  <IconViewColumnOutlineRounded class="data-grid__menu-item-icon" />
                  <span>Domyslny</span>
                  {props.activeViewId === '' ? (
                    <IconCheckRounded class="data-grid__menu-item-icon" />
                  ) : null}
                </button>
                {props.savedViews.map(renderViewButton)}
              </div>
            </div>
            <div class="data-grid__views-actions">
              <button type="button" class="data-grid__toolbar-button" onClick={props.onCreate}>
                <IconSaveRounded class="data-grid__button-icon" />
                <span>Nowy</span>
              </button>
              <button
                type="button"
                class="data-grid__toolbar-button"
                onClick={props.onOverwrite}
                disabled={!props.activeViewId}
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
