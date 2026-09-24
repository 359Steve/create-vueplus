import type L from 'leaflet';
import type { DrawSession } from './BaseDrawer';
import type { DrawRequest } from './DrawTypes';
import { BaseDrawer } from './BaseDrawer';

/** 圆形绘制器：单击确定圆心，再次单击确定半径 */
export class CircleDrawer extends BaseDrawer {
    /** 当前绘制会话 */
    private _drawSession: ReturnType<BaseDrawer['createDrawSession']>;
    /** 当前图层编辑会话 */
    private _layerSession: ReturnType<BaseDrawer['createLayerSession']>;
    /** 圆心坐标 */
    private _center: L.LatLngExpression | null = null;
    /** 预览圆图层 ID */
    private readonly _previewCircleId = this.createDrawId('previewCircle');

    /**
     * 开始绘制圆形
     * @param args 圆形绘制请求
     * @returns 绘制会话；地图未就绪时返回 undefined
     */
    draw(args: DrawRequest<'Circle'>): DrawSession | undefined {
        const map = this._mapManager.map;

        if (!map) return;

        const { callback, options } = args;
        const { tooltip, toolTipOptions, ...arg } = options ?? {};

        let previewCircle: L.Circle | null;

        /** 地图添加鼠标移动事件 */
        const handleMouseMove = (e: L.LeafletMouseEvent): void => {
            if (!this._center) return;

            const radius = this._mapManager.tool.calculateDistance(this._center, [e.latlng.lat, e.latlng.lng]);

            previewCircle?.setRadius(radius);
        };

        const handleCircleClick = this.createEditClickHandler(
            (): L.Circle | null => previewCircle,
            (currentCircle): void => {
                const currentCenter = currentCircle.getLatLng();

                callback({
                    id: this._previewCircleId,
                    data: {
                        center: [currentCenter.lat, currentCenter.lng],
                        radius: currentCircle.getRadius(),
                    },
                });
            },
        );

        // 地图添加点击事件
        const handleMapClick = (e: L.LeafletMouseEvent): void => {
            const point: L.LatLngExpression = [e.latlng.lat, e.latlng.lng];

            // 确定圆心
            if (!previewCircle) {
                this._center = point;
                previewCircle = this._mapManager.circle.addCircle(
                    this._previewCircleId,
                    point,
                    0,
                    this.getPreviewPathOptions(arg),
                );

                return;
            }

            // 确定半径
            const radius = this._mapManager.tool.calculateDistance(this._center!, point);

            previewCircle?.setRadius(radius);

            this._drawSession?.complete();

            previewCircle?.setStyle(this.getFinalPathOptions(arg));
            previewCircle?.bindTooltip(tooltip || '点击编辑', toolTipOptions);

            // 停止绘制阶段
            map.off('click', handleMapClick);
            map.off('mousemove', handleMouseMove);

            this._layerSession = this.createLayerSession(
                [
                    ['click', handleCircleClick],
                    [
                        'remove',
                        (e: L.LeafletEvent): void => this.layerMarkerRemove(e, this._drawSession?.finish, args.notice),
                    ],
                    ['pm:enable', this.layerEdit],
                    ['pm:disable', this.layerEdit],
                ],
                (): L.Circle | null => previewCircle,
            );

            callback({
                id: this._previewCircleId,
                data: {
                    center: this._center!,
                    radius,
                },
            });
        };

        this._drawSession = this.createDrawSession(
            [
                ['click', (e: L.LeafletMouseEvent): void => this.createClicks(e, handleMapClick)],
                ['mousemove', handleMouseMove],
            ],
            (): void => {
                this._layerSession?.finish();

                if (previewCircle) {
                    previewCircle?.off('click', handleCircleClick);
                    this._mapManager.circle.removeCircle(this._previewCircleId);
                }

                this._center = null;
                previewCircle = null;
                this._drawSession = undefined;
                this._layerSession = undefined;
            },
        );

        return this._drawSession;
    }
}
