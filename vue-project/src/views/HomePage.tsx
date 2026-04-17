import { defineComponent } from 'vue'

import MainLayout from '@/layouts/MainLayout'

export default defineComponent({
  name: 'HomePage',
  setup() {
    return () => (
      <MainLayout
        intro={{
          eyebrow: 'Strona glowna',
          title: 'Punkt startowy aplikacji',
          description:
            'Ten widok moze pelnic role dashboardu lub strony powitalnej z najwazniejszymi sekcjami projektu.',
        }}
      >
        <section aria-labelledby="home-overview">
          <h3 id="home-overview">Sekcje startowe</h3>
          <div>
            <article>
              <h4>Hero / wstep</h4>
              <p>Krotkie przedstawienie celu aplikacji i glownego wezwania do akcji.</p>
            </article>

            <article>
              <h4>Najwazniejsze informacje</h4>
              <p>Miejsce na skrot funkcji, status, liczby albo najwazniejsze komunikaty.</p>
            </article>

            <article>
              <h4>Nastepne kroki</h4>
              <p>Blok na onboarding, szybkie linki lub dalsza nawigacje po aplikacji.</p>
            </article>
          </div>
        </section>
      </MainLayout>
    )
  },
})
