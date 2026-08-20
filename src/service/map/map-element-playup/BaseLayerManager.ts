import type L from 'leaflet';
import type { MapManager } from '../MapManager';

export abstract class BaseLayerManager<TLayer extends L.Layer, TOptions = OverlayBaseOptions> {
    protected readonly _mapManager: MapManager;
    protected readonly _layers = new Map<string, TLayer>();

    constructor(mapManager: MapManager) {
        this._mapManager = mapManager;
    }

    get layers(): Map<string, TLayer> {
        return this._layers;
    }

    protected addLayer(id: string, createLayer: () => TLayer | null): TLayer | null {
        if (!this._mapManager.map) return null;

        const layer = createLayer();
        if (!layer) return null;

        this._layers.set(id, layer);
        return layer;
    }

    protected bindOverlayContent(layer: TLayer, options: TOptions & OverlayBaseOptions) {
        const { popup, tooltip, openPopup } = options;
        this._mapManager.tool.bindOverlayContent(layer, { popup, tooltip, openPopup });
    }

    protected getLayer(id: string): TLayer | undefined {
        return this._layers.get(id);
    }

    protected setLayerPopup(id: string, content: string | HTMLElement) {
        this._mapManager.tool.setPopup(id, this._layers, content);
    }

    protected setLayerVisible(id: string, visible: boolean) {
        this._mapManager.setLayerVisible(this._layers.get(id), visible);
    }

    protected removeLayer(id: string) {
        this._mapManager.tool.removeLayerFromMap(this._layers, id);
    }

    protected clearLayers() {
        this._mapManager.tool.clearStore(this._layers);
    }
}
