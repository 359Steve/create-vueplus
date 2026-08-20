import type { MapManager } from '../MapManager';
import type { GeomanLayer } from './DrawTypes';
import L from 'leaflet';

export abstract class BaseDrawer {
    static readonly DRAW_COLOR = '#00e5ff';
    static readonly PREVIEW_DASH_ARRAY = '8 8';

    protected readonly _mapManager: MapManager;

    constructor(mapManager: MapManager) {
        this._mapManager = mapManager;
    }

    /** 绘制预览元素默认样式 */
    protected getPreviewPathOptions(options?: L.PathOptions): L.PathOptions {
        return {
            color: BaseDrawer.DRAW_COLOR,
            weight: 2,
            dashArray: BaseDrawer.PREVIEW_DASH_ARRAY,
            fillOpacity: 0.1,
            ...options,
        };
    }

    /** 绘制正式元素默认样式 */
    protected getFinalPathOptions(options?: L.PathOptions): L.PathOptions {
        return {
            dashArray: undefined,
            fillOpacity: options?.fillOpacity ?? 0.2,
            color: options?.color ?? BaseDrawer.DRAW_COLOR,
            weight: options?.weight ?? 2,
        };
    }

    /** 绘制预览线段默认样式 */
    protected getPreviewLineOptions(): L.PolylineOptions {
        return {
            color: BaseDrawer.DRAW_COLOR,
            weight: 3,
            dashArray: BaseDrawer.PREVIEW_DASH_ARRAY,
            opacity: 0.6,
        };
    }

    /** 创建元素编辑事件 */
    protected createEditClickHandler<T extends GeomanLayer>(
        getLayer: () => T | null | undefined,
        callback: (_layer: T) => void,
    ) {
        return (e: L.LeafletMouseEvent) => {
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

    /** 创建统一控制地图事件监听 */
    protected createDrawSession(events: MapEvent[], cleanup?: () => void) {
        const map = this._mapManager.map;

        if (!map) return;

        events.forEach(([type, handler]) => {
            map.on(type, handler as L.LeafletEventHandlerFn);
        });

        let finished = false;

        const finish = () => {
            if (finished) return;

            finished = true;

            events.forEach(([type, handler]) => {
                map.off(type, handler as L.LeafletEventHandlerFn);
            });

            cleanup?.();
        };

        return {
            finish,
        };
    }
}
