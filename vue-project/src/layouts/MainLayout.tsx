import { defineComponent, type PropType } from 'vue'
import { RouterLink } from 'vue-router'

type PageIntro = {
  eyebrow: string
  title: string
  description: string
}

export default defineComponent({
  name: 'MainLayout',
  props: {
    intro: {
      type: Object as PropType<PageIntro>,
      required: true,
    },
  },
  setup(props, { slots }) {
    return () => (
      <div class="app-shell">
        <header class="app-header">
          <div class="container">
            <div>
              <p>Vue + JSX Starter</p>
              <h1>Prosty szablon aplikacji</h1>
            </div>

            <nav aria-label="Main navigation">
              <ul>
                <li>
                  <RouterLink to="/">Start</RouterLink>
                </li>
                <li>
                  <RouterLink to="/about">O projekcie</RouterLink>
                </li>
                <li>
                  <RouterLink to="/table">Tabela</RouterLink>
                </li>
              </ul>
            </nav>
          </div>
        </header>

        <main class="app-main">
          <div class="container">
            <section aria-labelledby="page-title">
              <p>{props.intro.eyebrow}</p>
              <h2 id="page-title">{props.intro.title}</h2>
              <p>{props.intro.description}</p>
            </section>

            {slots.default?.()}
          </div>
        </main>

        <footer class="app-footer">
          <div class="container">
            <p>Stopka aplikacji z miejscem na podstawowe informacje.</p>
          </div>
        </footer>
      </div>
    )
  },
})
