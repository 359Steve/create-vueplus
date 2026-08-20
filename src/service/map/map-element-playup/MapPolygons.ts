import L from 'leaflet';
import { BaseLayerManager } from './BaseLayerManager';

export class MapPolygons extends BaseLayerManager<L.Polygon, PolygonAddOptions> {
    get polygons() {
        return this.layers;
    }

    addPolygon(points: L.LatLngExpression[], options: PolygonAddOptions = {}, id: string) {
        return this.addLayer(id, () => {
            const { popup, tooltip, openPopup, ...polygonOptions } = options;
            const polygon = L.polygon(points, polygonOptions).addTo(this._mapManager.map!);
            this.bindOverlayContent(polygon, { popup, tooltip, openPopup });
            return polygon;
        });
    }

    updatePolygon(id: string, points: L.LatLngExpression[]) {
        this.getPolygon(id)?.setLatLngs(points);
    }

    getPolygon(id: string) {
        return this.getLayer(id);
    }

    setPolygonVisible(id: string, visible: boolean) {
        this.setLayerVisible(id, visible);
    }

    setPolygonPopup(id: string, content: string | HTMLElement) {
        this.setLayerPopup(id, content);
    }

    removePolygon(id: string) {
        this.removeLayer(id);
    }

    clearPolygons() {
        this.clearLayers();
    }
}
