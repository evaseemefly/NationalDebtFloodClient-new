import { TaskStatusEnum } from '@/enum/status'

/** 台风路径接口 */
export interface ITyTask {
	/** 作业发布时间 */
	issuTs: number
	/** 台风code */
	tyCode: string
	/** 作业状态 */
	ststus: TaskStatusEnum
}
