import L from 'leaflet';
import { BaseLayerManager } from './BaseLayerManager';

/** 点标记图层管理类 */
export class MapMarker extends BaseLayerManager<L.Marker, MarkerAddOptions> {
    /** 获取标记缓存 */
    get markers(): Map<string, L.Marker> {
        return this.layers;
    }

    /**
     * 创建标记
     * @param id 标记 ID
     * @param point 标记坐标
     * @param options 标记配置
     * @param callback 标记点击回调
     * @returns 当前标记；创建失败时返回 null
     */
    addMarker(
        id: string,
        point: L.LatLngExpression,
        options?: MarkerAddOptions,
        callback?: (_id: string) => void,
    ): L.Marker | null {
        return this.addLayer(id, 'marker', (): L.Marker | null => {
            const group = this._mapManager.layergroups.getOrCreateLayerGroup('marker');

            if (!group) return null;

            const marker =
                group &&
                L.marker(point, {
                    icon: this._mapManager.tool.droneIcon,
                    ...options,
                }).addTo(group);
            this.bindOverlayContent(marker, options);

            marker.on('click', (): void => {
                callback && callback(id);
            });

            if (options?.heading !== undefined) this._mapManager.tool.setMarkerHeading(marker, options.heading);
            return marker;
        });
    }

    /**
     * 平滑移动并更新标记朝向
     * @param id 标记 ID
     * @param point 目标坐标
     * @param duration 动画时长（毫秒）
     * @param keepAtCenter 是否保持地图中心跟随
     * @param heading 航向角
     */
    updateMarker(
        id: string,
        point: L.LatLngExpression,
        duration: number,
        keepAtCenter: boolean,
        heading?: number,
    ): void {
        const marker = this.getMarker(id);
        if (!marker) return;

        marker.slideCancel();

        marker.slideTo(point, {
            duration,
            keepAtCenter,
        });
        if (heading !== undefined) this._mapManager.tool.setMarkerHeading(marker, heading);
    }

    /**
     * 获取指定标记
     * @param id 元素 ID
     * @returns 标记图层
     */
    getMarker(id: string): L.Marker | undefined {
        return this.getLayer(id);
    }

    /**
     * 设置标记 popup 弹窗
     * @param id 元素 ID
     * @param content 弹窗内容
     */
    setMarkerPopup(id: string, content: string | HTMLElement): void {
        this.setLayerPopup(id, content);
    }

    /**
     * 设置标记显隐
     * @param id 元素 ID
     * @param visible 是否可见
     */
    setMarkerVisible(id: string, visible: boolean): void {
        this.setLayerVisible(id, 'marker', visible);
    }

    /**
     * 移除当前标记
     * @param id 元素 ID
     * @returns 是否成功移除
     */
    removeMarker(id: string): boolean {
        const marker = this.getMarker(id);
        if (marker && 'slideCancel' in marker && typeof marker.slideCancel === 'function') {
            marker.slideCancel();
        }
        return this.removeLayer(id, 'marker');
    }

    /** 清除全部标记 */
    clearMarkers(): void {
        for (const marker of this.markers.values()) {
            if ('slideCancel' in marker && typeof marker.slideCancel === 'function') {
                marker.slideCancel();
            }
        }
        this.clearLayers('marker');
    }
}
