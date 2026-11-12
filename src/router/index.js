import { createRouter, createWebHistory } from 'vue-router'

const SetupView = () => import('../views/SetupView.vue')
const CompetitionView = () => import('../views/CompetitionView.vue')

export const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/',
      name: 'setup',
      component: SetupView,
      meta: { view: 'setup' },
    },
    {
      path: '/competition',
      name: 'competition',
      component: CompetitionView,
      meta: { view: 'competition' },
    },
    {
      path: '/:pathMatch(.*)*',
      redirect: '/',
    },
  ],
  scrollBehavior() {
    return { top: 0 }
  },
})
