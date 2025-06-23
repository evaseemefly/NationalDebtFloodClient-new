/**
 * + 25-05-21
 * @description 栅格图层渲染
 */

import { DEFAULT_COLOR_SCALE } from '@/const/colorBar'
import { LayerTypeEnum } from '@/enum/map'
import L from 'leaflet'
import * as d3 from 'd3'
import moment from 'moment'
// 使用leaflet-canvaslayer-field还需要依赖的库
import chroma from 'chroma-js'
import consola from 'consola'
// TODO:[-] 20-09-12 暂时放弃使用 d3js，自己手绘，采用现成的第三方库:
// https://github.com/GeoTIFF/georaster-layer-for-leaflet
// 注意使用 该第三方库，依赖于 georaster
import 'georaster'
// 以下方式引入不成功
// import * as georaster from 'georaster'
// https://github.com/GeoTIFF/georaster-layer-for-leaflet
import 'georaster-layer-for-leaflet'
import { DEFAULT_LAYER_ID, DEFAULT_URL } from '@/const/default'

export interface IRaster {
	rasterLayer: L.Layer

	/**
	 * 将当前 raster 添加至 map
	 */
	add2map(
		map: L.Map,
		errorCallBackFun: (opt: { message: string; type: string }) => void
	): Promise<L.Layer>
}

/**
 * @description 栅格图层渲染 Layer
 * 根据远端的url加载渲染对应的栅格图层
 * @author evaseemefly
 * @date 2025/05/21
 * @class RasterLayers
 */
class RasterLayers {
	options: {
		rasterLayer: L.Layer

		/** chroma.scale 色标变量，在构造函数中给与赋值 */
		scaleList: string[] | string
		customMin?: number
		customMax?: number
		/** 色标上限 乘以的系数 不可缺省 */
		customCoefficient: number
		customCoeffMax?: number
		desc?: string

		/**
		 * 图层类型
		 */
		layerType?: LayerTypeEnum
	} = {
		rasterLayer: new L.Layer(),

		/** chroma.scale 色标变量，在构造函数中给与赋值 */
		scaleList: DEFAULT_COLOR_SCALE.scaleColorList,

		layerType: LayerTypeEnum.UN_LAYER,

		customCoefficient: 1,
	}
	/** 栅格的远程地址 */
	protected _tiffUrl: string = null

	get tiffUrl(): string {
		return this._tiffUrl
	}

	/**
	 * raster的实际最大值
	 *
	 * @memberof RasterGeoLayer
	 */
	rasterMax = 0
	/**
	 * raster的实际最小值
	 *
	 * @memberof RasterGeoLayer
	 */
	rasterMin = 0

	/**
	 * 色标的范围(乘以了系数=this.rasterMax * this.options.customCoefficient)
	 *
	 * @type {number[]}
	 * @memberof RasterGeoLayer
	 */
	scaleRange: number[] = []

	constructor(
		url: string,
		options?: {
			scaleList: string[] | string
			customMin?: number
			customMax?: number
			customCoefficient?: number
			customCoeffMax?: number
			desc?: string
		}
	) {
		this.options = { ...this.options, ...options }
		this._tiffUrl = url
	}

