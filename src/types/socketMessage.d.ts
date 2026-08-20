/** 消息类型 */
enum MessageId {
    VehicleList = 'VehicleList',
    Telemetry = 'Telemetry',
    Command = 'Command',
    CommandAck = 'CommandAck',
    Event = 'Event',
}

/** WebSocket 通用消息 */
interface WebSocketMessage<T = unknown> {
    /** 消息类型 */
    MessageId: MessageId;

    /** 设备ID */
    DeviceId: string;

    /** 事务ID */
    TransactionId: string;

    /** 消息体 */
    Data: T;
}

/** 飞机信息 */
interface WebVehicleInfo {
    /** 设备唯一标识 */
    DeviceId: string;

    /** 飞行器型号 */
    VehicleType: string;

    /** 固件版本 */
    FirmwareVersion: string;
}

/** 飞机列表 */
interface WebVehicleList {
    Vehicles: WebVehicleInfo[];
}

/** 电池数据 */
interface WebBatteryData {
    /** 电池ID */
    Id: string;

    /** 剩余电量 */
    RemainPercent: number;

    /** 温度 */
    Temperature: number;
}

/** 遥测数据 */
interface WebTelemetry {
    IsFlying: boolean;

    FlightMode: string;

    Lat: number;

    Lon: number;

    Alt: number;

    Pitch: number;

    Yaw: number;

    Roll: number;

    Vx: number;

    Vy: number;

    Vz: number;

    SatelliteCount: number;

    GpsLevel: string;

    Batteries: WebBatteryData[];
}

/** 控制命令 */
enum CommandId {
    SetParameters = 'SetParameters',

    Takeoff = 'Takeoff',

    Land = 'Land',

    Return = 'Return',

    FlyTo = 'FlyTo',

    Hover = 'Hover',

    PauseMission = 'PauseMission',

    StopMotors = 'StopMotors',
}

interface WebFlightParameters {
    Alt: number;

    HorizontalSpeed: number;

    VerticalSpeed: number;

    Yaw: number;
}

interface WebCommand {
    CommandId: CommandId;

    Params: unknown[];
}

interface WebCommandAck {
    /** 是否成功 */
    IsOk: boolean;

    /** 错误信息 */
    ErrorMessage: string;
}

interface WebEvent {
    /** 事件ID */
    EventId: string;

    /** 参数 */
    Params: unknown[];
}

interface WebSocketMessageMap {
    [MessageId.VehicleList]: WebVehicleList;

    [MessageId.Telemetry]: WebTelemetry;

    [MessageId.Command]: WebCommand;

    [MessageId.CommandAck]: WebCommandAck;

    [MessageId.Event]: WebEvent;
}

type TypedWebSocketMessage<T extends MessageId> = WebSocketMessage<WebSocketMessageMap[T]>;

type CommandAckMessage = TypedWebSocketMessage<MessageId.CommandAck>;
