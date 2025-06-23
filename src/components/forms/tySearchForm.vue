<template>
	<div
		v-draggable
		class="ty_search_form"
		id="ty_search_form"
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
				<!-- <div class="detail-input"></div> -->
				<el-input
					class="detail-input"
					v-model="tyCode"
					value="number"
					placeholder="台风编号"
				></el-input>
				<!-- <div class="detail-commit"></div> -->
				<button
					type="top"
					class="detail-commit el-button el-button--primary btn-primary"
					@click="spiderTy"
				>
					爬取<i class="fas fa-cloud-download-alt"></i>
				</button>
				<button
					type="top"
					class="detail-commit el-button el-button--primary btn-error"
					@click="clearTyPath"
				>
					清除<i class="far fa-times-circle"></i>
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
							<th scope="col">日期</th>
							<th scope="col">时间</th>
							<th scope="col">级别</th>
							<th scope="col">预报/实况</th>
							<th scope="col">气压</th>
						</tr>
					</thead>
					<tbody>
						<!-- <tr
							v-for="(tyTemp, index) in spiderTyCMAList"
							:key="tyTemp.id"
							@click="setCurrentTr(tyTemp, index)"
							:class="computeDateActivateCls(tyTemp.forecastDt)"
							:class="index == selectedTrIndex ? 'activate' : ' '"
						> -->
						<tr
							v-for="(tyTemp, index) in spiderTyCMAList"
							:key="tyTemp.id"
							@click="setCurrentTr(tyTemp, index)"
							:class="computeDateActivateCls(tyTemp.forecastDt)"
						>
							<td>{{ tyTemp.forecastDt | filterDate2MD }}</td>
							<td>{{ formatDt2HM(tyTemp.forecastDt) }}</td>
							<td :class="tyTemp.tyType | filterTyLevel2Cls">
								{{ tyTemp.tyType | filterTyLevel2Str }}
							</td>
							<td>{{ tyTemp.isForecast ? '预报' : '实况' }}</td>
							<td>{{ tyTemp.bp }}</td>
						</tr>
					</tbody>
				</table>
			</section>
		</div>
		<!-- 底部选择起止时间栏 -->
		<div class="ty-search-footer">
			<div class="ty-row">
				<span class="ty-search-title">起始</span>
				<div class="ty-search-detail">
					<el-date-picker
						v-model="startDt"
						class="date-small"
						type="datetime"
						:format="dateFormat"
						placeholder="选择日期时间"
					>
					</el-date-picker>
					<!-- <button
						type="top"
						class="detail-commit el-button el-button--primary btn-primary"
						@click="spiderTy"
					>
						确认<i class="fas fa-cloud-download-alt"></i>
					</button> -->
				</div>
			</div>
			<div class="ty-row">
				<span class="ty-search-title">结束</span>
				<div class="ty-search-detail">
					<!-- <div class="detail-input"></div> -->
					<el-date-picker
						v-model="endDt"
						class="date-small"
						type="datetime"
						placeholder="选择日期时间"
						:format="dateFormat"
					>
					</el-date-picker>
					<!-- <div class="detail-commit"></div> -->
					<button
						type="top"
						class="detail-commit el-button el-button--primary btn-primary"
						@click="commit"
					>
						提交<i class="far fa-save"></i>
					</button>
				</div>
			</div>
			<div class="ty-row">
				<span class="ty-search-title">结束</span>
				<div class="ty-search-detail">
					<button
						type="top"
						class="detail-commit el-button el-button--primary btn-primary"
						@click="commitTySurgeTask"
					>
						提交<i class="far fa-save"></i>
					</button>
				</div>
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
} from '@/util/filter'

