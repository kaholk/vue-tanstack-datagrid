import { defineComponent, type PropType } from 'vue'

export default defineComponent({
  name: 'DataGridEditableCellTrigger',
  props: {
    editable: {
      type: Boolean,
      default: false,
    },
    title: {
      type: String,
      default: '',
    },
    align: {
      type: String as PropType<'start' | 'center' | 'end'>,
      default: 'start',
    },
    multiline: {
      type: Boolean,
      default: false,
    },
    truncate: {
      type: Boolean,
      default: false,
    },
    onTrigger: {
      type: Function as PropType<() => void>,
      default: undefined,
    },
  },
  setup(props, { slots }) {
    return () => (
      <div
        class={[
          'data-grid__editable-trigger',
          props.editable ? 'data-grid__editable-trigger--editable' : '',
          props.align === 'center' ? 'data-grid__editable-trigger--center' : '',
          props.align === 'end' ? 'data-grid__editable-trigger--end' : '',
          props.multiline ? 'data-grid__editable-trigger--multiline' : '',
          props.truncate ? 'data-grid__editable-trigger--truncate' : '',
        ]}
        title={props.editable ? props.title : ''}
        onClick={(event) => {
          event.stopPropagation()
          if (props.editable) {
            props.onTrigger?.()
          }
        }}
      >
        {slots.default?.()}
      </div>
    )
  },
})
