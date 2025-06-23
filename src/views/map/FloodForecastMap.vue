<template>
	<div id="map_content" v-loading="loading" element-loading-background="rgba(28, 34, 52, 0.733)">
		<l-map
			ref="basemap"
			:zoom="zoom"
			:center="center"
			:options="mapOptions"
			:maxZoom="mapOptions.maxZoom"
			:minZoom="mapOptions.minZoom"
			id="ceshimap"
		>
			<l-tile-layer :url="url" :attribution="attribution"></l-tile-layer>
			<l-wms-tile-layer
				:baseUrl="ninelineWMS.url"
				:layers="ninelineWMS.options.layer"
				:format="ninelineWMS.options.format"
				:transparent="ninelineWMS.options.transparent"
			></l-wms-tile-layer>
			<!-- 南海岛礁 -->
			<l-wms-tile-layer
				:baseUrl="southlandWMS.url"
				:layers="southlandWMS.options.layer"
				:format="southlandWMS.options.format"
				:transparent="southlandWMS.options.transparent"
			></l-wms-tile-layer>

			<!-- TODO:[-] 20-08-26 新加入的世界国境线 -->
			<l-wms-tile-layer
				:baseUrl="worldLineWMS.url"
				:layers="worldLineWMS.options.layer"
				:format="worldLineWMS.options.format"
				:transparent="worldLineWMS.options.transparent"
				:zIndex="worldLineWMS.options.zindex"
			></l-wms-tile-layer>

			<!-- <LCircle
				:lat-lng="currentLatlng"
				:radius="boxRadius * boxRadiusUnit"
				:opacity="boxOptions.colorOpacity"
				:color="boxOptions.background"
				:fillColor="boxOptions.background"
				:fillOpacity="boxOptions.backgroundOpacity"
			></LCircle> -->
		</l-map>
		<!-- 不适用图层切换菜单 -->
		<!-- <LayersNavMenuView></LayersNavMenuView> -->
	</div>
</template>
<script lang="ts">
// vue 相关组件
import { Component, Prop, Vue, Watch, Emit } from 'vue-property-decorator'
import { Getter, Mutation, State, namespace } from 'vuex-class'
import { mixins } from 'vue-class-component'
// gis引擎组件
import * as L from 'leaflet'
import {
	LMap,
	LTileLayer,
	LMarker,
	LPopup,
	LPolyline,
	LPolygon,
	LCircle,
	LIcon,
	LWMSTileLayer,
	LGeoJson,
	LRectangle,
	// LeafletHeatmap
} from 'vue2-leaflet'
import { FeatureCollection, GeoJsonObject, Feature } from 'geojson'

// mixin
import { WMSMixin } from '@/views/map/mixin/wmsMixin'
import { MapMixin } from '@/views/map/mixin/mapMixin'
// mid model
import { FilterTyMidModel, TyRealDataMongoMidModel } from '@/middle_model/typhoon'
import { ISearchTyStationParams } from '@/middle_model/api_params'
import { TyphoonCircleStatus, TyCMAPathLine } from '@/middle_model/leaflet_plugin'
import { addStationIcon2Map, IconTyphoonCirlePulsing } from '@/middle_model/icon'
// 接口类
import { IStationIcon, IStationInfo } from '@/interface/station'
import { IHttpResponse } from '@/interface/common'
import { IPoint } from '@/interface/geo'
import { ITyphoonParams4Station } from '@/interface/station'

// store
import {
	GET_IS_SELECT_LOOP,
	GET_BOX_LOOP_RADIUS,
	GET_CURRENT_TY,
	SET_DATE_STEP,
	GET_BASE_MAP_KEY,
	GET_WAVE_PRODUCT_ISSUE_DATETIME,
	GET_WAVE_PRODUCT_ISSUE_TIMESTAMP,
	GET_WAVE_PRODUCT_LAYER_TYPE,
	GET_CURRENT_FORECAST_DT,
	SET_BOX_LOOP_LATLNG,
	GET_SCALAR_SHOW_TYPE,
	SET_STATION_CODE,
	SET_SHOW_STATION_SURGE_FORM,
	GET_REGION_PID,
	GET_STATION_CODE,
	GET_NOW,
	GET_ISSUE_TS,
	SET_ISOSURGE_COLOR_SCALE_STR_LIST,
	SET_ISOSURGE_COLOR_SCALE_VAL_RANGE,
	SET_IS_SHOW_RASTER_LEGEND,
	SET_SCALAR_SHOW_TYPE,
	SET_RASTER_COLOR_SCALE_RANGE,
	SET_STATIONS_BASEINFO_LIST,
	GET_SURGE_FORECAST_AREA,
	GET_GLOBAL_SURGE_ISSUE_TS,
	GET_GLOBAL_SURGE_FORECAST_TS,
	SET_TARGET_POSITION_LATLNG,
	GET_GLOBAL_SURGE_FORECAST_PRODUCT,
	GET_TYPHOON_PATH_LIST,
	GET_TY_GROUP,
	GET_TY_GROUP_PATH,
	GET_FLOOD_PLAIN_SHOW_TRIGGER,
	GET_FLOOD_RISK_LEVEL,
} from '@/store/types'
// 默认常量
import {
	DEFAULT_BOX_LOOP_RADIUS,
	DEFAULT_BOX_LOOP_RADIUS_UNIT,
	DEFAULT_BOX_LOOP_LATLNG,
	DEFAULT_LAYER_ID,
	DEFAULT_DATE,
	DEFAULT_TY_CODE,
	DEFAULT_TY_NAME_CH,
	DEFAULT_TY_NAME,
	DEFAULT_TY_NUM,
	DEFAULT_STATION_NAME,
	DEFAULT_SURGE_VAL,
	DEFAULT_STATION_CODE,
	DEFAULT_TIMESTAMP,
	DEFAULT_LATLNG,
} from '@/const/default'
// enum
import {
	IconTypeEnum,
	RasterFileEnum,
	ScalarShowTypeEnum,
	StationIconShowTypeEnum,
} from '@/enum/common'
import { MenuType, TyScatterMenuType } from '@/enum/menu'
import { ForecastAreaEnum, LayerTypeEnum, MapLayerEnum, RasterLayerEnum } from '@/enum/map'

