import type { MapManager } from '../MapManager';
import type { DrawDrag, DrawKeyType, DrawSync, DrawVueToMap, DrawWayline, GeomanLayer } from './DrawTypes';
import type { LayerEditEvent } from './PmEditType';
import L from 'leaflet';

/** 地图绘制会话 */
export interface DrawSession {
    /** 结束绘制并清理预览图层 */
    finish: () => void;
    /** 完成绘制，保留正式图层 */
    complete: () => void;
}

/** 图层编辑会话 */
export interface LayerSession {
    /** 结束图层编辑并解绑事件 */
    finish: () => void;
}

/** 地图绘制器基类：提供绘制会话、样式与点击识别等公共能力 */
export abstract class BaseDrawer {
    /** 当前绘制会话自增 ID */
    private _drawId = 0;
    /** 最近一次点击时间，用于区分单击与双击 */
    private _lastClickTime = 0;

    /** 绘制图形描边颜色 */
    static readonly DRAW_COLOR = '#00d4ff';
    /** 预览图形虚线样式 */
    static readonly PREVIEW_DASH_ARRAY = '8 8';
    /** 描边宽度 */
    static readonly WEIGHT = 2;
    /** 描边透明度 */
    static readonly OPACITY = 0.5;
    /** 填充透明度 */
    static readonly FILL_OPACITY = 0.1;

    /** 地图管理器 */
    protected readonly _mapManager: MapManager;

    /**
     * 创建绘制器
     * @param mapManager 地图管理器
     */
    constructor(mapManager: MapManager) {
        this._mapManager = mapManager;
    }

    /**
     * 创建唯一当前绘制 ID
     * @param prefix ID 前缀
     * @returns 带前缀的自增绘制 ID
     */
    protected createDrawId(prefix: string): string {
        this._drawId += 1;
        return `${prefix}-${this._drawId}`;
    }

    /**
     * 图层被移除时结束绘制会话并通知外部
     * @param e Leaflet 事件
     * @param finish 结束绘制会话的回调
     * @param notice 图层移除通知回调
     */
    protected layerMarkerRemove = (e: L.LeafletEvent, finish?: () => void, notice?: () => void): void => {
        if (e.type === 'remove') {
            finish?.();
            notice?.();
        }
    };

    /**
     * 监听 Geoman 编辑开关，切换虚线样式与提示显隐
     * @param e 图层编辑事件
     */
    protected layerEdit = (e: LayerEditEvent): void => {
        const { type, layer } = e;

        if (!(layer instanceof L.Path)) {
            return;
        }

        const isEditing = type === 'pm:enable';

        // 根据状态设置对应样式
        layer.setStyle({
            dashArray: isEditing ? BaseDrawer.PREVIEW_DASH_ARRAY : undefined,
        });

        // 根据状态设置 tip 显隐
        if (isEditing) {
            layer.closeTooltip();
        } else {
            layer.openTooltip();
        }
    };

    /**
     * 绘制预览元素默认样式
     * @param options 覆盖样式
     * @returns 预览路径样式
     */
    protected getPreviewPathOptions(options?: L.PathOptions): L.PathOptions {
        return {
            color: BaseDrawer.DRAW_COLOR,
            weight: BaseDrawer.WEIGHT,
            dashArray: BaseDrawer.PREVIEW_DASH_ARRAY,
            fillOpacity: BaseDrawer.FILL_OPACITY,
            ...options,
        };
    }

    /**
     * 绘制正式元素默认样式
     * @param options 覆盖样式
     * @returns 正式路径样式
     */
    protected getFinalPathOptions(options?: L.PathOptions): L.PathOptions {
        return {
            dashArray: undefined,
            fillOpacity: BaseDrawer.FILL_OPACITY,
            color: BaseDrawer.DRAW_COLOR,
            weight: BaseDrawer.WEIGHT,
            ...options,
        };
    }

    /**
     * 绘制预览线段默认样式
     * @param options 覆盖样式
     * @returns 预览折线样式
     */
    protected getPreviewLineOptions(options?: L.PathOptions): L.PolylineOptions {
        return {
            color: BaseDrawer.DRAW_COLOR,
            weight: BaseDrawer.WEIGHT,
            dashArray: BaseDrawer.PREVIEW_DASH_ARRAY,
            opacity: BaseDrawer.OPACITY,
            ...options,
        };
    }

