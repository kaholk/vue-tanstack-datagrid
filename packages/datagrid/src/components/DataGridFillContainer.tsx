import { defineComponent } from 'vue'

export default defineComponent({
  name: 'DataGridFillContainer',
  setup(_, { slots }) {
    return () => <div class="data-grid-fill-container">{slots.default?.()}</div>
  },
})
