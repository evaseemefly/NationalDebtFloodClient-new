import { FloodAreaLevelEnum } from '@/enum/flood'

/**
 * @description 自定义洪涝淹没区域多边形样式
 * 根据洪涝淹没区域等级设置不同的颜色和样式
 * @author evaseemefly
 * @date 2025/06/16
 * @param {FloodAreaLevelEnum} gtLevel
 * @returns {*}  {*}
 */
const getCustomerFloodPolygonStyle = (gtLevel: FloodAreaLevelEnum): any => {
	let colorStr = ''
	switch (gtLevel) {
		case FloodAreaLevelEnum.GTE100:
			colorStr = '#4899D9'
			break
		case FloodAreaLevelEnum.GTE150:
			colorStr = '#FFFB58'
			break
		case FloodAreaLevelEnum.GTE200:
			colorStr = '#FF0000'
			break
		default:
			break
	}
	const customStyle = {
		color: colorStr,
		weight: 2,
		opacity: 0.5,
		fillColor: colorStr,
		fillOpacity: 0.6,
	}
	return customStyle
}

export { getCustomerFloodPolygonStyle }
