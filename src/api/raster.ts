import axios, { AxiosResponse } from 'axios'
import { host } from './common'
import authHeader from './auth_header'

import { ITyphoonParams4Station } from '@/interface/station'
import { ForecastAreaEnum, LayerTypeEnum } from '@/enum/map'
import { RasterFileEnum } from '@/enum/common'
import { TyphoonGroupTypeEnum } from '@/enum/typhoon'
import { FloodAreaLevelEnum } from '@/enum/flood'

// 后端的请求地址及端口
// export const host = host
axios.defaults.withCredentials = true

const AREA = '/coverage'

/**
 * 根据取72小时最大增水场对应发布时间的 coverage info
 * @param layerType 产品图层种类
 * @returns {
    "forecast_ts": 1685620800,
    "issue_ts": 1685620800,
    "task_id": 39268281,
    "relative_path": "2023/06",
    "file_name": "NMF_TRN_OSTZSS_CSDT_2023060112_168h_SS_maxSurge.nc",
    "coverage_type": 2102
}
 */
const loadMaxSurgeCoverageInfoByIssue = (issueTs: number) => {
	const url = `${host}${AREA}/one/info/ts`
	return axios.get(url, {
		headers: authHeader(),
		params: { issue_ts: issueTs },
	})
}

/**
 * 通过发布时间戳获取最大增水场tif路径
 * @param issueTs 发布时间戳(单位s)
 * @returns
 */
const loadMaxSurgeCoverageTifUlrByIssue = (issueTsbyS: number) => {
	const url = `${host}${AREA}/one/url/ts`
	return axios.get(url, {
		headers: authHeader(),
		params: { issue_ts: issueTsbyS },
	})
}

/**
 * 加载不同的发布栅格图层时间戳
 * TODO:[*] 23-10-26 注意此处的不同栅格图层的发布时间戳（单位:s）
 * @param limitNum
 * @returns
 */
const loadDistCoverageIssueTs = (limitNum = 10) => {
	const url = `${host}${AREA}/dist/ts`
	return axios.get(url, {
		headers: authHeader(),
	})
}

/**
 * @description 获取指定区域的最近的发布时间戳集合
 * @author evaseemefly
 * @date 2024/11/01
 * @param {ForecastAreaEnum} area
 * @param {number} limit_count
 * @returns {*}  {Promise<AxiosResponse<number[]>>}
 */
const loadLastIssueTsList = (
	area: ForecastAreaEnum,
	limit_count: number
): Promise<AxiosResponse<number[]>> => {
	const url = `${host}${AREA}/last/issue/ts_list`
	return axios.get(url, {
		params: { area: area, limit_count: limit_count },
		headers: authHeader(),
	})
}

/**
 * @description 获取指定预报区域指定发布时间对应的预报时次时间戳集合
 * @author evaseemefly
 * @date 2024/11/01
 * @param {ForecastAreaEnum} area
 * @param {number} issueTs
 * @returns {*}  {Promise<AxiosResponse<number[]>>}
 */
const loadForecastTsList = (
	area: ForecastAreaEnum,
	issueTs: number
	// limit_count: number
): Promise<AxiosResponse<number[]>> => {
	const url = `${host}${AREA}/target/forecast/ts_list`
	return axios.get(url, {
		params: { area: area, issue_ts: issueTs },
		headers: authHeader(),
	})
}

/**
 * @description 获取全球逐时tif url
 * @author evaseemefly
 * @date 2024/11/01
 * @param {ForecastAreaEnum} area 预报区域
 * @param {number} issueTs 预报产品发布时间
 * @param {number} forecastTs 预报时次
 * @param {RasterFileEnum} rasterType 栅格图层类型
 * @returns {*}  {Promise<AxiosResponse<string>>}
 */
const loadGlobalHourlyCoverageTif = (
	area: ForecastAreaEnum,
	issueTs: number,
	forecastTs: number,
	rasterType: RasterFileEnum
) => {
	const url = `${host}${AREA}/target/url?`
	return axios.get(url, {
		params: {
			area: area,
			issue_ts: issueTs,
			forecast_ts: forecastTs,
			raster_type_val: rasterType,
		},
		headers: authHeader(),
	})
}

const loadGlobalSurgeMaxCoverageTif = (
	area: ForecastAreaEnum,
	issueTs: number,
	rasterType: RasterFileEnum
) => {
	const url = `${host}${AREA}/target/max/url?`
	const response = axios.get(url, {
		params: {
			area: area,
			issue_ts: issueTs,
			raster_type_val: rasterType,
		},
		headers: authHeader(),
	})
	return response
}

/**
 * @description 获取台风组的最大增水场tif
 * @author evaseemefly
 * @date 2025/05/20
 * @param {string} ty_code 台风编号
 * @param {number} task_id 任务id
 * @param {TyphoonGroupTypeEnum} group_type 台风组类型
 * @returns {*}  {Promise<AxiosResponse<string>>}
 */
const loadSurgeMaxCoverageTifByTyGroup = (
	ty_code: string,
	issue_ts: number,
	group_type: TyphoonGroupTypeEnum
) => {
	const url = `${host}${AREA}/surge/max/url`
	const response = axios.get(url, {
		params: {
			ty_code: ty_code,
			issue_ts: issue_ts,
			group_type: group_type,
		},
		headers: authHeader(),
	})
	return response
}

/**
 * 获取淹没范围栅格图层 geotiff
 * @param tyCode
 * @param issueTs
 * @returns
 */
const loadFloodPlainGridTifUrl = (tyCode: string, issueTs: number) => {
	const url = `${host}${AREA}/flood/grid/url`
	return axios.get(url, {
		headers: authHeader(),
		params: {
			ty_code: tyCode,
			issue_ts: issueTs,
		},
	})
}

/** 根据淹没等级获取对应的淹没范围geotiff */
const loadFloodPlainGridTifUrlByLevel = (
	tyCode: string,
	issueTs: number,
	gtLevel: FloodAreaLevelEnum
) => {
	const url = `${host}${AREA}/flood/grid/level/url`
	return axios.get(url, {
		headers: authHeader(),
		params: {
			ty_code: tyCode,
			issue_ts: issueTs,
			gt_level_val: gtLevel,
		},
	})
}
export {
	loadMaxSurgeCoverageInfoByIssue,
	loadMaxSurgeCoverageTifUlrByIssue,
	loadDistCoverageIssueTs,
	loadLastIssueTsList,
	loadForecastTsList,
	loadGlobalHourlyCoverageTif,
	loadGlobalSurgeMaxCoverageTif,
	loadSurgeMaxCoverageTifByTyGroup,
	loadFloodPlainGridTifUrl,
	loadFloodPlainGridTifUrlByLevel,
}
