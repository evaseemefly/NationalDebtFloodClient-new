/**
 * @description 台风级别枚举
 * @author evaseemefly
 * @date 2022/09/28
 * @export
 * @enum {number}
 */
export enum TyphoonLevelEnum {
	/**
	 * 热带风暴
	 */
	TS,
	/** 强热带风暴 */
	STS,
	/** 台风 */
	TY,
	/** 强台风 */
	STY,
	/** 超强台风 */
	SUPERTY,
}

/** 台风集合类型枚举 */
export enum TyphoonGroupTypeEnum {
	GROUP_CENTER = 4101,
	GROUP_SLOW = 4102,
	GROUP_FAST = 4103,
	GROUP_RIGHT = 4104,
	GROUP_LEFT = 4105,
}
