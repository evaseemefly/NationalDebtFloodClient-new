import * as L from 'leaflet'
// TODO:[-] 22-02-25 圆 -> 多边形
import '@geoman-io/leaflet-geoman-free'
import 'leaflet-semicircle' // 绘制半圆
import * as pointInPolygon from 'point-in-polygon' // 判断点是否在多边形中 - https://github.com/substack/point-in-polygon
// TODO:[-] 22-04-13 加入多颜色线段
// https://github.com/Oliv/leaflet-polycolor
import leafletPolycolor from 'leaflet-polycolor'
leafletPolycolor(L)
/*
+ 21-05-18 关于 tyGroupPath 相关的class
*/

import { CanvasMarkerLayer } from '@/common/canvasMakerLayer'
import { DEFAULT_TY_CODE, DEFAULT_TIMESTAMP, DEFAULT_TIMESTAMP_STR } from '@/const/default'
import { getTyPathLineColor } from '@/common/scaleColor'
import { TyphoonCircleStatus } from '@/common/circleStatus'
import { getTyIconUrlByType, IconTyphoonCirlePulsing, IconTyphoonCustom } from '@/common/icon'
import moment from 'moment'
export interface ITyGroupPathOptions {
	tyCode: string
	timestamp: string
}

export interface ITyPath {
	forecastDt: Date
	lat: number
	lon: number
	bp: number
	isForecast: boolean
	tyType: string
}

class TyGroupPath {
	defaultOptions: ITyGroupPathOptions = {
		tyCode: DEFAULT_TY_CODE,
		timestamp: DEFAULT_TIMESTAMP_STR,
	}
	tyCode: string
	timestamp: string
	constructor(tyCode?: string, timestamp?: string) {
		this.tyCode = this.defaultOptions.tyCode
		this.timestamp = this.defaultOptions.timestamp
		if (tyCode) {
			this.tyCode = tyCode
		}
		if (timestamp) {
			this.timestamp = timestamp
		}
	}
}

/**
 * + 22-04-08
 * 台风路径
 *
 * @class TyphoonPathIcon
 */
class TyCMAPathLine {
	public tyPathList: ITyPath[] = []
	protected myMap: L.Map
	constructor(mymap: L.Map, tyPathList: ITyPath[]) {
		this.tyPathList = tyPathList
		this.myMap = mymap
	}

	add2Map(markerFuncs: {
		onClick: (opt: any) => void
		onMouseOver: (opt: any) => void
		onMouseOut: (opt: any) => void
	}): L.LayerGroup<any> {
		const tyPointsList = this.initCenterPulsingIcon(markerFuncs)
		const tyPolylineRealdata = this.initLineRealdataLayer()
		const tyPolylineForecast = this.initLineForecastLayer()
		return new L.LayerGroup([...tyPointsList, tyPolylineRealdata, tyPolylineForecast]).addTo(
			this.myMap
		)
	}

	add2MapByCanvas(markerFuncs: {
		onClick: (opt: any) => void
		onMouseOver: (opt: any) => void
		onMouseOut: (opt: any) => void
	}): L.LayerGroup<any> {
		const tyPointsList = this.initCenterPulsingIcon(markerFuncs)
		const tyPolylineRealdata = this.initLineRealdataLayer()
		const tyPolylineForecast = this.initLineForecastLayer()
		const canvasMarkerLayer = new CanvasMarkerLayer().addTo(this.myMap)
		canvasMarkerLayer.addLayers(tyPointsList)
		return new L.LayerGroup([tyPolylineRealdata, tyPolylineForecast]).addTo(this.myMap)
	}

	getlastTyLatlng(): L.LatLng | null {
		if (this.tyPathList.length > 0) {
			const lastTy = this.tyPathList[this.tyPathList.length - 1]
			return new L.LatLng(lastTy.lat, lastTy.lon)
		} else {
			return null
		}
	}

