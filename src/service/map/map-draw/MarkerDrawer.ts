import type L from 'leaflet';
import type { DrawSession } from './BaseDrawer';
import type { DrawRequest } from './DrawTypes';
import { BaseDrawer } from './BaseDrawer';

/** 点标记绘制器：每次单击新增一个可编辑标记 */
export class MarkerDrawer extends BaseDrawer {
    /** 标记自增序号 */
    private _id = 1;
    /** 上一次点击坐标，用于去重 */
    private _previewPoint: L.LatLngExpression | null = null;
    /** 当前绘制会话 */
    private _drawSession: ReturnType<BaseDrawer['createDrawSession']>;
    /** 各标记对应的图层编辑会话 */
    private readonly _layerSession: ReturnType<BaseDrawer['createLayerSession']>[] = [];
    /** 标记 ID 前缀 */
    private readonly _markerIdPrefix = this.createDrawId('draw-marker');
    /** 已创建标记 ID 集合 */
    private readonly _markerIds = new Set<string>();
    /** 标记图层缓存 */
    private readonly _markers = new Map<string, L.Marker>();
    /** 标记点击处理器缓存 */
    private readonly _markerHandlers = new Map<string, (_e: L.LeafletMouseEvent) => void>();

    /**
     * 缓存已创建的标记及点击处理器
     * @param id 标记 ID
     * @param marker 标记图层
     * @param handler 点击处理器
     */
    private saveMarker(id: string, marker: L.Marker, handler: (_e: L.LeafletMouseEvent) => void): void {
        this._markerIds.add(id);
        this._markers.set(id, marker);
        this._markerHandlers.set(id, handler);
    }

    /**
     * 清除全部绘制标记及事件
     */
    private clearMarker(): void {
        this._markerIds.forEach((markerId) => {
            const marker = this._markers.get(markerId);
            const handler = this._markerHandlers.get(markerId);

            if (marker && handler) {
                marker?.off('click', handler);
                this._mapManager.marker.removeMarker(markerId);
            }
        });

        this._markerHandlers.clear();
        this._markerIds.clear();
        this._markers.clear();
    }

    /**
     * 开始绘制点标记
     * @param args 点标记绘制请求
     * @returns 绘制会话；地图未就绪时返回 undefined
     */
    draw(args: DrawRequest<'Marker'>): DrawSession | undefined {
        const map = this._mapManager.map;

        if (!map) return;

        const handleClick = (e: L.LeafletMouseEvent): void => {
            const point: L.LatLngExpression = [e.latlng.lat, e.latlng.lng];
            const currentId = `${this._markerIdPrefix}-${this._id}`;

            // 防止重复点
            if (this._mapManager.tool.latLngEqual(this._previewPoint, point)) {
                return;
            }

            this._mapManager.marker.addMarker(currentId, point, {
                icon: this._mapManager.tool.markerIcon,
                ...args.options,
            });

            const currentMarker = this._mapManager.marker.getMarker(currentId);

            if (currentMarker) {
                const handler = this.createEditClickHandler(
                    (): L.Marker => currentMarker,
                    (marker): void => {
                        const currentPoint = marker.getLatLng();

                        args.callback({
                            id: currentId,
                            data: [currentPoint.lat, currentPoint.lng],
                        });
                    },
                );

                const layerSession = this.createLayerSession(
                    [
                        ['click', handler],
                        [
                            'remove',
                            (e: L.LeafletEvent): void =>
                                this.layerMarkerRemove(
                                    e,
                                    (): void => {
                                        layerSession?.finish();
                                        this._layerSession.splice(this._layerSession.indexOf(layerSession), 1);
                                    },
                                    (): void => {
                                        if (!this._layerSession.length) {
                                            this._drawSession?.finish();
                                            args.notice?.();
                                        }
                                    },
                                ),
                        ],
                        ['pm:enable', this.layerEdit],
                        ['pm:disable', this.layerEdit],
                    ],
                    (): L.Marker => currentMarker,
                );
                this._layerSession.push(layerSession);

                this.saveMarker(currentId, currentMarker, handler);
            }

            this._id++;
            this._previewPoint = point;

            args.callback({
                id: currentId,
                data: point,
            });
        };

        this._drawSession = this.createDrawSession(
            [['click', (e: L.LeafletMouseEvent): void => this.createClicks(e, handleClick)]],
            (): void => {
                this._layerSession.forEach((session) => session?.finish());
                this.clearMarker();

                this._id = 1;
                this._previewPoint = null;
                this._layerSession.length = 0;
            },
        );

        return this._drawSession;
    }
}
