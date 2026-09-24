import L from 'leaflet';

/** 地图工具类：提供常用图标、计算和图层操作方法 */
export class MapTool {
    private _iconCache = new Map<string, L.Icon>();

    /** 高德卫星影像底图瓦片地址 */
    readonly GAODE_SATELLITE_URL = 'https://webst0{s}.is.autonavi.com/appmaptile?style=6&x={x}&y={y}&z={z}';

    /** 高德矢量路网底图瓦片地址 */
    readonly GAODE_VECTOR_URL =
        'https://webrd0{s}.is.autonavi.com/appmaptile?lang=zh_cn&size=1&scale=1&style=8&x={x}&y={y}&z={z}';

    /** 创建图标 */
    private createIcon(url: string, options: Partial<L.IconOptions> = {}): L.Icon {
        if (!this._iconCache.has(url)) {
            this._iconCache.set(
                url,
                L.icon({
                    iconSize: [24, 24],
                    iconAnchor: [12, 12],
                    ...options,
                    iconUrl: url,
                }),
            );
        }
        return this._iconCache.get(url)!;
    }

    /** 获取标记点基础图标 */
    get markerIcon(): L.Icon {
        return this.createIcon('/leaflet/images/marker-icon-base.png');
    }

    /** 无人机飞行中图标 */
    get droneIcon(): L.Icon {
        return this.createIcon('/leaflet/images/uav.png');
    }

    /** 无人机待命图标 */
    get droneWaitingIcon(): L.Icon {
        return this.createIcon('/leaflet/images/uav-waiting.png');
    }

    /** 无人机离线图标 */
    get droneOfflineIcon(): L.Icon {
        // 改名：outline → offline 更语义化
        return this.createIcon('/leaflet/images/uav-outline.png');
    }

    /** 无人机选中图标 */
    get droneSelectedIcon(): L.Icon {
        return this.createIcon('/leaflet/images/uav-selected.png');
    }

    /** 获取文字图层提示配置 */
    get imgTip(): OverlayBaseOptions {
        return {
            tooltip: '点击编辑',
            toolTipOptions: {
                permanent: true,
                direction: 'top',
                offset: [-5, -20],
                className: 'tooltip',
            },
        };
    }

    /** 获取图片图层提示配置 */
    get textTip(): OverlayBaseOptions {
        return {
            tooltip: '点击编辑',
            toolTipOptions: {
                permanent: true,
                direction: 'center',
                className: 'tooltip-draw',
            },
        };
    }

    /**
     * 克隆弹窗元素并设置可见
     * @param popup 弹窗元素
     * @returns 克隆后的弹窗元素
     */
    clonePopup(popup: HTMLElement): HTMLElement {
        const cloneDom = popup.cloneNode(true) as HTMLElement;

        Object.assign(cloneDom.style, {
            display: 'block',
            visibility: 'visible',
            opacity: '1',
        });

        return cloneDom;
    }

    /**
     * 修复 Leaflet 默认标记图标路径
     */
    fixDefaultIcon(): void {
        delete (L.Icon.Default.prototype as any)._getIconUrl;
        L.Icon.Default.mergeOptions({
            iconRetinaUrl: '/leaflet/images/uav.png',
            iconUrl: '/leaflet/images/uav.png',
            shadowUrl: '/leaflet/images/uav.png',
        });
    }

    /**
     * 计算两点之间的距离
     * @param pre 起点坐标
     * @param next 终点坐标
     * @returns 两点之间的距离（米）
     */
    calculateDistance(pre: L.LatLngExpression, next: L.LatLngExpression): number {
        const point1 = L.latLng(pre);
        const point2 = L.latLng(next);

        if (![point1.lat, point1.lng, point2.lat, point2.lng].every(Number.isFinite)) return 0;
        return point1.distanceTo(point2);
    }

    /**
     * 计算折线路径的总长度
     * @param points 折线路径点数组
     * @returns 路径总长度（米）
     */
    countDistance(points: L.LatLngExpression[]): number {
        if (points.length < 2) return 0;

        let distance = 0;
        for (let i = 1; i < points.length; i += 1) {
            distance += this.calculateDistance(points[i - 1], points[i]);
        }

        return distance;
    }

