<template>
	<div
		id="station_scalar_form"
		class="my-detail-form"
		v-loading="isLoading"
		element-loading-spinner="el-icon-loading"
		element-loading-background="rgba(49, 59, 89, 0.733)"
	>
		<div class="left-section">
			<div class="info-card base-info">
				<h3>{{ stationCode }} 站</h3>
				<div>
					<div class="row"><span>所属国家_en</span><span>-</span></div>
					<div class="row"><span>所属区域_en</span><span>-</span></div>
					<div class="row"><span>所属区域_ch</span><span>-</span></div>
					<!-- <div class="row"><span>站点</span><span>-</span></div> -->
					<div class="row"><span>位置</span><span>-</span></div>
					<!-- <div class="row">
						<span>最后更新时间</span
						><span>{{ getWaveIssueDt | fortmatData2YMDHM }}</span>
					</div> -->
				</div>
			</div>
		</div>
		<div class="right-section">
			<!-- 对于非集合路径才提供叠加天文潮位的选项 -->
			<div id="surge_scalar_chart"></div>
			<!-- TODO: [*] 25-06-24 暂时不实现 table 的逻辑 -->
			<!-- <div class="down-section">
				<GroupSurgeTableView
					:forecastDtList="forecastDtList"
					:surgeList="diffSurgeList"
					:tideList="tideList"
					:forecastValList="forecastValList"
					:diffSurgeList="diffSurgeList"
					:propHoverIndex="hoverDtIndex"
				></GroupSurgeTableView>
			</div> -->
		</div>
	</div>
</template>
<script lang="ts">
import { Component, Prop, Vue, Watch } from 'vue-property-decorator'
import { Getter, Mutation, State, namespace } from 'vuex-class'
import * as echarts from 'echarts'
import * as L from 'leaflet'
import chroma from 'chroma-js'
// 常量
import {
	DEFAULT_ALERT_TIDE,
	DEFAULT_DATE,
	DEFAULT_SURGE_DIFF,
	DEFAULT_BOX_LOOP_LATLNG,
	DEFAULT_SURGE_VAL,
	DEFAULT_STATION_CODE,
	DEFAULT_TIMESTAMP,
	DEFAULT_VAL_LIST,
	DEFAULT_TY_CODE,
	DEFAULT_TY_NAME_CH,
} from '@/const/default'
// 接口
import { IHttpResponse } from '@/interface/common'
//
// 枚举
import { TaskStatusEnum } from '@/enum/status'

import GroupSurgeTableView from '@/components/table/groupSurgeTableView.vue'

// store
import {
	GET_CURRENT_FORECAST_DT,
	GET_GLOBAL_SURGE_ISSUE_TS,
	GET_ISSUE_TS,
	GET_STATION_CODE,
	GET_SURGE_TD_STEP,
	GET_TARGET_POSITION_LATLNG,
	GET_TIMESPAN,
	GET_TYPHOON_CODE,
	GET_WAVE_PRODUCT_ISSUE_DATETIME,
} from '@/store/types'
//
// api
import { loadTargetStationSurgeRealdataList, loadTargetStationTideRealdataList } from '@/api/surge'
import { loadTargetPositionSurgeForecastdataList } from '@/api/coverage'
import { loadTargetStationGroupSurgeList } from '@/api/station'
import { loadStaionRegionCountry, loadStationStaus } from '@/api/station'
// 工具方法
// filter
import {
	fortmatData2YMDHM,
	fortmatData2MDHM,
	filterProductTypeName,
	filterLatlng2Str,
	formatSurge2Str,
	formatSurgeFixed2Str,
} from '@/util/filter'
import moment from 'moment'
import { MenuType } from '@/enum/menu'
import station from '@/store/modules/station'
import { TO_LOAD_FORECASTDATALIST_COORDS } from '@/bus/types'
import { EventBus } from '@/bus/BUS'
import { LayerTypeEnum } from '@/enum/map'

