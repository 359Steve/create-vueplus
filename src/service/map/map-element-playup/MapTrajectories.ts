import type { AntPathOptions } from '@/types/leafletMarkerExpress';
import L from 'leaflet';
import { BaseLayerManager } from './BaseLayerManager';

export class MapTrajectories extends BaseLayerManager<L.AntPath, AntPathOptions> {
    get trajectories() {
        return this.layers;
    }

    addTrajectory(id: string, points: L.LatLngExpression[] = [], options?: AntPathOptions) {
        if (this.layers.has(id)) return null;

        return this.addLayer(id, () => L.polyline.antPath(points, options).addTo(this._mapManager.map!));
    }

    appendTrajectoryPoint(id: string, point: L.LatLngExpression): boolean {
        const trajectory = this.getTrajectory(id);
        if (!trajectory) return false;

        trajectory.addLatLng(point);
        return true;
    }

    updateTrajectory(id: string, point: L.LatLngExpression, options?: AntPathOptions): void {
        if (!this.appendTrajectoryPoint(id, point)) {
            this.addTrajectory(id, [point], options);
        }
    }

    getTrajectory(id: string) {
        return this.getLayer(id);
    }

    setTrajectoriesVisible(id: string, visible: boolean) {
        this.setLayerVisible(id, visible);
    }

    removeTrajectory(id: string) {
        this.removeLayer(id);
    }

    clearTrajectories() {
        this.clearLayers();
    }
}
