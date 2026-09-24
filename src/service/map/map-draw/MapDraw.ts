import type { MapManager } from '../MapManager';
import type { DrawSession } from './BaseDrawer';
import type {
    DrawDrag,
    DrawDragParam,
    DrawKeyType,
    DrawRequest,
    DrawRequestParam,
    DrawSync,
    DrawSyncParam,
    DrawVueToMap,
    DrawVueToMapParam,
    DrawWayline,
    DrawWaylineParam,
} from './DrawTypes';
import { CircleDrawer } from './CircleDrawer';
import { MarkerDrawer } from './MarkerDrawer';
import { PolygonDrawer } from './PolygonDrawer';
import { PolylineDrawer } from './PolylineDrawer';
import { RectangleDrawer } from './RectangleDrawer';

/** 各图形绘制器方法映射 */
type DrawerMap = {
    [K in DrawKeyType]?: {
        /** 开始绘制指定类型图形 */
        draw: (_args: Extract<DrawRequest<DrawKeyType>, { type: K }>) => DrawSession | undefined;
        /** 列表选中航点后同步地图高亮 */
        setSelectPoint: (_args: Extract<DrawVueToMap<DrawKeyType>, { type: K }>) => void;
        /** 地图选中航点后同步列表高亮 */
        getSelectPoint: (_args: Extract<DrawSync<DrawKeyType>, { type: K }>) => void;
        /** 拖动折线顶点时实时同步列表坐标 */
        returnDragPoint: (_args: Extract<DrawDrag<DrawKeyType>, { type: K }>) => void;
        /** 将已有航点写入绘制器 */
        getWaylineData: (_args: Extract<DrawWayline<DrawKeyType>, { type: K }>) => boolean;
    };
};

/** 地图绘制工具管理类 */
export class MapDraw {
    /** 各类型绘制器映射表 */
    private readonly _drawers: DrawerMap;
    /** 当前活跃的绘制会话 */
    private _activeSession?: DrawSession;
    /** 地图管理器引用 */
    protected readonly _mapManager: MapManager;

    /**
     * 创建地图绘制管理器
     * @param mapManager 地图管理器实例
     */
    constructor(mapManager: MapManager) {
        this._mapManager = mapManager;
        this._drawers = {
            Marker: new MarkerDrawer(mapManager),
            Circle: new CircleDrawer(mapManager),
            Polyline: new PolylineDrawer(mapManager),
            Polylines: new PolylineDrawer(mapManager),
            Polygon: new PolygonDrawer(mapManager),
            Rectangle: new RectangleDrawer(mapManager),
        };
    }

    /**
     * 停止当前绘制会话
     */
    stopDraw(): void {
        if (this._activeSession) {
            this._activeSession.finish();
            this._activeSession = undefined;
        }

        const container = this._mapManager.mapContainer;
        if (container) {
            container.style.cursor = '';
            container.classList.remove('gcs-drawing-mode');
        }
    }

    /**
     * 清理所有绘制器状态
     */
    clearDrawers(): void {
        this.stopDraw();
        this._activeSession = undefined;
    }

    /**
     * 初始化并开始绘制
     * @param args 绘制请求参数
     * @returns 绘制会话对象
     */
    startDraw(args: DrawRequestParam): DrawSession | undefined {
        this.stopDraw();

        const container = this._mapManager.mapContainer;
        if (!container) return;

        container.style.cursor = 'crosshair';
        container.classList.add('gcs-drawing-mode');

        const drawer = this._drawers[args.type] as {
            draw: (_args: DrawRequestParam) => DrawSession | undefined;
        };
        const session = drawer?.draw(args);
        this._activeSession = session;
        return session;
    }

    /**
     * 根据列表选择同步地图元素选中状态
     * @param args 同步参数
     */
    setSelectPoint(args: DrawVueToMapParam): void {
        const drawer = this._drawers[args.type] as {
            setSelectPoint: (_args: DrawVueToMapParam) => void;
        };
        drawer?.setSelectPoint(args);
    }

    /**
     * 根据地图元素选中状态同步到列表
     * @param args 同步参数
     */
    getSelectPoint(args: DrawSyncParam): void {
        const drawer = this._drawers[args.type] as {
            getSelectPoint: (_args: DrawSyncParam) => void;
        };
        drawer?.getSelectPoint(args);
    }

    /**
     * 实时同步拖动点的位置到列表
     * @param args 拖动参数
     */
    returnDragPoint(args: DrawDragParam): void {
        const drawer = this._drawers[args.type] as {
            returnDragPoint: (_args: DrawDragParam) => void;
        };
        drawer?.returnDragPoint(args);
    }

    /**
     * 获取航线编辑数据
     * @param args 航线参数
     * @returns 是否成功获取数据
     */
    getWaylineData(args: DrawWaylineParam): boolean {
        const drawer = this._drawers[args.type] as {
            getWaylineData: (_args: DrawWaylineParam) => boolean;
        };
        return drawer?.getWaylineData(args);
    }
}
