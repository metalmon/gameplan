import dayjs from 'dayjs/esm'
import relativeTime from 'dayjs/esm/plugin/relativeTime'
import localizedFormat from 'dayjs/esm/plugin/localizedFormat'
import updateLocale from 'dayjs/esm/plugin/updateLocale'
import isToday from 'dayjs/esm/plugin/isToday'

// Import common locales
import en from 'dayjs/locale/en'
import ru from 'dayjs/locale/ru'
import es from 'dayjs/locale/es'
import fr from 'dayjs/locale/fr'
import de from 'dayjs/locale/de'
import it from 'dayjs/locale/it'
import pt from 'dayjs/locale/pt'
import zh from 'dayjs/locale/zh'
import ja from 'dayjs/locale/ja'
import ko from 'dayjs/locale/ko'
import ar from 'dayjs/locale/ar'
import hi from 'dayjs/locale/hi'

// Extend dayjs with plugins
dayjs.extend(updateLocale)
dayjs.extend(relativeTime)
dayjs.extend(localizedFormat)
dayjs.extend(isToday)

// Register all locales
dayjs.locale('en', en)
dayjs.locale('ru', ru)
dayjs.locale('es', es)
dayjs.locale('fr', fr)
dayjs.locale('de', de)
dayjs.locale('it', it)
dayjs.locale('pt', pt)
dayjs.locale('zh', zh)
dayjs.locale('ja', ja)
dayjs.locale('ko', ko)
dayjs.locale('ar', ar)
dayjs.locale('hi', hi)

// Set English as default
dayjs.locale('en')

export default dayjs
