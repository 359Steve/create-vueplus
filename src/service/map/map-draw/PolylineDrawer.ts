import type { DrawSession } from './BaseDrawer';
import type { DrawDrag, DrawRequest, DrawSync, DrawVueToMap, DrawWayline } from './DrawTypes';
import type { LayerAddVertex, LayerDelVertex, LayerEditEvent, LayerMarkerDrag } from './PmEditType';
import L from 'leaflet';
import { v4 as uuid } from 'uuid';
import { BaseDrawer } from './BaseDrawer';

interface MarkerItem {
    /** 顶点唯一标识 */
    id: string;
    /** 顶点标记图层，编辑前回显时可为空 */
    marker: L.Marker | null;
}

/** 折线 / 航线绘制器：支持新建、编辑、顶点选中与拖动同步 */
export class PolylineDrawer extends BaseDrawer {
    /** 是否进入已有航线编辑态 */
    private _isEdit?: boolean = false;
    /** 是否从本地草稿恢复 */
    private _isRecover?: boolean = false;
    /** 进入编辑前的航点数据 */
    private _editPoints: Parameters<DrawDrag<'Polyline' | 'Polylines'>['callback']>[0][] = [];
    /** 地图选中顶点后同步列表的回调 */
    private _returnPoint?: DrawSync<'Polyline' | 'Polylines'>['callback'];
    /** 拖动顶点时同步列表坐标的回调 */
    private _returnDragPoint?: DrawDrag<'Polyline' | 'Polylines'>['callback'];
    /** 当前绘制会话 */
    private _drawSession: ReturnType<BaseDrawer['createDrawSession']>;
    /** 当前图层编辑会话 */
    private _layerSession: ReturnType<BaseDrawer['createLayerSession']>;
    /** 正式折线图层 ID */
    private readonly _polylineId = this.createDrawId('polyline');
    /** 绘制预览折线 ID */
    private readonly _previewLineId = this.createDrawId('previewLine');
    /** 绘制过程中的预览顶点 ID */
    private readonly _polylineMarkerId: Set<string> = new Set();
    /** 当前选中的顶点 */
    private _selectedVertex: L.Marker | null = null;
    /** 顶点 ID 与图层对照表 */
    private _vertexIndexes: MarkerItem[] = [];

    /**
     * 根据相邻顶点更新当前顶点距离提示
     * @param prev 前一个顶点
     * @param current 当前顶点
     */
    private setTipContent(prev: L.Marker, current: L.Marker): void {
        const prePoint = prev.getLatLng();
        const currentPoint = current.getLatLng();
        this._mapManager.tool.setMarkerTip(current, [prePoint.lat, prePoint.lng], [currentPoint.lat, currentPoint.lng]);
    }

    /**
     * 组装折线绘制回调数据
     * @param id 折线图层 ID
     * @param data 顶点列表
     * @returns 绘制完成回调载荷
     */
    private callBack(id: string, data: MarkerItem[]): Parameters<DrawRequest<'Polyline' | 'Polylines'>['callback']>[0] {
        return {
            id,
            data: data.map((item) => {
                const { lat, lng } = item.marker!.getLatLng();
                return {
                    id: item.id,
                    latitude: lat,
                    longitude: lng,
                };
            }),
        };
    }

    /**
     * 获取图层当前可用的全部顶点
     * @param layer 当前路径图层
     * @param shape Geoman 图形类型
     * @returns 顶点标记列表
     */
    private getLayerVertexMarkers(layer: L.Path, shape: LayerEditEvent['shape']): L.Marker[] | undefined {
        const markers = layer.pm._markers;

        if (!markers?.length) {
            return;
        }

        const vertexMarkers = this.getVertexMarkers(markers, shape);
        return vertexMarkers.length ? vertexMarkers : undefined;
    }

