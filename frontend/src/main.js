import { createApp } from 'vue'
import {
  Button,
  Input,
  TextInput,
  FormControl,
  ErrorMessage,
  Dialog,
  Alert,
  Badge,
  request,
  setConfig,
  frappeRequest,
  pageMetaPlugin,
  resourcesPlugin,
} from 'frappe-ui'
import * as Sentry from '@sentry/vue'
import router from './router'
import App from './App.vue'
import './index.css'
import { getPlatform } from '@/utils'
import dayjs from '@/utils/dayjs'
import { createDialog } from './utils/dialogs'
import { createToast } from './utils/toasts'
import { getUser, users } from './data/users'
import { session } from './data/session'
import { initSocket } from './socket'
import resetDataMixin from './utils/resetDataMixin'
import translationPlugin from './translation'

let globalComponents = {
  Button,
  TextInput,
  Input,
  FormControl,
  ErrorMessage,
  Dialog,
  Alert,
  Badge,
}
let app = createApp(App)
setConfig('resourceFetcher', frappeRequest)
setConfig('defaultListUrl', 'gameplan.extends.client.get_list')
app.use(translationPlugin)
app.use(resourcesPlugin)
app.use(pageMetaPlugin)
app.use(router)
app.mixin(resetDataMixin)
for (let key in globalComponents) {
  app.component(key, globalComponents[key])
}
app.config.globalProperties.$dayjs = dayjs
app.config.globalProperties.$dialog = createDialog
app.config.globalProperties.$toast = createToast
app.config.globalProperties.$log = console.log.bind(console)
app.config.globalProperties.$user = getUser
app.config.globalProperties.$users = users
app.config.globalProperties.$session = session
app.config.globalProperties.$readOnlyMode = window.read_only_mode
app.config.globalProperties.$platform = getPlatform()
app.config.globalProperties.$isSessionUser = (email) => {
  return getUser().name === email
}

let socket
if (import.meta.env.DEV) {
  frappeRequest({ url: '/api/method/gameplan.www.g.get_context_for_dev' }).then((values) => {
    for (let key in values) {
      window[key] = values[key]
    }
    socket = initSocket()
    app.config.globalProperties.$socket = socket
    app.mount('#app')
  })
} else {
  socket = initSocket()
  app.config.globalProperties.$socket = socket
  app.mount('#app')
}

// sentry error logging
if (import.meta.env.PROD && window.gameplan_frontend_sentry_dsn) {
  Sentry.init({
    app,
    dsn: window.gameplan_frontend_sentry_dsn,
    integrations: [Sentry.browserTracingIntegration({ router })],
    tracesSampleRate: 1.0,
  })
}

if (import.meta.env.DEV) {
  window.$dayjs = dayjs
  window.$user = getUser
  window.$users = users
  window.$session = session
  window.$dialog = createDialog
  window.$toast = createToast
  window.$request = request
  window.$frappeRequest = frappeRequest
  window.$router = router
}
