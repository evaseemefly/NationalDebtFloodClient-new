/** 台风路径接口 */
export interface ITyPath {
	forecastDt: Date
	lat: number
	lon: number
	bp: number
	isForecast: boolean
	tyType: string
}

/** 台风采集基础信息接口 */
export interface ITyDetail {
	tyCode: string
	tyNameCh: string
	tyNameEn: string
	timeStamp: number
}

/** 提交的台风复合接口 */
export interface ITyPathComplex {
	tyDetail: ITyDetail
	tyPathList: ITyPath[]
}

/** 集合预报的摘要 */
export interface ITyGroupTip {
	tyCode: string
	/**发布时间戳(单位ms) */
	timeStamp: number
}

/** 25-05-15 台风集合嵌套类集合 */
export interface ITyGroupComplexList {
	groupType: string
	/** 发布时间 单位:s */
	issueTs: number
	tyCode: string
	tyPathList: ITyPath[]
}
