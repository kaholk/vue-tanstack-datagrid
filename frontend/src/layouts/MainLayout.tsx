import { computed, defineComponent, onMounted, ref, watch, type PropType } from 'vue'
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
    const theme = ref<'light' | 'dark'>('light')
    const themeToggleLabel = computed(() =>
      theme.value === 'light' ? 'Przelacz na ciemny motyw' : 'Przelacz na jasny motyw',
    )

    onMounted(() => {
      if (typeof window === 'undefined') {
        return
      }

      const storedTheme = window.localStorage.getItem('app-theme')
      if (storedTheme === 'light' || storedTheme === 'dark') {
        theme.value = storedTheme
        return
      }

      theme.value = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
    })

    watch(
      theme,
      (value) => {
        if (typeof document !== 'undefined') {
          document.documentElement.dataset.theme = value
        }

        if (typeof window !== 'undefined') {
          window.localStorage.setItem('app-theme', value)
        }
      },
      { immediate: true },
    )

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

            <button
              type="button"
              class="theme-toggle"
              aria-label={themeToggleLabel.value}
              onClick={() => {
                theme.value = theme.value === 'light' ? 'dark' : 'light'
              }}
            >
              {theme.value === 'light' ? 'Tryb ciemny' : 'Tryb jasny'}
            </button>
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
