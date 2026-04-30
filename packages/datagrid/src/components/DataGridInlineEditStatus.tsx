import { defineComponent, type PropType, type VNodeChild } from 'vue'

import IconErrorOutlineRounded from '~icons/material-symbols/error-outline-rounded'

export type DataGridInlineEditStatusState = 'pending' | 'error'

export default defineComponent({
  name: 'DataGridInlineEditStatus',
  props: {
    status: {
      type: String as PropType<DataGridInlineEditStatusState | null>,
      default: null,
    },
    message: {
      type: String,
      default: '',
    },
    align: {
      type: String as PropType<'start' | 'center' | 'end'>,
      default: 'start',
    },
    title: {
      type: String,
      default: '',
    },
  },
  setup(props, { slots }) {
    return () => (
      <span
        class={[
          'data-grid__inline-edit-status',
          props.align === 'center' ? 'data-grid__inline-edit-status--center' : '',
          props.align === 'end' ? 'data-grid__inline-edit-status--end' : '',
          props.status === 'pending' ? 'data-grid__inline-edit-status--pending' : '',
          props.status === 'error' ? 'data-grid__inline-edit-status--error' : '',
        ]}
        title={props.message || props.title || undefined}
      >
        <span class="data-grid__inline-edit-status-content">
          {slots.default?.() as VNodeChild}
        </span>
        {props.status === 'pending' ? (
          <span class="data-grid__inline-edit-status-spinner" aria-label="Ladowanie" />
        ) : null}
        {props.status === 'error' ? (
          <IconErrorOutlineRounded
            class="data-grid__inline-edit-status-error-icon"
            aria-label={props.message || 'Blad zapisu'}
          />
        ) : null}
      </span>
    )
  },
})
