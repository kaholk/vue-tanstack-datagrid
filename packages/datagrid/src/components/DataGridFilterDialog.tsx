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
    onClose: {
      type: Function as PropType<() => void>,
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
                      <div key={config.id} class="data-grid__filter-dialog-row">
                        <div class="data-grid__filter-dialog-main">
                          <span class="data-grid__filter-dialog-label">{config.label}</span>
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
