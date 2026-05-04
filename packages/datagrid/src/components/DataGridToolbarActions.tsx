import { defineComponent, type PropType, type VNodeChild } from 'vue'
import IconDeleteRounded from '~icons/material-symbols/delete-rounded'
import IconFilterAltOutline from '~icons/material-symbols/filter-alt-outline'
import IconHelpOutlineRounded from '~icons/material-symbols/help-outline-rounded'
import IconRefreshRounded from '~icons/material-symbols/refresh-rounded'
import IconViewColumnOutlineRounded from '~icons/material-symbols/view-column-outline-rounded'

export default defineComponent({
  name: 'DataGridToolbarActions',
  props: {
    activeFilterCount: {
      type: Number,
      default: 0,
    },
    onToggleFilterDialog: {
      type: Function as PropType<() => void>,
      required: true,
    },
    onRefresh: {
      type: Function as PropType<() => void>,
      required: true,
    },
    onClearFilters: {
      type: Function as PropType<() => void>,
      required: true,
    },
    onToggleFilterHelpDialog: {
      type: Function as PropType<() => void>,
      required: true,
    },
    onToggleColumnPicker: {
      type: Function as PropType<() => void>,
      required: true,
    },
    customActions: {
      type: Array as PropType<VNodeChild[] | undefined>,
      default: undefined,
    },
  },
  setup(props) {
    return () => (
      <div class="data-grid__toolbar-actions" data-grid-dialog-root="true">
        {props.customActions}
        <div class="data-grid__toolbar-button-group" data-grid-dialog-root="true">
          <button
            type="button"
            class={[
              'data-grid__toolbar-button',
              props.activeFilterCount > 0 ? 'data-grid__toolbar-button--group-start' : '',
            ]}
            onClick={props.onToggleFilterDialog}
            data-grid-dialog-root="true"
          >
            <IconFilterAltOutline class="data-grid__button-icon" />
            <span>Filtry</span>
            {props.activeFilterCount > 0 ? (
              <span class="data-grid__badge">{props.activeFilterCount}</span>
            ) : null}
          </button>
          {props.activeFilterCount > 0 ? (
            <button
              type="button"
              class={[
                'data-grid__toolbar-button',
                'data-grid__toolbar-button--danger',
                'data-grid__toolbar-button--icon-only',
                'data-grid__toolbar-button--group-end',
              ]}
              onClick={props.onClearFilters}
              aria-label="Wyczysc filtry"
              title="Wyczysc filtry"
              data-grid-dialog-root="true"
            >
              <IconDeleteRounded class="data-grid__button-icon" />
            </button>
          ) : null}
        </div>
        <button
          type="button"
          class="data-grid__toolbar-button data-grid__toolbar-button--icon-only"
          onClick={props.onToggleFilterHelpDialog}
          aria-label="Pomoc gridu"
          title="Pomoc gridu"
          data-grid-dialog-root="true"
        >
          <IconHelpOutlineRounded class="data-grid__button-icon" />
        </button>
        <button
          type="button"
          class="data-grid__toolbar-button"
          onClick={props.onRefresh}
          data-grid-dialog-root="true"
        >
          <IconRefreshRounded class="data-grid__button-icon" />
          <span>Odswiez</span>
        </button>
        <button
          type="button"
          class="data-grid__toolbar-button"
          onClick={props.onToggleColumnPicker}
          data-grid-dialog-root="true"
        >
          <IconViewColumnOutlineRounded class="data-grid__button-icon" />
          <span>Kolumny</span>
        </button>
      </div>
    )
  },
})
