/** 地图绘制图形类型 */
export const DrawKey = {
    /** 点标记 */
    Marker: 'Marker',
    /** 圆形 */
    Circle: 'Circle',
    /** 两点线段，单击第二个点即完成 */
    Polyline: 'Polyline',
    /** 多点折线，双击完成 */
    Polylines: 'Polylines',
    /** 多边形 */
    Polygon: 'Polygon',
    /** 矩形 */
    Rectangle: 'Rectangle',
} as const;

/** 绘制图形类型键名 */
export type DrawKeyType = keyof typeof DrawKey;

/** 绘制完成回传的图层数据 */
interface CallBackData<T> {
    /** 图形 layerid */
    id: string;
    /** 该图形对应的几何数据 */
    data: T;
}

/**
 * 各图形的回调数据与添加选项映射
 */
interface DrawConfig {
    [DrawKey.Marker]: {
        data: CallBackData<L.LatLngExpression>;
        options: MarkerAddOptions;
    };

    [DrawKey.Circle]: {
        data: CallBackData<{
            center: L.LatLngExpression;
            radius: number;
        }>;
        options: CircleAddOptions;
    };

    [DrawKey.Polyline]: {
        data: CallBackData<Omit<WaypointData, 'executeHeight' | 'waypointSpeed'>[]>;
        options: PolylineAddOptions;
    };

    [DrawKey.Polylines]: {
        data: CallBackData<Omit<WaypointData, 'executeHeight' | 'waypointSpeed'>[]>;
        options: PolylineAddOptions;
    };

    [DrawKey.Polygon]: {
        data: CallBackData<L.LatLngExpression[]>;
        options: PolygonAddOptions;
    };

    [DrawKey.Rectangle]: {
        data: CallBackData<L.LatLngBoundsExpression>;
        options: RectangleAddOptions;
    };
}

/** 发起一次绘制/编辑请求的参数联合类型 */
export type DrawRequestParam = {
    [K in DrawKeyType]: {
        /** 图形类型 */
        type: K;
        /** 绘制或编辑过程中回传当前图形数据 */
        callback: (_data: DrawConfig[K]['data']) => void;
        /** true 进入编辑已有图形，false 为新建绘制 */
        edit?: boolean;
        /** 是否为恢复数据 */
        recover?: boolean;
        /** 图形样式与提示配置 */
        options?: DrawConfig[K]['options'];
        /** 图层被移除时通知外部 */
        notice?: () => void;
    };
}[DrawKeyType];

/** 列表选中航点后同步地图高亮的参数 */
export type DrawVueToMapParam = {
    [K in DrawKeyType]: {
        /** 图形类型 */
        type: K;
        /** 选中顶点 ID */
        id: string;
    };
}[DrawKeyType];

/** 地图选中航点后同步列表高亮的参数 */
export type DrawSyncParam = {
    [K in DrawKeyType]: {
        /** 图形类型 */
        type: K;
        /** 地图选中后回传顶点 ID */
        callback: (_id: string) => void;
    };
}[DrawKeyType];

/** 拖动折线顶点时实时同步列表坐标的参数 */
export type DrawDragParam = {
    [K in DrawKeyType]: {
        /** 图形类型 */
        type: K;
        /** 拖动顶点后回传最新坐标 */
        callback: (_data: K extends 'Polyline' | 'Polylines' ? DrawConfig[K]['data']['data'][number] : any) => void;
    };
}[DrawKeyType];

/** 将已有航点写入绘制器，用于进入编辑态 */
export type DrawWaylineParam = {
    [K in DrawKeyType]: {
        /** 图形类型 */
        type: K;
        /** 已有航点数据 */
        data: K extends 'Polyline' | 'Polylines' ? DrawConfig[K]['data']['data'] : any;
    };
}[DrawKeyType];

/** 指定图形类型的绘制请求 */
export type DrawRequest<T extends DrawKeyType> = Extract<DrawRequestParam, { type: T }>;

/** 指定图形类型的列表 → 地图选中同步 */
export type DrawVueToMap<T extends DrawKeyType> = Extract<DrawVueToMapParam, { type: T }>;

/** 指定图形类型的地图 → 列表选中同步 */
export type DrawSync<T extends DrawKeyType> = Extract<DrawSyncParam, { type: T }>;

/** 指定图形类型的顶点拖动同步 */
export type DrawDrag<T extends DrawKeyType> = Extract<DrawDragParam, { type: T }>;

/** 指定图形类型的航线编辑数据写入 */
export type DrawWayline<T extends DrawKeyType> = Extract<DrawWaylineParam, { type: T }>;

/** Leaflet-Geoman 可编辑图层 */
export type GeomanLayer = L.Marker | L.Polyline | L.Polygon | L.Rectangle | L.Circle;