    /**
     * 判断两个经纬度数组是否相同
     * @param a 点a
     * @param b 点b
     * @returns 两个点是否相等
     */
    latLngEqual(a: L.LatLngExpression | null, b: L.LatLngExpression | null): boolean {
        if (!a || !b) return false;
        return L.latLng(a).equals(L.latLng(b));
    }

    /**
     * 从缓存中移除指定元素
     * @param store 缓存表
     * @param id 元素 id
     * @returns 是否成功移除
     */
    removeLayerFromMap<T extends L.Layer>(store: Map<string, T>, id: string): boolean {
        if (!id) return false;

        const layer = store.get(id);
        if (!layer) return false;

        if ('off' in layer && typeof layer.off === 'function') {
            layer.off();
        }

        layer.remove();
        store.delete(id);
        return true;
    }

    /**
     * 清空指定覆盖物缓存表，并自地图移除全部图层
     * @param store 覆盖物缓存表
     */
    clearStore<T extends L.Layer>(store: Map<string, T>): void {
        for (const layer of store.values()) {
            if ('off' in layer && typeof layer.off === 'function') {
                layer.off();
            }
            layer.remove();
        }
        store.clear();
    }

    /**
     * 为覆盖物绑定弹窗与悬停提示
     * @param layer 目标图层
     * @param options 弹窗 / 提示配置
     */
    bindOverlayContent(layer: L.Layer, options?: OverlayBaseOptions): void {
        if (!options) return;
        if (options.popup !== undefined) {
            layer.bindPopup(options.popup, options.popupOptions);

            if (options.openPopup) {
                layer.openPopup();
            }
        }
        if (options.tooltip !== undefined) {
            // 绑定鼠标放入提示语
            layer.bindTooltip(options.tooltip, options.toolTipOptions);
        }
    }

    /**
     * 旋转标记图标至指定航向
     * @param marker 目标标记
     * @param heading 航向角（度，0=北，顺时针）
     */
    setMarkerHeading(marker: L.Marker, heading: number): void {
        if (!Number.isFinite(heading)) return;
        const normalizedHeading = ((heading % 360) + 360) % 360;
        const applyHeading = (): void => {
            const node = marker.getElement();
            const img = node?.querySelector('img');
            if (img) {
                img.style.transform = `rotate(${normalizedHeading}deg)`;
                img.style.transformOrigin = 'center center';
            }
        };

        if (!marker.getElement()) {
            marker.once('add', applyHeading);
            return;
        }
        applyHeading();
    }

    /**
     * 为 layer 绑定或更新弹窗内容
     * @param id 标记 id
     * @param element 对应地图元素存储对象
     * @param content 弹窗内容，支持 HTML
     */
    setPopup<T extends L.Layer>(id: string, element: Map<string, T>, content: string | HTMLElement): void {
        element.get(id)?.bindPopup(content);
    }

    /**
     * 为标记顶点设置自定义图标和序号
     * @param marker 标记实例
     * @param index 顶点序号
     * @returns 更新后的标记实例
     */
    setVertexIcon(marker: L.Marker, index: number): L.Marker {
        return marker.setIcon(
            L.divIcon({
                className: 'polyline-node',
                html: `<span>${index + 1}</span>`,
                iconSize: [18, 18],
                iconAnchor: [9, 9],
            }),
        );
    }

    /**
     * 为折线顶点标记设置距离提示
     * @param currentMarker 当前顶点标记
     * @param prePoint 前一个点坐标
     * @param currentPoint 当前点坐标
     */
    setMarkerTip(currentMarker: L.Marker, prePoint: L.LatLngExpression, currentPoint: L.LatLngExpression): void {
        const content = `${this.calculateDistance(prePoint, currentPoint).toFixed(2)} 米`;
        const el = currentMarker.getTooltip()?.getElement();

        if (el) {
            el.textContent = content;
        } else {
            currentMarker.bindTooltip(content, {
                ...this.imgTip.toolTipOptions,
                offset: [3, -10],
                className: 'tooltip',
            });
        }
    }

    /** 添加选择顶点样式 */
    setVertexSelected(marker: L.Marker, selected: boolean): void {
        marker.getElement()?.querySelector('span')?.classList.toggle('is-selected', selected);
        marker.getTooltip()?.getElement()?.classList.toggle('tooltip-selected', selected);
    }
}
