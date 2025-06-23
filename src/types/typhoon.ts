// src/types/typhoon.ts

// 台风路径基础接口
export interface IPathType {
	forecastDt: Date
	lat: number
	lon: number
	bp: number
	isForecast: boolean
	tyType?: string
}

// 台风路径请求参数接口
export interface IPathQueryParams {
	startTime?: Date
	endTime?: Date
	tyType?: string
}

// 台风路径响应接口
export interface IPathResponse {
	code: number
	data: IPathType[]
	message: string
}
