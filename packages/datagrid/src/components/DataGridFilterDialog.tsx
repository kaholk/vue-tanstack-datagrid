import { defineComponent, type PropType, type VNodeChild } from 'vue'

import DataGridDialog from './DataGridDialog'
import type { DataGridFilterConfig } from '../types'

type FilterDialogSection = {
  id: string
  label: string
  items: DataGridFilterConfig[]
}

export default defineComponent({
  name: 'DataGridFilterDialog',
  props: {
    isOpen: {
      type: Boolean,
      required: true,
    },
    sections: {
      type: Array as PropType<FilterDialogSection[]>,
      required: true,
    },
    renderFilterControl: {
      type: Function as PropType<(config: DataGridFilterConfig) => VNodeChild>,
      required: true,
    },
    isFilterPending: {
      type: Function as PropType<(config: DataGridFilterConfig) => boolean>,
      required: true,
    },
    onClose: {
      type: Function as PropType<() => void>,
      required: true,
    },
    onApply: {
      type: Function as PropType<() => void>,
      required: true,
    },
    onResetDraft: {
      type: Function as PropType<() => void>,
      required: true,
    },
    onResetFilterDraft: {
      type: Function as PropType<(config: DataGridFilterConfig) => void>,
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
          title="Filtry"
          subtitle="Alternatywne miejsce do filtrowania danych i dodatkowe filtry spoza naglowkow."
          ariaLabel="Filter settings"
          surfaceClass="data-grid__dialog--filters"
          onClose={props.onClose}
          v-slots={{
            footer: () => [
              <button type="button" class="data-grid__dialog-action" onClick={props.onResetDraft}>
                Cofnij zmiany
              </button>,
              <button type="button" class="data-grid__dialog-action" onClick={props.onApply}>
                Filtruj
              </button>,
            ],
          }}
        >
          <div class="data-grid__filter-dialog-list">
            {props.sections.length > 0 ? (
              props.sections.map((section) => (
                <div key={section.id} class="data-grid__filter-dialog-section">
                  <div class="data-grid__filter-dialog-section-header">
                    <h5 class="data-grid__filter-dialog-section-title">{section.label}</h5>
                    <span class="data-grid__dialog-meta">
                      {section.items.length} {section.items.length === 1 ? 'filtr' : 'filtrow'}
                    </span>
                  </div>
                  <div class="data-grid__filter-dialog-group">
                    {section.items.map((config) => (
                      <div
                        key={config.id}
                        class={[
                          'data-grid__filter-dialog-row',
                          props.isFilterPending(config) ? 'data-grid__filter-dialog-row--pending' : '',
                        ]}
                      >
                        <div class="data-grid__filter-dialog-main">
                          <div class="data-grid__filter-dialog-title-row">
                            <span class="data-grid__filter-dialog-label">{config.label}</span>
                            {props.isFilterPending(config) ? (
                              <button
                                type="button"
                                class="data-grid__filter-dialog-reset"
                                title="Cofnij zmiany"
                                aria-label="Cofnij zmiany"
                                onClick={() => props.onResetFilterDraft(config)}
                              >
                                Cofnij
                              </button>
                            ) : null}
                          </div>
                          <span class="data-grid__dialog-meta">{config.id}</span>
                        </div>
                        <div class="data-grid__filter-dialog-control">
                          {props.renderFilterControl(config)}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))
            ) : (
              <div class="data-grid__filter-dialog-empty">Brak filtrow do skonfigurowania.</div>
            )}
          </div>
        </DataGridDialog>
      )
    }
  },
})
