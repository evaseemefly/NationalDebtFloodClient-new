import consola from 'consola'
import {
	SET_FLOOD_PLAIN_SHOW_TRIGGER,
	GET_FLOOD_PLAIN_SHOW_TRIGGER,
	SET_FLOOD_RISK_LEVEL,
	GET_FLOOD_RISK_LEVEL,
} from './../types'
import { FloodAreaLevelEnum } from '@/enum/flood'

export interface IFlood {
	floodPlainShowTrigger: number
	/** 淹没风险等级枚举 */
	floodRiskLevel: FloodAreaLevelEnum
}

const state: IFlood = {
	floodPlainShowTrigger: 0,
	/** 淹没风险等级枚举 */
	floodRiskLevel: FloodAreaLevelEnum.NONE, // 初始值为 NONE
}

const getters = {
	[GET_FLOOD_PLAIN_SHOW_TRIGGER](state: IFlood): number {
		return state.floodPlainShowTrigger
	},
	/**
	 * 获取淹没等级
	 * @param state
	 */
	[GET_FLOOD_RISK_LEVEL](state: IFlood): FloodAreaLevelEnum {
		return state.floodRiskLevel
	},
}

const mutations = {
	[SET_FLOOD_PLAIN_SHOW_TRIGGER](state: IFlood): void {
		state.floodPlainShowTrigger += 1
		// consola.info(`Flood plain show trigger updated: ${state.floodPlainShowTrigger}`)
		// 触发更新后，可以在这里添加其他逻辑，比如通知其他组件等
	},
	[SET_FLOOD_RISK_LEVEL](state: IFlood, level: FloodAreaLevelEnum): void {
		if (Object.values(FloodAreaLevelEnum).includes(level)) {
			state.floodRiskLevel = level
			consola.info(`Flood risk level updated: ${state.floodRiskLevel}`)
		} else {
			consola.warn(`Invalid flood risk level: ${level}`)
		}
	},
}

export default {
	namespaced: true,
	state: state,
	mutations,
	getters,
}
