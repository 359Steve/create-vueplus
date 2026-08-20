import L from 'leaflet';
import { MapDraw } from './map-draw/MapDraw';
import { MapCircle } from './map-element-playup/MapCircle';
import { MapLayerGroups } from './map-element-playup/MapLayerGroups';
import { MapMarker } from './map-element-playup/MapMarker';
import { MapPolygons } from './map-element-playup/MapPolygons';
import { MapPolylines } from './map-element-playup/MapPolylines';
import { MapRectangles } from './map-element-playup/MapRectangles';
import { MapTileLayers } from './map-element-playup/MapTileLayers';
import { MapTrajectories } from './map-element-playup/MapTrajectories';
import { MapTool } from './MapTool';
import 'leaflet-ant-path';
import 'leaflet.marker.slideto';
import '@geoman-io/leaflet-geoman-free';

/**
 * Leaflet 地图管理器：封装底图、视图控制以及点/线/面/圆/矩形/轨迹等常用覆盖物操作
 */
class MapManager {
    readonly draw: MapDraw;
    readonly marker: MapMarker;
    readonly circle: MapCircle;
    readonly rectangles: MapRectangles;
    readonly polylines: MapPolylines;
    readonly polygons: MapPolygons;
    readonly layergroups: MapLayerGroups;
    readonly tilelayers: MapTileLayers;
    readonly trajectories: MapTrajectories;
    readonly tool: MapTool = new MapTool();

    private _map: L.Map | null = null;
    private _defaultMarkerPopup: HTMLElement | null = null;

    constructor() {
        this.draw = new MapDraw(this);
        this.marker = new MapMarker(this);
        this.circle = new MapCircle(this);
        this.rectangles = new MapRectangles(this);
        this.polylines = new MapPolylines(this);
        this.polygons = new MapPolygons(this);
        this.layergroups = new MapLayerGroups(this);
        this.tilelayers = new MapTileLayers(this);
        this.trajectories = new MapTrajectories(this);
    }

    /** 获取原生 Leaflet Map 实例，未初始化时为 null */
    get map(): L.Map | null {
        return this._map;
    }

    /** 获取默认标记点弹窗内容 */
    get defaultMarkerPopup(): HTMLElement | null {
        return this._defaultMarkerPopup;
    }

    /** 注册所有标记点共用的默认弹窗内容 */
    setDefaultMarkerPopup(popup: HTMLElement | null): void {
        this._defaultMarkerPopup = popup;
    }

    /**
     * 初始化地图；若已存在实例会先销毁再重建
     * @param target 容器元素 id 或 HTMLElement
     * @param options 中心点、缩放等初始配置
     * @returns Leaflet Map 实例
     */
    initMap(target: string | HTMLElement, options: L.MapOptions = {}): L.Map {
        if (this._map) {
            this.destroyMap();
        }

        this.tool.fixDefaultIcon();

        const { center = [29.75, 120.21], zoom = 13, minZoom = 2, maxZoom = 18, ...args } = options;

        this._map = L.map(target, {
            center,
            zoom,
            minZoom,
            maxZoom,
            ...args,
        });

        return this._map;
    }

    /**
     * 销毁地图，并清理全部底图与覆盖物缓存
     */
    destroyMap() {
        if (!this._map) return;

        this.clearAllOverlays();
        this.tilelayers.clear();
        this.layergroups.clear();
        this._map.remove();
        this._map = null;
        this._defaultMarkerPopup = null;
    }

    // ====== 地图操作 ======

    /**
     * 点击地图显示经纬度信息
     * @param popupDom 弹窗DOM模板
     * @returns 移除监听的方法
     */
    enableLocationPopup(
        popupDom: HTMLElement,
        showPopup: boolean = false,
        callback: (_data: L.LatLngExpression) => void,
    ): () => void {
        const map = this._map;
        if (!map) return () => {};

        const handlerClick = (e: L.LeafletMouseEvent) => {
            const { lat, lng } = e.latlng;

            if (showPopup) {
                const time = new Date().toLocaleString();
                const cloneDom = this.tool.clonePopup(popupDom);
                const latEl = cloneDom.querySelector('.lat-text');
                const lngEl = cloneDom.querySelector('.lng-text');
                const timeEl = cloneDom.querySelector('.location-popup__time');
                if (latEl) latEl.textContent = String(lat.toFixed(4));
                if (lngEl) lngEl.textContent = String(lng.toFixed(4));
                if (timeEl) timeEl.textContent = time;
                L.popup({
                    closeButton: true,
                    autoClose: true,
                    closeOnClick: true,
                    maxWidth: 250,
                    minWidth: 110,
                })
                    .setLatLng(e.latlng)
                    .setContent(cloneDom)
                    .openOn(map);
            }

            callback([lat, lng]);
        };

        map.on('click', handlerClick);
        return () => {
            map.off('click', handlerClick);
            map.closePopup();
        };
    }

