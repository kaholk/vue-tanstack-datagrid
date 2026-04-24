import { defineComponent, type PropType } from 'vue'

import DataGridDialog from './DataGridDialog'

export default defineComponent({
  name: 'DataGridFilterHelpDialog',
  props: {
    isOpen: {
      type: Boolean,
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
          title="Jak uzywac filtrow"
          subtitle="Skrocona instrukcja budowania filtrow tekstowych, liczbowych i dat."
          ariaLabel="Pomoc dotyczaca filtrowania"
          surfaceClass="data-grid__dialog--filter-help"
          onClose={props.onClose}
          v-slots={{
            footer: () => (
              <button type="button" class="data-grid__dialog-action" onClick={props.onClose}>
                Zamknij
              </button>
            ),
          }}
        >
          <div class="data-grid__filter-help-content">
            <section class="data-grid__filter-help-section">
              <h5 class="data-grid__filter-help-title">1. Zwykle wpisywanie</h5>
              <p class="data-grid__filter-help-text">
                Wpisanie tekstu, np. <code>BME</code>, wyszukuje rekordy zawierajace te wartosc.
              </p>
            </section>

            <section class="data-grid__filter-help-section">
              <h5 class="data-grid__filter-help-title">2. Operatory logiczne</h5>
              <ul class="data-grid__filter-help-list">
                <li>
                  <strong>&amp;</strong> oznacza AND, np. <code>tag1&amp;tag2</code>
                </li>
                <li>
                  <strong>|</strong> oznacza OR, np. <code>BME|VDL</code>
                </li>
              </ul>
            </section>

            <section class="data-grid__filter-help-section">
              <h5 class="data-grid__filter-help-title">3. Dokladne dopasowanie</h5>
              <p class="data-grid__filter-help-text">
                Uzyj cudzyslowu, np. <code>"BME"</code>, aby dopasowac dokladna wartosc.
              </p>
            </section>

            <section class="data-grid__filter-help-section">
              <h5 class="data-grid__filter-help-title">4. Operatory porownania</h5>
              <ul class="data-grid__filter-help-list">
                <li>
                  <code>&gt;100</code>, <code>&gt;=100</code>, <code>&lt;50</code>, <code>&lt;=50</code>
                </li>
                <li>
                  <code>&lt;&gt;BME</code> wyklucza wartosci zawierajace <code>BME</code>
                </li>
                <li>
                  <code>*</code> dziala jako wildcard, np. <code>BM*</code>
                </li>
              </ul>
            </section>

            <section class="data-grid__filter-help-section">
              <h5 class="data-grid__filter-help-title">5. Daty</h5>
              <p class="data-grid__filter-help-text">
                Backend w tym gridzie obsluguje filtrowanie dat dla kolumn:
                <code> transport_date</code>, <code>confirmed_date</code>, <code>hidden_confirmed_date</code>
                i <code>received_date</code>. Dla <code>received_date</code> porownanie idzie po samej dacie,
                bez czasu.
              </p>
              <ul class="data-grid__filter-help-list">
                <li>
                  Wymagany, bezpieczny format: <code>YYYY-MM-DD</code>, np. <code>2026-04-24</code>
                </li>
                <li>
                  Dokladna data: <code>"2026-04-24"</code>
                </li>
                <li>
                  Od daty: <code>&gt;=2026-04-01</code>
                </li>
                <li>
                  Do daty: <code>&lt;=2026-04-30</code>
                </li>
                <li>
                  Zakres dat: <code>&gt;=2026-04-01&amp;&lt;=2026-04-30</code>
                </li>
                <li>
                  Kilka mozliwych dat: <code>"2026-04-24"|"2026-04-25"</code>
                </li>
              </ul>
            </section>

            <section class="data-grid__filter-help-section">
              <h5 class="data-grid__filter-help-title">6. Puste wartosci</h5>
              <p class="data-grid__filter-help-text">
                Aby znalezc puste pola uzyj <code>""</code> albo <code>''</code>. Aby znalezc niepuste:
                <code>&lt;&gt;""</code>
              </p>
            </section>
          </div>
        </DataGridDialog>
      )
    }
  },
})
