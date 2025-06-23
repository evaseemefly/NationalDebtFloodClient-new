import axios from 'axios'
import { host } from './common'
import authHeader from './auth_header'
// 后端的请求地址及端口
// export const host = host
axios.defaults.withCredentials = true

const area = '/typhoon'

/**
 * 爬取指定台风路径
 *
 * @param {string} tyCode
 * @return {*}
 *  ty_code: "2121"
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
const getTargetTyPathList = (tyCode: string) => {
	const url = `${host}${area}/spider/cma/list`
	return axios.get(url, {
		headers: authHeader(),
		params: {
			ty_code: tyCode,
		},
	})
}

export { getTargetTyPathList }
