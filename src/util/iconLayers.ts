/**
 * + 25-05-26
 * 所有icon图层
 * 站点图层;台风icons图层
 */

import * as L from 'leaflet'

import { AbsIconCirle, FixedStationSurgeIcon } from '@/middle_model/icon'
import { IStationInfo } from '@/interface/station'
import { IconTypeEnum } from '@/enum/common'
import { IToHtml } from '@/interface/leaflet_icon'
import {
	IconFormOnlyTitleStationSurgeMidModel,
	IconFormTitleStationSurgeMidModel,
	StationSurgeMidModel,
} from '@/middle_model/station'

const SURGE_MAX = 10
/**
 * @description 添加静态图标图层
 * @author evaseemefly
 * @date 2025/05/26
 * @returns {*}  {number[]}
 */
const addFixedIconsLayer_backup = (
	map: L.Map,
	stations: IStationInfo[],
	callbackFunc: (stationTemp: { code: string; name: string }) => void
): number[] => {
	const zoom = 7
	const self = this
	/** station 状态icon 集合 */
	const iconStaticList: AbsIconCirle[] = []
	/** station title 集合 */
	const iconTitleList: IToHtml[] = []
	const stationMidList: StationSurgeMidModel[] = []

	/** station icon markers 集合 */
	const iconMarkers: L.Marker[] = []
	/** station titles markers 集合*/
	const divMarkers: L.Marker[] = []

	// 获取极值
	stations.forEach((temp) => {
		/** 海洋站 icon */
		// TODO:[-] 23-03-28 此处加入根据传入的 iconType 生成不同的 station icon 实现
		let icon: AbsIconCirle = null

		icon = new FixedStationSurgeIcon({
			val: temp.surge,
			max: SURGE_MAX,
			min: 0,
			iconType: IconTypeEnum.FIXED_CIRCLE_ICON,
		})

		const titleIcon: IconFormOnlyTitleStationSurgeMidModel =
			new IconFormOnlyTitleStationSurgeMidModel(temp.name, temp.station_code, temp.surge)

		iconTitleList.push(titleIcon)

		/** 当前站点英文名 */
		const stationNameEn = temp.name
		/** 当前站点中文名 */
		const stationNameCh = temp.name
		// TODO:[*] 23-07-16 此处将 之前的 name=code => name=stationNameCh
		const tempStationSurge = new StationSurgeMidModel(
			stationNameCh,
			temp.station_code,
			'',
			'',
			new Date()
		)
		iconStaticList.push(icon)
		stationMidList.push(tempStationSurge)
	})
	let index = 0
	// 批量添加至 map 中
	iconStaticList.forEach((temp) => {
		const tempCode = stationMidList[index].stationCode
		const tempStationName = stationMidList[index].stationName
		const stationDivIcon = L.divIcon({
			// className: `surge_pulsing_icon_default ${iconSurgeMinArr[index].getClassName()}`,
			className: `surge_pulsing_icon_default`,
			html: temp.toHtml(),
			// 目前需要此部分，因为会造成 位置的位移
			// 坐标，[相对于原点的水平位置（左加右减），相对原点的垂直位置（上加下减）]
			// iconAnchor: [-20, 30]
		})
		iconTitleList.forEach((temp) => {}) // 2- 台站 station data form icon
		const stationSurgeMinDivICOn = L.divIcon({
			className: iconTitleList[index].getClassName(),
			html: iconTitleList[index].toHtml(),
			// 坐标，[相对于原点的水平位置（左加右减），相对原点的垂直位置（上加下减）]
			iconAnchor: [10, 30],
		})

		/** station title icon */
		const stationDivIconMarker: L.Marker = L.marker(
			[stations[index].lat, stations[index].lon],
			{
				icon: stationSurgeMinDivICOn,
				// @ts-ignore
				customData: { code: tempCode, name: tempStationName },
				riseOnHover: true, // 鼠标移入zindex升级
			}
		).on(
			'click',
			(e: {
				target: {
					options: {
						customData: { code: string; name: string }
					}
				}
			}) => {
				callbackFunc({
					code: e.target.options.customData.code,
					name: e.target.options.customData.name,
				})
			}
		)

		divMarkers.push(stationDivIconMarker)

		const stationCirlePulsingMakrer: L.Marker = L.marker(
			[stations[index].lat, stations[index].lon],
			{
				icon: stationDivIcon,
			}
		)
		iconMarkers.push(stationCirlePulsingMakrer)

		index++
	})
	const iconMarkersGroup: L.LayerGroup = L.layerGroup(iconMarkers).addTo(map)
	const iconMarkersGroupId: number = L.Util.stamp(iconMarkersGroup)
	// @ts-ignore
	// const pulsingLayerGroupId: number = L.layerGroup(iconMarkers).addTo(map)._leaflet_id

	/** 海洋站 station status title icons */
	// @ts-ignore
	// const divLayerGroupId: number = L.layerGroup(divMarkers).addTo(map)._leaflet_id
	const divLayerGroup: L.LayerGroup = L.layerGroup(divMarkers).addTo(map)
	const divLayerGroupId: number = L.Util.stamp(divLayerGroup)
	return [iconMarkersGroupId, divLayerGroupId]
}

