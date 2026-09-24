import type L from 'leaflet';

/** Geoman 图层形状事件基础载荷 */
export type LayerShapeEvent = L.PM.BaseEventPayload & {
    /** 当前图形类型 */
    shape: L.PM.SUPPORTED_SHAPES;
};

/** 图层进入 / 退出编辑事件 */
export type LayerEditEvent = LayerShapeEvent & {
    /** 当前图层 */
    layer: L.Layer;
    /** Leaflet 事件名 */
    type?: MapEventName;
};

/** 图层新增顶点事件 */
export type LayerAddVertex = LayerShapeEvent & {
    /** 正在编辑的图层 */
    workingLayer: L.Layer;
    /** 新增顶点标记 */
    marker: L.Marker;
    /** 新增顶点坐标 */
    latlng: L.LatLng;
    /** 顶点索引路径 */
    indexPath?: number[];
};

/** 图层删除顶点事件 */
export type LayerDelVertex = LayerShapeEvent & {
    /** 当前图层 */
    layer: L.Layer;
    /** 被删除的顶点标记 */
    marker: L.Marker;
    /** 顶点索引路径 */
    indexPath: number | number[];
};

/** 图层顶点拖动事件 */
export type LayerMarkerDrag = LayerShapeEvent & {
    /** 当前图层 */
    layer: L.Layer;
    /** 顶点索引路径 */
    indexPath: number | number[];
    /** Geoman 原始标记事件 */
    markerEvent: any;
    /** 被拖动的顶点 */
    target?: L.Marker;
};
