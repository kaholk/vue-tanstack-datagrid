import { defineComponent, type CSSProperties, type PropType } from 'vue'

export default defineComponent({
  name: 'DataGridDropdownMenu',
  props: {
    menuClass: {
      type: [String, Array] as PropType<string | string[]>,
      default: '',
    },
    scopeAttr: {
      type: String,
      default: '',
    },
    style: {
      type: Object as PropType<CSSProperties>,
      default: undefined,
    },
  },
  setup(props, { slots }) {
    return () => (
      <div
        class={props.menuClass}
        style={props.style}
        {...(props.scopeAttr ? { [props.scopeAttr]: 'true' } : {})}
        onClick={(event) => event.stopPropagation()}
      >
        {slots.default?.()}
      </div>
    )
  },
})
