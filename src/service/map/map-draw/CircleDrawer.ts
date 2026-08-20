import type L from 'leaflet';
import type { DrawRequest } from './DrawTypes';
import { BaseDrawer } from './BaseDrawer';

export class CircleDrawer extends BaseDrawer {
    draw(args: DrawRequest<'Circle'>) {
        const map = this._mapManager.map;

        if (!map) return;

        const { callback, options } = args;
        let center: L.LatLngExpression | null = null;
        let previewCircle = this._mapManager.circle.addCircle({
            id: 'previewCircle',
            Lat: 0,
            Lon: 0,
            radius: 0,
            options: this.getPreviewPathOptions(options),
        });

        if (!previewCircle) return;

        /** 地图添加鼠标移动事件 */
        const handleMouseMove = (e: L.LeafletMouseEvent) => {
            if (!center) return;

            const radius = this._mapManager.tool.calculateDistance(center, [e.latlng.lat, e.latlng.lng]);

            previewCircle?.setRadius(radius);
        };

        const handleCircleClick = this.createEditClickHandler(
            () => previewCircle,
            (currentCircle) => {
                const currentCenter = currentCircle.getLatLng();

                callback({
                    center: [currentCenter.lat, currentCenter.lng],
                    radius: currentCircle.getRadius(),
                });
            },
        );

        // 地图添加点击事件
        const handleMapClick = (e: L.LeafletMouseEvent) => {
            const { lat, lng } = e.latlng;

            // 确定圆心
            if (!center) {
                center = [lat, lng];

                previewCircle?.setLatLng(center);

                return;
            }

            // 确定半径
            const radius = this._mapManager.tool.calculateDistance(center, [lat, lng]);

            previewCircle?.setRadius(radius);

            // 转换为正式样式
            previewCircle?.setStyle(this.getFinalPathOptions(options));

            // 停止绘制阶段
            map.off('click', handleMapClick);
            map.off('mousemove', handleMouseMove);

            previewCircle?.on('click', handleCircleClick);
            previewCircle?.pm.enable();
        };

        return this.createDrawSession(
            [
                ['click', handleMapClick],
                ['mousemove', handleMouseMove],
            ],
            () => {
                center = null;
                previewCircle?.off('click', handleCircleClick);
                previewCircle = null;
                this._mapManager.circle.removeCircle('previewCircle');
            },
        );
    }
}
