import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import LanguageDetector from 'i18next-browser-languagedetector'

import en from './locales/en.json'
import pl from './locales/pl.json'
import so from './locales/so.json'
import sv from './locales/sv.json'
import ta from './locales/ta.json'
import ur from './locales/ur.json'

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
      en: { translation: en },
      pl: { translation: pl },
      so: { translation: so },
      sv: { translation: sv },
      ta: { translation: ta },
      ur: { translation: ur },
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
