import type L from 'leaflet';
import type { DrawRequest } from './DrawTypes';
import { BaseDrawer } from './BaseDrawer';

export class MarkerDrawer extends BaseDrawer {
    /** 画点 */
    draw(args: DrawRequest<'Marker'>) {
        const map = this._mapManager.map;

        if (!map) return;

        let id = 1;
        let previewPoint: L.LatLngExpression | null = null;

        const markers = new Set<L.Marker>();
        const markerHandlers = new Map<L.Marker, (_e: L.LeafletMouseEvent) => void>();

        const handleClick = (e: L.LeafletMouseEvent) => {
            const point: L.LatLngExpression = [e.latlng.lat, e.latlng.lng];
            const currentId = `draw-marker-${id}`;

            // 防止重复点
            if (this._mapManager.tool.latLngEqual(previewPoint, point)) {
                return;
            }

            this._mapManager.marker.addMarker({
                id: currentId,
                Lat: point[0],
                Lon: point[1],
                options: {
                    icon: this._mapManager.tool.markerIcon,
                    ...args.options,
                },
            });

            const currentMarker = this._mapManager.marker.getMarker(currentId);

            if (currentMarker) {
                const handler = this.createEditClickHandler(
                    () => currentMarker,
                    (marker) => {
                        const currentPoint = marker.getLatLng();

                        args.callback([currentPoint.lat, currentPoint.lng]);
                    },
                );

                currentMarker.on('click', handler);

                markers.add(currentMarker);
                markerHandlers.set(currentMarker, handler);
            }

            id++;
            previewPoint = point;

            args.callback(point);
        };

        return this.createDrawSession([['click', handleClick]], () => {
            markers.forEach((marker) => {
                const handler = markerHandlers.get(marker);

                if (handler) {
                    marker.off('click', handler);
                }
            });

            id = 1;
            previewPoint = null;
            markerHandlers.clear();
            markers.clear();

            this._mapManager.marker.clearMarkers();
        });
    }
}
