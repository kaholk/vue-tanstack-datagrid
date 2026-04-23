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
          title="Jak używać filtrów"
          subtitle="Instrukcja tworzenia zaawansowanych zapytań wyszukiwania."
          ariaLabel="Pomoc dotycząca filtrowania"
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
          <div style={{ padding: '0 16px 16px 16px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <h5 style={{ margin: '0 0 8px 0', fontSize: '14px', fontWeight: 600 }}>1. Zwykłe wpisywanie</h5>
              <p style={{ margin: 0, fontSize: '13px', color: 'var(--app-text-muted)' }}>
                Wpisanie tekstu np. <strong>BME</strong> wyszuka wszystkie rekordy zawierające ten tekst w danym polu.
              </p>
            </div>

            <div>
              <h5 style={{ margin: '0 0 8px 0', fontSize: '14px', fontWeight: 600 }}>2. Operatory logiczne</h5>
              <ul style={{ margin: 0, paddingLeft: '20px', fontSize: '13px', color: 'var(--app-text-muted)' }}>
                <li style={{ marginBottom: '4px' }}>
                  <strong>& (AND)</strong> - musi spełniać oba warunki. Np. <code>tag1&tag2</code>
                </li>
                <li>
                  <strong>| (OR)</strong> - musi spełniać przynajmniej jeden z warunków. Np. <code>BME|VDL</code>
                </li>
              </ul>
            </div>

            <div>
              <h5 style={{ margin: '0 0 8px 0', fontSize: '14px', fontWeight: 600 }}>3. Dokładne dopasowanie</h5>
              <p style={{ margin: 0, fontSize: '13px', color: 'var(--app-text-muted)' }}>
                Użyj podwójnych <code>""</code> lub pojedynczych <code>''</code> cudzysłowów, aby znaleźć dokładną wartość.
                Np. wpisanie <code>"BME"</code> znajdzie dokładnie <strong>BME</strong> (ale już nie <strong>BMEX</strong>).
              </p>
            </div>

            <div>
              <h5 style={{ margin: '0 0 8px 0', fontSize: '14px', fontWeight: 600 }}>4. Puste wartości</h5>
              <p style={{ margin: 0, fontSize: '13px', color: 'var(--app-text-muted)' }}>
                Aby znaleźć wartości puste (brak przypisania), wpisz <code>""</code> lub <code>''</code>. Możesz również użyć <code>&lt;&gt;""</code> aby znaleźć pola, które <strong>nie są</strong> puste.
              </p>
            </div>

            <div>
              <h5 style={{ margin: '0 0 8px 0', fontSize: '14px', fontWeight: 600 }}>5. Operatory porównania i wykluczenia</h5>
              <p style={{ margin: '0 0 4px 0', fontSize: '13px', color: 'var(--app-text-muted)' }}>
                Dostępne operatory (muszą znajdować się na początku zapytania): <code>&lt;</code>, <code>&gt;</code>, <code>&lt;=</code>, <code>&gt;=</code>, <code>&lt;&gt;</code> (różne).
              </p>
              <ul style={{ margin: 0, paddingLeft: '20px', fontSize: '13px', color: 'var(--app-text-muted)' }}>
                <li style={{ marginBottom: '4px' }}>
                  <code>&lt;&gt;BME</code> - odfiltruje rekordy, które zawierają "BME".
                </li>
                <li style={{ marginBottom: '4px' }}>
                  <code>&gt;100</code> - liczby większe niż 100.
                </li>
                <li>
                  <code>&lt;&gt;BME&amp;&lt;&gt;VDL</code> - odfiltruje wszystko co zawiera "BME" oraz "VDL".
                </li>
              </ul>
            </div>

            <div>
              <h5 style={{ margin: '0 0 8px 0', fontSize: '14px', fontWeight: 600 }}>6. Zastępowanie znaków (Wildcards)</h5>
              <p style={{ margin: 0, fontSize: '13px', color: 'var(--app-text-muted)' }}>
                Użyj <code>*</code> aby zastąpić dowolny ciąg znaków. Np. <code>BM*</code> znajdzie wartości zaczynające się na "BM".
              </p>
            </div>
          </div>
        </DataGridDialog>
      )
    }
  },
})
