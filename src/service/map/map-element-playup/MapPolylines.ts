import L from 'leaflet';
import { BaseLayerManager } from './BaseLayerManager';

/** 折线图层管理类 */
export class MapPolylines extends BaseLayerManager<L.Polyline, PolylineAddOptions> {
    /** 获取折线缓存 */
    get polylines(): Map<string, L.Polyline> {
        return this.layers;
    }

    /**
     * 创建折线
     * @param id 折线 ID
     * @param points 折线坐标点数组
     * @param options 折线配置选项
     * @returns 当前折线；创建失败时返回 null
     */
    addPolyline(id: string, points: L.LatLngExpression[], options?: PolylineAddOptions): L.Polyline | null {
        return this.addLayer(id, 'polyline', (): L.Polyline | null => {
            const group = this._mapManager.layergroups.getOrCreateLayerGroup('polyline');

            if (!group) return null;

            const polyline = L.polyline(points, options).addTo(group);
            this.bindOverlayContent(polyline, options);
            return polyline;
        });
    }

    /**
     * 更新折线
     * @param id 元素 ID
     * @param points 折线坐标点数组
     */
    updatePolyline(id: string, points: L.LatLngExpression[]): void {
        this.getPolyline(id)?.setLatLngs(points);
    }

    /**
     * 向折线追加坐标点
     * @param id 元素 ID
     * @param lat 纬度
     * @param lon 经度
     */
    appendPolylinePoint(id: string, lat: number, lon: number): void {
        const line = this.getPolyline(id);
        if (!line) return;

        line.addLatLng([lat, lon]);
    }

    /**
     * 获取指定折线
     * @param id 元素 ID
     * @returns 折线图层
     */
    getPolyline(id: string): L.Polyline | undefined {
        return this.getLayer(id);
    }

    /**
     * 设置折线 popup 弹窗
     * @param id 元素 ID
     * @param content 弹窗内容
     */
    setPolylinePopup(id: string, content: string | HTMLElement): void {
        this.setLayerPopup(id, content);
    }

    /**
     * 设置折线显隐
     * @param id 元素 ID
     * @param visible 是否可见
     */
    setPolylineVisible(id: string, visible: boolean): void {
        this.setLayerVisible(id, 'polyline', visible);
    }

    /**
     * 移除当前折线
     * @param id 元素 ID
     * @returns 是否成功移除
     */
    removePolyline(id: string): boolean {
        return this.removeLayer(id, 'polyline');
    }

    /** 清除全部折线 */
    clearPolylines(): void {
        this.clearLayers('polyline');
    }
}
