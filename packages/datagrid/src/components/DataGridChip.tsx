import { defineComponent, type PropType } from 'vue'

type ChipTone = 'neutral' | 'info' | 'success' | 'warning' | 'danger'

export default defineComponent({
  name: 'DataGridChip',
  props: {
    label: {
      type: String,
      required: true,
    },
    tone: {
      type: String as PropType<ChipTone>,
      default: 'neutral',
    },
    color: {
      type: String,
      default: '',
    },
  },
  setup(props) {
    return () => (
      <span
        class={['data-grid__chip', props.color ? '' : `data-grid__chip--${props.tone}`]}
        style={props.color ? { '--data-grid-chip-color': props.color } : undefined}
      >
        {props.label}
      </span>
    )
  },
})
