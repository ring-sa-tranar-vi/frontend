import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import LanguageDetector from 'i18next-browser-languagedetector'

import ar from './locales/ar.json'
import da from './locales/da.json'
import de from './locales/de.json'
import en from './locales/en.json'
import es from './locales/es.json'
import fi from './locales/fi.json'
import fit from './locales/fit.json'
import fr from './locales/fr.json'
import it from './locales/it.json'
import nl from './locales/nl.json'
import no from './locales/no.json'
import pl from './locales/pl.json'
import se from './locales/se.json'
import so from './locales/so.json'
import sv from './locales/sv.json'
import ta from './locales/ta.json'
import ur from './locales/ur.json'
import zh from './locales/zh.json'

const initialization = i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    fallbackLng: 'sv', // Swedish fallback
    detection: {
      order: ['localStorage'],
      caches: ['localStorage'],
    },
    debug: import.meta.env.DEV,

    resources: {
      ar: { translation: ar },
      da: { translation: da },
      de: { translation: de },
      en: { translation: en },
      es: { translation: es },
      fi: { translation: fi },
      fit: { translation: fit },
      fr: { translation: fr },
      it: { translation: it },
      nl: { translation: nl },
      no: { translation: no },
      pl: { translation: pl },
      se: { translation: se },
      so: { translation: so },
      sv: { translation: sv },
      ta: { translation: ta },
      ur: { translation: ur },
      zh: { translation: zh },
    },

    interpolation: {
      escapeValue: false,
    },
  })

function syncDocumentLanguage(language: string) {
  if (typeof document === 'undefined') return

  document.documentElement.lang = language
  document.documentElement.dir = i18n.dir(language)
}

void initialization.then(() =>
  syncDocumentLanguage(i18n.resolvedLanguage ?? i18n.language),
)
i18n.on('languageChanged', syncDocumentLanguage)

export default i18n
