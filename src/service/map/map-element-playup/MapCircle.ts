import L from 'leaflet';
import { BaseLayerManager } from './BaseLayerManager';

export class MapCircle extends BaseLayerManager<L.Circle, CircleAddOptions> {
    get circles() {
        return this.layers;
    }

    addCircle(param: AddCircleParam) {
        return this.addLayer(param.id, () => {
            const { popup, tooltip, openPopup, ...circleOptions } = param.options;
            const circle = L.circle([param.Lat, param.Lon], { radius: param.radius, ...circleOptions }).addTo(
                this._mapManager.map!,
            );
            this.bindOverlayContent(circle, { popup, tooltip, openPopup });
            return circle;
        });
    }

    updateCircle(param: UpdateCircleParam) {
        const circle = this.getCircle(param.id);
        if (!circle) return;

        circle.slideTo([param.Lat, param.Lon], {
            duration: param.duration,
            keepAtCenter: param.keepAtCenter,
        });
        if (param.radius !== undefined) circle.setRadius(param.radius);
    }

    getCircle(id: string) {
        return this.getLayer(id);
    }

    setCirclePopup(id: string, content: string | HTMLElement) {
        this.setLayerPopup(id, content);
    }

    setCircleVisible(id: string, visible: boolean) {
        this.setLayerVisible(id, visible);
    }

    removeCircle(id: string) {
        this.removeLayer(id);
    }

    clearCircles() {
        this.clearLayers();
    }
}