    /**
     * 区分单击与双击后分别执行对应回调
     * @param e 鼠标事件
     * @param click 单击回调
     * @param dbclick 双击回调
     */
    protected createClicks<T extends L.LeafletMouseEvent>(
        e: T,
        click: (_e: T) => void,
        dbclick?: (_e: T) => void,
    ): void {
        const now = Date.now();

        if (now - this._lastClickTime < 300) {
            // 双击
            this._lastClickTime = 0;

            dbclick && dbclick(e);
            return;
        }

        this._lastClickTime = now;

        // 单击
        click(e);
    }

    /**
     * 创建图层点击后切换编辑态的处理器
     * @param getLayer 获取当前图层
     * @param callback 退出编辑后的回调
     * @returns 点击事件处理器
     */
    protected createEditClickHandler<T extends GeomanLayer>(
        getLayer: () => T | null | undefined,
        callback: (_layer: T) => void,
    ): (_e: L.LeafletMouseEvent) => void {
        return (e: L.LeafletMouseEvent): void => {
            L.DomEvent.stopPropagation(e);

            const layer = getLayer();

            if (!layer) return;

            if (layer.pm.enabled()) {
                layer.pm.disable();
                callback(layer);

                return;
            }

            layer.pm.enable();
        };
    }

    /**
     * 绑定地图绘制事件并返回可结束/完成的会话
     * @param events 地图事件列表
     * @param cleanup 会话结束时的清理回调
     * @returns 绘制会话；地图未就绪时返回 undefined
     */
    protected createDrawSession(events: MapEvent[], cleanup?: () => void): DrawSession | undefined {
        const map = this._mapManager.map;
        const container = this._mapManager.mapContainer;

        if (!map || !container) return;

        // 绑定事件
        events.forEach(([type, handler]) => {
            map.on(type, handler as L.LeafletEventHandlerFn);
        });

        const removeEvents = (): void => {
            // 绘制完成但未关闭设置状态
            this._drawId = 0;
            this._lastClickTime = 0;
            container.style.cursor = '';
            container.classList.remove('gcs-drawing-mode');

            // 移除地图事件监听
            events.forEach(([type, handler]) => {
                map.off(type, handler as L.LeafletEventHandlerFn);
            });
        };

        let finished = false;

        const finish = (): void => {
            if (finished) return;

            finished = true;
            removeEvents();
            cleanup?.();
        };

        const complete = (): void => {
            if (finished) return;
            removeEvents();
        };

        return {
            finish,
            complete,
        };
    }

    /**
     * 绑定图层编辑事件并返回可结束的会话
     * @param events 图层事件列表
     * @param getLayer 获取当前图层
     * @returns 图层会话；图层不存在时返回 undefined
     */
    protected createLayerSession<T extends GeomanLayer>(
        events: MapEvent[],
        getLayer: () => T | null | undefined,
    ): LayerSession | undefined {
        const layer = getLayer();

        if (!layer || !Array.isArray(events)) return;

        events.forEach(([type, handler]) => {
            layer.on(type, handler as L.LeafletEventHandlerFn);
        });

        let finished = false;

        return {
            finish: (): void => {
                if (finished) return;
                finished = true;

                const currentLayer = getLayer();
                if (currentLayer?.pm?.enabled()) {
                    currentLayer.pm.disable();
                }

                events.forEach(([type, handler]) => {
                    currentLayer?.off(type, handler as L.LeafletEventHandlerFn);
                });
            },
        };
    }

    /**
     * 重置绘制器内部状态
     */
    protected resetDrawerState(): void {
        this._drawId = 0;
        this._lastClickTime = 0;
    }

    /**
     * 列表选中航点后同步地图高亮
     * @param _args 选中参数
     */
    setSelectPoint(_args: DrawVueToMap<DrawKeyType>): void {}

    /**
     * 地图选中航点后同步列表高亮
     * @param _args 选中回调参数
     */
    getSelectPoint(_args: DrawSync<DrawKeyType>): void {}

    /**
     * 拖动折线顶点时实时同步列表坐标
     * @param _args 拖动回调参数
     */
    returnDragPoint(_args: DrawDrag<DrawKeyType>): void {}

    /**
     * 将已有航点写入绘制器，进入编辑态
     * @param _args 航线数据参数
     * @returns 是否写入成功
     */
    getWaylineData(_args: DrawWayline<DrawKeyType>): boolean {
        return true;
    }
}
