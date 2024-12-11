import { createResource } from 'frappe-ui'
import dayjs from '@/utils/dayjs'

// List of pre-imported locales
const PRELOADED_LOCALES = ['en', 'ru', 'es', 'fr', 'de', 'it', 'pt', 'zh', 'ja', 'ko', 'ar', 'hi']

export default function translationPlugin(app) {
  app.config.globalProperties.__ = translate
  window.__ = translate
  if (!window.translatedMessages) fetchTranslations()
}

function format(message, replace) {
  return message.replace(/{(\d+)}/g, function (match, number) {
    return typeof replace[number] != 'undefined' ? replace[number] : match
  })
}

function translate(message, replace, context = null) {
  let translatedMessages = window.translatedMessages || {}
  let translatedMessage = ''

  if (context) {
    let key = `${message}:${context}`
    if (translatedMessages[key]) {
      translatedMessage = translatedMessages[key]
    }
  }

  if (!translatedMessage) {
    translatedMessage = translatedMessages[message] || message
  }

  const hasPlaceholders = /{\d+}/.test(message)
  if (!hasPlaceholders) {
    return translatedMessage
  }

  return format(translatedMessage, replace)
}

function fetchTranslations(lang) {
  createResource({
    url: 'gameplan.api.get_translations',
    cache: 'translations',
    auto: true,
    transform: (data) => {
      window.translatedMessages = data || {}

      // Get language from HTML or detect from translations
      const locale = (() => {
        // If we see Russian translations, use Russian
        if (data && Object.values(data)[0] === 'A4' && Object.values(data)[1] === 'Конечная точка API') {
          return 'ru'
        }
        return document.documentElement.lang || 'en'
      })()

      // Only attempt dynamic import for non-preloaded locales
      if (!PRELOADED_LOCALES.includes(locale)) {
        try {
          // Dynamically import the locale
          import(/* @vite-ignore */ `dayjs/locale/${locale}.js`)
            .then(() => {
              dayjs.locale(locale)
            })
            .catch(() => {
              console.warn(`Dayjs locale '${locale}' not found, falling back to English`)
              dayjs.locale('en')
            })
        } catch (e) {
          console.warn('Error setting dayjs locale:', e)
          dayjs.locale('en')
        }
      } else {
        // For preloaded locales, just set the locale directly
        dayjs.locale(locale)
      }
    },
    onError: (error) => {
      console.error('Translation fetch error:', error)
      window.translatedMessages = {}
      dayjs.locale('en') // Fallback to English
    }
  })
}
