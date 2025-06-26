import { ITyGroupComplexList, ITyGroupTip } from '@/interface/typhoon'
import {
	SET_TYPHOON_PATH_LIST,
	GET_TYPHOON_PATH_LIST,
	GET_TY_GROUP,
	SET_TY_GROUP,
	GET_TY_GROUP_PATH,
	SET_TY_GROUP_PATH,
} from './../types'
import { DEFAULT_TIMESTAMP, DEFAULT_TY_CODE } from '@/const/default'

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
	tyGroup: ITyGroupTip
	/** 当前选中的case中的指定预报台风路径(5种) */
	tyGroupPath: ITyGroupComplexList
}

const state: ITyphoon = {
	tyPathList: [],
	tyGroup: {
		tyCode: DEFAULT_TY_CODE,
		timeStamp: DEFAULT_TIMESTAMP,
	},
	tyGroupPath: null,
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
	[GET_TY_GROUP](state: ITyphoon): ITyGroupTip {
		return state.tyGroup
	},
	[GET_TY_GROUP_PATH](state: ITyphoon): ITyGroupComplexList {
		return state.tyGroupPath
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
	[SET_TY_GROUP](state: ITyphoon, tyGroup: ITyGroupTip): void {
		state.tyGroup = tyGroup
	},
	[SET_TY_GROUP_PATH](state: ITyphoon, tyGroupPath: ITyGroupComplexList): void {
		state.tyGroupPath = tyGroupPath
	},
}

export default {
	// TODO:[-] 21-07-24 切记此处是 namespaced 而不是 namespace
	namespaced: true,
	state: state,
	mutations,
	getters,
}