// api
import { loadTyRealDataList, loadStationTideDataList, getTyGroupPathList } from '@/api/typhoon'
import {
	loadStationDetailDataList,
	loadStationNameDict,
	loadInlandStationMaxSurge,
} from '@/api/station'
// 各类插件
import { TyMiniMarker } from '@/plugins/customerMarker'
import {
	AbsBaseTyHeatmap,
	AbsBaseTyScatter,
	TyRadiusHeatMap,
	TyRadiusScatter,
	TyUniqueFilterScatter,
	TyUniquerFilterHeatMap,
} from '@/plugins/scatter'
// 工具类
import { convertTyRealDataMongo2TyCMAPathLine } from '@/middle_model/util'
import moment, { relativeTimeRounding } from 'moment'
import { ITyGroupComplexList, ITyGroupTip, ITyPath } from '@/interface/typhoon'
import { Collapse, Loading } from 'element-ui'
import station from '@/store/modules/station'
// 第三方插件
// 当前布局会导致此热图插件出错，暂时无法解决
// 以前使用的 heatmap 出现了问题，暂时不使用
// 方式1: 使用 heatmap.js 并使用对应 leaflet-heatmap.js 插件
import 'heatmap.js'
import HeatmapOverlay from '@/plugins/leaflet-heatmap.js'

// 其余组件
import LayersNavMenuView from '@/components/nav/LayersNavMenuView.vue'

// 引入事件总线
import { EventBus } from '@/bus/BUS'
import {
	TO_CLEAR_ALL_LAYER,
	TO_FILTER_TY_PATH_LIST,
	TO_GET_UNIQUE_TY_SEARCH_READ_DATA,
} from '@/bus/types'
import { FilterType4ScattersEnum, FilterTypeEnum } from '@/enum/filter'
import { MS_UNIT } from '@/const/unit'
import { ISurgeRasterLayer, SurgeRasterGeoLayer, SurgeRasterLayer } from './raster'
import { Sosurface } from './isosurface'
import { DEFAULT_COLOR_SCALE } from '@/const/colorBar'
import wave from '@/store/modules/wave'
import { StationBaseInfo } from './station'
import { WaveBarOptType } from '@/middle_model/geo'
import { loading } from '@/common/common'

// - 23-03-27 api
import { loadSurgeListByRecently } from '@/api/surge' // 获取所有潮位站距离当前最近的潮值
import { loadAllStationStatusJoinGeoInfo, loadAllStationLastSurge } from '@/api/station'
import { StationBaseInfoMidModel } from '@/middle_model/station'
import { IScale } from '@/const/colorBar'
import { getIntegerList } from '@/util/math'
import {
	loadFloodPlainGridTifUrl,
	loadFloodPlainGridTifUrlByLevel,
	loadGlobalHourlyCoverageTif,
	loadSurgeMaxCoverageTifByTyGroup,
} from '@/api/raster'
import { ForecastProductTypeEnum } from '@/enum/surge'
import { getBoundsByArea } from '@/util/map'
import { formatGroupType2Enmu } from '@/util/filter'
import RasterLayers from '@/util/rasterLayers'
import { addFixedIconsLayer } from '@/util/iconLayers'
import { FloodAreaLevelEnum } from '@/enum/flood'
import { loadFloodPolygonByLevel } from '@/api/geo'
import { customGeoFeatureProcessData } from '@/util/geoUtil'
import { getCustomerFloodPolygonStyle } from '@/util/mapStyleUtil'
import consola from 'consola'

