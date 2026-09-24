import type L from 'leaflet';
import type { MapManager } from '../MapManager';

/** 图层管理器基类：统一处理图层缓存、弹窗绑定与显隐 */
export abstract class BaseLayerManager<TLayer extends L.Layer, Toptions = OverlayBaseOptions> {
    /** 地图管理器 */
    protected readonly _mapManager: MapManager;
    /** 当前类型图层缓存 */
    protected readonly _layers = new Map<string, TLayer>();

    /**
     * 创建图层管理器
     * @param mapManager 地图管理器
     */
    constructor(mapManager: MapManager) {
        this._mapManager = mapManager;
    }

    /** 获取当前类型 layer 缓存 */
    protected get layers(): Map<string, TLayer> {
        return this._layers;
    }

    /**
     * 清理图层的事件监听器和绑定内容
     * @param layer 要清理的图层
     */
    protected cleanupLayer(layer: TLayer): void {
        if ('off' in layer && typeof layer.off === 'function') {
            layer.off();
        }
        if ('closePopup' in layer && typeof layer.closePopup === 'function') {
            layer.closePopup();
        }
        if ('closeTooltip' in layer && typeof layer.closeTooltip === 'function') {
            layer.closeTooltip();
        }
    }

    /**
     * 创建对应 layer 图层
     * @param id 图层 ID
     * @param type 图层组类型
     * @param createLayer 创建图层方法
     * @returns 当前图层
     */
    protected addLayer(id: string, type: ManagedElementType, createLayer: () => TLayer | null): TLayer | null {
        if (!this._mapManager.map || !id) return null;

        this.removeLayer(id, type);
        const layer = createLayer();
        if (!layer) return null;

        this._layers.set(id, layer);
        return layer;
    }

    /**
     * 绑定 popup 弹窗
     * @param layer 当前元素
     * @param options 弹窗配置
     */
    protected bindOverlayContent(layer: TLayer, options?: Toptions): void {
        this._mapManager.tool.bindOverlayContent(layer, { ...options });
    }

    /**
     * 从缓存中获取对应 ID 图层
     * @param id 元素 ID
     * @returns 图层实例
     */
    protected getLayer(id: string): TLayer | undefined {
        return this._layers.get(id);
    }

    /**
     * 设置元素弹窗内容
     * @param id 元素 ID
     * @param content 弹窗内容
     */
    protected setLayerPopup(id: string, content: string | HTMLElement): void {
        this._mapManager.tool.setPopup(id, this._layers, content);
    }

    /**
     * 设置图层显隐
     * @param id 元素 ID
     * @param type 图层组类型
     * @param visible 是否可见
     */
    protected setLayerVisible(id: string, type: ManagedElementType, visible: boolean): void {
        const layer = this._layers.get(id);
        const layerGroup = this._mapManager.layergroups.getOrCreateLayerGroup(type);

        if (!layer || !layerGroup) return;

        if (visible) {
            if (!layerGroup.hasLayer(layer)) layer.addTo(layerGroup);
            return;
        }

        if (layerGroup.hasLayer(layer)) layerGroup.removeLayer(layer);
    }

    /**
     * 移除对应元素
     * @param id 元素 ID
     * @param type 图层组类型
     * @returns 是否成功移除
     */
    protected removeLayer(id: string, type: ManagedElementType): boolean {
        if (!id) return false;

        const layer = this._layers.get(id);

        if (!layer) return false;

        this._mapManager.layergroups.removeLayer(type, layer);
        this.cleanupLayer(layer);
        layer.remove();
        this._layers.delete(id);
        return true;
    }

    /**
     * 移除某种类型全部元素
     * @param type 图层组类型
     */
    protected clearLayers(type: ManagedElementType): void {
        for (const layer of this._layers.values()) {
            this._mapManager.layergroups.removeLayer(type, layer);
            this.cleanupLayer(layer);
            layer.remove();
        }
        this._layers.clear();
    }
}
