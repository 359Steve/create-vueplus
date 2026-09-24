import type { AntPathOptions } from '@/types/leafletMarkerExpress';
import L from 'leaflet';
import { BaseLayerManager } from './BaseLayerManager';

/** 蚂蚁线轨迹图层管理类 */
export class MapTrajectories extends BaseLayerManager<L.AntPath, AntPathOptions> {
    /** 获取轨迹缓存 */
    get trajectories(): Map<string, L.AntPath> {
        return this.layers;
    }

    /**
     * 创建轨迹
     * @param id 元素 ID
     * @param points 轨迹坐标点数组
     * @param options 轨迹配置选项
     * @returns 当前轨迹
     */
    addTrajectory(id: string, points: L.LatLngExpression[] = [], options?: AntPathOptions): L.AntPath | null {
        if (this.trajectories.has(id)) return null;

        return this.addLayer(id, 'trajectory', (): L.AntPath | null => {
            const group = this._mapManager.layergroups.getOrCreateLayerGroup('trajectory');

            if (!group) return null;

            return L.polyline.antPath(points, options).addTo(group);
        });
    }

    /**
     * 向轨迹追加坐标点
     * @param id 元素 ID
     * @param point 坐标点
     * @returns 是否追加成功
     */
    appendTrajectoryPoint(id: string, point: L.LatLngExpression): boolean {
        const trajectory = this.getTrajectory(id);
        if (!trajectory) return false;

        trajectory.addLatLng(point);
        return true;
    }

    /**
     * 更新轨迹
     * @param id 元素 ID
     * @param point 坐标点
     * @param options 轨迹配置选项
     */
    updateTrajectory(id: string, point: L.LatLngExpression, options?: AntPathOptions): void {
        if (!this.appendTrajectoryPoint(id, point)) {
            this.addTrajectory(id, [point], options);
        }
    }

    /**
     * 获取指定轨迹
     * @param id 元素 ID
     * @returns 轨迹图层
     */
    getTrajectory(id: string): L.AntPath | undefined {
        return this.getLayer(id);
    }

    /**
     * 设置轨迹显隐
     * @param id 元素 ID
     * @param visible 是否可见
     */
    setTrajectoriesVisible(id: string, visible: boolean): void {
        this.setLayerVisible(id, 'trajectory', visible);
    }

    /**
     * 移除当前轨迹
     * @param id 元素 ID
     * @returns 是否成功移除
     */
    removeTrajectory(id: string): boolean {
        return this.removeLayer(id, 'trajectory');
    }

    /** 清除全部轨迹 */
    clearTrajectories(): void {
        this.clearLayers('trajectory');
    }
}