    /**
     * 容器尺寸变化后调用，强制地图重新计算尺寸并修正瓦片错位
     */
    invalidateSize() {
        this._map?.invalidateSize();
    }

    /**
     * 设置地图中心点；可同时指定缩放级别
     * @param lat 纬度
     * @param lon 经度
     * @param zoom 可选缩放级别；不传则保持当前缩放
     */
    setView(lat: number, lon: number, zoom?: number) {
        if (!this._map) return;
        if (zoom !== undefined) {
            this._map.setView([lat, lon], zoom);
        } else {
            this._map.setView([lat, lon]);
        }
    }

    /**
     * 平移到指定坐标，保持当前缩放级别
     * @param lat 纬度
     * @param lon 经度
     */
    panTo(lat: number, lon: number) {
        this._map?.panTo([lat, lon]);
    }

    /**
     * 设置地图缩放级别
     * @param zoom 目标缩放级别
     */
    setZoom(zoom: number) {
        this._map?.setZoom(zoom);
    }

    /**
     * 获取当前缩放级别
     * @returns 缩放级别；地图未初始化时返回 undefined
     */
    getZoom(): number | undefined {
        return this._map?.getZoom();
    }

    /**
     * 根据高度设置地图缩放级别
     */
    setZoomByAltitude(
        altitude: number,
        options?: {
            minAltitude?: number;
            maxAltitude?: number;
            minZoom?: number;
            maxZoom?: number;
        },
    ) {
        const { minAltitude = 10, maxAltitude = 1000, minZoom = 10, maxZoom = 18 } = options ?? {};

        const ratio = Math.max(0, Math.min(1, (altitude - minAltitude) / (maxAltitude - minAltitude)));

        const zoom = maxZoom - ratio * (maxZoom - minZoom);

        this._map?.setZoom(zoom);
    }

    /**
     * 获取当前地图中心点
     * @returns 中心坐标；地图未初始化时返回 undefined
     */
    getCenter(): L.LatLng | undefined {
        return this._map?.getCenter();
    }

    // ====== 地图视野控制 ======

    /**
     * 将视野适配到一组坐标点
     * @param points 坐标点列表
     * @param options Leaflet fitBounds 配置
     */
    fitPoints(points: L.LatLngExpression[], options?: L.FitBoundsOptions) {
        if (!this._map || points.length === 0) return;
        this._map.fitBounds(
            L.latLngBounds(
                points.map((p) => {
                    return L.latLng(p);
                }),
            ),
            options,
        );
    }

    /**
     * 地图缩放到能显示全部设备的区域
     * @param bounds 目标范围
     * @param options Leaflet fitBounds 配置
     */
    fitBounds(bounds: L.LatLngBoundsExpression, options?: L.FitBoundsOptions) {
        this._map?.fitBounds(bounds, options);
    }

    /**
     * 设置单个图层显隐
     * @param layer 目标图层
     * @param visible 是否可见
     */
    setLayerVisible(layer: L.Layer | undefined, visible: boolean) {
        if (!layer || !this._map) return;
        if (visible) {
            if (!this._map.hasLayer(layer)) {
                layer.addTo(this._map);
            }
        } else {
            layer.remove();
        }
    }

    // ====== 状态查询 ======

    /**
     * 判断指定 id 是否存在于管理器缓存中。
     * 未指定类型时，检查所有覆盖物、底图及图层组。
     * @param id 元素 id
     * @param type 可选元素类型
     */
    has(id: string, type?: ManagedElementType): boolean {
        const stores = {
            marker: this.marker.markers,
            tileLayer: this.tilelayers.tileLayers,
            polyline: this.polylines.polylines,
            polygon: this.polygons.polygons,
            circle: this.circle.circles,
            rectangle: this.rectangles.rectangles,
            trajectory: this.trajectories.trajectories,
            layerGroup: this.layergroups.layerGroups,
        } as const;

        if (type) return stores[type].has(id);
        return Object.values(stores).some((store) => {
            return store.has(id);
        });
    }

    // ====== 批量清理 ======

    /**
     * 清除指定无人机的所有元素
     * @param id 无人机id
     */
    clearCurrent(id: string) {
        this.marker.removeMarker(id);
        this.polylines.removePolyline(id);
        this.polygons.removePolygon(id);
        this.circle.removeCircle(id);
        this.rectangles.removeRectangle(id);
        this.trajectories.removeTrajectory(id);
        this.layergroups.removeLayerGroup(id);
    }

    /**
     * 清除所有覆盖物，不影响底图
     */
    clearAllOverlays() {
        this.marker.clearMarkers();
        this.polylines.clearPolylines();
        this.polygons.clearPolygons();
        this.circle.clearCircles();
        this.rectangles.clearRectangles();
        this.trajectories.clearTrajectories();
        this.layergroups.clearLayerGroupAll();
    }
}

const mapManager = new MapManager();
export default mapManager;
export { MapManager };