	/**
	 * @description 初始化 icon
	 * @author evaseemefly
	 * @date 2022/10/09
	 * @protected
	 * @param {{
	 * 		onClick: (opt: any) => void 鼠标点击回调函数
	 * 		onMouseOver: (opt: any) => void	鼠标移入回调函数
	 * 	}} markerFuncs	marker 相关函数
	 * @returns {*}  {L.Marker[]}
	 * @memberof TyCMAPathLine
	 */
	protected initCenterPulsingIcon(markerFuncs: {
		onClick: (opt: any) => void
		onMouseOver: (opt: any) => void
		onMouseOut: (opt: any) => void
	}): L.Marker[] {
		const tyPointsList: L.Marker[] = []
		this.tyPathList.forEach((tempPath) => {
			const typhoonStatus = new TyphoonCircleStatus(
				0,
				tempPath.bp,
				tempPath.forecastDt,
				tempPath.lat,
				tempPath.lon
			)
			// TODO:[-] 22-03-15 修改为 台风img marker
			const tyCustomIcon = L.icon({
				iconUrl: getTyIconUrlByType(tempPath.tyType),
				iconSize: [40, 40], // size of the icon
				// shadowSize: [50, 64], // size of the shadow
				iconAnchor: [20, 20], // point of the icon which will
				className: 'my-leaflet-custom-icon',
			})
			// TODO:[-] 22-03-17 修改之前的台风中心路径由脉冲mark改为台风标准图片marker，切记需要加入 customData!!
			const tyCustomMarker = L.marker([tempPath.lat, tempPath.lon], {
				icon: tyCustomIcon,
				// @ts-ignore
				customData: typhoonStatus,
				riseOnHover: true,
			})
			// TODO:[*] 22-10-09 对于鼠标移入与点击加入对应的事件
			tyCustomMarker
				.on('click', (e) => {
					markerFuncs.onClick(e)
				})
				.on('mouseover', (e) => {
					markerFuncs.onMouseOver(e)
				})
				.on('mouseout', (e) => {
					markerFuncs.onMouseOut(e)
				})
			tyPointsList.push(tyCustomMarker)
		})
		return tyPointsList
	}
	/**
	 * 实时台风路径
	 *
	 * @protected
	 * @return {*}  {L.Polyline}
	 * @memberof TyCMAPathLine
	 */
	protected initLineRealdataLayer(): any {
		const latLngs: L.LatLng[] = []
		this.tyPathList.forEach((temp) => {
			if (!temp.isForecast) {
				latLngs.push(new L.LatLng(temp.lat, temp.lon))
			}
		})
		// 对于实况需要加入一个循环判断
		// ---
		// 方法2:
		/*
            实现思路
            step1: 获取不同的台风等级的所在位置index，以及对应的颜色
        */
		const tyTypes: string[] = ['TS', 'STS', 'TY', 'STY', 'SuperTY']
		const polylines: L.Polyline[] = []
		const latlngs: number[][] = []
		const colorScales: string[] = []
		this.tyPathList.forEach((temp) => {
			if (!temp.isForecast) {
				latlngs.push([temp.lat, temp.lon])
				colorScales.push(getTyPathLineColor(temp.tyType))
			}
		})
		// 此处使用 leaflet-polycolor 实现折线的多颜色(线性过度)
		// latlngs 每个折点的坐标数组;
		// colorScales 每个折点的起止颜色数组
		// eslint-disable-next-line
		// @ts-ignore
		const polyLine = L.polycolor(latlngs, {
			colors: colorScales,
			weight: 5,
		})
		return polyLine
	}

	/**
	 * 预报台风风路径
	 *
	 * @protected
	 * @return {*}  {L.Polyline}
	 * @memberof TyCMAPathLine
	 */
	protected initLineForecastLayer(): L.Polyline {
		const latLngs: L.LatLng[] = []

		const forecastTyIndex: number = this.tyPathList.findIndex((temp) => {
			return temp.isForecast
		})
		if (forecastTyIndex > 0) {
			const lastRealTy = this.tyPathList[forecastTyIndex - 1]
			latLngs.push(new L.LatLng(lastRealTy.lat, lastRealTy.lon))
			this.tyPathList.forEach((temp) => {
				if (temp.isForecast) {
					latLngs.push(new L.LatLng(temp.lat, temp.lon))
				}
			})
		}

		return new L.Polyline(latLngs, { color: '#2980b9', dashArray: '5,10' })
	}
}

class TyphoonOutLinePolygon {}

export { TyGroupPath, TyphoonOutLinePolygon, TyCMAPathLine }