/** 判断本组件内的surge配置是否符合 */
const checkSurgeOpts = (area: ForecastAreaEnum, issueTs: number, forecastTs: number): boolean => {
	let isOk = false
	if (
		area != ForecastAreaEnum.NONE &&
		issueTs != DEFAULT_TIMESTAMP &&
		forecastTs != DEFAULT_TIMESTAMP
	) {
		isOk = true
	}
	return isOk
}

// 定义接口
/** 台风预报路径接口 */
interface IPathType {
	forecastDt: Date
	lat: number
	lon: number
	bp: number
	isForecast: boolean
	tyType?: string
}

/**
 * - 24 10 全球风暴潮预报map——加载四个预报区域的栅格图层
 *
 */
@Component({
	components: {
		'l-marker': LMarker,
		'l-map': LMap,
		'l-tile-layer': LTileLayer,
		'l-polyline': LPolyline,
		LCircle,
		'l-icon': LIcon,
		'l-wms-tile-layer': LWMSTileLayer,
		'l-geo-json': LGeoJson,
		'l-polygon': LPolygon,
		'l-rectangle': LRectangle,
		LayersNavMenuView,
	},
	mixins: [WMSMixin, MapMixin],
})
export default class GlobalForecastMapView extends Vue {
	zoom = 9
	center: number[] = [30.0, 121.8833]
	rasterURL: string = null
	url =
		'https://webrd04.is.autonavi.com/appmaptile?lang=zh_cn&size=1&scale=1&style=7&x={x}&y={y}&z={z}'
	// url = 'http://tileserver.memomaps.de/tilegen/{z}/{x}/{y}.png'
	// TODO:[-] 20-11-09 新加入的 map 相关的一些基础静态配置
	mapOptions: {
		center: number[]
		preferCanvas: boolean
		minZoom: number
		maxZoom: number
		render: any
	} = {
		center: [47.41322, -1.219482],
		preferCanvas: true,
		minZoom: 3,
		// 可缩放的最大 level
		maxZoom: 12,
		// 目前已经使用了 canvas 渲染
		render: L.canvas(),
	}

	isSelectLoop = false
	/** 当前窗口正在加载 */
	loading = false

	/** 临时的台风marker 主要显示 时间,bp */
	tempTyMarker: L.Marker<any> = null

	/** 当前标量场 layer id */
	scalarLayerId = DEFAULT_LAYER_ID

	/** 等值面的 layer id */
	sosurfaceLayerId = DEFAULT_LAYER_ID

	/** 台风路径 line layer id */
	spiderTyPathLineLayerId: number = DEFAULT_LAYER_ID

	/** 格点文字 layer id */
	gridTitlesLayerId = DEFAULT_LAYER_ID

	uniqueRasterLayerId = DEFAULT_LAYER_ID

	tempTyMarkerId: number = DEFAULT_LAYER_ID

	/** 目前添加至map的markers id 集合 */
	markersIdList: number[] = []

	/** 台风集合预报路径集合 */
	tyGroupList: ITyGroupComplexList[] = []

	/** vuex common now 当前时间 */
	@Getter(GET_NOW, { namespace: 'common' })
	now: Date

	/** TODO:[-] 23-02-02 注意修改为通过监听 预报时间戳来执行加载操作(监听 预报Date 会出现多次赋相同值触发多次的问题) */
	forecastTimestamp = 0
	/** 圈选选项 */
	boxOptions = {
		color: '#1abc9c',
		colorOpacity: 0.6,
		background: '#1abc9c',
		backgroundOpacity: 0.7,
	}

	/** 爬取台风路径 */
	spiderTyphoonPathList: IPathType[] = []

	/** 当前的海洋站潮位list */
	surgeStationList: IStationInfo[] = []

	/** 海洋站基础信息 集合 */
	stationBaseInfoList: StationBaseInfoMidModel[] = []

	/** 存储异步任务队列
	 * 注意存储异步任务方法的类型 为一个闭包函数，下次调用时不需要手动传入参数!
	 */
	asyncTasksQueue: (() => void)[] = []

	/** 是否有正在处理的异步任务 */
	isTaskProcessing = false

	/** 获取栅格图层的显示类型 */
	@Getter(GET_SCALAR_SHOW_TYPE, { namespace: 'common' }) getScalarType: ScalarShowTypeEnum

	created() {
		// TODO:[*] 25-04-01 页面准备加载时 需要通过 vuex 获取需要监听的变量，并执行加载栅格图层的操作. 注意可能存在监听变量并未加载的情况
	}

