import type { MapManager } from '../MapManager';
import L from 'leaflet';

/** 地图图层组管理类：按类型管理多个图层组 */
export class MapLayerGroups {
    /** 图层组缓存 */
    private _layerGroups = new Map<ManagedElementType, L.LayerGroup>();
    /** 地图管理器引用 */
    private readonly _mapManager: MapManager;

    /**
     * 创建图层组管理器
     * @param mapManager 地图管理器实例
     */
    constructor(mapManager: MapManager) {
        this._mapManager = mapManager;
    }

    /** 获取图层组缓存 */
    get layerGroups(): Map<ManagedElementType, L.LayerGroup> {
        return this._layerGroups;
    }

    // ====== 地图图层组控制 ======

    /**
     * 获取或创建命名图层组，便于批量显隐与管理
     * @param key 图层组名称
     * @returns 图层组；地图未初始化时返回 null
     */
    getOrCreateLayerGroup(key: ManagedElementType): L.LayerGroup | null {
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
    setLayerGroupVisible(key: ManagedElementType, visible: boolean): void {
        const group = this._layerGroups.get(key);
        if (!group || !this._mapManager.map) return;

        if (visible && !this._mapManager.map.hasLayer(group)) {
            group.addTo(this._mapManager.map);
        } else if (!visible && this._mapManager.map.hasLayer(group)) {
            group.remove();
        }
    }

    /**
     * 清空指定图层组内的全部子图层
     * @param key 图层组名称
     * @returns 是否成功清空
     */
    clearLayerGroup(key: ManagedElementType): boolean {
        const group = this._layerGroups.get(key);
        if (!group) return false;

        group.clearLayers();
        return true;
    }

    /**
     * 清除全部图层组的内容
     */
    clearAll(): void {
        for (const group of this._layerGroups.values()) {
            group.clearLayers();
        }
    }

    /**
     * 从指定图层组中移除指定元素
     * @param type 图层组类型
     * @param layer 移除的元素
     * @returns 是否成功移除
     */
    removeLayer(type: ManagedElementType, layer: L.Layer): boolean {
        const group = this._layerGroups.get(type);
        if (!group || !group.hasLayer(layer)) return false;

        group.removeLayer(layer);
        return true;
    }

    /**
     * 删除指定 ID 的图层元素并从对应图层组中移除
     * @param id 元素 ID
     * @returns 是否找到并移除了元素
     */
    removeLayerGroup(id: string): boolean {
        if (!id) return false;

        const groups = [
            ['marker', this._mapManager.marker.getMarker(id)],
            ['polyline', this._mapManager.polylines.getPolyline(id)],
            ['polygon', this._mapManager.polygons.getPolygon(id)],
            ['circle', this._mapManager.circle.getCircle(id)],
            ['rectangle', this._mapManager.rectangles.getRectangle(id)],
            ['trajectory', this._mapManager.trajectories.getTrajectory(id)],
        ] as const;

        let removed = false;
        for (const [type, layer] of groups) {
            if (!layer) continue;

            const group = this._layerGroups.get(type);
            if (group?.hasLayer(layer)) {
                group.removeLayer(layer);
                removed = true;
            }
        }

        return removed;
    }

    /** 清除并移除所有图层组 */
    clear(): void {
        for (const group of this._layerGroups.values()) {
            group.clearLayers();
            group.remove();
        }
        this._layerGroups.clear();
    }
}
