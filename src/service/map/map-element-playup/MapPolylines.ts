import L from 'leaflet';
import { BaseLayerManager } from './BaseLayerManager';

export class MapPolylines extends BaseLayerManager<L.Polyline, PolylineAddOptions> {
    get polylines() {
        return this.layers;
    }

    addPolyline(points: L.LatLngExpression[], options: PolylineAddOptions = {}, id: string) {
        return this.addLayer(id, () => {
            const { popup, tooltip, openPopup, ...lineOptions } = options;
            const polyline = L.polyline(points, lineOptions).addTo(this._mapManager.map!);
            this.bindOverlayContent(polyline, { popup, tooltip, openPopup });
            return polyline;
        });
    }

    updatePolyline(id: string, points: L.LatLngExpression[]) {
        this.getPolyline(id)?.setLatLngs(points);
    }

    appendPolylinePoint(id: string, lat: number, lon: number) {
        const line = this.getPolyline(id);
        if (!line) return;

        const latlngs = line.getLatLngs() as L.LatLng[];
        latlngs.push(L.latLng(lat, lon));
        line.setLatLngs(latlngs);
    }

    getPolyline(id: string) {
        return this.getLayer(id);
    }

    setPolylinePopup(id: string, content: string | HTMLElement) {
        this.setLayerPopup(id, content);
    }

    setPolylineVisible(id: string, visible: boolean) {
        this.setLayerVisible(id, visible);
    }

    removePolyline(id: string) {
        this.removeLayer(id);
    }

    clearPolylines() {
        this.clearLayers();
    }
}
