import 'leaflet';

interface Slideto {
    slideTo: (
        latlng: L.LatLngExpression,
        options?: {
            duration?: number;
            keepAtCenter?: boolean;
        },
    ) => this;

    slideCancel: () => this;
}

interface AntPathOptions extends L.PolylineOptions {
    /**
     * 使用的 Leaflet Vector 类型
     * 默认：L.polyline
     */
    use?: typeof L.polyline;

    /**
     * 是否暂停动画
     * @default false
     */
    paused?: boolean;

    /**
     * 是否反向播放动画
     * @default false
     */
    reverse?: boolean;

    /**
     * 是否使用硬件加速
     * @default false
     */
    hardwareAccelerated?: boolean;

    /**
     * 流动虚线的颜色
     * @default 'white'
     */
    pulseColor?: string;

    /**
     * 动画延迟
     * @default 400
     */
    delay?: number;

    /**
     * 虚线大小
     * @default '10, 20'
     */
    dashArray?: string | [number, number];
}

declare module 'leaflet' {
    interface Marker extends Slideto {}
    interface Circle extends Slideto {}
    interface AntPath extends L.FeatureGroup, L.Polyline {
        pause: () => boolean;
        resume: () => boolean;
        reverse: () => this;
    }
    namespace polyline {
        function antPath(latlngs: L.LatLngExpression[] | L.LatLngExpression[][], options?: AntPathOptions): AntPath;
    }
}
