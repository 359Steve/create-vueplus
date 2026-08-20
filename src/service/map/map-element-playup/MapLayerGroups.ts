import type { MapManager } from '../MapManager';
import L from 'leaflet';

export class MapLayerGroups {
    private _layerGroups = new Map<string, L.LayerGroup>();
    private readonly _mapManager: MapManager;

    constructor(mapManager: MapManager) {
        this._mapManager = mapManager;
    }

    /** 图层组 */
    get layerGroups(): Map<string, L.LayerGroup> {
        return this._layerGroups;
    }

    // ====== 地图图层组控制 ======

    /**
     * 获取或创建命名图层组，便于批量显隐与管理
     * @param key 图层组名称
     * @returns 图层组；地图未初始化时返回 null
     */
    getOrCreateLayerGroup(key: string): L.LayerGroup | null {
        if (!this._mapManager.map) return null;

        let group = this._layerGroups.get(key);

        if (!group) {
            // 创建空图层组
            group = L.layerGroup().addTo(this._mapManager.map);
            this._layerGroups.set(key, group);
        }
        return group;
    }

    /**
     * 设置图层组显隐
     * @param key 图层组名称
     * @param visible 是否可见
     */
    setLayerGroupVisible(key: string, visible: boolean) {
        if (!this._mapManager.map) return;
        const group = this._layerGroups.get(key);
        if (!group) return;

        // 判断当前图层组是否添加在地图中，进行控制显隐
        if (visible) {
            if (!this._mapManager.map.hasLayer(group)) {
                group.addTo(this._mapManager.map);
            }
        } else {
            group.remove();
        }
    }

    /**
     * 清空指定图层组内的全部子图层
     * @param key 图层组名称
     */
    clearLayerGroup(key: string) {
        this._layerGroups.get(key)?.clearLayers();
    }

    /**
     * 清除全部图层组
     */
    clearLayerGroupAll() {
        for (const group of this._layerGroups.values()) {
            group.clearLayers();
        }
    }

    /**
     * 删除指定图层组使用元素并清除该图层
     * @param id 图层组id
     */
    removeLayerGroup(id: string) {
        const group = this._layerGroups.get(id);
        group?.clearLayers();
        group?.remove();
        this._layerGroups.delete(id);
    }

    clear() {
        for (const group of this._layerGroups.values()) {
            group.clearLayers();
            group.remove();
        }
        this._layerGroups.clear();
    }
}
