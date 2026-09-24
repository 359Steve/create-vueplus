import L from 'leaflet';
import { BaseLayerManager } from './BaseLayerManager';

/** 矩形图层管理类 */
export class MapRectangles extends BaseLayerManager<L.Rectangle, RectangleAddOptions> {
    /** 获取矩形缓存 */
    get rectangles(): Map<string, L.Rectangle> {
        return this.layers;
    }

    /**
     * 创建矩形
     * @param id 矩形 ID
     * @param bounds 矩形边界
     * @param options 矩形配置选项
     * @returns 当前矩形；创建失败时返回 null
     */
    addRectangle(id: string, bounds: L.LatLngBoundsExpression, options?: RectangleAddOptions): L.Rectangle | null {
        return this.addLayer(id, 'rectangle', (): L.Rectangle | null => {
            const group = this._mapManager.layergroups.getOrCreateLayerGroup('rectangle');

            if (!group) return null;

            const rectangle = L.rectangle(bounds, options).addTo(group);
            this.bindOverlayContent(rectangle, options);
            return rectangle;
        });
    }

    /**
     * 更新矩形
     * @param id 元素 ID
     * @param bounds 矩形边界
     */
    updateRectangle(id: string, bounds: L.LatLngBoundsExpression): void {
        this.getRectangle(id)?.setBounds(bounds);
    }

    /**
     * 获取指定矩形
     * @param id 元素 ID
     * @returns 矩形图层
     */
    getRectangle(id: string): L.Rectangle | undefined {
        return this.getLayer(id);
    }

    /**
     * 设置矩形 popup 弹窗
     * @param id 元素 ID
     * @param content 弹窗内容
     */
    setRectanglePopup(id: string, content: string | HTMLElement): void {
        this.setLayerPopup(id, content);
    }

    /**
     * 设置矩形显隐
     * @param id 元素 ID
     * @param visible 是否可见
     */
    setRectanglesVisible(id: string, visible: boolean): void {
        this.setLayerVisible(id, 'rectangle', visible);
    }

    /**
     * 移除当前矩形
     * @param id 元素 ID
     * @returns 是否成功移除
     */
    removeRectangle(id: string): boolean {
        return this.removeLayer(id, 'rectangle');
    }

    /** 清除全部矩形 */
    clearRectangles(): void {
        this.clearLayers('rectangle');
    }
}
