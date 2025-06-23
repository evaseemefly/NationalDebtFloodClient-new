/**
 * @description 任务状态枚举类
 * @author evaseemefly
 * @date 2025/05/12
 * @export
 * @enum {number}
 */
export enum TaskStatusEnum {
	/** 等待 */
	PENDING = 4002,
	/** 进行中 */
	IN_PROGRESS = 4003,
	COMPLETED = 4004,
	FAILED = 4005,
}
