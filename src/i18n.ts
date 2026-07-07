import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import LanguageDetector from 'i18next-browser-languagedetector'

import en from './locales/en.json'
import so from './locales/so.json'
import sv from './locales/sv.json'
import ta from './locales/ta.json'
import ur from './locales/ur.json'

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    fallbackLng: 'sv', // Swedish fallback
    detection: {
      order: ['localStorage'],
      caches: ['localStorage'],
    },
    debug: true,

    resources: {
      en: { translation: en },
      so: { translation: so },
      sv: { translation: sv },
      ta: { translation: ta },
      ur: { translation: ur },
    },

    interpolation: {
      escapeValue: false,
    },
  })

export default i18n
