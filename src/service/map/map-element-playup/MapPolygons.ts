import L from 'leaflet';
import { BaseLayerManager } from './BaseLayerManager';

/** 多边形图层管理类 */
export class MapPolygons extends BaseLayerManager<L.Polygon, PolygonAddOptions> {
    /** 获取多边形缓存 */
    get polygons(): Map<string, L.Polygon> {
        return this.layers;
    }

    /**
     * 创建多边形
     * @param id 多边形 ID
     * @param points 多边形坐标点数组
     * @param options 多边形配置选项
     * @returns 当前多边形；创建失败时返回 null
     */
    addPolygon(id: string, points: L.LatLngExpression[], options?: PolygonAddOptions): L.Polygon | null {
        return this.addLayer(id, 'polygon', (): L.Polygon | null => {
            const group = this._mapManager.layergroups.getOrCreateLayerGroup('polygon');

            if (!group) return null;

            const polygon = L.polygon(points, options).addTo(group);
            this.bindOverlayContent(polygon, options);
            return polygon;
        });
    }

    /**
     * 更新多边形
     * @param id 元素 ID
     * @param points 多边形坐标点数组
     */
    updatePolygon(id: string, points: L.LatLngExpression[]): void {
        this.getPolygon(id)?.setLatLngs(points);
    }

    /**
     * 获取指定多边形
     * @param id 元素 ID
     * @returns 多边形图层
     */
    getPolygon(id: string): L.Polygon | undefined {
        return this.getLayer(id);
    }

    /**
     * 设置多边形显隐
     * @param id 元素 ID
     * @param visible 是否可见
     */
    setPolygonVisible(id: string, visible: boolean): void {
        this.setLayerVisible(id, 'polygon', visible);
    }

    /**
     * 设置多边形 popup 弹窗
     * @param id 元素 ID
     * @param content 弹窗内容
     */
    setPolygonPopup(id: string, content: string | HTMLElement): void {
        this.setLayerPopup(id, content);
    }

    /**
     * 移除当前多边形
     * @param id 元素 ID
     * @returns 是否成功移除
     */
    removePolygon(id: string): boolean {
        return this.removeLayer(id, 'polygon');
    }

    /** 清除全部多边形 */
    clearPolygons(): void {
        this.clearLayers('polygon');
    }
}
