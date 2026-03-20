import { useState } from "react";
import { Device, DeviceField } from "@/types";
import { Plus, X, Trash2 } from "lucide-react";

interface DeviceFormProps {
  device?: Device;
  onSave: (d: Omit<Device, "id" | "projectId">) => Promise<void>;
  onClose: () => void;
}

export default function DeviceForm({ device, onSave, onClose }: DeviceFormProps) {
  const [deviceId, setDeviceId] = useState(device?.deviceId || "");
  const [statusTopic, setStatusTopic] = useState(device?.statusTopic || "");
  const [otaTopic, setOtaTopic] = useState(device?.otaTopic || "");
  const [fields, setFields] = useState<DeviceField[]>(device?.fields || []);
  const [loading, setLoading] = useState(false);

  const handleAddField = () => {
    setFields([...fields, { label: "", topic: "", unit: "" }]);
  };

  const handleRemoveField = (index: number) => {
    setFields(fields.filter((_, i) => i !== index));
  };

  const handleChangeField = (index: number, key: keyof DeviceField, value: string) => {
    const newFields = [...fields];
    newFields[index] = { ...newFields[index], [key]: value };
    setFields(newFields);
  };

  const autoFillTopics = () => {
    if (deviceId && !statusTopic && !otaTopic) {
      setStatusTopic(`devices/${deviceId}/status`);
      setOtaTopic(`devices/${deviceId}/ota`);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await onSave({
        deviceId,
        statusTopic,
        otaTopic,
        fields
      });
      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl max-w-2xl w-full shadow-2xl overflow-hidden border border-gray-100 dark:border-gray-700 max-h-[90vh] flex flex-col">
        <div className="flex justify-between items-center p-4 border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            {device ? "Edit Device" : "New Device"}
          </h3>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300">
            <X size={20} />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto flex-1 space-y-6">
          <div className="space-y-4">
            <h4 className="font-medium text-gray-900 dark:text-gray-100 border-b border-gray-200 dark:border-gray-700 pb-2">Basic Info</h4>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Device ID</label>
              <input 
                required
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                value={deviceId} onChange={e => setDeviceId(e.target.value)}
                onBlur={autoFillTopics}
                placeholder="e.g. esp32_livingroom"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Status Topic</label>
                <input 
                  required
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  value={statusTopic} onChange={e => setStatusTopic(e.target.value)}
                  placeholder="devices/esp32/status"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">OTA Topic</label>
                <input 
                  required
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  value={otaTopic} onChange={e => setOtaTopic(e.target.value)}
                  placeholder="devices/esp32/ota"
                />
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex justify-between items-center border-b border-gray-200 dark:border-gray-700 pb-2">
              <h4 className="font-medium text-gray-900 dark:text-gray-100">Sensor Fields</h4>
              <button
                type="button"
                onClick={handleAddField}
                className="text-sm flex items-center gap-1 text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
              >
                <Plus size={16} /> Add Field
              </button>
            </div>
            
            {fields.length === 0 ? (
              <p className="text-sm text-gray-500 dark:text-gray-400 italic">No fields added. This device will only report status.</p>
            ) : (
              <div className="space-y-3">
                {fields.map((field, idx) => (
                  <div key={idx} className="flex gap-2 items-start bg-gray-50 dark:bg-gray-900/50 p-3 rounded-lg border border-gray-100 dark:border-gray-700">
                    <div className="flex-1 space-y-3">
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <input 
                            required
                            className="w-full px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                            placeholder="Label (e.g. Temperature)"
                            value={field.label} onChange={e => handleChangeField(idx, "label", e.target.value)}
                          />
                        </div>
                        <div>
                          <input 
                            className="w-full px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                            placeholder="Unit (e.g. °C)"
                            value={field.unit || ""} onChange={e => handleChangeField(idx, "unit", e.target.value)}
                          />
                        </div>
                      </div>
                      <input 
                        required
                        className="w-full px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                        placeholder={`Topic (e.g. devices/${deviceId || "esp32"}/temp)`}
                        value={field.topic} onChange={e => handleChangeField(idx, "topic", e.target.value)}
                      />
                    </div>
                    <button 
                      type="button"
                      onClick={() => handleRemoveField(idx)}
                      className="p-2 text-gray-400 hover:text-red-600 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-md mt-1"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </form>

        <div className="p-4 bg-gray-50 dark:bg-gray-800/80 border-t border-gray-100 dark:border-gray-700 flex justify-end gap-3 rounded-b-xl">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none"
          >
            Cancel
          </button>
          <button
            type="submit"
            onClick={handleSubmit}
            disabled={loading}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
          >
            {loading ? "Saving..." : "Save Device"}
          </button>
        </div>
      </div>
    </div>
  );
}
