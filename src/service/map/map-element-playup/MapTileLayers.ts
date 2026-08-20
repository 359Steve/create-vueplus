import type { MapManager } from '../MapManager';
import L from 'leaflet';

export class MapTileLayers {
    private _tileLayers = new Map<string, L.TileLayer>();
    private readonly _mapManager: MapManager;

    constructor(mapManager: MapManager) {
        this._mapManager = mapManager;
    }

    /** 地图瓦片图层 */
    get tileLayers(): Map<string, L.TileLayer> {
        return this._tileLayers;
    }

    // ====== 地图瓦片设置 ======

    /**
     * 添加瓦片底图
     * @param url 瓦片地址模板
     * @param key 图层标识，用于后续切换或移除，默认 `default`
     * @param options 瓦片配置
     * @returns 瓦片图层；地图未初始化时返回 null
     */
    addTileLayer(url: string, key = 'default', options?: L.TileLayerOptions) {
        if (!this._mapManager.map) return null;

        // 先删除旧的
        const existing = this._tileLayers.get(key);
        if (existing) {
            existing.remove();
            this._tileLayers.delete(key);
        }

        // 创建新的
        const layer = L.tileLayer(url, {
            maxZoom: 18,
            minZoom: 2,
            ...options,
        }).addTo(this._mapManager.map);

        this._tileLayers.set(key, layer);
        return layer;
    }

    /**
     * 添加高德卫星影像底图
     * @param key 图层标识，默认 `default`
     */
    addGaodeSatellite(key = 'default', url: string = this._mapManager.tool.GAODE_SATELLITE_URL) {
        this.addTileLayer(url, key, {
            subdomains: ['1', '2', '3', '4'],
            maxZoom: 18,
            minZoom: 2,
            attribution: '&copy; 高德地图',
        });
    }

    /**
     * 添加高德矢量路网底图
     * @param key 图层标识，默认 `default`
     */
    addGaodeVector(key = 'default', url: string = this._mapManager.tool.GAODE_VECTOR_URL) {
        this.addTileLayer(url, key, {
            subdomains: ['1', '2', '3', '4'],
            maxZoom: 18,
            minZoom: 2,
            attribution: '&copy; 高德地图',
        });
    }

    /**
     * 移除指定标识的瓦片底图
     * @param key 图层标识，默认 `default`
     */
    removeTileLayer(key = 'default') {
        const layer = this._tileLayers.get(key);
        if (layer) {
            layer.remove();
            this._tileLayers.delete(key);
        }
    }

    clear() {
        for (const layer of this._tileLayers.values()) {
            layer.remove();
        }
        this._tileLayers.clear();
    }
}
