export interface MqttConfig {
  url: string;
  port: number;
  username?: string;
  password?: string;
  tls: boolean;
  caCert?: string;
}

export interface Project {
  id: string;
  userId: string;
  name: string;
  mqttConfig: MqttConfig;
}

export interface DeviceField {
  label: string;
  topic: string;
  unit?: string;
}

export interface Device {
  id: string; // Document ID
  projectId: string; // Foreign key
  deviceId: string; // e.g. "esp32_01"
  statusTopic: string;
  otaTopic: string;
  fields: DeviceField[];
}

export interface OtaHistory {
  id: string;
  deviceId: string;
  projectId: string;
  userId: string;
  version: string;
  url: string;
  timestamp: any;
}

export interface Firmware {
  id: string;
  projectId: string;
  deviceId: string;
  userId: string;
  version: string;
  description: string;
  fileName: string;
  fileUrl: string;
  uploadedAt: any;
}
