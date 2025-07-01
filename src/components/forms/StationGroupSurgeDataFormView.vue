<template>
	<div v-draggable id="station_surge_form" v-if="getIsShow" class="right-station-surge-form">
		<div class="my-detail-form">
			<div class="detail-content">
				<div class="">
					<el-switch v-model="isAddition" active-text="总潮位" inactive-text="集合增水">
					</el-switch>
				</div>
				<!-- TODO:[-] 25-06-26 由 DataFormView 组件中获取 groupPathSurgeList 数据 -->
				<StationGroupSurgeChartView
					:groupPathSurgeList="groupPathSurgeList"
					:tideList="tideList"
					:stationCode="getStationCode"
					:isFinished="isFinished"
					:isAddition="isAddition"
				></StationGroupSurgeChartView>
			</div>
		</div>
	</div>
</template>
<script lang="ts">
import { Component, Prop, Vue, Watch } from 'vue-property-decorator'
import { Getter, Mutation, State, namespace } from 'vuex-class'
import StationGroupSurgeChartView from '@/components/charts/StationGroupSurgeDataCharts.vue'
import { GET_SHOW_STATION_SURGE_FORM, GET_STATION_CODE, GET_TY_GROUP } from '@/store/types'
import { ITyphoon } from '@/store/modules/typhoon'
import { ITyGroupTip } from '@/interface/typhoon'
import { DEFAULT_STATION_CODE, DEFAULT_TIMESTAMP, DEFAULT_TY_CODE } from '@/const/default'
import { loadTargetStationGroupSurgeList, loadTargetStationTideList } from '@/api/station'
import consola from 'consola'
import { IHttpResponse } from '@/interface/common'
import { ITide, ITyGroupPathSurge } from '@/interface/surge'
import { TyphoonGroupTypeEnum } from '@/enum/typhoon'

/**
 * 站点集合预报增水 form 组件——其中嵌套 StationGroupSurgeChartView 子组件
 */
@Component({ components: { StationGroupSurgeChartView } })
export default class StationGroupSurgeDataFormView extends Vue {
	mounted() {}

	/** 集合路径增水集合 */
	groupPathSurgeList: ITyGroupPathSurge[] = []

	/** 天文潮预报集合 */
	tideList: ITide[] = []

	/** 所有api加载完毕 */
	isFinished = false

	/** 是否显示总潮位 */
	isAddition = false

	/** + 25-06-30 加载指定站点的增水全集合(增水集合+天文潮集合) */
	async loadTargetStationSurgeList(
		stationCode: string,
		tyCode: string,
		issueTs: number
	): Promise<void> {
		this.isFinished = false // 设置 isFinished 为 false，表示加载未完成
		try {
			loadTargetStationGroupSurgeList(stationCode, tyCode, issueTs)
				.then((res: IHttpResponse<ITyGroupPathSurge[]>) => {
					// step1: 获取增水集合
					if (res.status === 200 && res.data) {
						this.groupPathSurgeList = res.data
						return res.data
					} else {
						// 建议处理请求失败或数据为空的情况
						consola.error(`加载数据失败或返回数据为空，状态码: ${res.status}`)
						return [] // 清空旧数据，防止显示错误信息
					}
				})
				.then((res) => {
					// step2: 获取增水集合的起止时间
					// res 是一个包含增水数据的数组
					if (res.length === 0) {
						consola.warn('未找到对应的增水数据，请检查站点或台风编号是否正确。')
					} else {
						// TODO:[-] 25-06-30 根据加载的增水集合，获取起止时间
						const forecastTsList: number[] = res[0].surge_list.map((surge) => {
							return surge.forecast_ts
						})
						const endTs = Math.max(...forecastTsList) // 获取增水集合的最大时间戳
						const startTs = Math.min(...forecastTsList) // 获取增水集合的最小时间戳
						return {
							start: startTs,
							end: endTs,
						}
					}
				})
				.then((timeRange) => {
					// step3: 获取天文潮数据
					if (timeRange) {
						// 调用获取天文潮的函数
						this.loadTargetStationAstronomicTideList(
							stationCode,
							timeRange.start,
							timeRange.end
						)
					}
				})
				.finally(() => {
					// step4: 设置 isFinished 为 true，表示加载完成
					this.isFinished = true
				})
		} catch (error) {
			consola.error('API请求异常:', error)
		}
	}