	mounted() {
		const issueTs = this.getIssueTs
		const that = this

		const mymap: L.Map = this.$refs.basemap['mapObject']

		this.getAllStations(mymap)
		// TODO:[*] 25-06-04 测试加载淹没栅格图层
		// this.addFloodPlainRasterLayer(mymap)
		// TODO:[*] 25-06-09 测试按照淹没等级加载对应的淹没栅格图层(geotiff)
		// this.addFloodPlainRasterLayerByLevel(
		// 	mymap,
		// 	ScalarShowTypeEnum.ISOSURFACE,
		// 	FloodAreaLevelEnum.GTE200
		// )
		if (this.getFloodRiskLevel !== FloodAreaLevelEnum.NONE) {
			// 如果当前的淹没风险等级不为 NONE 则加载对应的淹没栅格图层
			this.addFloodPolygonByLevel(mymap, '2106', 1747125125, this.getFloodRiskLevel)
		} else {
			// 清除当前的淹没栅格图层
			this.clearUniquerRasterLayer()
			consola.log('当前的淹没风险等级为 NONE,清除当前的淹没栅格图层')
		}
		// this.addFloodPolygonByLevel(mymap, '2106', 1747125125, FloodAreaLevelEnum.GTE100)

		// 点击地图隐藏 station surge form
		mymap.on('click', (el) => {
			// console.log(el)
			that.setShowStationSurgeForm(false)
		})
	}

	/** 获取所有的潮位站 */
	getAllStations(map: L.Map): void {
		this.stationBaseInfoList = []
		// 获取所有的潮位站
		loadAllStationStatusJoinGeoInfo()
			.then((res) => {
				const allStations = res.data.map(
					(item) =>
						new StationBaseInfoMidModel(
							-1,
							item.station_name,
							item.station_code,
							item.lat,
							item.lon
						)
				)
				return allStations
			})
			.then((allStations: StationBaseInfoMidModel[]) => {
				this.stationBaseInfoList = allStations
				// const allStationIcons: IStationInfo[] = []
				const allStationIcons: IStationInfo[] = allStations.map((item) => {
					// 将所有的潮位站转换为 IStationInfo
					const stationIcon: IStationInfo = {
						name: item.stationName,
						station_code: item.stationCode,
						lat: item.lat,
						lon: item.lon,
						gmt_realtime: new Date(),
						surge: 10,
					}
					return stationIcon
				})
				// 在地图中加载潮位站
				addFixedIconsLayer(map, allStationIcons, (msg: { code: string; name: string }) => {
					console.log(`当前点击了code:${msg.code},name:${msg.name}`)
				})
			})
			.catch((err) => {
				console.error(err)
			})
	}

	/** 清除当前选定的圈选位置的中心点 */
	private clearCurrentLatlng(): void {
		// this.currentLatlng = null
	}

	/** 清除当前的 标量场栅格图层 */
	private clearScalarLayer(): void {
		if (this.scalarLayerId != DEFAULT_LAYER_ID) {
			// @ts-ignore
			this.clearLayerById(this.scalarLayerId)
		}
	}

	/** 清除当前的矢量图层 */
	private clearAllRasterLayer(): void {
		this.clearScalarLayer()
		this.clearSosurfaceLayer()
		this.clearGridTitlesLayer
	}

	private clearLayersByIds(ids: number[]): void {
		const that = this
		ids.forEach((id) => {
			// @ts-ignore
			that.clearLayerById(id)
		})
	}

	/** 清除当前的 等值面图层 */
	private clearSosurfaceLayer(): void {
		if (this.sosurfaceLayerId != DEFAULT_LAYER_ID) {
			// @ts-ignore
			this.clearLayerById(this.sosurfaceLayerId)
		}
	}

	/** 清除当前的 格点数值图层 */
	private clearGridTitlesLayer(): void {
		if (this.gridTitlesLayerId != DEFAULT_LAYER_ID) {
			// @ts-ignore
			this.clearLayerById(this.gridTitlesLayerId)
		}
	}

	private loadStationAndShow(code: string, position: L.LatLng = DEFAULT_LATLNG): void {
		this.setStationCode(code)
		this.setPositionLatlng(position)
		this.setShowStationSurgeForm(true)
	}

	/**
	 *根据 leaflet_id -> map.removce(layer)
	 *
	 * @param {number} id
	 * @memberof MapMixin
	 */
	private clearLayerById(id: number): void {
		const mymap: L.Map = this.$refs.basemap['mapObject']
		if (mymap) {
			mymap.eachLayer((layer: L.Layer) => {
				// @ts-ignore
				if (layer._leaflet_id === id) {
					mymap.removeLayer(layer)
				}
			})
		}
	}

	/** 设置台风的时间间隔步长 */
	@Mutation(SET_DATE_STEP, { namespace: 'common' }) setDateStep

	/** 设置当前潮位站 code */
	@Mutation(SET_STATION_CODE, { namespace: 'station' }) setStationCode

	/** 设置当前潮位站的坐标 */
	@Mutation(SET_TARGET_POSITION_LATLNG, { namespace: 'station' }) setPositionLatlng

	/** 设置 显示|隐藏 station surge form */
	@Mutation(SET_SHOW_STATION_SURGE_FORM, { namespace: 'station' }) setShowStationSurgeForm

	/** 设置栅格图层色标范围 {
	range?: number[]
	scaleColorList: string | string[]
} */
	@Mutation(SET_RASTER_COLOR_SCALE_RANGE, { namespace: 'common' }) setRasterColorScaleRange: (
		val: IScale
	) => void

