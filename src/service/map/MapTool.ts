import L from 'leaflet';

export class MapTool {
    /** 高德卫星影像底图瓦片地址 */
    readonly GAODE_SATELLITE_URL = 'https://webst0{s}.is.autonavi.com/appmaptile?style=6&x={x}&y={y}&z={z}';

    /** 高德矢量路网底图瓦片地址 */
    readonly GAODE_VECTOR_URL =
        'https://webrd0{s}.is.autonavi.com/appmaptile?lang=zh_cn&size=1&scale=1&style=8&x={x}&y={y}&z={z}';

    /** 标记点基础图标 */
    get markerIcon() {
        return L.icon({
            iconUrl: '/leaflet/images/marker-icon-base.png',
            iconSize: [32, 48],
            iconAnchor: [20, 20],
        });
    }

    /** 无人机图标 */
    get droneIcon() {
        return L.icon({
            iconUrl: '/leaflet/images/marker-icon.png',
            iconSize: [32, 32],
            iconAnchor: [20, 20],
        });
    }

    /** 克隆popup */
    clonePopup(popup: HTMLElement) {
        const cloneDom = popup.cloneNode(true) as HTMLElement;

        Object.assign(cloneDom.style, {
            display: 'block',
            visibility: 'visible',
            opacity: '1',
        });

        return cloneDom;
    }

    /**
     * 手动设置默认 marker 图标
     */
    fixDefaultIcon() {
        delete (L.Icon.Default.prototype as any)._getIconUrl;
        L.Icon.Default.mergeOptions({
            iconRetinaUrl: '/leaflet/images/marker-icon-2x.png',
            iconUrl: '/leaflet/images/marker-icon.png',
            shadowUrl: '/leaflet/images/marker-shadow.png',
        });
    }

    /**
     *
     * @param pre 起点
     * @param next 终点
     * @returns 得到两点之间的距离，单位（米）
     */
    calculateDistance(pre: L.LatLngExpression, next: L.LatLngExpression) {
        const point1 = L.latLng(pre);
        const point2 = L.latLng(next);

        return point1.distanceTo(point2) || 0;
    }

    /**
     * 判断两个经纬度数组是否相同
     * @param a 点a
     * @param b 点b
     * @returns 两个点是否相等
     */
    latLngEqual(a: L.LatLngExpression | null, b: L.LatLngExpression | null) {
        if (!a || !b) return false;
        return L.latLng(a).equals(L.latLng(b));
    }

    /**
     * 从缓存中移除指定元素
     * @param store 缓存表
     * @param id 元素 id
     * @returns 是否成功移除
     */
    removeLayerFromMap<T extends L.Layer>(store: Map<string, T>, id: string) {
        const layer = store.get(id);
        if (!layer) return false;
        layer.remove();
        store.delete(id);
        return true;
    }

    /**
     * 清空指定覆盖物缓存表，并自地图移除全部图层
     * @param store 覆盖物缓存表
     */
    clearStore<T extends L.Layer>(store: Map<string, T>) {
        for (const layer of store.values()) {
            layer.remove();
        }
        store.clear();
    }

    /**
     * 为覆盖物绑定弹窗与悬停提示
     * @param layer 目标图层
     * @param options 弹窗 / 提示配置
     */
    bindOverlayContent(layer: L.Layer, options?: OverlayBaseOptions) {
        if (!options) return;
        if (options.popup !== undefined) {
            layer.bindPopup(options.popup);

            if (options.openPopup) {
                layer.openPopup();
            }
        }
        if (options.tooltip !== undefined) {
            // 绑定鼠标放入提示语
            layer.bindTooltip(options.tooltip);
        }
    }

    /**
     * 旋转标记图标至指定航向
     * @param marker 目标标记
     * @param heading 航向角（度，0=北，顺时针）
     */
    setMarkerHeading(marker: L.Marker, heading: number) {
        const el = marker.getElement();
        if (!el) {
            marker.once('add', () => {
                const node = marker.getElement();
                if (node) {
                    node.style.transformOrigin = 'center center';
                    const img = node.querySelector('img');
                    if (img) {
                        img.style.transform = `rotate(${heading}deg)`;
                        img.style.transformOrigin = 'center center';
                    }
                }
            });
            return;
        }
        const img = el.querySelector('img');
        if (img) {
            img.style.transform = `rotate(${heading}deg)`;
            img.style.transformOrigin = 'center center';
        }
    }

    /**
     * 为圆形区域绑定或更新弹窗内容
     * @param id 标记 id
     * @param element 对应地图元素存储对象
     * @param content 弹窗内容，支持 HTML
     */
    setPopup<T extends L.Layer>(id: string, element: Map<string, T>, content: string | HTMLElement) {
        element.get(id)?.bindPopup(content);
    }
}
