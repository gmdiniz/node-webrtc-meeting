import Vue from 'vue'
import App from './App.vue'
import router from './router'
import store from './store'
import vuetify from './plugins/vuetify'
import mdiVue from 'mdi-vue/v2'

import './assets/reset.css'

import * as mdijs from '@mdi/js'

Vue.use(mdiVue, {
  icons: mdijs
})

Vue.config.productionTip = false

// router.beforeEach((to, from, next) => {
//   if (to.matched.some(record => record.meta.requiresLogin)) {
//     if (!store.getters.loggedIn) {
//       next({ name: 'login' })
//     } else {
//       next()
//     }
//   } else {
//     next()
//   }
// })

new Vue({
  router,
  store,
  vuetify,
  render: h => h(App)
}).$mount('#app')
