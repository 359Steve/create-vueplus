import L from 'leaflet';
import { BaseLayerManager } from './BaseLayerManager';

/** 圆形图层管理类 */
export class MapCircle extends BaseLayerManager<L.Circle, CircleAddOptions> {
    /** 获取圆形缓存 */
    get circles(): Map<string, L.Circle> {
        return this.layers;
    }

    /**
     * 创建圆
     * @param id 圆形 ID
     * @param point 圆心坐标
     * @param radius 半径（米）
     * @param options 圆形配置
     * @returns 当前圆形；创建失败时返回 null
     */
    addCircle(id: string, point: L.LatLngExpression, radius: number, options?: CircleAddOptions): L.Circle | null {
        return this.addLayer(id, 'marker', (): L.Circle | null => {
            const group = this._mapManager.layergroups.getOrCreateLayerGroup('circle');

            if (!group) return null;

            const circle = L.circle(point, { radius, ...options }).addTo(group);
            this.bindOverlayContent(circle, options);
            return circle;
        });
    }

    /**
     * 更新圆心与半径
     * @param id 圆形 ID
     * @param point 圆心坐标
     * @param radius 半径（米）
     */
    updateCircle(id: string, point: L.LatLngExpression, radius: number): void {
        const circle = this.getCircle(id);
        if (!circle) return;

        circle.setLatLng(point);
        if (radius !== undefined) circle.setRadius(radius);
    }

    /**
     * 获取指定圆形
     * @param id 元素 ID
     * @returns 圆形图层
     */
    getCircle(id: string): L.Circle | undefined {
        return this.getLayer(id);
    }

    /**
     * 设置圆 popup 弹窗
     * @param id 元素 ID
     * @param content 弹窗内容
     */
    setCirclePopup(id: string, content: string | HTMLElement): void {
        this.setLayerPopup(id, content);
    }

    /**
     * 设置圆形显隐
     * @param id 元素 ID
     * @param visible 是否可见
     */
    setCircleVisible(id: string, visible: boolean): void {
        this.setLayerVisible(id, 'circle', visible);
    }

    /**
     * 移除当前圆
     * @param id 元素 ID
     * @returns 是否成功移除
     */
    removeCircle(id: string): boolean {
        return this.removeLayer(id, 'circle');
    }

    /** 清除全部圆 */
    clearCircles(): void {
        this.clearLayers('circle');
    }
}
