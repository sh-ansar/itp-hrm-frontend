import { createRouter, createWebHistory } from 'vue-router'
import OverviewView from '../views/OverviewView.vue'
export const router = createRouter({ history: createWebHistory(), routes: [{ path: '/', name: 'overview', component: OverviewView }, { path: '/:pathMatch(.*)*', redirect: '/' }] })
