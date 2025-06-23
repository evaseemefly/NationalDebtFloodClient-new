import axios, { Axios, AxiosResponse } from 'axios'
import * as L from 'leaflet'
import { host } from './common'
import authHeader from './auth_header'

import { ITyphoonParams4Station } from '@/interface/station'
import { FloodPolygonFeatureCollection } from '@/types/index'
import { FloodAreaLevelEnum } from '@/enum/flood'

// 后端的请求地址及端口
// export const host = host
axios.defaults.withCredentials = true

const area = '/geo'

/** TODO:[-] 25-06-12
 * 根据淹没风险等级(淹没深度)加载洪涝淹没区域多边形数据
 *
 */
const loadFloodPolygonByLevel = (
	tyCode: string,
	issueTs: number,
	gtLevel: FloodAreaLevelEnum
): Promise<AxiosResponse<FloodPolygonFeatureCollection>> => {
	const url = `${host}${area}/flood/grid/level/polygon`
	return axios.get(url, {
		headers: authHeader(),
		params: {
			ty_code: tyCode,
			issue_ts: issueTs,
			gt_level_val: gtLevel,
		},
	})
}

export { loadFloodPolygonByLevel }
