import type L from 'leaflet';
import type { DrawRequest } from './DrawTypes';
import { BaseDrawer } from './BaseDrawer';

export class PolygonDrawer extends BaseDrawer {
    draw(args: DrawRequest<'Polygon'>) {
        const map = this._mapManager.map;

        if (!map) return;

        const { callback, options } = args;
        const points: L.LatLngExpression[] = [];
        // 预览多边形
        let previewPolygon = this._mapManager.polygons.addPolygon(
            [],
            this.getPreviewPathOptions(options),
            'previewPolygon',
        );
        // 预览线条
        let previewLine = this._mapManager.polylines.addPolyline([], this.getPreviewLineOptions(), 'previewLine');

        if (!previewPolygon || !previewLine) return;

        /** 点击添加多边形点 */
        const handleClick = (e: L.LeafletMouseEvent) => {
            points.push([e.latlng.lat, e.latlng.lng]);

            if (points.length === 2) {
                previewLine?.setLatLngs(points);
            }
        };

        /** 移动鼠标绘制预览多边形 */
        const handleMouseMove = (e: L.LeafletMouseEvent) => {
            if (!points.length) return;

            const { lat, lng } = e.latlng;

            if (points.length === 1) {
                previewLine?.setLatLngs([...points, [lat, lng]]);
                return;
            }

            this._mapManager.polylines.getPolyline('previewLine') &&
                // eslint-disable-next-line style/indent-binary-ops
                this._mapManager.polylines.removePolyline('previewLine');
            previewPolygon?.setLatLngs([...points, [lat, lng]]);
        };

        const handlePolygonClick = this.createEditClickHandler(
            () => previewPolygon,
            (currentPolygon) => {
                const points = currentPolygon.getLatLngs() as L.LatLng[];

                callback(points.map((item) => [item.lat, item.lng]));
            },
        );

        /** 双击结束 */
        const handleDblClick = () => {
            // 移除事件监听
            map.off('click', handleClick);
            map.off('mousemove', handleMouseMove);
            map.off('dblclick', handleDblClick);

            previewPolygon?.setStyle(this.getFinalPathOptions(options));

            previewPolygon?.on('click', handlePolygonClick);
            previewPolygon?.pm.enable();
        };

        return this.createDrawSession(
            [
                ['click', handleClick],
                ['mousemove', handleMouseMove],
                ['dblclick', handleDblClick],
            ],
            () => {
                points.length = 0;
                previewLine = null;
                previewPolygon?.off('click', handlePolygonClick);
                previewPolygon = null;
                this._mapManager.polygons.removePolygon('previewPolygon');
            },
        );
    }
}