import { loadWaveProductForecastRealDataList } from '@/api/wave'
import { filter } from 'vue/types/umd'
import { faL } from '@fortawesome/free-solid-svg-icons'
import consola from 'consola'
import { ITide, ITyGroupPathSurge } from '@/interface/surge'
import { MS_UNIT } from '@/const/unit'
import { getTyGroupEnumName } from '@/enum/typhoon'

const MARGIN_TOP = 20
const MARGIN_BOTTOM = 20

@Component({
	filters: {
		filterProductTypeName,
		filterLatlng2Str,
		fortmatData2YMDHM,
		formatSurge2Str,
		formatSurgeFixed2Str,
	},
	components: {
		GroupSurgeTableView,
	},
})
export default class StationGroupSurgeChartView extends Vue {
	/** 预报的结束时间与 getForecastDt 的时间差(单位:s) */
	END_TIME_INTERVAL: number = 3 * 24 * 60 * 60

	isLoading = false

	/** 当前的图表charts对象(唯一) */
	myChart: echarts.ECharts = null

	/** 预报时间列表 */
	forecastDtList: Date[] = []
	dtList: Date[] = []
	/** 实况潮位 */
	surgeList: number[] = []
	/** 实况潮位-天文潮 */
	diffSurgeList: number[] = []
	/** 预报值列表 */
	forecastValList: number[] = []
	/** 预报时间戳集合 */
	forecastTsList: number[] = []

	yAxisMin = 0
	yAxisMax = 0

	VAL_PADDING = 20

	chartTitle = 'xxx站潮位'
	chartSubTitle = '--'

	seriesMap: Map<string, string> = new Map([
		['中心路径', '中心路径'],
		['慢速路径', '慢速路径'],
		['快速路径', '快速路径'],
		['右侧路径', '右侧路径'],
		['左侧路径', '左侧路径'],
		['天文潮', '天文潮'],
	])

	/** 是否要将天文潮与增水进行叠加 */
	@Prop({ type: Boolean, default: false })
	readonly isAddition: boolean

	@Prop({ type: Boolean, default: false })
	readonly isFinished: boolean

	@Prop({ type: Array, default: () => [] })
	readonly groupPathSurgeList: ITyGroupPathSurge[]

	@Prop({ type: Array, default: () => [] })
	readonly tideList: ITide[]

	@Prop({ type: String, default: DEFAULT_STATION_CODE })
	readonly stationCode: string

	tyCode = DEFAULT_TY_CODE

	/** 鼠标移入 chart 中的 index */
	hoverDtIndex = 0

	created() {}

	// 监听 prop 变化
	// @Watch('groupPathSurgeList', { deep: true, immediate: true })
	// onGroupPathSurgeListChanged(newVal: ITyGroupPathSurge[], oldVal: ITyGroupPathSurge[]) {
	get paramsOpts(): { isFinished: boolean; isAddition: boolean } {
		const { isFinished, isAddition } = this
		return { isFinished, isAddition }
	}

