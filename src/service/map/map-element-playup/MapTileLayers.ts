import type { MapManager } from '../MapManager';
import L from 'leaflet';

/** 地图瓦片底图管理类 */
export class MapTileLayers {
    /** 瓦片图层缓存 */
    private _tileLayers = new Map<string, L.TileLayer>();
    /** 地图管理器 */
    private readonly _mapManager: MapManager;

    /**
     * 创建瓦片图层管理器
     * @param mapManager 地图管理器
     */
    constructor(mapManager: MapManager) {
        this._mapManager = mapManager;
    }

    /** 获取地图瓦片图层缓存 */
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
    addTileLayer(url: string, key = 'default', options?: L.TileLayerOptions): L.TileLayer | null {
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
     * @param url 瓦片地址，默认高德卫星地址
     */
    addGaodeSatellite(key = 'default', url: string = this._mapManager.tool.GAODE_SATELLITE_URL): void {
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
     * @param url 瓦片地址，默认高德矢量地址
     */
    addGaodeVector(key = 'default', url: string = this._mapManager.tool.GAODE_VECTOR_URL): void {
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
     * @returns 是否成功移除
     */
    removeTileLayer(key = 'default'): boolean {
        const layer = this._tileLayers.get(key);
        if (!layer) return false;

        layer.off();
        layer.remove();
        this._tileLayers.delete(key);
        return true;
    }

    /** 清除并移除所有瓦片图层 */
    clear(): void {
        for (const layer of this._tileLayers.values()) {
            layer.off();
            layer.remove();
        }
        this._tileLayers.clear();
    }
}