    /**
     * 修改顶点编号
     * @param marker 顶点标记
     * @param index 顶点序号（从 0 开始）
     */
    private updateVertexNumber(marker: L.Marker, index: number): void {
        const span = marker.getElement()?.querySelector('span');

        if (span) {
            span.textContent = String(index + 1);
        }
    }

    /**
     * 根据图形类型取出顶点标记数组
     * @param markers Geoman 顶点缓存
     * @param shape 图形类型
     * @returns 一维顶点标记数组
     */
    private getVertexMarkers(markers: L.Marker[] | L.Marker[][], shape: LayerEditEvent['shape']): L.Marker[] {
        return shape === 'Polygon' || shape === 'Rectangle'
            ? ((markers as L.Marker[][])[0] ?? [])
            : (markers as L.Marker[]);
    }

    /**
     * 删除顶点后更新相邻 Tooltip
     * @param vertexMarkers 顶点列表
     * @param index 被删除顶点的原索引
     */
    private updateAfterDelete(vertexMarkers: L.Marker[], index: number): void {
        if (!vertexMarkers.length) {
            return;
        }

        const prev = vertexMarkers[index - 1];
        const current = vertexMarkers[index];

        // 删除的是第一个顶点
        if (!prev) {
            current?.closeTooltip();
            return;
        }

        // 删除的是中间节点
        if (current) {
            this.setTipContent(prev, current);
        }
    }

    /**
     * 更新指定顶点相邻边的 Tooltip
     * @param vertexMarkers 顶点列表
     * @param index 当前顶点索引
     */
    private updateAdjacentMarkerTips(vertexMarkers: L.Marker[], index: number): void {
        const current = vertexMarkers[index];
        const pre = vertexMarkers[index - 1];
        const next = vertexMarkers[index + 1];

        if (!current) {
            return;
        }

        if (pre) {
            this.setTipContent(pre, current);
        }

        if (next) {
            this.setTipContent(current, next);
        }
    }

    /**
     * 从指定位置开始更新顶点编号
     * @param vertexMarkers 顶点列表
     * @param startIndex 起始索引
     */
    private updateVertexNumbers(vertexMarkers: L.Marker[], startIndex: number): void {
        for (let i = startIndex; i < vertexMarkers.length; i++) {
            this.updateVertexNumber(vertexMarkers[i], i);
        }
    }

    /**
     * 取消当前选中顶点高亮
     */
    private clearSelectedVertex(): void {
        if (!this._selectedVertex) return;

        this._mapManager.tool.setVertexSelected(this._selectedVertex, false);
        this._selectedVertex = null;
    }

    /**
     * 选中顶点并同步到列表
     * @param marker 目标顶点
     */
    private selectVertex(marker: L.Marker): void {
        const { lat, lng } = marker.getLatLng();
        this._mapManager.panTo(lat, lng);
        if (this._selectedVertex !== marker) {
            this.clearSelectedVertex();
            this._selectedVertex = marker;
            this._mapManager.tool.setVertexSelected(marker, true);

            // 同步列表
            this._returnPoint?.(this._vertexIndexes.find((item) => item.marker === marker)?.id ?? uuid());
        }
    }

    /**
     * 顶点点击事件：切换选中态
     * @param e Leaflet 鼠标事件
     */
    private editMarkerClick = (e: L.LeafletMouseEvent): void => {
        L.DomEvent.stopPropagation(e);
        this.selectVertex(e.target as L.Marker);
    };

    /**
     * 绑定顶点点击事件
     * @param marker 顶点标记
     */
    private bindVertexClick(marker: L.Marker): void {
        marker.off('click', this.editMarkerClick);
        marker.on('click', this.editMarkerClick);
    }