	@Watch('paramsOpts', { deep: true, immediate: true })
	todo(
		val: { isFinished: boolean; isAddition: boolean },
		oldVal: { isFinished: boolean; isAddition: boolean }
	) {
		if (val.isFinished === true) {
			this.isLoading = false
			const groupPathSurgeList = this.groupPathSurgeList
			// + 25-07-01 根据 addition prop 决定是否对数据进行叠加处理
			/** 处理后的集合预报增水集合 */
			let processedGroupPathSurgeList = groupPathSurgeList
			if (val.isAddition) {
				if (val.isAddition) {
					// 深拷贝并对 surge 值进行叠加
					processedGroupPathSurgeList = this.groupPathSurgeList.map((path) => ({
						...path,
						surge_list: path.surge_list.map((surgeItem, index) => {
							// 假设 tideList 与 surge_list 按索引对齐
							const tideValue = this.tideList[index] ? this.tideList[index].tide : 0
							return {
								...surgeItem,
								surge: surgeItem.surge + tideValue,
							}
						}),
					}))
				}
			}
			if (
				processedGroupPathSurgeList.length > 0 &&
				processedGroupPathSurgeList[0].surge_list.length === 0
			) {
				this.$log.warn('groupPathSurgeList 中的 surge_list 为空，无法初始化图表。')
				return
			}
			const xList = processedGroupPathSurgeList[0].surge_list.map((item) => {
				return new Date(item.forecast_ts * MS_UNIT)
			})
			let yList = processedGroupPathSurgeList.map((item) => {
				return {
					yList: item.surge_list.map((val) => val.surge),
					fieldName: getTyGroupEnumName(item.group_type),
				}
			})
			// 获取天文潮位数据
			const tideList = this.tideList.map((item) => item.tide)
			yList.push({
				yList: tideList,
				fieldName: '天文潮',
			})
			// + 25-07-01 根据 addition 状态动态设置标题
			const title = val.isAddition ? '集合路径总潮位预报' : '集合路径增水预报'
			// 每次 prop 一有新值就 init 图表
			this.initCharts(xList, yList, { fieldName: DEFAULT_TY_NAME_CH, vals: [] }, title, 0)
		} else {
			this.isLoading = true
		}
	}

	/** TODO:[-] 24-12-09
	 * 将 预报 与 实况数据按照时间进行合并并返回
	 * TODO:[*] 24-12-12 传入的 tideList 为 169 转换后返回为 96有值，后面无值
	 */
	unifyData(
		dtList: Date[],
		tideDtList: Date[],
		surgeList: number[],
		tideList: number[],
		diffSurgeList: number[],
		forecastTs: number[],
		forecastVals: number[]
	) {
		// 1. 将 dtList 转换为时间戳数组
		const dtTimestamps = dtList.map((date) => date.getTime())

		const tideDtTimestamps = tideDtList.map((date) => date.getTime())

		// 2. 合并时间戳数组并去重排序
		const mergedTimestamps = Array.from(
			new Set([...dtTimestamps, ...tideDtTimestamps, ...forecastTs])
		).sort((a, b) => a - b)

		// 3. 创建对齐后的实况数据和预报数据数组
		const alignedSurgeList = mergedTimestamps.map((timestamp) =>
			dtTimestamps.includes(timestamp) ? surgeList[dtTimestamps.indexOf(timestamp)] : null
		)

		const alignedTideList = mergedTimestamps.map((timestamp) =>
			tideDtTimestamps.includes(timestamp)
				? tideList[tideDtTimestamps.indexOf(timestamp)]
				: null
		)

		const alignedDiffSurgeList = mergedTimestamps.map((timestamp) =>
			dtTimestamps.includes(timestamp) ? diffSurgeList[dtTimestamps.indexOf(timestamp)] : null
		)

		const alignedForecastSurgeList = mergedTimestamps.map((timestamp) =>
			forecastTs.includes(timestamp) ? forecastVals[forecastTs.indexOf(timestamp)] : null
		)

		// 4. 返回结果
		return {
			mergedTimestamps,
			alignedSurgeList,
			alignedTideList,
			alignedDiffSurgeList,
			alignedForecastSurgeList,
		}
	}

