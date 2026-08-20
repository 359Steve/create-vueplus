interface MarkerParam {
    Lat: number;
    Lon: number;
    id: string;
}

/** 覆盖物通用附加选项 */
interface OverlayBaseOptions {
    /** 弹窗内容，支持 HTML */
    popup?: string | HTMLElement;
    /** 悬停提示 */
    tooltip?: string;
    /** 是否在添加后立即打开弹窗 */
    openPopup?: boolean;
}

/** 标记点添加选项 */
interface MarkerAddOptions extends L.MarkerOptions, OverlayBaseOptions {
    /** 航向角，用于旋转图标 */
    heading?: number;
}

/** 创建 marker 类型 */
interface AddMarkerParam extends MarkerParam {
    options: MarkerAddOptions;
}

/** 更新 marker 类型 */
interface UpdateMarkerParam extends MarkerParam {
    duration: number;
    keepAtCenter: boolean;
    heading?: number;
}

/** 创建圆区域类型 */
interface AddCircleParam extends MarkerParam {
    radius: number;
    options: CircleAddOptions;
}

/** 更新圆区域类型 */
interface UpdateCircleParam extends Omit<UpdateMarkerParam, 'heading'> {
    radius: number;
}