    /**
     * 监听添加顶点
     * @param callback 折线数据回传回调
     * @returns Geoman 顶点新增处理器
     */
    protected addVertex = (
        callback: DrawRequest<'Polyline' | 'Polylines'>['callback'],
    ): ((_e: LayerAddVertex) => void) => {
        return (e: LayerAddVertex): void => {
            const { marker, workingLayer, shape, indexPath } = e;

            if (!(workingLayer instanceof L.Path) || !Array.isArray(indexPath)) {
                return;
            }

            const index = indexPath[0];
            const vertexMarkers = this.getLayerVertexMarkers(workingLayer, shape);

            if (!vertexMarkers?.[index]) {
                return;
            }

            // 设置当前顶点样式及编号
            this._mapManager.tool.setVertexIcon(marker, index);

            // 更新当前顶点与前后顶点之间的 Tooltip
            this.updateAdjacentMarkerTips(vertexMarkers, index);

            // 更新新增顶点之后的编号
            this.updateVertexNumbers(vertexMarkers, index + 1);

            // 绑定顶点点击事件
            this.bindVertexClick(marker);

            this._vertexIndexes = vertexMarkers.map((marker) => {
                return {
                    id: this._vertexIndexes.find((item) => item.marker === marker)?.id ?? uuid(),
                    marker,
                };
            });

            callback(this.callBack(this._polylineId, this._vertexIndexes));

            // 同步列表
            this._returnPoint?.(this._vertexIndexes.find((item) => item.marker === this._selectedVertex)?.id ?? uuid());
        };
    };

    /**
     * 监听删除顶点
     * @param callback 折线数据回传回调
     * @returns Geoman 顶点删除处理器
     */
    protected delVertex = (
        callback: DrawRequest<'Polyline' | 'Polylines'>['callback'],
    ): ((_e: LayerDelVertex) => void) => {
        return (e: LayerDelVertex): void => {
            const { layer, shape, indexPath, marker } = e;

            if (!(layer instanceof L.Path) || !Array.isArray(indexPath)) {
                return;
            }

            const markers = layer.pm._markers;

            if (!markers?.length) {
                return;
            }

            const index = indexPath[0];
            const vertexMarkers = this.getVertexMarkers(markers, shape);

            // 删除顶点后，更新受影响的 Tooltip
            this.updateAfterDelete(vertexMarkers, index);

            // 从删除位置开始更新后续顶点编号
            this.updateVertexNumbers(vertexMarkers, index);

            this._vertexIndexes = vertexMarkers.map((marker) => {
                return {
                    id: this._vertexIndexes.find((item) => item.marker === marker)?.id ?? uuid(),
                    marker,
                };
            });

            callback(this.callBack(this._polylineId, this._vertexIndexes));

            if (this._selectedVertex === marker) {
                this.selectVertex(vertexMarkers[index === vertexMarkers.length ? index - 1 : index]);
            } else {
                // 同步列表
                this._returnPoint?.(
                    this._vertexIndexes.find((item) => item.marker === this._selectedVertex)?.id ?? uuid(),
                );
            }
        };
    };

    /**
     * 实时监听顶点拖动，同步相邻 Tooltip 与列表坐标
     * @param e 顶点拖动事件
     */
    protected layerMarkerDrag = (e: LayerMarkerDrag): void => {
        const { layer, indexPath, shape } = e;

        if (!(layer instanceof L.Path) || !Array.isArray(indexPath)) {
            return;
        }

        const index = indexPath[0];
        const vertexMarkers = this.getLayerVertexMarkers(layer, shape);

        if (!vertexMarkers || index >= vertexMarkers.length) {
            return;
        }

        // 更新当前顶点相邻边的 Tooltip
        this.updateAdjacentMarkerTips(vertexMarkers, index);

        const { id, marker } = this._vertexIndexes[index];

        if (!marker) return;

        const { lat, lng } = marker.getLatLng();
        this._returnDragPoint?.({
            id,
            latitude: lat,
            longitude: lng,
        });
    };