	initCharts(
		xList: Date[],
		yVals: { yList: number[]; fieldName: string }[],
		areaVals: { vals: number[]; fieldName: string },
		title: string,
		selectIndex: number
	): void {
		const that = this
		const nodeDiv = document.getElementById('surge_scalar_chart')
		// TODO:[-] 25-06-25 根据传入的yVal 设置极值
		const allNums = yVals.flatMap((item) => item.yList)
		that.yAxisMax = Math.max(...allNums) + this.VAL_PADDING
		that.yAxisMin = Math.min(...allNums) - this.VAL_PADDING
		if (nodeDiv) {
			const myChart: echarts.ECharts = echarts.init(nodeDiv)
			let legendData: {
				name: string
				itemStyle: {
					color: string
				}
				textStyle: {
					color: string
				}
			}[] = []
			let series = []
			let scale = chroma.scale([
				// '#00429d',
				// '#4771b2',
				'#73a2c6',
				'#a5d5d8',
				'#ffffe0',
				'#ffbcaf',
				'#f4777f',
				'#cf3759',
				'#93003a',
			])
			/** 曲线相关设置，根据:yVals 读取；并根据 scale 进行线性颜色取值 */
			let fieldsCount: number = yVals.length + 1
			for (let index = 0; index < yVals.length; index++) {
				const element = yVals[index]
				const tempLegend: {
					name: string
					itemStyle: {
						color: string
					}
					textStyle: {
						color: string
					}
				} = {
					name: element.fieldName,
					itemStyle: {
						color: scale(index / fieldsCount).hex(),
					},
					textStyle: {
						color: scale(index / fieldsCount).hex(),
					},
				}
				legendData.push(tempLegend)

				const tempSeries = {
					name: element.fieldName,
					type: 'line',
					silent: false,
					// areaStyle: {
					// 	opacity: 0.8,
					// 	color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
					// 		{
					// 			offset: 0,
					// 			color: scale(index / fieldsCount).hex(),
					// 		},
					// 		{
					// 			offset: 1,
					// 			color: scale((index + 1) / fieldsCount).hex(),
					// 		},
					// 	]),
					// },
					lineStyle: { color: scale(index / fieldsCount).hex() },
					emphasis: {
						focus: 'series',
					},
					data: element.yList,
					showSymbol: false,
					smooth: true,
					markPoint: {
						symbol: 'circle',
						symbolSize: 2,
						data: [
							{ type: 'max', name: 'Max' },
							{ type: 'min', name: 'Min' },
						],
						symbolOffset: [0, '-500%'],
						label: {
							color: '#fff',
						},
					},
				}
				series.push(tempSeries)
			}
			/** area填色相关设置, 根据 areaVals 读取;为固定颜色 */
			const element = areaVals
			if (element.vals.length > 0) {
				// 如果 areaVals 有值，则添加到图表中
				const tempLegend: {
					name: string
					itemStyle: {
						color: string
					}
					textStyle: {
						color: string
					}
				} = {
					name: element.fieldName,
					itemStyle: {
						color: '#f39c12',
					},
					textStyle: {
						color: '#f39c12',
					},
				}
				legendData.push(tempLegend)

				const tempSeries = {
					name: element.fieldName,
					type: 'line',
					silent: false,
					areaStyle: {
						opacity: 0.8,
						color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
							{
								offset: 0,
								color: '#f1c40f',
							},
							{
								offset: 1,
								color: '#e67e22',
							},
						]),
					},
					lineStyle: { color: '#f1c40f' },
					emphasis: {
						focus: 'series',
					},
					data: element.vals,
					showSymbol: false,
					smooth: true,
					markPoint: {
						symbol: 'circle',
						symbolSize: 2,
						data: [
							{ type: 'max', name: 'Max' },
							{ type: 'min', name: 'Min' },
						],
						symbolOffset: [0, '-500%'],
						label: {
							color: '#fff',
						},
					},
				}
				series.push(tempSeries)
			}

