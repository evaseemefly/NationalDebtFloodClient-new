<template>
	<div
		v-draggable
		class="ty_search_form"
		id="ty_grouppath_form"
		@mouseover="toTopic($event)"
		@mouseout="reduceTopic($event)"
		v-show="isShow"
		v-loading="isLoading"
		element-loading-spinner="el-icon-loading"
		element-loading-background="rgba(49, 59, 89, 0.733)"
	>
		<div class="ty-search-container">
			<span class="ty-search-title">台风编号</span>
			<div class="ty-search-detail">
				<el-input class="detail-input" v-model="tyCode" placeholder="台风编号"></el-input>
				<button
					type="top"
					class="detail-commit el-button el-button--primary btn-primary"
					@click="getTyGroupTasks(tyCode)"
				>
					查询<i class="fas fa-cloud-download-alt"></i>
				</button>
			</div>
		</div>
		<!-- 台风信息 -->
		<div class="ty-info">
			<div class="ty-info-header">
				<h4 class="header-level-title">台风名称: {{ tyName }}</h4>
			</div>
			<section>
				<table>
					<thead>
						<tr>
							<th scope="col">台风编号</th>
							<th scope="col">日期</th>
							<th scope="col">时间</th>
							<th scope="col">集合数量</th>
						</tr>
					</thead>
					<tbody>
						<tr
							v-for="tyTemp in tyGroupTips"
							:key="tyTemp.id"
							@click="selectGroupTy(tyTemp)"
						>
							<td>{{ tyTemp.tyCode }}</td>
							<td>{{ tyTemp.timeStamp | filterDate2MD }}</td>
							<td>{{ tyTemp.timeStamp | filterformatDate2HM }}</td>
							<!-- <td>{{ formatDt2HM(tyTemp.forecastDt) }}</td> -->
							<!-- <td :class="tyTemp.tyType | filterTyLevel2Cls">
								{{ tyTemp.tyType | filterTyLevel2Str }}
							</td> -->
						</tr>
					</tbody>
				</table>
			</section>
		</div>
		<div class="ty-info">
			<div class="ty-info-header">
				<h4 class="header-level-title">集合路径:</h4>
			</div>
			<section>
				<table>
					<thead>
						<tr>
							<th scope="col">台风编号</th>
							<th scope="col">日期</th>
							<th scope="col">时间</th>
							<th scope="col">路径</th>
						</tr>
					</thead>
					<tbody>
						<tr
							v-for="tyGpTemp in tyGroupPathList"
							:key="tyGpTemp.id"
							@click="selectTyGroupPath(tyGpTemp)"
						>
							<td>{{ tyGpTemp.tyCode }}</td>
							<td>{{ tyGpTemp.issueTs | filterDate2MD }}</td>
							<td>{{ tyGpTemp.issueTs | filterformatDate2HM }}</td>
							<td>{{ tyGpTemp.groupType | filterTyGroupType }}</td>
						</tr>
					</tbody>
				</table>
			</section>
		</div>
		<div>----------------------------</div>
		<div class="ty-search-footer">
			<div class="ty-row">
				<span class="ty-search-title">加载漫滩预报</span>
				<div class="ty-search-detail">
					<button
						type="top"
						class="detail-commit el-button el-button--primary btn-primary"
						@click="toShowFloodPlainRaster()"
					>
						提交<i class="fa-solid fa-house-flood-water"></i>
					</button>
				</div>
				<el-tooltip class="item" effect="dark" content="风险等级" placement="top">
					<div class="row_child">
						<div id="issue_selecter_nav" class="nav_item_icon nav_icon_operator">
							<el-select
								v-model="selectedFloodRiskLevel"
								placeholder="请选择"
								:popper-append-to-body="false"
							>
								<el-option
									v-for="item in riskLevelOptions"
									:key="item.key"
									:label="item.val"
									:value="item.key"
								>
								</el-option>
							</el-select>
						</div>
					</div>
				</el-tooltip>
			</div>
		</div>
	</div>
</template>
<script lang="ts">
import { Prop, Vue, Watch } from 'vue-property-decorator'
import { Getter, Mutation, State, namespace } from 'vuex-class'
import Component from 'vue-class-component'
// filter
import {
	formatDate2YMD,
	formatDate2MD,
	formatDate2HM,
	formatTyLevel2Str,
	formatTyLevel2Cls,
	formatGroupTypeName,
} from '@/util/filter'

