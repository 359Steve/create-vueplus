/** 面板可下发的飞行指令类型 */
type FlightAction = 'takeoff' | 'return-home' | 'emergency-land' | 'stop-motors' | 'hover' | 'pause-mission';

interface ActionItem {
    id: FlightAction;
    label: string;
    description: string;
    icon: string;
    tone: 'primary' | 'success' | 'warning' | 'danger' | 'neutral';
    confirm: boolean;
}

/** 无人机参数面板类型 */
interface FlightParameterValues {
    altitude: number;
    horizontalSpeed: number;
    verticalSpeed: number;
    yaw: number;
}