	/** @delayed
	 * 加载指定站点的集合增水集合
	 */
	async loadTargetStationGroupSurgeList(stationCode: string, tyCode: string, issueTs: number) {
		loadTargetStationGroupSurgeList(stationCode, tyCode, issueTs)
			.then((res: IHttpResponse<ITyGroupPathSurge[]>) => {
				if (res.status === 200 && res.data) {
					// consola.log(
					// 	`loadTargetStationGroupSurgeList 返回数据:${JSON.stringify(res.data)}`
					// )
					this.groupPathSurgeList = res.data
					return res.data
				} else {
					// 建议处理请求失败或数据为空的情况
					consola.error(`加载数据失败或返回数据为空，状态码: ${res.status}`)
					this.groupPathSurgeList = [] // 清空旧数据，防止显示错误信息
				}
			})
			.catch((error) => {
				// 捕获网络请求等异常
				consola.error('API请求异常:', error)
				this.groupPathSurgeList = [] // 发生异常时也清空数据
			})
	}

	/** TODO:[*] 25-06-26
	 * 加载指定时间范围的天文潮
	 */
	async loadTargetStationAstronomicTideList(
		stationCode: string,
		startTs: number,
		endTs: number
	): Promise<void> {
		loadTargetStationTideList(stationCode, startTs, endTs)
			.then((res: IHttpResponse<ITide[]>) => {
				if (res.status === 200 && res.data) {
					consola.log(
						`loadTargetStationAstronomicTideList 返回数据:${JSON.stringify(res.data)}`
					)
					// 处理返回的数据
					this.tideList = res.data
				} else {
					consola.error(`加载天文潮数据失败或返回数据为空，状态码: ${res.status}`)
				}
			})
			.catch((error) => {
				consola.error('API请求异常:', error)
			})
	}

	/**
	 * TODO:[*] 25-06-25
	 * 将监听 tyCode | stationCode	| issueTs 的变化
	 * 	 *1 监听变化，获取对应的潮位预报数据
	 */

	/** 获取台风组信息 */
	@Getter(GET_TY_GROUP, { namespace: 'typhoon' })
	getTyGroup: ITyGroupTip | null

	/** 获取站点编号 */
	@Getter(GET_STATION_CODE, { namespace: 'station' })
	getStationCode: string

	/** 台风集合摘要和选中站点 */
	get tySource(): {
		typhoon: ITyGroupTip | null
		stationCode: string
	} {
		if (this.getTyGroup && this.getStationCode) {
			// 返回一个包含所有依赖项的对象，方便 Watcher 使用
			const { getTyGroup, getStationCode } = this
			return {
				typhoon: getTyGroup,
				stationCode: getStationCode,
			}
		}
		return null
	}

	@Watch('tySource', { immediate: true, deep: true })
	onTySourceChange(
		newVal: {
			typhoon: ITyGroupTip | null
			stationCode: string
		},
		oldVal: {
			typhoon: ITyGroupTip | null
			stationCode: string
		}
	) {
		// 当 tySource 变化时触发
		if (
			newVal &&
			newVal.typhoon.timeStamp !== DEFAULT_TIMESTAMP &&
			newVal.typhoon.tyCode !== DEFAULT_TY_CODE &&
			newVal.stationCode !== DEFAULT_STATION_CODE
		) {
			// 这里可以添加获取潮位预报数据的逻辑
			console.log(
				`Typhoon or Station Code changed:stationCode:${newVal.stationCode}, tyCode:${newVal.typhoon.tyCode}, timeStamp:${newVal.typhoon.timeStamp}`
			)

			this.loadTargetStationSurgeList(
				newVal.stationCode,
				newVal.typhoon.tyCode,
				newVal.typhoon.timeStamp
			)
		}
	}

	@Getter(GET_SHOW_STATION_SURGE_FORM, { namespace: 'station' })
	getIsShow: boolean
}
</script>
<style scoped lang="less">
@import '../../styles/station/station-chart';
// + 21-12-06 加入重写的 emelemtnui 样式
@import '../../styles/my-elementui/common';
@import '../../styles/base-form.less';
.test {
	background: rgb(252, 182, 31);
	color: rgb(235, 232, 70);
}

#station_surge_form {
	bottom: 60px;
	left: 50px;
	// @form-base-background();
}
.detail-content {
	@form-base-background();
}
</style>
