import Vue from 'vue'
import VueRouter from 'vue-router'
import Meetings from '../views/Meetings'
import MeetingRoom from '../views/MeetingRoom.vue'
import PageNotFound from '../views/404.vue'

Vue.use(VueRouter)

const routes = [
  {
    path: '/',
    name: 'meetings',
    component: Meetings,
    meta: {
      requiresLogin: false
    }
  },
  {
    path: '/room/:roomId',
    name: 'room/',
    component: MeetingRoom,
    meta: {
      requiresLogin: false
    }
  },
  {
    path: '*',
    component: PageNotFound
  }
]

const router = new VueRouter({
  mode: 'history',
  base: process.env.BASE_URL,
  routes
})

export default router
