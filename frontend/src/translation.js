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
  createResource({
    url: 'gameplan.api.get_translations',
    cache: 'translations',
    auto: true,
    onSuccess: (data) => {
      window.translatedMessages = data.translations || {}
      setDayjsLocale(data.language)
    },
    onError: () => {
      window.translatedMessages = {}
    }
  })
}
