import { useState, useEffect } from "react";
import { Device, OtaHistory, Firmware } from "@/types";
import { useFirestore } from "@/hooks/useFirestore";
import { useFirmware } from "@/hooks/useFirmware";
import { X, History, ArrowRight } from "lucide-react";
import { formatDistanceToNow, format } from "date-fns";

interface OtaModalProps {
  device: Device;
  onSave: (url: string, version: string) => Promise<void>;
  onClose: () => void;
}

export default function OtaModal({ device, onSave, onClose }: OtaModalProps) {
  const { getOtaHistory } = useFirestore();
  const { getFirmwares } = useFirmware();
  
  const [url, setUrl] = useState("");
  const [version, setVersion] = useState("");
  const [activeTab, setActiveTab] = useState<"select" | "history">("select");
  
  const [firmwares, setFirmwares] = useState<Firmware[]>([]);
  const [history, setHistory] = useState<OtaHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    Promise.all([
      getOtaHistory(device.id),
      getFirmwares(device.id)
    ]).then(([histRes, fwRes]) => {
      setHistory(histRes);
      setFirmwares(fwRes);
      
      // Auto-select most recently uploaded firmware if available
      if (fwRes.length > 0) {
        setUrl(fwRes[0].fileUrl);
        setVersion(fwRes[0].version);
      }
      setLoading(false);
    });
  }, [device.id, getOtaHistory, getFirmwares]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url) return;
    setIsSubmitting(true);
    await onSave(url, version);
    setIsSubmitting(false);
  };

  const handleSelectFirmware = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const fwUrl = e.target.value;
    const fw = firmwares.find(f => f.fileUrl === fwUrl);
    if (fw) {
      setUrl(fw.fileUrl);
      setVersion(fw.version);
    }
  };

  const handleSelectHistory = (histUrl: string, histVersion: string) => {
    setUrl(histUrl);
    setVersion(histVersion || "");
    setActiveTab("select"); // Switch back to 'select' to submit
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl max-w-lg w-full shadow-2xl overflow-hidden border border-gray-100 dark:border-gray-700 flex flex-col max-h-[90vh]">
        <div className="flex justify-between items-center p-4 border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            OTA Update: {device.deviceId}
          </h3>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300">
            <X size={20} />
          </button>
        </div>
        
        <div className="flex-1 overflow-y-auto p-6">
          <div className="flex border-b border-gray-200 dark:border-gray-700 mb-6">
            <button
              onClick={() => setActiveTab("select")}
              className={`pb-2 px-1 text-sm font-medium mr-6 transition-colors border-b-2 ${activeTab === 'select' ? 'border-blue-500 text-blue-600 dark:text-blue-400' : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'}`}
            >
              Select Firmware
            </button>
            <button
              onClick={() => setActiveTab("history")}
              className={`pb-2 px-1 text-sm font-medium transition-colors border-b-2 ${activeTab === 'history' ? 'border-blue-500 text-blue-600 dark:text-blue-400' : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'}`}
            >
              Previous Triggers
            </button>
          </div>

          {activeTab === "select" && (
            <form id="ota-form" onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Target Firmware <span className="text-red-500">*</span></label>
                
                {loading ? (
                  <p className="text-sm text-gray-500 animate-pulse">Loading firmwares...</p>
                ) : firmwares.length === 0 ? (
                  <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800/50 text-sm text-yellow-800 dark:text-yellow-200">
                    No firmwares uploaded for this device yet. Please close this window and click the purple Upload button on the device card to upload a `.bin` firmware file.
                  </div>
                ) : (
                  <select 
                    required
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    value={url}
                    onChange={handleSelectFirmware}
                  >
                    <option value="" disabled>Select a firmware version...</option>
                    {firmwares.map(fw => (
                      <option key={fw.id} value={fw.fileUrl}>
                        {fw.version} - {fw.description} (Uploaded: {format(fw.uploadedAt?.toMillis() || Date.now(), 'MMM d, yyyy')})
                      </option>
                    ))}
                  </select>
                )}
              </div>
              
              {/* Show selected details silently to user to verify */}
              {url && !loading && (
                <div className="p-3 bg-gray-50 dark:bg-gray-800/60 rounded-lg border border-gray-100 dark:border-gray-700">
                  <p className="text-xs text-gray-500 dark:text-gray-400 flex flex-col gap-1">
                    <span><strong className="text-gray-700 dark:text-gray-300">Version:</strong> {version || 'Unknown'}</span>
                    <span className="truncate"><strong className="text-gray-700 dark:text-gray-300">File Url:</strong> {url}</span>
                  </p>
                </div>
              )}
            </form>
          )}

          {activeTab === "history" && (
            <div>
              {loading ? (
                <p className="text-sm text-gray-500 animate-pulse">Loading history...</p>
              ) : history.length === 0 ? (
                <p className="text-sm text-gray-500 dark:text-gray-400 italic">No previous OTA commands sent to this device.</p>
              ) : (
                <div className="space-y-3">
                  {history.map(item => (
                    <div key={item.id} className="bg-gray-50 dark:bg-gray-700/50 p-3 rounded-lg border border-gray-100 dark:border-gray-600 flex justify-between items-center group">
                      <div className="overflow-hidden pr-4">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-sm font-semibold text-gray-900 dark:text-white">{item.version || "Unknown Ver."}</span>
                          <span className="text-xs text-gray-500 dark:text-gray-400">
                            {item.timestamp ? formatDistanceToNow(item.timestamp.toMillis(), { addSuffix: true }) : "Just now"}
                          </span>
                        </div>
                        <p className="text-xs text-gray-500 dark:text-gray-400 truncate" title={item.url}>{item.url}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleSelectHistory(item.url, item.version || "")}
                        className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-gray-600 rounded-lg transition shrink-0 opacity-0 group-hover:opacity-100"
                        title="Reuse this firmware URL"
                      >
                        <ArrowRight size={18} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="p-4 bg-gray-50 dark:bg-gray-800/80 border-t border-gray-100 dark:border-gray-700 flex justify-end gap-3">
          <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-100 transition">Cancel</button>
          <button type="submit" form="ota-form" disabled={isSubmitting || !url || activeTab === 'history'} className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition disabled:opacity-50">
            {isSubmitting ? "Triggering..." : "Trigger Selected"}
          </button>
        </div>
      </div>
    </div>
  );
}
