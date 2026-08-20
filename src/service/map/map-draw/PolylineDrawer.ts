import type L from 'leaflet';
import type { DrawRequest } from './DrawTypes';
import { BaseDrawer } from './BaseDrawer';

export class PolylineDrawer extends BaseDrawer {
    draw(args: DrawRequest<'Polyline' | 'Polylines'>) {
        const map = this._mapManager.map;

        if (!map) return;

        const points: L.LatLngExpression[] = [];
        // 正式线条
        let polyline = this._mapManager.polylines.addPolyline(
            [],
            {
                color: BaseDrawer.DRAW_COLOR,
                weight: 4,
                ...args.options,
            },
            'polyline',
        );
        // 预览线条
        let previewLine = this._mapManager.polylines.addPolyline([], this.getPreviewLineOptions(), 'previewLine');

        if (!polyline || !previewLine) return;

        // 单击添加点
        const handleClick = (e: L.LeafletMouseEvent) => {
            const { lat, lng } = e.latlng;
            points.push([lat, lng]);

            polyline?.setLatLngs(points);
        };

        // 鼠标移动预览
        const handleMouseMove = (e: L.LeafletMouseEvent) => {
            if (!points.length) return;
            const { lat, lng } = e.latlng;

            previewLine?.setLatLngs([points[points.length - 1], [lat, lng]]);
        };

        const handleLineClick = this.createEditClickHandler(
            () => polyline,
            (currentPolyline) => {
                const point = currentPolyline.getLatLngs() as L.LatLng[];

                args.callback(point.map((item) => [item.lat, item.lng]));
            },
        );

        // 双击结束
        const handleDblClick = () => {
            this._mapManager.polylines.removePolyline('previewLine');

            map.off('click', handleClick);
            map.off('mousemove', handleMouseMove);
            map.off('dblclick', handleDblClick);

            polyline?.on('click', handleLineClick);
            polyline?.pm.enable();
        };

        return this.createDrawSession(
            [
                ['click', handleClick],
                ['mousemove', handleMouseMove],
                ['dblclick', handleDblClick],
            ],
            () => {
                polyline?.off('click', handleLineClick);

                points.length = 0;
                polyline = null;
                previewLine = null;

                this._mapManager.polylines.clearPolylines();
            },
        );
    }
}
