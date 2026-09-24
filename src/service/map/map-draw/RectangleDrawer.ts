import type L from 'leaflet';
import type { DrawSession } from './BaseDrawer';
import type { DrawRequest } from './DrawTypes';
import { BaseDrawer } from './BaseDrawer';

/** 矩形绘制器：两次单击确定对角点 */
export class RectangleDrawer extends BaseDrawer {
    /** 矩形第一个角点 */
    private _pinnacle: L.LatLngTuple | null = null;
    /** 矩形图层 ID */
    private readonly _rectangleId = this.createDrawId('rectangle');
    /** 当前绘制会话 */
    private _drawSession: ReturnType<BaseDrawer['createDrawSession']>;
    /** 当前图层编辑会话 */
    private _layerSession: ReturnType<BaseDrawer['createLayerSession']>;

    /**
     * 开始绘制矩形
     * @param args 矩形绘制请求
     * @returns 绘制会话；地图未就绪时返回 undefined
     */
    draw(args: DrawRequest<'Rectangle'>): DrawSession | undefined {
        const map = this._mapManager.map;

        if (!map) return;

        const { callback, options } = args;
        const { tooltip, toolTipOptions, ...arg } = options ?? {};

        let previewRectangle: L.Rectangle | null;

        /** 鼠标移动 */
        const handleMouseMove = (e: L.LeafletMouseEvent): void => {
            if (!this._pinnacle) return;

            previewRectangle?.setBounds([this._pinnacle, [e.latlng.lat, e.latlng.lng]]);
        };

        const handleRectangleClick = this.createEditClickHandler(
            (): L.Rectangle | null => previewRectangle,
            (currentRectangle): void => {
                const bounds = currentRectangle.getBounds();
                const northEast = bounds.getNorthEast();
                const southWest = bounds.getSouthWest();

                callback({
                    id: this._rectangleId,
                    data: [
                        [southWest.lat, southWest.lng],
                        [northEast.lat, northEast.lng],
                    ],
                });
            },
        );

        /**
         * 鼠标点击
         */
        const handleClick = (e: L.LeafletMouseEvent): void => {
            const point: L.LatLngTuple = [e.latlng.lat, e.latlng.lng];

            // 第一次点击：确定第一个角
            if (!this._pinnacle && !previewRectangle) {
                this._pinnacle = point;

                previewRectangle = this._mapManager.rectangles.addRectangle(
                    this._rectangleId,
                    [point],
                    this.getPreviewPathOptions(arg),
                );

                return;
            }

            previewRectangle?.setBounds([this._pinnacle!, point]);

            this._drawSession?.complete();

            previewRectangle?.setStyle(this.getFinalPathOptions(arg));
            previewRectangle?.bindTooltip(tooltip || '点击编辑', toolTipOptions);

            // 停止绘制
            map.off('click', handleClick);
            map.off('mousemove', handleMouseMove);

            this._layerSession = this.createLayerSession(
                [
                    ['click', handleRectangleClick],
                    [
                        'remove',
                        (e: L.LeafletEvent): void => this.layerMarkerRemove(e, this._drawSession?.finish, args.notice),
                    ],
                    ['pm:enable', this.layerEdit],
                    ['pm:disable', this.layerEdit],
                ],
                (): L.Rectangle | null => previewRectangle,
            );

            callback({
                id: this._rectangleId,
                data: [this._pinnacle!, point],
            });
        };

        this._drawSession = this.createDrawSession(
            [
                ['click', (e: L.LeafletMouseEvent): void => this.createClicks(e, handleClick)],
                ['mousemove', handleMouseMove],
            ],
            (): void => {
                this._layerSession?.finish();

                if (previewRectangle) {
                    previewRectangle.off('click', handleRectangleClick);
                    this._mapManager.rectangles.removeRectangle(this._rectangleId);
                }

                previewRectangle = null;
                this._pinnacle = null;
                this._drawSession = undefined;
                this._layerSession = undefined;
            },
        );

        return this._drawSession;
    }
}
