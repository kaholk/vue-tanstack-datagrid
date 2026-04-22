import { type Column } from '@tanstack/vue-table'
import { defineComponent, type CSSProperties, type PropType } from 'vue'
import IconCloseRounded from '~icons/material-symbols/close-rounded'
import IconLeftPanelCloseRounded from '~icons/material-symbols/left-panel-close-rounded'
import IconNorthRounded from '~icons/material-symbols/north-rounded'
import IconRightPanelCloseRounded from '~icons/material-symbols/right-panel-close-rounded'
import IconSouthRounded from '~icons/material-symbols/south-rounded'

import DataGridDropdownMenu from './DataGridDropdownMenu'

type AnyRow = Record<string, unknown>

export default defineComponent({
  name: 'DataGridColumnMenu',
  props: {
    column: {
      type: Object as PropType<Column<AnyRow, unknown>>,
      required: true,
    },
    pickerLabel: {
      type: String,
      required: true,
    },
    menuStyle: {
      type: Object as PropType<CSSProperties>,
      required: true,
    },
    isServerColumn: {
      type: Boolean,
      required: true,
    },
    sortedState: {
      type: [String, Boolean] as PropType<'asc' | 'desc' | false>,
      required: true,
    },
    pinnedSide: {
      type: [String, Boolean] as PropType<'left' | 'right' | false>,
      required: true,
    },
    onToggleSorting: {
      type: Function as PropType<(column: Column<AnyRow, unknown>) => void>,
      required: true,
    },
    onSetSortDesc: {
      type: Function as PropType<(column: Column<AnyRow, unknown>) => void>,
      required: true,
    },
    onClearSorting: {
      type: Function as PropType<(column: Column<AnyRow, unknown>) => void>,
      required: true,
    },
    onSetPin: {
      type: Function as PropType<
        (column: Column<AnyRow, unknown>, side: 'left' | 'right' | false) => void
      >,
      required: true,
    },
    onClose: {
      type: Function as PropType<() => void>,
      required: true,
    },
  },
  setup(props) {
    return () => (
      <DataGridDropdownMenu
        menuClass="data-grid__column-menu"
        scopeAttr="data-grid-menu-root"
        style={props.menuStyle}
      >
        <div class="data-grid__menu-column-name">{props.pickerLabel}</div>
        {props.isServerColumn ? (
          <div class="data-grid__menu-section">
            <div class="data-grid__menu-title">Sort</div>
            <div class="data-grid__menu-row">
              <button
                type="button"
                class={[
                  'data-grid__menu-item',
                  props.sortedState === 'asc' ? 'data-grid__menu-item--active' : '',
                ]}
                onClick={() => props.onToggleSorting(props.column)}
                disabled={props.sortedState === 'asc'}
              >
                <IconNorthRounded class="data-grid__menu-item-icon" />
                <span>ASC</span>
              </button>
              <button
                type="button"
                class={[
                  'data-grid__menu-item',
                  props.sortedState === 'desc' ? 'data-grid__menu-item--active' : '',
                ]}
                onClick={() => props.onSetSortDesc(props.column)}
                disabled={props.sortedState === 'desc'}
              >
                <IconSouthRounded class="data-grid__menu-item-icon" />
                <span>DESC</span>
              </button>
              <button
                type="button"
                class="data-grid__menu-item"
                onClick={() => props.onClearSorting(props.column)}
                disabled={!props.sortedState}
              >
                <IconCloseRounded class="data-grid__menu-item-icon" />
                <span>Clear</span>
              </button>
            </div>
          </div>
        ) : null}
        <div class="data-grid__menu-section">
          <div class="data-grid__menu-title">Pin</div>
          <div class="data-grid__menu-row">
            <button
              type="button"
              class={[
                'data-grid__menu-item',
                props.pinnedSide === 'left' ? 'data-grid__menu-item--active' : '',
              ]}
              onClick={() => props.onSetPin(props.column, 'left')}
              disabled={props.pinnedSide === 'left'}
            >
              <IconLeftPanelCloseRounded class="data-grid__menu-item-icon" />
              <span>Left</span>
            </button>
            <button
              type="button"
              class={[
                'data-grid__menu-item',
                props.pinnedSide === 'right' ? 'data-grid__menu-item--active' : '',
              ]}
              onClick={() => props.onSetPin(props.column, 'right')}
              disabled={props.pinnedSide === 'right'}
            >
              <IconRightPanelCloseRounded class="data-grid__menu-item-icon" />
              <span>Right</span>
            </button>
            <button
              type="button"
              class="data-grid__menu-item"
              onClick={() => props.onSetPin(props.column, false)}
              disabled={!props.pinnedSide}
            >
              <IconCloseRounded class="data-grid__menu-item-icon" />
              <span>Unpin</span>
            </button>
          </div>
        </div>
        <div class="data-grid__menu-section">
          <button type="button" class="data-grid__menu-close" onClick={props.onClose}>
            <IconCloseRounded class="data-grid__menu-item-icon" />
            <span>Close</span>
          </button>
        </div>
      </DataGridDropdownMenu>
    )
  },
})