    /**
     * 绘制过程中添加预览顶点
     * @param point 顶点坐标
     * @param index 顶点序号
     * @param points 已确定的全部顶点
     */
    private addDrawPreviewVertex(point: L.LatLngExpression, index: number, points: L.LatLngExpression[]): void {
        const markerId = this.createDrawId('polylineMarker');
        const marker = this._mapManager.marker.addMarker(markerId, point, {
            interactive: false,
        });

        if (!marker) return;

        this._mapManager.tool.setVertexIcon(marker, index);

        if (index > 0) {
            this._mapManager.tool.setMarkerTip(marker, points[index - 1], point);
        }

        this._polylineMarkerId.add(markerId);
    }

    /**
     * 清除绘制过程中的预览顶点
     */
    private clearDrawPreviewVertices(): void {
        this._polylineMarkerId.forEach((id) => {
            this._mapManager.marker.removeMarker(id);
        });
        this._polylineMarkerId.clear();
    }

    /**
     * 为编辑态顶点设置编号、Tooltip 与点击事件
     * @param markers 顶点标记列表
     */
    private updateVertexIcons(markers: L.Marker[]): void {
        for (const [index, marker] of markers.entries()) {
            // 关闭顶点点击监听
            marker.off('click', this.editMarkerClick);

            // 编辑状态设置顶点样式和 tip
            this._mapManager.tool.setVertexIcon(marker, index);

            if (index) {
                this.setTipContent(markers[index - 1], marker);
            }

            marker.on('click', this.editMarkerClick);
        }

        this._vertexIndexes = markers.map((marker, index) => ({
            id: this._vertexIndexes[index]?.id ?? uuid(),
            marker,
        }));
    }

    /**
     * 监听进入编辑态，刷新顶点样式并默认选中首点
     * @param callback 折线数据回传回调
     * @returns Geoman 编辑事件处理器
     */
    protected lineLayerEdit = (
        callback: DrawRequest<'Polyline' | 'Polylines'>['callback'],
    ): ((_e: LayerEditEvent) => void) => {
        return (e: LayerEditEvent): void => {
            const { shape, layer } = e;

            if (!(layer instanceof L.Path)) {
                return;
            }

            const vertexMarkers = this.getLayerVertexMarkers(layer, shape);

            if (!vertexMarkers) {
                return;
            }

            // 设置顶点样式
            this.updateVertexIcons(vertexMarkers);

            callback(this.callBack(this._polylineId, this._vertexIndexes));

            // 默认选中第一个顶点
            const currentMarker = this._vertexIndexes[0].marker;
            currentMarker && this.selectVertex(currentMarker);
        };
    };