	public async add2map(
		map: L.Map,
		pretreatmentCallBackFun: (ElMessage) => void,
		isShowRasterLayer = true
	): Promise<number> {
		let layerId: number = DEFAULT_LAYER_ID

		let addedLayer: L.Layer = null
		const that = this
		// TODO:[-] 20-11-04 暂时注释掉，调取远程的文件会出现错误
		// const urlGeoTifUrl = tifResp.data
		// TODO:[*] 25-03-26 注意此处会由于 Promise中的错误(服务器500)导致无法加载,需要此处进行捕获异常或处理异常
		// 加入catch代码块
		try {
			let urlGeoTifUrl = DEFAULT_URL
			if (this._tiffUrl != null) {
				urlGeoTifUrl = this._tiffUrl
			}
			if (isShowRasterLayer && urlGeoTifUrl != undefined) {
				// 大体思路 获取 geotiff file 的路径，二进制方式读取 -> 使用 georaster 插件实现转换 -> 获取色标，
				// TODO:[*] 24-11-05 此部分应封装为方法
				// TODO:[-] 20-11-02 将之前的逻辑方式修改为 await 的方式
				// TODO:[-] 20-11-05 在 fetch 请求头中加入跨域的部分
				const fetchHeader = new Headers({
					'Access-Control-Allow-Origin': '*',
					'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8,',
				})
				// TypeError: Failed to fetch
				/**
				 * TODO:[*] 25-05-21 出现跨域的错误
				 * forecast:1  Access to fetch at 'http://localhost:82/images/TYPHOON/data/user1/surge_path/2025/2106/1746777768768/zmax_center.dat.tif' from origin 'http://localhost:8086' has been blocked by CORS policy: No 'Access-Control-Allow-Origin' header is present on the requested resource.
				 */
				const response = await fetch(urlGeoTifUrl, {
					method: 'GET',
					// headers: fetchHeader,
					mode: 'cors',
				})
				const arrayBuffer = await response.arrayBuffer()
				// 使用 import 'georaster' 的方式引入会出现没有智能提示的问题
				// @ts-ignore
				const georasterResponse: any = await parseGeoraster(arrayBuffer)
				// TODO:[-] 22-04-14 加入 栅格的范围是否由 options.custom 定义
				// TODO:[*] 24-11-05 此处若options 中定义了 customMin 则显示，若未配置则显示实际的最小值
				const min: number = this.options.customMin
					? this.options.customMin
					: georasterResponse.mins[0]
				// TODO:[-] 22-04-15 若增水大于1m，则整个场*0.8，所以对于max*0.8
				const rasterMax = georasterResponse.maxs[0]
				this.rasterMax = rasterMax
				this.rasterMin = min
				const max = rasterMax

				// TODO:[-] 22-04-15 此处修改为 range 为色标要求的范围
				// const range = georasterResponse.ranges[0]
				const range: number = max - min
				// const scale = chroma.scale('Viridis')
				// TODO:[*] 21-08-19 error: chroma 错误
				// chroma.js?6149:180 Uncaught (in promise) Error: unknown format: #ee4620,#ee462f,#ed4633,#ef6b6d,#f3a4a5,#f9dcdd,#dcdcfe
				// TODO:[-] 22-04-15 手动设置色标
				// TODO:[*] 22-04-20 注意此处需要对scaleList 进行修改加入最后一个色标
				const scaleList = [...this.options.scaleList]
				if (
					that.options.customCoeffMax &&
					that.options.customCoefficient &&
					rasterMax > that.options.customCoeffMax
				) {
					scaleList.push(scaleList[scaleList.length - 1])
				}
				const scale = chroma.scale(scaleList)
				this.scaleRange = [min, max * this.options.customCoefficient]
				// scale.domain(this.scaleRange)

				// TODO:[*] 21-02-10 此处当加载全球风场的geotiff时，y不在实际范围内，需要手动处理

				// @ts-ignore
				const layer = new GeoRasterLayer({
					georaster: georasterResponse,
					opacity: 0.6,
					pixelValuesToColorFn: function (pixelValues) {
						const pixelValue = pixelValues[0] // there's just one band in this raster
						// TODO:[-] 22-04-15 此处加入对于极值大于1.0米的增水将像素值乘以一个系数0.8
						// if (that.options.customCoeffMax && rasterMax > this.options.customCoeffMax) {
						//     pixelValue = pixelValue * this.options.customCoefficient
						// }

						// if there's zero wind, don't return a color
						// TODO:[-] 22-01-20 由于最大增水场可能会出现 pixelValue 为 0 的情况，所以需要剔除掉===0的判断
						// if (pixelValue === 0 || Number.isNaN(pixelValue)) return null
						// 注意此处有出现 该值超过1的情况
						const scaledPixelValue = (pixelValue - min) / range

						if (Number.isNaN(pixelValue)) return null
						let color = ''
						if (
							that.options.customCoeffMax &&
							that.options.customCoefficient &&
							rasterMax > that.options.customCoeffMax
						) {
							color = scale(
								scaledPixelValue * (1 / that.options.customCoefficient)
							).hex()
							// color = scale(scaledPixelValue).hex()
						} else {
							color = scale(scaledPixelValue).hex()
						}

						return color
					},
					resolution: 256,
				})
				pretreatmentCallBackFun({ message: `加载当前栅格成功!` })
				addedLayer = layer.addTo(map)
				// @ts-ignore
				layerId = addedLayer._leaflet_id
			}
		} catch (error) {
			// 将异常抛出并记录
			consola.error(error)
			throw new Error(`加载 geotiff 图层失败,请检查是否存在指定的geotiff路径`)
		}

		return layerId
	}
}
export default RasterLayers