			// this.surgeByGroupPath = []
			const option = {
				title: {
					text: title,
					subtext: that.chartSubTitle,
					textStyle: {
						color: '#f8f8f7',
					},
				},
				tooltip: {
					trigger: 'axis',
					showContent: true,
					axisPointer: {
						type: 'cross',
					},
					formatter: function (params, ticket, callback) {
						/** 
						 * html
						  '2024-12-18 06:00<br />undefined:-<br />undefined:2.92<br />undefined:0.04<br />增水						  :-<br />'
						  params[1].seriesName
						  '天文潮'
						  params[2].seriesName
						  '预报增水值'
						  params[3].seriesName
						  'surge'
						  						 */
						//x轴名称
						const dt = params[0].name
						const dtStr: string = fortmatData2YMDHM(dt)
						let html = '' + dtStr + '<br />'
						for (let index = 0; index < params.length; index++) {
							const temp = params[index]
							const seriesName: string = that.seriesMap.get(temp.seriesName)
							const seriesVal: string = isNaN(temp.value) ? '-' : temp.value
							// 拼接为 line
							const tempHtml = `${seriesName}:${seriesVal}` + '<br />'
							html = html + tempHtml
						}
						return html
					},
				},
				legend: {
					data: legendData,
					right: '10%',
				},
				grid: {
					left: '3%',
					right: '4%',
					bottom: '3%',
					containLabel: true,
				},
				xAxis: [
					{
						type: 'category',
						boundaryGap: false,
						// data: that.forecastDateList,
						data: xList,
						nameTextStyle: {
							color: '#f8f8f7',
						},
						axisLabel: {
							textStyle: {
								color: '#f8f8f7', //字体颜色
								fontSize: 12, //字体大小
							},
							formatter: (val: Date) => {
								return fortmatData2YMDHM(val)
							},
						},
					},
				],
				yAxis: [
					{
						type: 'value',
						nameTextStyle: {
							color: '#f8f8f7',
						},
						axisLabel: {
							textStyle: {
								color: '#f8f8f7', //字体颜色
								fontSize: 12, //字体大小
							},
						},
						min: that.yAxisMin,
						max: that.yAxisMax,
						// scale: true
					},
				],
				series: series,
			}
			// TODO:[-] 22-07-05 加入多条集合路径曲线
			const lineStyle = {
				width: 1,
				opacity: 0.5,
			}
			// TODO:[*] 23-04-03
			// ERROR:`setOption` should not be called during main process.
			myChart.setOption(option)
			if (!this.myChart) {
				this.myChart = myChart
			}
		}
	}

	/** 判断chart 选项中参数是否符合标准规范 */
	checkChartOptsStandards(stationCode: string, tyCode: string, issueTs: number) {
		let isStandard = false
		if (
			stationCode != DEFAULT_STATION_CODE &&
			tyCode != DEFAULT_STATION_CODE &&
			issueTs != DEFAULT_TIMESTAMP
		) {
			isStandard = true
		}
		return isStandard
	}
}
</script>
<style scoped lang="less">
@import '../../styles/station/station-chart.less';
// @import url('../../styles/base-form.less');
.my-detail-form {
	height: 100%;
	width: 100%;
}
// 潮位chart
#surge_scalar_chart {
	// height: 100%;
	height: 250px;
	// TODO:[*] 24-12-10 此处测试后需要改为 100%
	width: 1024px;
	// width: 100%;
}
#station_scalar_form {
	// @form-base-background();
	// height: 100%;
	// width: 100%;
	flex-direction: row;
	.left-section {
		background: #2c3e50;
		display: flex;
		// flex: 1;
		// width: 200px;
		flex-direction: row;
		justify-content: center;
		.info-card {
			color: white;
			// width: 45%;
			width: 150px;
			margin: 5px;
			padding: 5px;
			h3 {
				display: flex;
				border-bottom: 1px solid #c4ccd6;
				padding: 5px;
				font-size: 18px;
				align-items: center;
				letter-spacing: 0.36px;
			}
			.row {
				// justify-content: space-between;
				display: flex;
				justify-content: space-between;
				font-size: 14px;
				line-height: 24px;
			}
		}
	}
	.right-section {
		padding: 5px;
		margin: 5px;
		display: flex;
		// flex: 5;
		flex-direction: column;
		div.down-section {
			display: flex;
			flex-direction: column;
			align-items: center;
		}
	}
	// 不再使用此种布局
	.upper-section {
		// color: white;
		width: 100%;
		display: flex;
		flex-direction: row;
		justify-content: center;
	}
}
.down-section {
	display: flex;
	flex-direction: column;
	align-items: center;
}
</style>
