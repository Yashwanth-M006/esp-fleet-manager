import { Device } from "@/types";
import { MqttDeviceState, OtaState } from "@/hooks/useMqtt";
import { Settings, Trash2, Download, UploadCloud, Wifi, WifiOff, AlertTriangle, RefreshCw } from "lucide-react";

interface DeviceCardProps {
  device: Device;
  state?: MqttDeviceState;
  isConnected: boolean;
  onEdit: () => void;
  onDelete: () => void;
  onOta: () => void;
  onUploadFirmware: () => void;
}

const formatLabel = (key: string) => {
  if (key.toLowerCase() === 'uptime_sec') return 'Uptime';
  const words = key.replace(/_/g, ' ').split(' ');
  return words.map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
};

const getUnit = (key: string, device: Device) => {
  const configuredField = device.fields.find(f => 
    f.label.toLowerCase() === key.toLowerCase() || 
    f.label.toLowerCase().replace(/\s+/g, "_") === key.toLowerCase()
  );
  if (configuredField && configuredField.unit) return ` ${configuredField.unit}`;
  
  const k = key.toLowerCase();
  if (k.includes('temp')) return ' °C';
  if (k.includes('hum')) return ' %';
  if (k.includes('sec')) return ' sec';
  return '';
};

const renderOtaProgress = (ota: OtaState | undefined) => {
  if (!ota || (!ota.isUpdating && ota.state !== 'success' && ota.state !== 'failed')) return null;
  
  let statusText = "Updating...";
  let colorClass = "text-blue-600 dark:text-blue-400";
  let barColor = "bg-blue-500";
  
  switch(ota.state) {
    case 'started': statusText = "Starting update..."; break;
    case 'downloading': statusText = "Downloading firmware..."; break;
    case 'flashing': statusText = "Flashing firmware..."; break;
    case 'success': 
      statusText = "Update successful"; 
      colorClass = "text-green-600 dark:text-green-400";
      barColor = "bg-green-500";
      break;
    case 'failed': 
      statusText = `Update failed${ota.reason ? `: ${ota.reason}` : ''}`; 
      colorClass = "text-red-600 dark:text-red-400";
      barColor = "bg-red-500";
      break;
    default:
      statusText = "Updating...";
  }

  const versionText = ota.version && ota.version !== 'unknown' 
    ? `Updating to v${ota.version.replace(/^v/, '')}` 
    : "Firmware Update";

  return (
    <div className="mt-4 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-xl border border-gray-100 dark:border-gray-600">
      <div className="flex justify-between items-center mb-2">
        <span className={`text-sm font-semibold ${colorClass}`}>
          {versionText}
        </span>
        <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
          {ota.progress}%
        </span>
      </div>
      
      <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-2.5 mb-2 overflow-hidden">
        <div className={`h-2.5 rounded-full transition-all duration-300 ${barColor}`} style={{ width: `${Math.max(0, Math.min(100, ota.progress))}%` }}></div>
      </div>
      
      <p className={`text-xs font-semibold ${colorClass}`}>{statusText}</p>
    </div>
  );
};

export default function DeviceCard({ device, state, isConnected, onEdit, onDelete, onOta, onUploadFirmware }: DeviceCardProps) {
  const isOnline = isConnected && state?.status === "online";
  const hasError = state?.status === "error";
  const isUpdating = state?.status === "updating" || state?.status === "downloading" || state?.status === "flashing" || state?.ota?.isUpdating;
  
  const statusColor = !isConnected 
    ? "bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-500"
    : isOnline 
      ? "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400" 
      : isUpdating 
        ? "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400 animate-pulse"
        : hasError 
          ? "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400"
          : "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400";

  const StatusIcon = !isConnected ? WifiOff : isOnline ? Wifi : isUpdating ? RefreshCw : hasError ? AlertTriangle : WifiOff;

  const fieldsEntries = Object.entries(state?.fields || {}).filter(([key]) => key && key.trim() !== "");

  return (
    <div className="bg-white dark:bg-gray-800 p-4 rounded-2xl shadow-md border border-gray-100 dark:border-gray-700 flex flex-col justify-between h-full">
      <div className="space-y-4 flex-1">
        <div className="flex justify-between items-start mb-2">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg flex items-center justify-center ${statusColor}`}>
              <StatusIcon size={20} className={isUpdating ? "animate-spin" : ""} />
            </div>
            <div>
              <h3 className="font-bold text-xl text-gray-900 dark:text-white truncate" title={device.deviceId}>
                {device.deviceId}
              </h3>
              {!isConnected && <span className="text-xs text-red-500 font-medium">Disconnected</span>}
            </div>
          </div>
          <div className="flex gap-2 text-gray-400">
            <button onClick={onEdit} className="hover:text-blue-500 transition" title="Edit"><Settings size={18} /></button>
            <button onClick={onUploadFirmware} className="hover:text-purple-500 transition" title="Upload Firmware"><UploadCloud size={18} /></button>
            <button onClick={onOta} className="hover:text-green-500 transition" title="OTA Update"><Download size={18} /></button>
            <button onClick={onDelete} className="hover:text-red-500 transition" title="Delete"><Trash2 size={18} /></button>
          </div>
        </div>

        {fieldsEntries.length === 0 ? (
          <p className="text-gray-500 dark:text-gray-400 text-sm">No telemetry data yet.</p>
        ) : (
          <div className="flex flex-col space-y-1">
            {fieldsEntries.map(([key, val], idx) => {
              const displayVal = typeof val === 'object' ? JSON.stringify(val) : val;
              return (
                <div key={idx} className="text-gray-800 dark:text-gray-200 text-base">
                  <span className="font-medium text-gray-600 dark:text-gray-400">{formatLabel(key)}:</span> {displayVal}{getUnit(key, device)}
                </div>
              );
            })}
          </div>
        )}
        
        {renderOtaProgress(state?.ota)}
      </div>
    </div>
  );
}
