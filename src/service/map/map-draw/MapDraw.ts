import type { MapManager } from '../MapManager';
import type { BaseDrawer } from './BaseDrawer';
import type { DrawKeyType, DrawRequestParam } from './DrawTypes';
import { CircleDrawer } from './CircleDrawer';
import { MarkerDrawer } from './MarkerDrawer';
import { PolygonDrawer } from './PolygonDrawer';
import { PolylineDrawer } from './PolylineDrawer';
import { RectangleDrawer } from './RectangleDrawer';

type DrawerMap = {
    [K in DrawKeyType]?: {
        draw: (_args: Extract<DrawRequestParam, { type: K }>) => ReturnType<BaseDrawer['createDrawSession']>;
    };
};

export class MapDraw {
    private readonly _drawers: DrawerMap;

    constructor(mapManager: MapManager) {
        this._drawers = {
            Marker: new MarkerDrawer(mapManager),
            Circle: new CircleDrawer(mapManager),
            Polyline: new PolylineDrawer(mapManager),
            Polylines: new PolylineDrawer(mapManager),
            Polygon: new PolygonDrawer(mapManager),
            Rectangle: new RectangleDrawer(mapManager),
        };
    }

    startDraw(args: DrawRequestParam) {
        const drawer = this._drawers[args.type] as {
            draw: (_args: DrawRequestParam) => ReturnType<BaseDrawer['createDrawSession']>;
        };

        return drawer?.draw(args);
    }
}
