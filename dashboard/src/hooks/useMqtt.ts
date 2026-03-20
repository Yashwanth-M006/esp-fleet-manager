"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import mqtt, { MqttClient } from "mqtt";
import { Project, Device } from "@/types";

export interface OtaState {
  isUpdating: boolean;
  progress: number;
  state: string; // 'started', 'downloading', 'success', 'failed'
  version?: string;
  reason?: string;
}

export interface MqttDeviceState {
  status: "online" | "offline" | "updating" | "downloading" | "flashing" | "updated" | "error";
  lastSeen: number;
  fields: Record<string, string | number>;
  ota?: OtaState;
}

export const useMqtt = (project: Project | null, devices: Device[]) => {
  const [client, setClient] = useState<MqttClient | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [deviceStates, setDeviceStates] = useState<Record<string, MqttDeviceState>>({});
  
  const clientRef = useRef<MqttClient | null>(null);
  const devicesRef = useRef(devices);
  const timeoutIntervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    devicesRef.current = devices;
  }, [devices]);

  // Connect to MQTT when project is available
  useEffect(() => {
    if (!project) return;

    const { url, port, username, password, tls } = project.mqttConfig;
    let proto = tls ? "wss" : "ws";
    
    let brokerUrl = url;
    if (!brokerUrl.includes("://")) {
      brokerUrl = `${proto}://${url}`;
    }
    
    // Ensure correct port parsing and path
    try {
      const parsedUrl = new URL(brokerUrl);
      parsedUrl.port = port.toString();
      if (parsedUrl.pathname === "/") {
        parsedUrl.pathname = "/mqtt";
      }
      brokerUrl = parsedUrl.toString();
    } catch (e) {
      brokerUrl = `${brokerUrl}:${port}/mqtt`;
    }

    const newClient = mqtt.connect(brokerUrl, {
      username: username || undefined,
      password: password || undefined,
      ca: project.mqttConfig.caCert ? [project.mqttConfig.caCert] : undefined,
      reconnectPeriod: 5000
    });

    clientRef.current = newClient;

    newClient.on("connect", () => {
      setIsConnected(true);
      setClient(newClient);

      // Subscribe to all device topics
      devicesRef.current.forEach((d) => {
        newClient.subscribe(d.statusTopic);
        d.fields.forEach(f => {
          newClient.subscribe(f.topic);
        });
      });
    });

    newClient.on("reconnect", () => setIsConnected(false));
    newClient.on("offline", () => setIsConnected(false));
    newClient.on("error", (err) => console.error("MQTT Error: ", err));

    newClient.on("message", (topic, message) => {
      const payload = message.toString();

      setDeviceStates(prev => {
        const newState = { ...prev };
        let updated = false;

        devicesRef.current.forEach(device => {
          if (!newState[device.id]) {
            newState[device.id] = { status: "offline", lastSeen: 0, fields: {} };
          }
          const devState = newState[device.id];

          let parsedPayload: any = null;
          try {
            parsedPayload = JSON.parse(payload);
          } catch(e) {}

          let rawStatus = payload;
          if (parsedPayload && typeof parsedPayload === 'object') {
            if (parsedPayload.state) rawStatus = parsedPayload.state;
            else if (parsedPayload.status) rawStatus = parsedPayload.status;
          }

          if (topic === device.statusTopic) {
            devState.status = rawStatus as MqttDeviceState["status"];
            devState.lastSeen = Date.now();
            updated = true;
          }

          const baseOta = device.otaTopic;
          if (topic === `${baseOta}/status`) {
            if (parsedPayload && typeof parsedPayload === 'object') {
              devState.ota = {
                ...(devState.ota || { isUpdating: true, progress: 0, state: 'started' }),
                state: parsedPayload.state || 'started',
                version: parsedPayload.version || devState.ota?.version,
                reason: parsedPayload.reason || devState.ota?.reason
              };
              if (parsedPayload.state === 'success' || parsedPayload.state === 'failed') {
                devState.ota.isUpdating = false;
                // Optional: unsubscribe on completion to clean up
                // clientRef.current?.unsubscribe(`${baseOta}/status`);
                // clientRef.current?.unsubscribe(`${baseOta}/progress`);
              }
              devState.lastSeen = Date.now();
              updated = true;
            }
          }

          if (topic === `${baseOta}/progress`) {
            if (parsedPayload && typeof parsedPayload === 'object' && parsedPayload.progress !== undefined) {
              devState.ota = {
                ...(devState.ota || { isUpdating: true, progress: 0, state: 'downloading' }),
                progress: parsedPayload.progress,
                state: devState.ota?.state === 'started' ? 'downloading' : (devState.ota?.state || 'downloading')
              };
              devState.lastSeen = Date.now();
              updated = true;
            }
          }

          const isFieldTopic = device.fields.some(f => f.topic === topic);
          if (isFieldTopic) {
            if (parsedPayload && typeof parsedPayload === 'object') {
              Object.entries(parsedPayload).forEach(([key, val]) => {
                devState.fields[key] = val as string | number;
              });
            } else {
              // Fallback for non-JSON plain text:
              // Save it under the label of the first matching field
              const matchingField = device.fields.find(f => f.topic === topic);
              if (matchingField) {
                devState.fields[matchingField.label] = payload;
              }
            }
            devState.lastSeen = Date.now();
            updated = true;
          }
        });

        return updated ? newState : prev;
      });
    });

    return () => {
      newClient.end();
      clientRef.current = null;
    };
  }, [project]);

  // Handle timeouts (15 seconds offline to allow 10s publish intervals)
  useEffect(() => {
    timeoutIntervalRef.current = setInterval(() => {
      const now = Date.now();
      setDeviceStates(prev => {
        let changed = false;
        const newState = { ...prev };
        Object.keys(newState).forEach(deviceId => {
          const devState = newState[deviceId];
          // 15000ms allows devices to comfortably publish every 10 seconds without flickering offline
          if (devState.status === "online" && now - devState.lastSeen > 15000) {
            newState[deviceId] = { ...devState, status: "offline" };
            changed = true;
          }
        });
        return changed ? newState : prev;
      });
    }, 2000);

    return () => {
      if (timeoutIntervalRef.current) clearInterval(timeoutIntervalRef.current);
    };
  }, []);

  const triggerOta = useCallback((device: Device, firmwareUrl: string, version?: string) => {
    if (clientRef.current?.connected) {
      const baseOta = device.otaTopic;
      // Subscribe dynamically per device on action
      clientRef.current.subscribe(`${baseOta}/status`);
      clientRef.current.subscribe(`${baseOta}/progress`);

      setDeviceStates(prev => {
        const devState = prev[device.id] || { status: 'online', lastSeen: Date.now(), fields: {} };
        return {
          ...prev,
          [device.id]: {
            ...devState,
            ota: {
              isUpdating: true,
              progress: 0,
              state: 'started',
              version: version || 'unknown'
            }
          }
        };
      });

      clientRef.current.publish(`${baseOta}/cmd`, JSON.stringify({
        action: "ota",
        version: version || undefined,
        url: firmwareUrl
      }));
    } else {
      console.warn("MQTT client not connected");
    }
  }, []);

  return { client, isConnected, deviceStates, triggerOta };
};
