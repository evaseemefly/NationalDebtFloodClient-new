import { LayerTypeEnum } from '@/enum/map'
import { TyphoonGroupTypeEnum } from '@/enum/typhoon'

/**
 * @description 潮位预报数据项接口
 * @author evaseemefly
 * @date 2025/06/26
 * @export
 * @interface ISurgeItem
 */
export interface ISurgeItem {
	station_code: string
	forecast_ts: number
	issue_ts: number
	surge: number
}

/**
 * @description 不同台风路径对应潮位集合接口
 */
export interface ITyGroupPathSurge {
	group_type: number
	surge_list: ISurgeItem[]
}

/**
 * @description 天文潮数据接口
 */
export interface ITide {
	station_code: string
	ts: number
	tide: number
}