/**
 * @description 添加静态图标图层
 * @author evaseemefly
 * @date 2025/05/26
 * @param {L.Map} map - Leaflet地图实例
 * @param {IStationInfo[]} stations - 站点信息数组
 * @param {Function} callbackFunc - 点击站点时的回调函数
 * @returns {number[]} 返回两个图层组的ID [圆圈图层ID, 标题图层ID]
 */
const addFixedIconsLayer = (
	map: L.Map,
	stations: IStationInfo[],
	callbackFunc: (stationTemp: { code: string; name: string }) => void
): number[] => {
	/** 圆圈图标标记集合 */
	const iconMarkers: L.Marker[] = []
	/** 标题图标标记集合 */
	const divMarkers: L.Marker[] = []

	// 遍历站点数据，创建图标
	stations.forEach((station, index) => {
		// 1. 创建圆圈状态图标
		const circleIcon: AbsIconCirle = new FixedStationSurgeIcon({
			val: station.surge,
			max: SURGE_MAX,
			min: 0,
			iconType: IconTypeEnum.FIXED_CIRCLE_ICON,
		})

		// 2. 创建标题图标
		const titleIcon: IconFormOnlyTitleStationSurgeMidModel =
			new IconFormOnlyTitleStationSurgeMidModel(
				station.name,
				station.station_code,
				station.surge
			)

		// 3. 创建圆圈图标的 DivIcon
		const stationDivIcon = L.divIcon({
			className: `surge_pulsing_icon_default`,
			html: circleIcon.toHtml(),
		})

		// 4. 创建标题图标的 DivIcon
		const stationTitleDivIcon = L.divIcon({
			className: titleIcon.getClassName(),
			html: titleIcon.toHtml(),
			// 设置图标锚点位置 [水平偏移, 垂直偏移]
			iconAnchor: [10, 30],
		})

		// 5. 创建圆圈标记
		const circleMarker: L.Marker = L.marker([station.lat, station.lon], {
			icon: stationDivIcon,
		})
		iconMarkers.push(circleMarker)

		// 6. 创建标题标记（带点击事件）
		const titleMarker: L.Marker = L.marker([station.lat, station.lon], {
			icon: stationTitleDivIcon,
			// @ts-ignore 自定义数据
			customData: { code: station.station_code, name: station.name },
			riseOnHover: true, // 鼠标悬停时提升层级
		}).on(
			'click',
			(e: {
				target: {
					options: {
						customData: { code: string; name: string }
					}
				}
			}) => {
				// 触发回调函数
				callbackFunc({
					code: e.target.options.customData.code,
					name: e.target.options.customData.name,
				})
			}
		)
		divMarkers.push(titleMarker)
	})

	// 7. 创建图层组并添加到地图
	/** 圆圈图标图层组 */
	const iconMarkersGroup: L.LayerGroup = L.layerGroup(iconMarkers).addTo(map)
	const iconMarkersGroupId: number = L.Util.stamp(iconMarkersGroup)

	/** 标题图标图层组 */
	const divLayerGroup: L.LayerGroup = L.layerGroup(divMarkers).addTo(map)
	const divLayerGroupId: number = L.Util.stamp(divLayerGroup)

	// 8. 返回两个图层组的ID
	return [iconMarkersGroupId, divLayerGroupId]
}

export { addFixedIconsLayer }