// 枚举
import { TyphoonLevelEnum } from '@/enum/typhoon'
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
} from '@/store/types'
import { IPathType } from '@/types'
import { submitTyphoonPath, submitTyphoonSurge } from '@/api/task'
import { ITyDetail, ITyPath, ITyPathComplex } from '@/interface/typhoon'
import moment from 'moment'
@Component({
	filters: {
		filterFormatDate2YMD: formatDate2YMD,
		filterformatDate2HM: formatDate2HM,
		filterDate2MD: formatDate2MD,
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
export default class TySearchFormView extends Vue {
	/** 爬取的台风路径数据列表 */
	spiderTyCMAList: ITyPath[] = []
	/** 过滤后的台风路径数据列表 */
	filterTyList: ITyPath[] = []

	/** 选中的台风 index */
	selectedTrIndex = 0

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

	/** 判断当前时间是否在起止时间范围内 */
	computeDateActivateCls(currentDt: Date): string {
		let cls = 'un-activate'
		// 若当前时间在选取的时间范围内则添加 activate 标签
		if (currentDt >= this.startDt && currentDt <= this.endDt) {
			cls = 'activate'
		}
		return cls
	}

	// 爬取台风
	spiderTy(): void {
		const self = this
		self.spiderTyCMAList = []
		/*
            ty_code: "2121"
            ty_id: 2726099
            ty_name_ch: "妮亚图"
            ty_name_en: "NYATOH"
            ty_path_list: Array(24)
            0:
            bp: 998
            forecast_dt: "2021-11-30T00:00:00Z"
            forecast_ty_path_list: (8) [
                0:
                bp: 990
                forecast_dt: "2021-11-30T12:00:00Z"
                lat: 13.2
                lon: 137.6
                ts: 1638273600
                ty_type: "TS"
                ,...
            ]
            lat: 12.6
            lon: 139.2
            ts: 1638230400000
            ty_type: "TS"
        */
		//
		// const loadInstance = loading('等待加载等值面', {
		// 	fullscreen: true,
		// 	background: 'rgba(49, 59, 89, 0.733)',
		// })
		this.$message(`正在爬取台风编号:${this.tyCode} ing`)
		this.isLoading = true
		getTargetTyPathList(this.tyCode)
			.then(
				(res: {
					status: number
					data: {
						ty_code: string
						ty_id: number
						ty_name_ch: string
						ty_name_en: string
						ty_path_list: Array<{
							lat: number
							lon: number
							ts: number
							ty_type: string
							bp: number
							forecast_dt: Date
							forecast_ty_path_list: Array<{
								lat: number
								lon: number
								ts: number
								ty_type: string
								bp: number
								forecast_dt: string
							}>
						}>
					}
				}) => {
					if (res.status === 200) {
						/*
                            step-1: 对于 res.data.ty_path_list 根据ts(时间戳)按照从小到大进行排序
                            step-2: 遍历 res.data.ty_path_list 提取每个时刻的台风实况
                            step-3: 获取 index=count 的实况中的 forecast_ty_path_list push 至台风路径 list 中
                        */
						// if (
						//     !res.data.hasOwnProperty('ty_path_list') &&
						//     res.data.ty_path_list.length <= 0
						if (res.data.ty_path_list.length <= 0) {
							throw new Error(`无法爬取${this.tyCode}的台风路径`)
						}
						self.tyName = res.data.ty_name_ch
						const tyPathList: Array<{
							lat: number
							lon: number
							ts: number
							tyType: string
							bp: number
							forecastDt: Date
							isForecast: boolean
						}> = []
						const tempTyPathList = res.data.ty_path_list.sort((a, b) => {
							return a.ts - b.ts
						})
						tempTyPathList.forEach((temp) => {
							tyPathList.push({
								lat: temp.lat,
								lon: temp.lon,
								ts: temp.ts,
								tyType: temp.ty_type,
								bp: temp.bp,
								forecastDt: new Date(temp.forecast_dt),
								isForecast: false,
							})
						})
						tempTyPathList[tempTyPathList.length - 1].forecast_ty_path_list.forEach(
							(temp) => {
								tyPathList.push({
									lat: temp.lat,
									lon: temp.lon,
									ts: temp.ts,
									tyType: temp.ty_type,
									bp: temp.bp,
									forecastDt: new Date(temp.forecast_dt),
									isForecast: true,
								})
							}
						)
						// console.log(tyPathList)
						this.spiderTyCMAList = []
						tyPathList.forEach((temp) => {
							this.spiderTyCMAList.push({
								forecastDt: temp.forecastDt,
								lat: temp.lat,
								lon: temp.lon,
								bp: temp.bp,
								isForecast: temp.isForecast,
								tyType: temp.tyType,
							})
						})
						const currentTs = moment.now()
						this.tyDetail = {
							tyCode: res.data.ty_code,
							tyNameCh: res.data.ty_name_ch,
							tyNameEn: res.data.ty_name_en,
							timeStamp: currentTs,
						}
					}
				}
			)
			.catch((e: Error) => {
				// console.log(e)
				this.$message.error(e.message)
				this.spiderTyCMAList = []
				self.setTyphoonPathList([])
			})
			.finally(() => {
				// console.log(res.data)
				// this.setTyphoonPathList(this.customerTyCMAList)
				if (this.spiderTyCMAList.length > 0) {
					this.$message(`爬取台风编号:${this.tyCode}成功`)
				}
				// TODO:[-] 25-04-27 将起止时间设置为当前爬取的台风的起止时间(默认)
				this.startDt = this.spiderTyCMAList[0].forecastDt
				this.endDt = this.spiderTyCMAList[this.spiderTyCMAList.length - 1].forecastDt
				self.setTyphoonPathList(self.spiderTyCMAList)
				this.isLoading = false
				// loadInstance.close()
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

	/** 根据当前选取的台风过滤路径提交至后台 */
	commit(): void {
		const submitData: ITyPathComplex = {
			tyDetail: this.tyDetail,
			tyPathList: this.filterTyList,
		}
		submitTyphoonPath(submitData).then((res) => {
			if (res.status === 200) {
				this.$message.success('提交成功')
			} else {
				this.$message.error('提交失败')
			}
		})
	}

	commitTySurgeTask(): void {
		const submitData: ITyPathComplex = {
			tyDetail: this.tyDetail,
			tyPathList: this.filterTyList,
		}
		submitTyphoonSurge(submitData).then((res) => {
			if (res.status === 200) {
				this.$message.success('提交成功')
			} else {
				this.$message.error('提交失败')
			}
		})
	}

	/** + 22-10-08 清除台风路径及其他相关数据 */
	clearTyPath(): void {
		this.spiderTyCMAList = []
		this.selectedTrIndex = -1
		this.setTyphoonPathList([])
		this.tyCode = ''
		this.tyName = '-'
	}

	@Watch('selectedDt')
	onSelectDt(val: Date): void {
		this.setTyForecastDt(val)
	}

	/** 起止时间 */
	get filterDtOpts(): { startDt: Date; endDt: Date } {
		const { startDt, endDt } = this
		return { startDt, endDt }
	}

	/** 根据起止时间设置台风过滤路径集合 */
	@Watch('filterDtOpts')
	OnFilterDtOpts(val: { startDt: Date; endDt: Date }): void {
		this.$log.info(`监听到截取起止时间发生变化:${val.startDt}->${val.endDt}`)
		const filterTyList = this.filterTyphoonPathByTimeRange(
			this.spiderTyCMAList,
			val.startDt,
			val.endDt
		)
		this.filterTyList = filterTyList
		this.setTyphoonPathList(filterTyList)
	}

	/**
	 * TODO:[-] 25-04-27
	 * 根据时间范围过滤台风路径数据
	 * @param list 台风路径数据列表
	 * @param startTime 开始时间
	 * @param endTime 结束时间
	 * @returns 过滤后的台风路径数据列表
	 */
	filterTyphoonPathByTimeRange(list: ITyPath[], startTime: Date, endTime: Date): ITyPath[] {
		// 确保开始时间不晚于结束时间
		if (startTime > endTime) {
			throw new Error('开始时间不能晚于结束时间')
		}

		return list.filter((path) => {
			const pathTime = new Date(path.forecastDt)
			return pathTime >= startTime && pathTime <= endTime
		})
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

	@Getter(GET_SHOW_TYPHOON_SEARCH_FORM, { namespace: 'common' }) getShowTySearchForm

	/** 获取当前台风选定的预报时刻 */
	@Getter(GET_TYPHOON_FORECAST_DATETIME, { namespace: 'common' }) getTyForecastDt

	@Watch('getShowTySearchForm')
	onShowTySearchForm(val: boolean) {
		this.isShow = val
	}

	/** 监听 vuex 的预报时刻 发声变化反向触发本组件选定对应的时间 */
	@Watch('getTyForecastDt')
	onTyForecastDt(val: Date) {
		// 监听到 vuex 的 预报时刻发声变化，需要从当前 spiderTyCMAList 找到对应的 obj
		const index = this.spiderTyCMAList.findIndex((temp) => {
			return temp.forecastDt === val
		})
		if (index >= 0) {
			this.setCurrentTr(this.spiderTyCMAList[index], index)
		}

		// this.selectedDt = val
	}
}
</script>
<style scoped lang="less">
@import '../../styles/base-color';
.ty_search_form {
	position: absolute;
	top: 50px;
	left: 50px;
	width: 300px;
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
</style>