	/** 设置当前 潮位等值面色标 实际值数组 */
	@Mutation(SET_ISOSURGE_COLOR_SCALE_VAL_RANGE, { namespace: 'common' })
	setIsoSurgeColorScaleValRange

	/** 设置当前 潮位等值面色标 色标颜色数组 */
	@Mutation(SET_ISOSURGE_COLOR_SCALE_STR_LIST, { namespace: 'common' })
	setIsoSurgeColorScaleStrList

	/** 设置是否显示 raster layer 图例 */
	@Mutation(SET_IS_SHOW_RASTER_LEGEND, { namespace: 'map' })
	setIsShowRasterLayerLegend

	/** 显示网格图层类型 */
	@Mutation(SET_SCALAR_SHOW_TYPE, { namespace: 'common' })
	setScalarShowType

	/** 获取当前地图key */
	@Getter(GET_BASE_MAP_KEY, { namespace: 'map' }) getBaseMapKey

	/** 获取当前的预报时间(不再监听此变量，改为监听forecastTimestamp. ts=Date.getTime() ) */
	@Getter(GET_CURRENT_FORECAST_DT, { namespace: 'common' })
	getForecastDt: Date

	@Getter(GET_TYPHOON_PATH_LIST, { namespace: 'typhoon' }) getSpiderTyphoonPathList

	@Watch('getForecastDt')
	onForecastDt(val: Date) {
		this.forecastTimestamp = val.getTime()
	}

	@Watch('getSpiderTyphoonPathList')
	onGetSpiderTyPathList(
		val: {
			forecastDt: Date
			lat: number
			lon: number
			bp: number
			isForecast: boolean
			tyType: string
			// radius: number
		}[]
	): void {
		this.spiderTyphoonPathList = val
	}

	@Watch('spiderTyphoonPathList', { immediate: true, deep: true })
	onSpiderTyPathList(
		val: {
			forecastDt: Date
			lat: number
			lon: number
			bp: number
			isForecast: boolean
			tyType: string
			// radius: number
		}[]
	): void {
		const mymap: L.Map = this.$refs.basemap['mapObject']
		const self = this
		if (this.spiderTyPathLineLayerId !== DEFAULT_LAYER_ID) {
			this.clearLayerById(this.spiderTyPathLineLayerId)
		}
		// 添加至地图中
		const cmaPathLine = new TyCMAPathLine(mymap, val)

		// TODO:[*] 22-05-30 注意此处修改尝试使用 canvas 渲染路径中心点(png)
		// TODO:[*] 22-10-09 加入了鼠标移入与点击事件
		const cmaPathLineLayer = cmaPathLine.add2Map({
			onClick: (e: {
				target: {
					options: {
						customData: TyphoonCircleStatus
					}
				}
			}) => {
				console.log(e.target.options.customData.forecastDt)
			},
			onMouseOver: (e: {
				target: {
					options: {
						customData: TyphoonCircleStatus
					}
				}
			}) => {
				const customData = e.target.options.customData
				const tyMarkerInstance = new TyMiniMarker(
					customData.lat,
					customData.lon,
					customData.forecastDt,
					customData.bp
				)
				const divIcon = L.divIcon({
					className: 'leaflet_marker_tyhoon-mini',
					html: tyMarkerInstance.toHtml(),
					iconAnchor: [20, -30], // point of the icon which will
				})
				const tyMarker = L.marker([customData.lat, customData.lon], {
					icon: divIcon,
				})
				// @ts-ignore
				self.tempTyMarkerId = tyMarker.addTo(mymap)._leaflet_id
			},
			onMouseOut: (e: {
				target: {
					options: {
						customData: TyphoonCircleStatus
					}
				}
			}) => {
				// 清除当前 ty marker
				self.clearLayerById(self.tempTyMarkerId)
				self.tempTyMarkerId = DEFAULT_LAYER_ID
				self.tempTyMarker = null
			},
		})
		const lastTyLatlng = cmaPathLine.getlastTyLatlng()
		if (lastTyLatlng) {
			this.center = [lastTyLatlng.lat, lastTyLatlng.lng]
		}
		// @ts-ignore
		this.spiderTyPathLineLayerId = cmaPathLineLayer._leaflet_id
	}

	/**
	 * 25-05-15
	 * 监听 tyGroup 变化
	 * step1: 加载对应的台风集合路径
	 * step2: 加载增水集合
	 * @param val
	 */
	@Watch('getTyGroup')
	onGetTyGroup(val: ITyGroupTip): void {
		// console.log('getTyGroup', val)
		if (val) {
			this.getTyGroupList(val.tyCode, val.timeStamp)
		}
	}

	/**
	 *  根据当前选择的 group 获取对应的集合列表 */
	getTyGroupList(code: string, ts: number): void {
		// this.isLoading = true
		getTyGroupPathList(code, ts / MS_UNIT)
			.then((res) => {
				this.tyGroupList = res.data
				this.initTyGroupList()
				// this.isLoading = false
			})
			.catch((err) => {
				console.error(err)
				// this.isLoading = false
			})
	}