// 枚举
import { TyphoonGroupTypeEnum, TyphoonLevelEnum } from '@/enum/typhoon'
import { color } from 'echarts'
import { ColorScales } from '@/const/colorBar'
// 工具类
import { stickyTopic, reduceTopic } from '@/util/styleUtil'
// api
import { getTargetTyPathList } from '@/api/spider'
// vuex
import {
	SET_TYPHOON_PATH_LIST,
	SET_TYPHOON_FORECAST_DATETIME,
	GET_TYPHOON_FORECAST_DATETIME,
	GET_SHOW_TYPHOON_SEARCH_FORM,
	SET_TY_GROUP,
	SET_TY_GROUP_PATH,
	SET_FLOOD_PLAIN_SHOW_TRIGGER,
	SET_FLOOD_RISK_LEVEL,
} from '@/store/types'
import { IPathType } from '@/types'
import { submitTyphoonPath, submitTyphoonSurge } from '@/api/task'
import {
	ITyDetail,
	ITyGroupComplexList,
	ITyGroupTip,
	ITyPath,
	ITyPathComplex,
} from '@/interface/typhoon'
import moment from 'moment'
import { ITyTask } from '@/interface/task'
import { getTyGroupbyTask, getTyGroupDetailList, getTyGroupPathList } from '@/api/typhoon'
import { IHttpResponse } from '@/interface/common'
import { MS_UNIT } from '@/const/unit'
import { FloodAreaLevelEnum } from '@/enum/flood'
@Component({
	filters: {
		filterFormatDate2YMD: formatDate2YMD,
		filterformatDate2HM: formatDate2HM,
		filterDate2MD: formatDate2MD,
		filterTyGroupType: formatGroupTypeName,
		filterIsForecast: (val: boolean): string => {
			return val ? '预报' : '实况'
		},
		filterTyLevel2Str: formatTyLevel2Str,
		filterTyLevel2Cls: formatTyLevel2Cls,
		filterTyNameCh: (val: string): string => {
			return val === '' ? '-' : val
		},
	},
})
export default class TyGroupPathFilterFormView extends Vue {
	filterTyTaskList: ITyTask[] = []
	/** 台风路径数据列表 */
	/** 过滤后的台风路径数据列表 */
	filterTyList: ITyPath[] = []

	/** 选中的台风 index */
	selectedTrIndex = 0

	/** 淹没风险等级 */
	selectedFloodRiskLevel: FloodAreaLevelEnum = FloodAreaLevelEnum.NONE

	riskLevelOptions = [
		{ key: FloodAreaLevelEnum.NONE, val: '未选择' },
		{ key: FloodAreaLevelEnum.GTE100, val: '低风险' },
		{ key: FloodAreaLevelEnum.GTE150, val: '中风险' },
		{ key: FloodAreaLevelEnum.GTE200, val: '高风险' },
	]

	/** 是否显示查找台风窗口 */
	isShow = true

	isLoading = false

	dateFormat = 'yyyy/MM/dd HH'

	tyCode = ''
	tyName = ''
	selectedDt = new Date(1970, 1, 1)

	startDt: Date = new Date(1970, 1, 1)
	endDt: Date = new Date(1970, 1, 1)
	/** 爬取的台风基础信息 */
	tyDetail: ITyDetail = null

	/** 台风集合路径摘要数组 */
	tyGroupTips: ITyGroupTip[] = []

	/** 当前case对应的5个路径集合 */
	tyGroupPathList: ITyGroupComplexList[] = []

	setCurrentTr(val: IPathType, index: number): void {
		// console.log(`checked:index ${index}, val: ${val}`)
		this.selectedTrIndex = index
		this.selectedDt = val.forecastDt
	}

	getTrColor(index: number): string {
		let colorStr = ''
		if (index === this.selectedTrIndex) {
			colorStr = '#9b59b6;'
		}
		return colorStr
	}

	formatDt2HM(dt: Date): string {
		return formatDate2HM(dt)
	}

	/** 提交当前选中的台风任务 */
	getTyGroupTasks(val: string): void {
		getTyGroupbyTask(val)
			.then((res: IHttpResponse<{ tyCode: string; timestamp: number }[]>) => {
				this.tyGroupTips = []
				res.data.forEach((item) => {
					this.tyGroupTips.push({
						tyCode: item.tyCode,
						timeStamp: item.timestamp * MS_UNIT,
					})
				})
			})
			.catch((err) => {
				console.error(err)
			})
	}

	/** 选中台风集合case */
	selectGroupTy(val: ITyGroupTip): void {
		// this.getTyGroupList(val.tyCode, val.timeStamp)
		this.setTyGroup(val)
		this.getTyGroupPathDetailList(val)
	}

	/** 选择 5种集合路径 中的一条路径 */
	selectTyGroupPath(val: ITyGroupComplexList): void {
		this.setTyGroupPath(val)
	}

	/** 加载当前case对应的5个记录路径信息 */
	getTyGroupPathDetailList(val: ITyGroupTip): void {
		getTyGroupDetailList(val.tyCode, val.timeStamp / MS_UNIT)
			.then((res: IHttpResponse<ITyGroupComplexList[]>) => {
				this.tyGroupPathList = res.data
				// this.setTyphoonPathList(res.data)
			})
			.catch((err) => {
				console.error(err)
			})
	}

