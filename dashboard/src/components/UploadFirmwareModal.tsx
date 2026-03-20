import { useState } from "react";
import { Device } from "@/types";
import { useFirmware } from "@/hooks/useFirmware";
import { X, UploadCloud } from "lucide-react";
import toast from "react-hot-toast";

interface UploadFirmwareModalProps {
  device: Device;
  onClose: () => void;
  onSuccess: () => void;
}

export default function UploadFirmwareModal({ device, onClose, onSuccess }: UploadFirmwareModalProps) {
  const { uploadFirmware, uploading, uploadProgress } = useFirmware();
  const [version, setVersion] = useState("");
  const [description, setDescription] = useState("");
  const [file, setFile] = useState<File | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file || !version || !description) return;
    if (description.length > 8) {
      toast.error("Description must be max 8 characters");
      return;
    }
    if (!file.name.endsWith('.bin')) {
      toast.error("Only .bin firmware files are allowed");
      return;
    }

    try {
      await uploadFirmware(device.projectId, device.id, version, description, file);
      toast.success("Firmware uploaded successfully!");
      onSuccess();
    } catch (error: any) {
      toast.error(error.message || "Failed to upload firmware");
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl max-w-md w-full shadow-2xl overflow-hidden border border-gray-100 dark:border-gray-700">
        <div className="flex justify-between items-center p-4 border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            <UploadCloud size={20} /> Upload Firmware
          </h3>
          <button onClick={onClose} disabled={uploading} className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 disabled:opacity-50">
            <X size={20} />
          </button>
        </div>
        
        <div className="p-6">
          <form id="upload-form" onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Version <span className="text-red-500">*</span></label>
              <input 
                required
                disabled={uploading}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white disabled:opacity-50"
                value={version} onChange={e => setVersion(e.target.value)}
                placeholder="e.g. 1.1.0"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Description <span className="text-red-500">*</span></label>
              <input 
                required
                disabled={uploading}
                maxLength={8}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white disabled:opacity-50"
                value={description} onChange={e => setDescription(e.target.value)}
                placeholder="e.g. stable"
              />
              <p className="text-xs text-gray-500 mt-1">Max 8 characters</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Firmware File (.bin) <span className="text-red-500">*</span></label>
              <input 
                required
                type="file"
                accept=".bin"
                disabled={uploading}
                className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 disabled:opacity-50"
                onChange={e => setFile(e.target.files?.[0] || null)}
              />
            </div>
            
            {uploading && (
              <div className="mt-4">
                <div className="flex justify-between text-xs text-blue-600 dark:text-blue-400 font-semibold mb-1">
                  <span>Uploading...</span>
                  <span>{Math.round(uploadProgress)}%</span>
                </div>
                <div className="w-full bg-blue-100 dark:bg-blue-900/40 rounded-full h-2 overflow-hidden">
                  <div className="bg-blue-600 h-2 rounded-full transition-all duration-300" style={{ width: `${uploadProgress}%` }}></div>
                </div>
              </div>
            )}
          </form>
        </div>

        <div className="p-4 bg-gray-50 dark:bg-gray-800/80 border-t border-gray-100 dark:border-gray-700 flex justify-end gap-3">
          <button type="button" onClick={onClose} disabled={uploading} className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-100 transition disabled:opacity-50">Cancel</button>
          <button type="submit" form="upload-form" disabled={uploading || !file} className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition disabled:opacity-50 flex items-center gap-2">
            <UploadCloud size={16} /> Upload
          </button>
        </div>
      </div>
    </div>
  );
}