    /**
     * 开始绘制折线或航线
     * @param args 折线绘制请求
     * @returns 绘制会话；地图未就绪时返回 undefined
     */
    draw(args: DrawRequest<'Polyline' | 'Polylines'>): DrawSession | undefined {
        this._isEdit = Boolean(args.edit);
        this._isRecover = Boolean(args.recover);
        const map = this._mapManager.map;

        if (!map) return;

        const keepDrawing = !this._isEdit;

        const { tooltip, toolTipOptions, ...arg } = args.options ?? {};
        const points: L.LatLngExpression[] = this._editPoints.map((item) => [item.latitude, item.longitude]);

        let polyline = this._mapManager.polylines.addPolyline(this._polylineId, points, {
            color: BaseDrawer.DRAW_COLOR,
            weight: BaseDrawer.WEIGHT,
            dashArray: BaseDrawer.PREVIEW_DASH_ARRAY,
            opacity: BaseDrawer.OPACITY,
        });

        let previewLine: L.Polyline | null = null;
        if (keepDrawing) {
            previewLine = this._mapManager.polylines.addPolyline(
                this._previewLineId,
                [],
                this.getPreviewLineOptions(arg),
            );

            if (this._isRecover && points.length) {
                previewLine?.setLatLngs([points[points.length - 1]]);
                points.forEach((point, index) => {
                    this.addDrawPreviewVertex(point, index, points);
                });
            }
        }

        if (!polyline || (keepDrawing && !previewLine)) return;

        // 完成绘制
        const finishDraw = (): void => {
            if (points.length < 2) return;

            if (previewLine) {
                this._mapManager.polylines.removePolyline(this._previewLineId);
                previewLine = null;
            }

            this._drawSession?.complete();
            this.clearDrawPreviewVertices();

            const event: MapEvent[] = [
                [
                    'remove',
                    (): void => {
                        this._layerSession?.finish();
                        args.notice?.();
                    },
                ],
                ['pm:enable', this.lineLayerEdit(args.callback)],
                ['pm:vertexadded', this.addVertex(args.callback)],
                ['pm:vertexremoved', this.delVertex(args.callback)],
                ['pm:markerdrag', this.layerMarkerDrag],
            ];

            this._layerSession = this.createLayerSession(event, (): L.Polyline | null => polyline);
            polyline?.pm.enable();
        };

        // 鼠标移动预览
        const handleMouseMove = (e: L.LeafletMouseEvent): void => {
            if (!points.length) return;
            const { lat, lng } = e.latlng;

            previewLine?.setLatLngs([points[points.length - 1], [lat, lng]]);
        };

        // 单击
        const handleClick = (e: L.LeafletMouseEvent): void => {
            if (!polyline) return;

            const point: L.LatLngExpression = [e.latlng.lat, e.latlng.lng];

            points.push(point);
            previewLine?.setLatLngs([point]);
            polyline?.addLatLng(point);
            this.addDrawPreviewVertex(point, points.length - 1, points);

            if (args.type === 'Polyline' && points.length === 2) {
                finishDraw();
            }
        };

        // 双击
        const handleDblClick = (): void => {
            if (args.type === 'Polyline' || points.length < 3) return;

            finishDraw();
        };

        const event: MapEvent[] = keepDrawing
            ? [
                  ['click', (e: L.LeafletMouseEvent): void => this.createClicks(e, handleClick, handleDblClick)],
                  ['mousemove', handleMouseMove],
              ]
            : [];

        this._drawSession = this.createDrawSession(event, (): void => {
            this._layerSession?.finish();

            if (polyline) {
                this._mapManager.polylines.removePolyline(this._polylineId);
            }

            if (previewLine) {
                this._mapManager.polylines.removePolyline(this._previewLineId);
                previewLine = null;
            }

            this.clearDrawPreviewVertices();

            polyline = null;
            points.length = 0;
            this._isEdit = false;
            this._isRecover = false;
            this._editPoints = [];
            this._selectedVertex = null;
            this._vertexIndexes = [];
            this._drawSession = undefined;
            this._layerSession = undefined;
            this._returnPoint = undefined;
            this._returnDragPoint = undefined;
        });

        if (this._isEdit) {
            finishDraw();
        }

        return this._drawSession;
    }

    /**
     * 列表选中航点后同步地图高亮
     * @param args 选中参数
     */
    setSelectPoint(args: DrawVueToMap<'Polyline' | 'Polylines'>): void {
        const { id } = args;
        const currentMarker = this._vertexIndexes.find((item) => item.id === id)?.marker;

        if (!currentMarker) return;

        this.selectVertex(currentMarker);
    }

    /**
     * 地图选中航点后同步列表高亮
     * @param args 选中回调参数
     */
    getSelectPoint(args: DrawSync<'Polyline' | 'Polylines'>): void {
        this._returnPoint = args.callback;
    }

    /**
     * 拖动折线顶点时实时同步列表坐标
     * @param args 拖动回调参数
     */
    returnDragPoint(args: DrawDrag<'Polyline' | 'Polylines'>): void {
        this._returnDragPoint = args.callback;
    }

    /**
     * 将已有航点写入绘制器，进入编辑态
     * @param args 航线数据参数
     * @returns 是否写入成功
     */
    getWaylineData(args: DrawWayline<'Polyline' | 'Polylines'>): boolean {
        const { data } = args;
        try {
            this._editPoints = data;
            this._vertexIndexes = data.map((item) => {
                return {
                    id: item.id,
                    marker: null,
                };
            });

            return true;
        } catch {
            return false;
        }
    }
}