	initTyGroupList(): void {
		const mymap: L.Map = this.$refs.basemap['mapObject']
		for (let i = 0; i < this.tyGroupList.length; i++) {
			const val = this.tyGroupList[i]

			const cmaPathLine = new TyCMAPathLine(mymap, val.tyPathList)
			const cmaPathLineLayer = cmaPathLine.add2Map(
				{
					onClick: (e: {
						target: {
							options: {
								customData: TyphoonCircleStatus
							}
						}
					}) => {
						console.log(e.target.options.customData.forecastDt)
					},
					onMouseOver: (e: {
						target: {
							options: {
								customData: TyphoonCircleStatus
							}
						}
					}) => {},
					onMouseOut: (e: {
						target: {
							options: {
								customData: TyphoonCircleStatus
							}
						}
					}) => {},
				},
				false
			)
		}
	}

	addFloodPlainRasterLayer(
		map: L.Map,
		scalarLayerType: ScalarShowTypeEnum,
		options: {
			colorScale?: string[]
			valScale?: number[]
			filterMin?: number
			filterMax?: number
		} = {}
	): void {
		this.clearUniquerRasterLayer()
		const scaleList = DEFAULT_COLOR_SCALE
		const tyCode: string = DEFAULT_TY_CODE
		const issueTs: number = DEFAULT_TIMESTAMP
		loadFloodPlainGridTifUrl(tyCode, issueTs)
			.then((res) => {
				/** 获取的当前group对应的max surge tif=> url */
				const tifUrl: string = res.data
				return tifUrl
			})
			.then((url) => {
				switch (scalarLayerType) {
					case ScalarShowTypeEnum.RASTER:
						// 加载栅格图层
						this.addSurgeScalarLayer2Map(map, url)
						break
					case ScalarShowTypeEnum.ISOSURFACE:
						// 加载等值面
						const isosurfaceOpts = { filterMin: 0.2 }
						this.addSurgeIsosurfaceLayer2Map(map, url, isosurfaceOpts)
						break
					default:
						console.warn('未定义的标量场类型')
				}
				// this.addSurgeScalarLayer2Map(map, url)
			})
			.catch((err) => {
				console.error(err)
			})
	}

	/**
	 * 加载淹没范围多边形至map中
	 * @description 通过淹没等级加载对应的淹没范围多边形
	 * @param map
	 * @param tyCode
	 * @param issueTs
	 * @param gtLevel
	 */
	addFloodPolygonByLevel(
		map: L.Map,
		tyCode: string,
		issueTs: number,
		gtLevel: FloodAreaLevelEnum
	): void {
		this.clearUniquerRasterLayer()
		loadFloodPolygonByLevel(tyCode, issueTs, gtLevel)
			.then((res) => {
				// 将返回的数据转换为标准的 GeoJSON FeatureCollection
				const geojsonData: FeatureCollection = customGeoFeatureProcessData(res.data)
				/**
				 * 通过传入的 gtLevel 生成对应的自定义样式——区分颜色
				 */
				const customStyle = getCustomerFloodPolygonStyle(gtLevel)

				// 4. 创建一个 GeoJSON 图层，并添加到地图中
				var geojsonLayer = L.geoJSON(geojsonData, {
					style: customStyle,
					onEachFeature: function (feature, layer) {
						// 绑定弹窗显示多边形的名称
						// if (feature.properties && feature.properties.name) {
						// 	layer.bindPopup('名称: ' + feature.properties.name)
						// }
					},
				}).addTo(map)

				// 5. 根据加载的数据自动调整地图视野
				map.fitBounds(geojsonLayer.getBounds())
				// 设置图层的 ID（如果需要）
				//  23-06-09 注意此处的图层ID需要设置为唯一的
				const layerId = (geojsonLayer as any)._leaflet_id
				return layerId
			})
			.then((layerId) => {
				// 设置当前的唯一图层ID
				this.uniqueRasterLayerId = layerId
			})
			.catch((error) => {
				console.error('加载 GeoJSON 数据失败:', error)
			})
	}

	/**
	 * @deprecated
	 * 将淹没范围栅格图层添加至地图中
	 * @description
	 * @param map
	 * @param scalarLayerType
	 * @param gtLevel
	 * @param options
	 */
	addFloodPlainRasterLayerByLevel(
		map: L.Map,
		scalarLayerType: ScalarShowTypeEnum,
		gtLevel: FloodAreaLevelEnum,
		options: {
			colorScale?: string[]
			valScale?: number[]
			filterMin?: number
			filterMax?: number
		} = {}
	): void {
		this.clearUniquerRasterLayer()
		const scaleList = DEFAULT_COLOR_SCALE
		const tyCode: string = DEFAULT_TY_CODE
		const issueTs: number = DEFAULT_TIMESTAMP
		loadFloodPlainGridTifUrlByLevel(tyCode, issueTs, gtLevel)
			.then((res) => {
				/** 获取的当前group对应的max surge tif=> url */
				const tifUrl: string = res.data
				return tifUrl
			})
			.then((url) => {
				switch (scalarLayerType) {
					case ScalarShowTypeEnum.RASTER:
						// 加载栅格图层
						this.addSurgeScalarLayer2Map(map, url)
						break
					case ScalarShowTypeEnum.ISOSURFACE:
						// 加载等值面
						const isosurfaceOpts = { filterMin: 0.2 }
						this.addSurgeIsosurfaceLayer2Map(map, url, isosurfaceOpts)
						break
					default:
						console.warn('未定义的标量场类型')
				}
				// this.addSurgeScalarLayer2Map(map, url)
			})
			.catch((err) => {
				console.error(err)
			})
	}