	/**@deprecated
	 *  根据当前选择的 group 获取对应的集合列表 */
	getTyGroupList(code: string, ts: number): void {
		this.isLoading = true
		getTyGroupPathList(code, ts / MS_UNIT)
			.then((res) => {
				this.filterTyList = res.data
				this.isLoading = false
			})
			.catch((err) => {
				console.error(err)
				this.isLoading = false
			})
	}

	getTrActivateCls(index: number): string {
		// TODO:[-]
		// :class="index == selectTrIndex ? 'activate' : ' '"
		// :style="{ background: getTrColor(index) }"
		// 注意以上方式不行
		let cls = 'un-activate'
		if (index === this.selectedTrIndex) {
			cls = 'activate'
		}
		return cls
	}

	/** 显示漫滩预报栅格图层 */
	toShowFloodPlainRaster(): void {
		this.setFloodPlainShowTrigger()
	}

	/** + 22-10-08 清除台风路径及其他相关数据 */
	clearTyPath(): void {
		this.selectedTrIndex = -1
		this.setTyphoonPathList([])
		this.tyCode = ''
		this.tyName = '-'
	}

	toTopic(ele: MouseEvent): void {
		// TODO:[*] 22-10-06 注意此处存在一个bug，即若鼠标移入的是 ty_search_form 中的子div，则ele会是子div对象
		const ELE_ID = 'ty_search_form'
		// const dom = ele.target

		stickyTopic(ELE_ID)
	}

	reduceTopic(ele: HTMLElement): void {
		const ELE_ID = 'ty_search_form'
		reduceTopic(ELE_ID)
	}

	/** 设置台风路径集合 */
	@Mutation(SET_TYPHOON_PATH_LIST, { namespace: 'typhoon' }) setTyphoonPathList

	/** 设置 台风预报时刻 */
	@Mutation(SET_TYPHOON_FORECAST_DATETIME, { namespace: 'common' }) setTyForecastDt

	/** 设置当前的 台风群组 */
	@Mutation(SET_TY_GROUP, { namespace: 'typhoon' }) setTyGroup

	/** 设置当前case 选中的集合台风的路径(5种中的一个) */
	@Mutation(SET_TY_GROUP_PATH, { namespace: 'typhoon' }) setTyGroupPath

	/** 显示淹没预报的raster */
	@Mutation(SET_FLOOD_PLAIN_SHOW_TRIGGER, { namespace: 'flood' }) setFloodPlainShowTrigger

	@Getter(GET_SHOW_TYPHOON_SEARCH_FORM, { namespace: 'common' })
	getShowTySearchForm

	/** 设置当前淹没风险等级 */
	@Mutation(SET_FLOOD_RISK_LEVEL, { namespace: 'flood' })
	setFloodRiskLevel

	@Watch('getShowTySearchForm')
	onShowTySearchForm(val: boolean) {
		this.isShow = val
	}

	@Watch('selectedFloodRiskLevel')
	onSelectedFloodRiskLevelChange(val: FloodAreaLevelEnum) {
		this.setFloodRiskLevel(val)
	}
}
</script>
<style scoped lang="less">
@import '../../styles/base-color';
#ty_grouppath_form {
	position: absolute;
	top: 50px;
	left: 380px;
	width: 300px;
}
.ty_search_form {
	// height: 450px;
	background-color: #20262cd9;
	z-index: 900;
	// max-height: 600px;
	.ty-search-container {
		display: flex;
		align-items: center;
		margin: 7px;
		span {
			width: 100px;
			color: white;
		}
		.ty-search-detail {
			display: flex;
			div {
				margin: 2px;
			}
			button {
				margin: 2px;
			}
		}
	}
	.ty-info {
		.ty-info-header {
			display: flex;
			margin: 5px;
			h4 {
				color: white;
				font-size: 1.2rem;
			}
			span {
			}
		}
		section {
			font-size: 13px;
			color: white;
			margin: 5px;
			max-height: 420px;
			overflow: auto;
			// height: 400px;
			// overflow: auto;
			table {
				width: 100%;
				tbody {
					@typhoon-legend();
					tr:hover {
						background: #27ae60;
					}
					.activate {
						// background: #9b59b6;
						background: #23b49c;
						color: white !important;
					}
					.un-activate {
						background: #545869;
					}
				}
			}
		}
	}
}
.ty-row {
	display: flex;
	align-items: center;
	margin: 7px;
}
.date-small {
	width: 160px !important;
}
.ty-search-detail {
	display: flex;
	div {
		margin: 2px;
	}
	button {
		margin: 2px;
		height: 40px;
	}
}
.ty-search-title {
	color: white;
}
.ty-search-footer {
	background: #34495e;
	.ty-row {
		margin-bottom: 0px;
		padding: 5px;
	}
}
.el-button.btn-primary {
	background: #1abc9c;
	border-color: #1abc9c;
}
.el-button.btn-error {
	background: #c0392b;
	border-color: #c0392b;
}
.el-button {
	padding: 5px;
}
.row_child {
	width: 100px;
}
</style>
