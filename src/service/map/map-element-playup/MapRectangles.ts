import L from 'leaflet';
import { BaseLayerManager } from './BaseLayerManager';

export class MapRectangles extends BaseLayerManager<L.Rectangle, RectangleAddOptions> {
    get rectangles() {
        return this.layers;
    }

    addRectangle(bounds: L.LatLngBoundsExpression, options: RectangleAddOptions = {}, id: string) {
        return this.addLayer(id, () => {
            const { popup, tooltip, openPopup, ...rectangleOptions } = options;
            const rectangle = L.rectangle(bounds, rectangleOptions).addTo(this._mapManager.map!);
            this.bindOverlayContent(rectangle, { popup, tooltip, openPopup });
            return rectangle;
        });
    }

    updateRectangle(id: string, bounds: L.LatLngBoundsExpression) {
        this.getRectangle(id)?.setBounds(bounds);
    }

    getRectangle(id: string) {
        return this.getLayer(id);
    }

    setRectanglePopup(id: string, content: string | HTMLElement) {
        this.setLayerPopup(id, content);
    }

    setRectanglesVisible(id: string, visible: boolean) {
        this.setLayerVisible(id, visible);
    }

    removeRectangle(id: string) {
        this.removeLayer(id);
    }

    clearRectangles() {
        this.clearLayers();
    }
}
