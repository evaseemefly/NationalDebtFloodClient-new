import { SET_TYPHOON_PATH_LIST, GET_TYPHOON_PATH_LIST } from './../types'

export interface ITyphoon {
	/** 台风路径 */
	tyPathList: {
		forecastDt: Date
		lat: number
		lon: number
		bp: number
		isForecast: boolean
		tyType: string
	}[]
}

const state: ITyphoon = {
	tyPathList: [],
}

const getters = {
	[GET_TYPHOON_PATH_LIST](state: ITyphoon): {
		forecastDt: Date
		lat: number
		lon: number
		bp: number
		isForecast: boolean
		tyType: string
	}[] {
		return state.tyPathList
	},
}

const mutations = {
	[SET_TYPHOON_PATH_LIST](
		state: ITyphoon,
		pathList: {
			forecastDt: Date
			lat: number
			lon: number
			bp: number
			isForecast: boolean
			tyType: string
		}[]
	): void {
		state.tyPathList = pathList
	},
}

export default {
	// TODO:[-] 21-07-24 切记此处是 namespaced 而不是 namespace
	namespaced: true,
	state: state,
	mutations,
	getters,
}
