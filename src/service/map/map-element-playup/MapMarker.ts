import L from 'leaflet';
import { BaseLayerManager } from './BaseLayerManager';

export class MapMarker extends BaseLayerManager<L.Marker, MarkerAddOptions> {
    get markers() {
        return this.layers;
    }

    addMarker(param: AddMarkerParam) {
        return this.addLayer(param.id, () => {
            const { popup, tooltip, openPopup, heading, ...markerOptions } = param.options;
            const marker = L.marker([param.Lat, param.Lon], {
                icon: this._mapManager.tool.droneIcon,
                ...markerOptions,
            }).addTo(this._mapManager.map!);
            this.bindOverlayContent(marker, {
                popup: popup ?? this._mapManager.defaultMarkerPopup ?? undefined,
                tooltip,
                openPopup,
            });

            if (heading !== undefined) this._mapManager.tool.setMarkerHeading(marker, heading);
            return marker;
        });
    }

    updateMarker(param: UpdateMarkerParam) {
        const marker = this.getMarker(param.id);
        if (!marker) return;

        marker.slideCancel();

        marker.slideTo([param.Lat, param.Lon], {
            duration: param.duration,
            keepAtCenter: param.keepAtCenter,
        });
        if (param.heading !== undefined) this._mapManager.tool.setMarkerHeading(marker, param.heading);
    }

    getMarker(id: string) {
        return this.getLayer(id);
    }

    setMarkerPopup(id: string, content: string | HTMLElement) {
        this.setLayerPopup(id, content);
    }

    setMarkerVisible(id: string, visible: boolean) {
        this.setLayerVisible(id, visible);
    }

    removeMarker(id: string) {
        this.removeLayer(id);
    }

    clearMarkers() {
        this.clearLayers();
    }
}
