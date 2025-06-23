import fecha from 'fecha'

const DEFAULT_RADIUS = 1

/**
 * + 21-04-20 台风圆 状态
 *
 * @class TyphoonCircleStatus
 */
class TyphoonCircleStatus {
	// color_enum=Color
	// 最大风速
	radius = DEFAULT_RADIUS
	// + 21-10-08 有效数字保留的位数
	EFFECTIVE_UNIT = 3
	// 气压
	bp: number
	forecastDt: Date
	lat: number
	lon: number

	constructor(radius: number, bp: number, forecastDt: Date, lat: number, lon: number) {
		this.radius = radius
		this.bp = bp
		this.forecastDt = forecastDt
		this.lat = lat
		this.lon = lon
	}

	public get latFiltered(): number | string {
		let filteredVal: number | string = ''
		if (this.lat) {
			filteredVal = parseFloat(this.lat.toFixed(this.EFFECTIVE_UNIT))
		}
		return filteredVal
	}

	public get lonFiltered(): number | string {
		let filteredVal: number | string = ''
		if (this.lon) {
			filteredVal = parseFloat(this.lon.toFixed(this.EFFECTIVE_UNIT))
		}
		return filteredVal
	}

	public get bpFiltered(): number | string {
		let filteredVal: number | string = ''
		if (this.bp) {
			filteredVal = parseFloat(this.bp.toFixed(this.EFFECTIVE_UNIT))
		}
		return filteredVal
	}
	public get radiusFiltered(): number | string {
		let filteredVal: number | string = ''
		if (this.radius) {
			filteredVal = parseFloat(this.radius.toFixed(this.EFFECTIVE_UNIT))
		}
		return filteredVal
	}

	//获取颜色（string）
	getColor(): string {
		let colorStr = 'blue'
		const val = this.radius
		if (val <= 2) {
			// return color_str
		} else if (val < 4) {
			colorStr = 'yellow'
			// return color_str
		} else if (val < 6) {
			colorStr = 'red'
		}
		return colorStr
	}

	/**
	 * 获取圆圈的半径
	 *  + 21-05-07 加入一个系数，因为之前的圆圈的半径不够大
	 *
	 * @return {*}  {number}
	 * @memberof TyphoonCircleStatus
	 */
	getWeight(): number {
		let weight = 2
		const coeff = 1.25
		const val = this.radius
		if (val <= 30) {
			weight = 2
		} else if (val < 40) {
			weight = 3
		} else if (val < 60) {
			weight = 4
		} else if (val < 100) {
			weight = 5
		} else {
			weight = 6
		}
		return weight * weight
	}

	toDivIconHtml(): string {
		const that = this
		// 21-12-22 备份
		//     const htmlStr = `
		// <div class='typhoon_data_div mb-4 col-md-4 box-shadow'>
		// 			<div class='card-header'>台风数据</div>
		// 			<div class='card-body'>
		// 				<div class='row'>
		// 					<div class='col-md-4'>时间</div>
		// 					<div class='col-md-8'>${fecha.format(new Date(that.forecastDt), 'YYYY-MM-DD HH:mm')}</div>
		// 				</div>
		// 				<div class='row'>
		// 					<div class='col-md-4'>中心位置</div>
		// 					<div class='col-md-8'>${that.latFiltered}, ${that.lonFiltered}</div>
		// 				</div>

		// 			</div>
		// 			<div class='row_footer'>
		// 					<div class='typhoon_footer'>
		// 						<div class='columnar'>
		// 							<div class='subitem_top'>${that.bpFiltered}</div>
		// 							<div class='subitem_foot'>气压</div>
		// 						</div>
		// 						<div class='columnar'>
		// 							<div class='subitem_top'>${that.radiusFiltered}</div>
		// 							<div class='subitem_foot'>大风半径</div>
		// 						</div>
		// 					</div>
		// 				</div>
		// 		</div>
		// `
		const htmlStr = `
    <div class='typhoon_data_div mb-4 col-md-4 box-shadow'>
				<div class='card-header'>台风数据</div>
				<div class='card-body'>
					<div class='row'>
						<div class='col-md-4'>时间</div>
						<div class='col-md-8'>${fecha.format(new Date(that.forecastDt), 'YYYY-MM-DD HH:mm')}</div>
					</div>
					<div class='row'>
						<div class='col-md-4'>中心位置</div>
						<div class='col-md-8'>${that.latFiltered}, ${that.lonFiltered}</div>
					</div>
					
				</div>
				<div class='row_footer'>
                    <div class='columnar'>
                        <div class='subitem_top'>${that.bpFiltered}</div>
                        <div class='subitem_foot'>气压</div>
                    </div>
                    <div class='columnar'>
                        <div class='subitem_top'>${that.radiusFiltered}</div>
                        <div class='subitem_foot'>大风半径</div>
                    </div>
				</div>
			</div>
    `
		return htmlStr
	}
}

export { TyphoonCircleStatus }
