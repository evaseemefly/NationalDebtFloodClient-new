/**
 * @description 淹没区域多边形特征类型定义
 * @author evaseemefly
 * @date 2025/06/16
 * @interface FloodPolygonFeature
 */
interface FloodPolygonFeature {
	value: number | null
	ty_code: string
	name: string
	description: string
	properties: {
		threshold: number
	}
	geom: {
		type: 'Polygon'
		coordinates: number[][][] // 数字数组表示多边形的坐标
	}
	issue_time: number
	flood_level: number
}

/**
 * @description 淹没区域多边形特征集合类型定义
 * @author evaseemefly
 * @date 2025/06/16
 * @interface FloodPolygonFeatureCollection
 */
interface FloodPolygonFeatureCollection {
	type: string
	features: FloodPolygonFeature[]
}

export type { FloodPolygonFeature, FloodPolygonFeatureCollection }
