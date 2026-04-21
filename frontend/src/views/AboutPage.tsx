import { defineComponent } from 'vue'

import MainLayout from '@/layouts/MainLayout'

export default defineComponent({
  name: 'AboutPage',
  setup() {
    return () => (
      <MainLayout
        intro={{
          eyebrow: 'Druga podstrona',
          title: 'Strona informacyjna',
          description:
            'Ten widok pokazuje prosty uklad tresci, ktory mozna rozbudowac o opis projektu, zespolu lub procesu.',
        }}
      >
        <section aria-labelledby="about-content">
          <h3 id="about-content">Przykladowa struktura tresci</h3>

          <article>
            <h4>O aplikacji</h4>
            <p>Krotki opis tego, czym jest projekt i jaki problem rozwiazuje.</p>
          </article>

          <article>
            <h4>Jak to rozwijac</h4>
            <p>Kolejne sekcje mozna dzielic na mniejsze komponenty i ladowac per widok.</p>
          </article>

          <article>
            <h4>Co dalej</h4>
            <p>Na tym etapie warto dopiero potem dodawac style, dane i logike biznesowa.</p>
          </article>
        </section>
      </MainLayout>
    )
  },
})