	@Watch('floodMaxSurgeOptions')
	onFloodMaxSurgeOptions(val: {
		getTyGroupPath: ITyGroupComplexList
		getScalarType: ScalarShowTypeEnum
	}): void {
		this.clearAllRasterLayer()
		const map: L.Map = this.$refs.basemap['mapObject']
		const groupType = formatGroupType2Enmu(val.getTyGroupPath.groupType)
		if (val) {
			loadSurgeMaxCoverageTifByTyGroup(
				val.getTyGroupPath.tyCode,
				val.getTyGroupPath.issueTs,
				groupType
			)
				.then((res) => {
					/** 获取的当前group对应的max surge tif=> url */
					const tifUrl: string = res.data
					return tifUrl
				})
				.then((url) => {
					switch (val.getScalarType) {
						case ScalarShowTypeEnum.RASTER:
							// 加载栅格图层
							this.addSurgeScalarLayer2Map(map, url)
							break
						case ScalarShowTypeEnum.ISOSURFACE:
							// 加载等值面
							const isosurfaceOpts = { filterMin: 0.2 }
							this.addSurgeIsosurfaceLayer2Map(map, url, isosurfaceOpts)
							break
					}
				})
				.catch((err) => {
					console.error(err)
				})
		}
	}

	@Watch('getFloodRiskLevel')
	onFloodRiskLevel(val: FloodAreaLevelEnum): void {
		console.log('getFloodRiskLevel', val)
		const mymap: L.Map = this.$refs.basemap['mapObject']
		if (val !== FloodAreaLevelEnum.NONE) {
			this.addFloodPolygonByLevel(mymap, '2106', 1747125125, val)
		} else {
			this.clearUniquerRasterLayer()
		}
	}

	/** 标量场的显示类型 栅格图层|等值面 */
	@Getter(GET_SCALAR_SHOW_TYPE, { namespace: 'common' })
	getScalarShowType: ScalarShowTypeEnum

	@Getter(GET_STATION_CODE, { namespace: 'station' })
	getStationCode: string

	/** 获取当前选中的台风 group case */
	@Getter(GET_TY_GROUP, { namespace: 'typhoon' })
	getTyGroup: ITyGroupTip

	/** 监听——执行加载淹没范围栅格图层操作 */
	@Getter(GET_FLOOD_PLAIN_SHOW_TRIGGER, { namespace: 'flood' })
	getFloodPlainRasterTrigger: number

	/** 获取当前选中的台风集合路径(5条中的一条) */
	@Getter(GET_TY_GROUP_PATH, { namespace: 'typhoon' })
	getTyGroupPath: ITyGroupComplexList

	/** 获取淹没风险等级 */
	@Getter(GET_FLOOD_RISK_LEVEL, { namespace: 'flood' })
	getFloodRiskLevel: FloodAreaLevelEnum

	get floodPlainRasterOptions(): {
		getFloodPlainRasterTrigger: number
		getScalarType: ScalarShowTypeEnum
	} {
		const { getFloodPlainRasterTrigger, getScalarType } = this
		return {
			getFloodPlainRasterTrigger,
			getScalarType,
		}
	}

	/** 当前台风增水多个变量options */
	get floodMaxSurgeOptions(): {
		getTyGroupPath: ITyGroupComplexList
		getScalarType: ScalarShowTypeEnum
	} {
		const { getTyGroupPath, getScalarType } = this
		return {
			getTyGroupPath,
			getScalarType,
		}
	}

	@Watch('floodPlainRasterOptions')
	onFloodPlainRasterOptions(val: {
		getFloodPlainRasterTrigger: number
		getScalarType: ScalarShowTypeEnum
	}): void {
		// console.log('floodPlainRasterOptions', val)
		const mymap: L.Map = this.$refs.basemap['mapObject']
		if (val.getFloodPlainRasterTrigger > 0) {
			this.addFloodPlainRasterLayer(mymap, this.getScalarType)
		} else {
			this.clearUniquerRasterLayer()
		}
	}

	/** 设置字典基础信息集合 */
	@Mutation(SET_STATIONS_BASEINFO_LIST, { namespace: 'station' }) setStationsBaseInfo: (
		val: StationBaseInfoMidModel[]
	) => void

