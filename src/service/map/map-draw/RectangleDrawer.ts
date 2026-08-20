import type L from 'leaflet';
import type { DrawRequest } from './DrawTypes';
import { BaseDrawer } from './BaseDrawer';

export class RectangleDrawer extends BaseDrawer {
    draw(args: DrawRequest<'Rectangle'>) {
        const map = this._mapManager.map;

        if (!map) return;

        const { callback, options } = args;
        // 第一个角
        let pinnacle: L.LatLngTuple | null = null;
        // 预览矩形
        let previewRectangle = this._mapManager.rectangles.addRectangle(
            [
                [0, 0],
                [0, 0],
            ],
            this.getPreviewPathOptions(options),
            'previewRectangle',
        );

        if (!previewRectangle) return;

        /** 鼠标移动 */
        const handleMouseMove = (e: L.LeafletMouseEvent) => {
            if (!pinnacle) return;

            previewRectangle?.setBounds([pinnacle, [e.latlng.lat, e.latlng.lng]]);
        };

        const handleRectangleClick = this.createEditClickHandler(
            () => previewRectangle,
            (currentRectangle) => {
                const points = currentRectangle.getLatLngs() as L.LatLng[];

                callback(points.map((item) => [item.lat, item.lng]));
            },
        );

        /**
         * 鼠标点击
         */
        const handleClick = (e: L.LeafletMouseEvent) => {
            const point: L.LatLngTuple = [e.latlng.lat, e.latlng.lng];

            // 第一次点击：确定第一个角
            if (!pinnacle) {
                pinnacle = point;
                previewRectangle?.setBounds([pinnacle, pinnacle]);

                return;
            }

            previewRectangle?.setBounds([pinnacle, point]);

            // 正式样式
            previewRectangle?.setStyle(this.getFinalPathOptions(options));

            // 停止绘制
            map.off('click', handleClick);
            map.off('mousemove', handleMouseMove);

            previewRectangle?.on('click', handleRectangleClick);
            previewRectangle?.pm.enable();
        };

        return this.createDrawSession(
            [
                ['click', handleClick],
                ['mousemove', handleMouseMove],
            ],
            () => {
                previewRectangle?.off('click', handleRectangleClick);
                pinnacle = null;
                previewRectangle = null;
                this._mapManager.rectangles.removeRectangle('previewRectangle');
            },
        );
    }
}
