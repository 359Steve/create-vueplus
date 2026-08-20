export const DrawKey = {
    Marker: 'Marker',
    Circle: 'Circle',
    Polyline: 'Polyline',
    Polylines: 'Polylines',
    Polygon: 'Polygon',
    Rectangle: 'Rectangle',
} as const;

export type DrawKeyType = keyof typeof DrawKey;

interface DrawConfig {
    [DrawKey.Marker]: {
        data: L.LatLngExpression;
        options: L.MarkerOptions;
    };

    [DrawKey.Circle]: {
        data: {
            center: L.LatLngExpression;
            radius: number;
        };
        options: L.CircleOptions;
    };

    [DrawKey.Polyline]: {
        data: L.LatLngExpression[];
        options: L.PolylineOptions;
    };

    [DrawKey.Polylines]: {
        data: L.LatLngExpression[];
        options: L.PolylineOptions;
    };

    [DrawKey.Polygon]: {
        data: L.LatLngExpression[];
        options: L.PolylineOptions;
    };

    [DrawKey.Rectangle]: {
        data: L.LatLngBoundsExpression;
        options: L.PolylineOptions;
    };
}

export type DrawRequestParam = {
    [K in DrawKeyType]: {
        type: K;
        callback: (_data: DrawConfig[K]['data']) => void;
        options?: DrawConfig[K]['options'];
    };
}[DrawKeyType];

export type DrawRequest<T extends DrawKeyType> = Extract<DrawRequestParam, { type: T }>;

export type GeomanLayer = L.Marker | L.Polyline | L.Polygon | L.Rectangle | L.Circle;
