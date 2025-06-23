import Vue from 'vue'
import VueRouter, { RouteConfig } from 'vue-router'
import FloodForecastHomeView from '../views/FloodForecastHomeView.vue'

Vue.use(VueRouter)

const routes: Array<RouteConfig> = [
	{
		// 广东省淹没系统 home 页
		path: '/flood/forecast',
		name: 'home',
		component: FloodForecastHomeView,
	},
]

const router = new VueRouter({
	mode: 'history',
	// @ts-ignore
	base: process.env.BASE_URL,
	routes,
})

export default router
