import axios from 'axios'
import { host } from './common'
import authHeader from './auth_header'
import { ISearchTyStationParams } from '@/middle_model/api_params'
import { faYammer } from '@fortawesome/free-brands-svg-icons'
// 枚举
import { FilterTypeEnum } from '@/enum/filter'
import { IPathType } from '@/types'

import { DEFAULT_COMPLEX_NUM, DEFAULT_TY_NUM } from '@/const/default'
import { ITyPathComplex } from '@/interface/typhoon'
// 后端的请求地址及端口
// export const host = host
axios.defaults.withCredentials = true

const area = '/tasks'

/**
 * 提交台风路径数据
 * @param par
 * @returns
 */
const submitTyphoonPath = (params: ITyPathComplex) => {
	const url = `${host}${area}/create/typhoon/path`
	return axios.post(url, {
		tyDetail: params.tyDetail,
		tyPathList: params.tyPathList,
	})
}

/**
 * 提交台风风暴潮数据
 * @param params
 * @returns
 */
const submitTyphoonSurge = (params: ITyPathComplex) => {
	const url = `${host}${area}/create/typhoon/surge`
	return axios.post(url, {
		tyDetail: params.tyDetail,
		tyPathList: params.tyPathList,
	})
}

export { submitTyphoonPath, submitTyphoonSurge }
