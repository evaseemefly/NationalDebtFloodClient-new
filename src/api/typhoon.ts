import axios, { Axios, AxiosResponse } from 'axios'
import { host } from './common'
import authHeader from './auth_header'
import { ISearchTyStationParams } from '@/middle_model/api_params'
import { faYammer } from '@fortawesome/free-brands-svg-icons'
// 枚举
import { FilterTypeEnum } from '@/enum/filter'
import { IPathType } from '@/types'

import { DEFAULT_COMPLEX_NUM, DEFAULT_TY_NUM } from '@/const/default'
// 后端的请求地址及端口
// export const host = host
axios.defaults.withCredentials = true

const area = '/flood/typhoon'

/**
 * @description
 * @author evaseemefly
 * @date 2022/10/18
 * 台风参数接口:
 * latlon,range,size,index
 * @export
 * @interface ITyphoonParams
 * @extends {IPage}
 */
export interface ITyphoonParams extends IPage {
	latlon: number[]
	range: number
	//TODO:[*] 19-05-13 加入了分页
}
/**
 * 可分页接口:
 * size,index
 * @export
 * @interface IPage
 */
export interface IPage {
	// 页容积
	size?: number
	// 当前页
	index?: number
	// 跳转页
	to?: number
}

/** + 22-10-18 默认page */
const DEFAULT_PAGE: IPage = {
	size: -1,
	index: -1,
}

/**
 * + 22-10-18
 * 获取经过对应范围的台风列表
 * @param params
 * @returns
 */
const loadTyListByRange = (params: ITyphoonParams) => {
	const url = `${host}${area}/filter/range/`
	const getData = { ...params, ...DEFAULT_PAGE }
	return axios.get(url, {
		headers: authHeader(),
		params: {
			latlon: getData.latlon,
			range: getData.range,
			size: getData.size,
			index: getData.index,
		},
	})
}

/** 根据 唯一性查询参数 获取台风集合 */
const loadTyListByUniqueParams = (params: {
	filterType: FilterTypeEnum
	year?: string
	month?: string
	tyNum?: string
}) => {
	const url = `${host}${area}/filter/condition/`
	return axios.get(url, {
		headers: authHeader(),
		params: {
			filter_type: params.filterType,
			year: params.year !== '' ? params.year : DEFAULT_COMPLEX_NUM,
			month: params.month !== '' ? params.month : DEFAULT_COMPLEX_NUM,
			ty_num: params.tyNum !== '' ? params.tyNum : DEFAULT_TY_NUM,
		},
	})
}

/**
 * + 22-11-12 加载经过指定区域的台风全部散点
 * @param params
 * @returns
 * {
 * [
 *	{
 *	 "num": "4904",
 *	 "list_ty_geo": [
 *		 {
 *			 "code": "Elaine",
 *			 "date": "1949-06-30T00:00:00Z",
 *			 "num": "4904",
 *			 "bp": 1008.0,
 *			 "wsm": 0.0,
 *			 "level": 0,
 *			 "latlon": {
 *				 "type": "Point",
 *				 "coordinates": [
 *					 140.3,
 *					 5.5
 *				 ]
 *			 }
 *		 },
 *	]
 * }
 */
const loadTyScattersByRadius = (params: ITyphoonParams) => {
	const url = `${host}${area}/filter/range/all/geo/`
	const getData = { ...params }
	return axios.get(url, {
		headers: authHeader(),
		params: {
			latlon: getData.latlon,
			range: getData.range,
		},
	})
}

/**
 * 根据复杂条件查询获取台风对应全部散点
 * @param parms
 * @returns
 */
const loadTyScatterByComplex = (parms: {
	filterType: FilterTypeEnum
	year?: string
	month?: string
	tyNum?: string
}) => {
	const url = `${host}${area}/filter/unique/all/geo/`
	return axios.get(url, {
		headers: authHeader(),
		params: {
			filter_type: parms.filterType,
			year: parms.year !== '' ? parms.year : DEFAULT_COMPLEX_NUM,
			month: parms.month !== '' ? parms.month : DEFAULT_COMPLEX_NUM,
			ty_num: parms.tyNum !== '' ? parms.tyNum : DEFAULT_TY_NUM,
		},
	})
}
/**
 * + 22-10-19 根据 code 加载对应的台风的路径及气象信息
 * @param code
 * @returns
 */
const loadTyRealDataList = (code: string, num: string) => {
	const url = `${host}${area}/data/typhoonrealdata/`
	return axios.get(url, {
		headers: authHeader(),
		params: {
			code: code,
			num: num,
		},
	})
}

/**
 * 根据 code name date 获取该时刻对应的全部站点
 * @param par :{
	code: string
	name: string
	date: Date
}
 * @returns
 */
const loadStationTideDataList = (par: ISearchTyStationParams) => {
	const url = `${host}${area}/data/stationtide/`
	return axios.get(url, {
		params: par,
	})
}

/**
 * 根据code获取台风路径分组
 * @param tyCode
 * @returns	
 *  eg:{
		* 	[
			{
				"tyCode": "2106",
				"timestamp": 1747117996
			},
			{
				"tyCode": "2106",
				"timestamp": 1747125125
			}
		]
 * }
 */
const getTyGroupbyTask = (tyCode: string) => {
	const url = `${host}${area}/group/dist`
	return axios.get(url, {
		headers: authHeader(),
		params: {
			ty_code: tyCode,
		},
	})
}

/**
 * 根据台风code和时间戳获取所有的集合路径列表
 * @param tyCode
 * @param timestamp 发布时间戳(单位:s)
 * @returns
 * eg:{
 * 		[
    		{
    		    "tyCode": "2106",
    		    "issueTs": 1725588000,
    		    "groupType": "center",
    		    "tyPathList": [
    		        {
    		            "forecastDt": "2024-09-05T09:00:00",
    		            "lat": 19.2,
    		            "lon": 112.2,
    		            "bp": 905,
    		            "isForecast": true,
    		            "tyType": "center"
    		        },
 * }	
 */
const getTyGroupPathList = (tyCode: string, timestamp: number) => {
	const url = `${host}${area}/grouppath/list`
	return axios.get(url, {
		headers: authHeader(),
		params: {
			ty_code: tyCode,
			issue_ts: timestamp,
		},
	})
}

/**
 * 根据台风code和时间戳 获取 台风集合路径集合
 * @param tyCode
 * @param timestamp 发布时间戳(单位:s)
 * @returns
 */
const getTyGroupDetailList = (tyCode: string, timestamp: number) => {
	const url = `${host}${area}/grouppath/list`
	return axios.get(url, {
		headers: authHeader(),
		params: {
			ty_code: tyCode,
			issue_ts: timestamp,
		},
	})
}

export {
	loadTyListByRange,
	loadTyRealDataList,
	loadStationTideDataList,
	loadTyScattersByRadius,
	loadTyScatterByComplex,
	loadTyListByUniqueParams,
	getTyGroupbyTask,
	getTyGroupPathList,
	getTyGroupDetailList,
}
