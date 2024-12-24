import dayjs from 'dayjs'
import advancedFormat from 'dayjs/plugin/advancedFormat'
import timezone from 'dayjs/plugin/timezone'
import utc from 'dayjs/plugin/utc'
import localizedFormat from 'dayjs/plugin/localizedFormat'
import relativeTime from 'dayjs/plugin/relativeTime'
import updateLocale from 'dayjs/plugin/updateLocale'
import isToday from 'dayjs/esm/plugin/isToday'

// Import common locales
import 'dayjs/locale/en'
import 'dayjs/locale/ru'
import 'dayjs/locale/es'
import 'dayjs/locale/fr'
import 'dayjs/locale/de'
import 'dayjs/locale/it'
import 'dayjs/locale/pt'
import 'dayjs/locale/zh'
import 'dayjs/locale/ja'
import 'dayjs/locale/ko'
import 'dayjs/locale/ar'
import 'dayjs/locale/hi'

// Extend dayjs with plugins
dayjs.extend(advancedFormat)
dayjs.extend(timezone)
dayjs.extend(utc)
dayjs.extend(localizedFormat)
dayjs.extend(relativeTime)
dayjs.extend(updateLocale)
dayjs.extend(isToday)

// Function to set dayjs locale
export async function setDayjsLocale(locale = null) {
  // Use provided locale or get from browser/system settings
  locale = locale || window.navigator.language || 'en'
  // Handle locales with region codes (e.g., 'en-US' -> 'en')
  const baseLocale = locale.split('-')[0].toLowerCase()
  
  try {
    // Try to use preloaded locale
    if (!dayjs.Ls[baseLocale]) {
      // If locale is not loaded, try to load it dynamically
      console.log(`Loading locale: ${baseLocale}`)
      // Add @vite-ignore comment to suppress dynamic import warning
      await import(/* @vite-ignore */ `dayjs/locale/${baseLocale}.js`)
    }
    
    dayjs.locale(baseLocale)
    console.log(`Locale set to: ${baseLocale}`)
  } catch (e) {
    console.warn(`Dayjs locale '${baseLocale}' not found, falling back to English:`, e)
    dayjs.locale('en')
  }
}

// Format date with current locale
export function formatDate(date, format = 'L LTS') {
  if (!date) return ''
  return dayjs(date).format(format)
}

// Get relative time in current locale
export function timeAgo(date) {
  if (!date) return ''
  return dayjs(date).fromNow()
}

export default dayjs 