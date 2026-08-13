import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import LanguageDetector from 'i18next-browser-languagedetector'
import fr from './locales/fr.json'
import en from './locales/en.json'

i18n
  .use(LanguageDetector)     // détecte la langue du navigateur
  .use(initReactI18next)     // connecte i18next à React
  .init({
    resources: {
      fr: { translation: fr },
      en: { translation: en },
    },
    fallbackLng: 'fr',       // si langue non trouvée → français par défaut
    interpolation: {
      escapeValue: false,    // React gère déjà la sécurité XSS
    },
  })

export default i18n