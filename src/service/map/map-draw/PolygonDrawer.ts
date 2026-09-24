import type L from 'leaflet';
import type { DrawSession } from './BaseDrawer';
import type { DrawRequest } from './DrawTypes';
import { BaseDrawer } from './BaseDrawer';

/** 多边形绘制器：单击加点，双击闭合 */
export class PolygonDrawer extends BaseDrawer {
    /** 已确定的多边形顶点 */
    private readonly _points: L.LatLngExpression[] = [];
    /** 两点预览折线 ID */
    private readonly _previewLineId = this.createDrawId('previewLine');
    /** 预览多边形 ID */
    private readonly _previewPolygonId = this.createDrawId('previewPolygon');
    /** 当前绘制会话 */
    private _drawSession: ReturnType<BaseDrawer['createDrawSession']>;
    /** 当前图层编辑会话 */
    private _layerSession: ReturnType<BaseDrawer['createLayerSession']>;

    /**
     * 开始绘制多边形
     * @param args 多边形绘制请求
     * @returns 绘制会话；地图未就绪时返回 undefined
     */
    draw(args: DrawRequest<'Polygon'>): DrawSession | undefined {
        const map = this._mapManager.map;

        if (!map) return;

        const { callback, options } = args;
        const { tooltip, toolTipOptions, ...arg } = options ?? {};

        // 预览多边形
        let previewPolygon: L.Polygon | null;
        // 预览线条
        let previewLine: L.Polyline | null;

        const handlePolygonClick = this.createEditClickHandler(
            (): L.Polygon | null => previewPolygon,
            (currentPolygon): void => {
                const points = currentPolygon.getLatLngs()[0] as L.LatLng[];

                callback({
                    id: this._previewPolygonId,
                    data: points.map((item) => [item.lat, item.lng]),
                });
            },
        );

        /** 移动鼠标绘制预览多边形 */
        const handleMouseMove = (e: L.LeafletMouseEvent): void => {
            if (!this._points.length) return;

            const { lat, lng } = e.latlng;

            if (this._points.length === 1) {
                previewLine?.setLatLngs([...this._points, [lat, lng]]);
                return;
            }

            if (previewLine) {
                this._mapManager.polylines.removePolyline(this._previewLineId);
                previewLine = null;
            }

            previewPolygon?.setLatLngs([...this._points, [lat, lng]]);
        };

        /** 点击添加多边形点 */
        const handleClick = (e: L.LeafletMouseEvent): void => {
            const point: L.LatLngExpression = [e.latlng.lat, e.latlng.lng];
            this._points.push(point);

            if (!previewPolygon && !previewLine) {
                previewPolygon = this._mapManager.polygons.addPolygon(
                    this._previewPolygonId,
                    [point],
                    this.getPreviewPathOptions(arg),
                );

                previewLine = this._mapManager.polylines.addPolyline(
                    this._previewLineId,
                    [point],
                    this.getPreviewLineOptions(arg),
                );

                return;
            }

            previewLine?.addLatLng(point);
        };

        /** 双击结束 */
        const handleDblClick = (): void => {
            if (this._points.length < 3) return;

            this._drawSession?.complete();

            previewPolygon?.setStyle(this.getFinalPathOptions(arg));
            previewPolygon?.bindTooltip(tooltip || '点击编辑', toolTipOptions);

            this._layerSession = this.createLayerSession(
                [
                    ['click', handlePolygonClick],
                    [
                        'remove',
                        (e: L.LeafletEvent): void => this.layerMarkerRemove(e, this._drawSession?.finish, args.notice),
                    ],
                    ['pm:enable', this.layerEdit],
                    ['pm:disable', this.layerEdit],
                ],
                (): L.Polygon | null => previewPolygon,
            );

            callback({
                id: this._previewPolygonId,
                data: this._points,
            });
        };

        this._drawSession = this.createDrawSession(
            [
                ['click', (e: L.LeafletMouseEvent): void => this.createClicks(e, handleClick, handleDblClick)],
                ['mousemove', handleMouseMove],
            ],
            (): void => {
                this._layerSession?.finish();

                if (previewPolygon) {
                    previewPolygon.off('click', handlePolygonClick);
                    this._mapManager.polygons.removePolygon(this._previewPolygonId);
                }

                previewPolygon = null;
                this._points.length = 0;
                this._drawSession = undefined;
                this._layerSession = undefined;
            },
        );

        return this._drawSession;
    }
}
