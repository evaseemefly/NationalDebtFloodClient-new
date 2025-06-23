import { FeatureCollection, GeoJsonObject, Feature } from 'geojson'
import { FloodPolygonFeatureCollection } from '@/types/index'

/**
 * @description 自定义地理特征数据处理函数
 * 将洪涝淹没区域多边形特征集合转换为 GeoJSON FeatureCollection 格式
 * @author evaseemefly
 * @date 2025/06/16
 * @param {FloodPolygonFeatureCollection} data
 * @returns {*}  {FeatureCollection}
 */
const customGeoFeatureProcessData = (data: FloodPolygonFeatureCollection): FeatureCollection => {
	const geoRes = data.features
	const features: Feature[] = geoRes.map((item) => ({
		type: 'Feature',
		geometry: item.geom,
		properties: {
			value: item.value,
			ty_code: item.ty_code,
			name: item.name,
			description: item.description,
			threshold: item.properties ? item.properties.threshold : null,
			issue_time: item.issue_time,
			flood_level: item.flood_level,
		},
	}))

	// 这里使用类型断言，明确指定 type 为 "FeatureCollection"
	const geojsonData = {
		type: 'FeatureCollection' as const,
		features: features,
	}

	return geojsonData
}

export { customGeoFeatureProcessData }
