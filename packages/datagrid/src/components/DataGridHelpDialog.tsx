import { defineComponent, ref, type PropType } from 'vue'

import howToSearchImage from '../assets/datagrid_help.png'
import DataGridDialog from './DataGridDialog'

export default defineComponent({
  name: 'DataGridHelpDialog',
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
    const isImageExpanded = ref(false)

    return () => {
      if (!props.isOpen) {
        return null
      }

      return (
        <DataGridDialog
          title="Pomoc gridu"
          subtitle="Filtrowanie, zaznaczanie i skroty."
          ariaLabel="Pomoc gridu"
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
            <button
              type="button"
              class="data-grid__filter-help-image-link"
              aria-label="Powieksz infografike"
              onClick={() => {
                isImageExpanded.value = true
              }}
            >
              <img
                src={howToSearchImage}
                alt="Infografika pokazujaca jak uzywac wyszukiwania"
                class="data-grid__filter-help-image"
              />
            </button>

            <section class="data-grid__filter-help-section">
              <h5 class="data-grid__filter-help-title">Tryby filtrowania</h5>
              <ul class="data-grid__filter-help-list">
                <li>
                  Kolumny typu select maja dwa tryby: <strong>lista</strong> oraz{' '}
                  <strong>tekst</strong>.
                </li>
                <li>
                  W trybie listy zaznacz wartosci i kliknij <strong>Filtruj</strong>.
                </li>
                <li>
                  W trybie tekstowym wpisz warunek i kliknij <strong>Filtruj</strong>.
                </li>
                <li>
                  Przelaczanie trybu: kliknij przycisk <strong>T</strong> aby wejsc w tekst,
                  albo przycisk listy aby wrocic do wyboru z listy.
                </li>
                <li>
                  Jezeli kolumna ma tylko pole tekstowe, wpisz filtr i zatwierdz{' '}
                  <strong>Enterem</strong>. <strong>Escape</strong> cofa edycje pola.
                </li>
              </ul>
            </section>

            <section class="data-grid__filter-help-section">
              <h5 class="data-grid__filter-help-title">Tekst</h5>
              <ul class="data-grid__filter-help-list">
                <li>
                  Zwykly tekst, np. <code>BME</code>, szuka wartosci zawierajacych ten tekst.
                </li>
                <li>
                  Dokladne dopasowanie: <code>"BME"</code>.
                </li>
                <li>
                  AND: <code>tag1&amp;tag2</code>.
                </li>
                <li>
                  OR: <code>BME|VDL</code>.
                </li>
                <li>
                  Wykluczenie: <code>&lt;&gt;BME</code>.
                </li>
                <li>
                  Wildcard: <code>BM*</code>.
                </li>
              </ul>
            </section>

            <section class="data-grid__filter-help-section">
              <h5 class="data-grid__filter-help-title">Liczby</h5>
              <ul class="data-grid__filter-help-list">
                <li>
                  Wieksze / mniejsze: <code>&gt;100</code>, <code>&gt;=100</code>,{' '}
                  <code>&lt;50</code>, <code>&lt;=50</code>.
                </li>
                <li>
                  Zakres: <code>&gt;=10&amp;&lt;=50</code>.
                </li>
                <li>
                  Kilka wartosci: <code>10|20|30</code>.
                </li>
              </ul>
            </section>

            <section class="data-grid__filter-help-section">
              <h5 class="data-grid__filter-help-title">Daty</h5>
              <ul class="data-grid__filter-help-list">
                <li>
                  Bezpieczny format: <code>YYYY-MM-DD</code>, np. <code>2026-04-24</code>.
                </li>
                <li>
                  Dokladna data: <code>"2026-04-24"</code>.
                </li>
                <li>
                  Od daty: <code>&gt;=2026-04-01</code>.
                </li>
                <li>
                  Do daty: <code>&lt;=2026-04-30</code>.
                </li>
                <li>
                  Zakres dat: <code>&gt;=2026-04-01&amp;&lt;=2026-04-30</code>.
                </li>
                <li>
                  Kilka dat: <code>"2026-04-24"|"2026-04-25"</code>.
                </li>
              </ul>
            </section>

            <section class="data-grid__filter-help-section">
              <h5 class="data-grid__filter-help-title">Puste wartosci</h5>
              <ul class="data-grid__filter-help-list">
                <li>
                  Puste: <code>""</code> albo <code>''</code>.
                </li>
                <li>
                  Niepuste: <code>&lt;&gt;""</code>.
                </li>
              </ul>
            </section>

            <section class="data-grid__filter-help-section">
              <h5 class="data-grid__filter-help-title">Zaznaczanie</h5>
              <ul class="data-grid__filter-help-list">
                <li>Klik w checkbox zaznacza albo odznacza wiersz.</li>
                <li>
                  <strong>Shift + klik</strong> na checkboxie zaznacza zakres wierszy.
                </li>
                <li>
                  <strong>Ctrl + klik</strong> na komorce zaznacza pojedyncza komorke.
                </li>
                <li>
                  <strong>Ctrl + Shift + klik</strong> zaznacza zakres komorek od ostatnio
                  zaznaczonej komorki.
                </li>
                <li>
                  <strong>Shift + klik</strong> na komorce kolumny zaznacza cala kolumne.
                </li>
                <li>
                  <strong>Alt + klik</strong> na dowolnej komorce zaznacza lub odznacza wiersz
                  bez uruchamiania akcji komorki.
                </li>
                <li>
                  <strong>Alt + Shift + klik</strong> na dowolnej komorce zaznacza zakres wierszy
                  bez uruchamiania akcji komorki.
                </li>
                <li>
                  Panel zaznaczenia pozwala kopiowac zaznaczone wiersze, kolumny lub komorki,
                  czyscic zaznaczenie i uruchamiac dodatkowe akcje.
                </li>
              </ul>
            </section>
          </div>

          {isImageExpanded.value ? (
            <div
              class="data-grid__filter-help-preview"
              role="dialog"
              aria-modal="true"
              aria-label="Powiekszona infografika"
              onClick={() => {
                isImageExpanded.value = false
              }}
            >
              <div class="data-grid__filter-help-preview-panel" onClick={(event) => event.stopPropagation()}>
                <button
                  type="button"
                  class="data-grid__dialog-close data-grid__filter-help-preview-close"
                  onClick={() => {
                    isImageExpanded.value = false
                  }}
                >
                  Zamknij
                </button>
                <img
                  src={howToSearchImage}
                  alt="Infografika pokazujaca jak uzywac wyszukiwania"
                  class="data-grid__filter-help-preview-image"
                />
              </div>
            </div>
          ) : null}
        </DataGridDialog>
      )
    }
  },
})
