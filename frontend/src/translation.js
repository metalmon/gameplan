import { createResource } from 'frappe-ui'
import { setDayjsLocale } from './utils/dayjs'
export default function translationPlugin(app) {
  app.config.globalProperties.__ = translate
  window.__ = translate
  
  // Initialize translations
  fetchTranslations()
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

function fetchTranslations() {
  const maxRetries = 3
  const baseDelay = 1000 // 1 second
  let retryCount = 0

  function attemptFetch() {
    createResource({
      url: 'gameplan.api.get_translations',
      cache: 'translations',
      auto: true,
      onSuccess: (data) => {
        window.translatedMessages = data.translations || {}
        setDayjsLocale(data.language)
      },
      onError: (error) => {
        retryCount++
        if (retryCount < maxRetries) {
          // Exponential backoff: 1s, 2s, 4s
          const delay = baseDelay * Math.pow(2, retryCount - 1)
          console.warn(`Failed to fetch translations (attempt ${retryCount}/${maxRetries}). Retrying in ${delay/1000}s...`, error)
          setTimeout(attemptFetch, delay)
        } else {
          console.error('Failed to fetch translations after all retries. Using empty translations.', error)
          window.translatedMessages = {}
        }
      }
    })
  }

  attemptFetch()
}
