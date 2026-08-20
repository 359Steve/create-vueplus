/** 纬度、经度元组 */
type LatLon = [lat: number, lon: number];

/** 受 MapManager 管理的元素类型 */
type ManagedElementType =
    | 'marker'
    | 'tileLayer'
    | 'polyline'
    | 'polygon'
    | 'circle'
    | 'rectangle'
    | 'trajectory'
    | 'layerGroup';

/** 圆形标记添加选项 */
interface CircleMarkerAddOptions extends L.CircleMarkerOptions, OverlayBaseOptions {}

/** 折线添加选项 */
interface PolylineAddOptions extends L.PolylineOptions, OverlayBaseOptions {}

/** 多边形添加选项 */
interface PolygonAddOptions extends L.PolylineOptions, OverlayBaseOptions {}

/** 圆形区域添加选项 */
interface CircleAddOptions extends L.CircleOptions, OverlayBaseOptions {}

/** 矩形添加选项 */
interface RectangleAddOptions extends L.PolylineOptions, OverlayBaseOptions {}

/** 轨迹添加选项 */
interface TrajectoryOptions extends L.PolylineOptions {
    /** 轨迹点上限，超出后丢弃最早的点；0 或不设表示不限制 */
    maxPoints?: number;
    /** 是否显示当前位置标记，默认 true */
    showMarker?: boolean;
    /** 当前位置标记配置 */
    markerOptions?: L.MarkerOptions;
    /** 轨迹线颜色，默认 `#3388ff` */
    color?: string;
    /** 轨迹线宽度 */
    weight?: number;
    /** 轨迹线透明度 */
    opacity?: number;
}

/** 轨迹内部记录结构 */
interface TrajectoryRecord {
    /** 轨迹折线图层 */
    polyline: L.Polyline;
    /** 当前位置标记，未创建时为 null */
    marker: L.Marker | null;
    /** 轨迹点列表 */
    points: L.LatLng[];
    /** 轨迹点上限，0 表示不限制 */
    maxPoints: number;
    /** 是否显示当前位置标记 */
    showMarker: boolean;
    /** 当前位置标记配置 */
    markerOptions?: L.MarkerOptions;
}

/** 定义leaflet事件名 */
type MapEventName = keyof L.LeafletEventHandlerFnMap;

/** 定义leaflet事件方法与事件名对应关系 */
type MapEventHandler<K extends MapEventName> = L.LeafletEventHandlerFnMap[K];

/** 定义leaflet事件元组类型 */
type MapEvent = {
    [K in MapEventName]: [event: K, handler: L.LeafletEventHandlerFnMap[K]];
}[MapEventName];