	/** 当前发布时间戳 */
	@Getter(GET_ISSUE_TS, { namespace: 'common' })
	getIssueTs: number

	addSurgeScalarLayer2Map(map: L.Map, url: string): void {
		this.clearScalarLayer()
		this.clearSosurfaceLayer()
		const scaleList = [
			'#153C83',
			'#4899D9',
			'#FFFB58',
			'#F1C712',
			'#E79325',
			'#F22015',
			'#C40E0F',
		]
		const rasterLayer = new RasterLayers(url)
		rasterLayer.add2map(map, this.$message).then((layerId: number) => {
			// console.log('layerId', layerId)
			// this.setRasterColorScaleRange({
			// 	range: [0, 6],
			// 	scaleColorList: scaleList,
			// })
			// this.setIsoSurgeColorScaleStrList(scaleList)
			// this.setIsoSurgeColorScaleValRange([0, 6])
			// this.setIsShowRasterLayerLegend(true)
			this.scalarLayerId = layerId
		})
	}

	addSurgeIsosurfaceLayer2Map(
		map: L.Map,
		url: string,
		isosurfaceOpts: {
			colorScale?: string[]
			valScale?: number[]
			filterMin?: number
			filterMax?: number
		} = {}
	): void {
		this.clearSosurfaceLayer()
		const scaleList = [
			'#153C83',
			'#4899D9',
			'#FFFB58',
			'#F1C712',
			'#E79325',
			'#F22015',
			'#C40E0F',
		]
		const maxSosurface = new Sosurface(url, isosurfaceOpts)
		// 此处会有可能出现错误，对于加载的地主不存在指定文件时会出现错误，但 catch 无法捕捉到
		maxSosurface
			.addSosurface2MapbyScale(map, this.$message, () => {}, true)
			.then((sosurfaceOpts) => {
				// 采用链式表达式，由于后面的then还需要 maxSosurface 需要额外将 maxSosurface 返回
				// 将 maxSosurface 和 sosurfaceOpts 一起返回
				return { maxSosurface, sosurfaceOpts }
			})
	}

	/**  清除唯一的栅格图层——以后将所有清除 raster 均调用此方法 */
	clearUniquerRasterLayer(): void {
		if (this.uniqueRasterLayerId !== DEFAULT_LAYER_ID) {
			// this.setIsShowRasterLayerLegend(false)
			// @ts-ignore
			this.clearLayerById(this.uniqueRasterLayerId)
			this.uniqueRasterLayerId = DEFAULT_LAYER_ID
		}
	}

	/** 将地图缩放至当前 surgeStationList  */
	zoom2Country(): void {
		if (this.surgeStationList.length > 0) {
			const tempStation = this.surgeStationList[0]

			const tempPostion = new L.LatLng(tempStation.lat, tempStation.lon)
			const mymap: L.Map = this.$refs.basemap['mapObject']
			mymap.setView(tempPostion)
		}
	}

	@Watch('getBaseMapKey')
	onBaseMapKey(val: MapLayerEnum): void {
		const mymap: L.Map = this.$refs.basemap['mapObject']
		switch (true) {
			// case val === MapLayerEnum.SATELITE_MAP:
			//     this.url = `https://api.maptiler.com/maps/hybrid/256/{z}/{x}/{y}.jpg?key=${MAPTITLELAYER_TOKEN_KEY}`
			case val === MapLayerEnum.SATELITE_MAP:
				this.url = 'http://tileserver.memomaps.de/tilegen/{z}/{x}/{y}.png'

				// this.getMapBoxLayerClass('0TuB9SR4KyaoCi4FUrPM').addTo(mymap)
				break
			case val === MapLayerEnum.SIMPLE_MAP:
				// 使用 geoq 的底图
				this.url =
					'https://webrd04.is.autonavi.com/appmaptile?lang=zh_cn&size=1&scale=1&style=7&x={x}&y={y}&z={z}'
				break
		}
	}
}
</script>
<style lang="less">
@import '../../styles/base';
@import '../../styles/map/my-leaflet';
@import '../../styles/typhoon/typhoonDivicon';
@import '../../styles/station/stationIcon';
@import '../../styles/isosurface/isosurface';

.leaflet-control-attribution {
	a {
		svg {
			visibility: hidden;
		}
	}
}

#map_content {
	// 此处放在base.less中的@centermap中
	// padding: 10px;
	flex: 5;
	display: flex;
	flex-direction: column;
	// 留出右侧的 信息栏 的位置
	// margin-right: 50px;
	@centermap();
	@center();

	#process {
		display: flex;
		z-index: 1500;
		width: 100%;

		.progress {
			width: 100%;
		}
	}

	// TODO:[-] 20-06-18 添加的 overlayer 的样式
	.leaflet-control-layers-list label {
		color: black !important;
	}

	// 20-08-04 覆盖一下leaflet的control-zoom 样式
	.leaflet-control-container {
		.leaflet-top {
			top: 60px;
		}
	}
}
</style>
