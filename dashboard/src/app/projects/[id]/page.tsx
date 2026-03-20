"use client";

import { use, useEffect, useState } from "react";
import ProtectedRoute from "@/components/ProtectedRoute";
import Navbar from "@/components/Navbar";
import DeviceCard from "@/components/DeviceCard";
import DeviceForm from "@/components/DeviceForm";
import OtaModal from "@/components/OtaModal";
import UploadFirmwareModal from "@/components/UploadFirmwareModal";
import { useFirestore } from "@/hooks/useFirestore";
import { useMqtt } from "@/hooks/useMqtt";
import { Project, Device } from "@/types";
import { ArrowLeft, Plus, Server, CheckCircle2, XCircle } from "lucide-react";
import Link from "next/link";
import toast from "react-hot-toast";
import { useRouter } from "next/navigation";

export default function ProjectDetail({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const router = useRouter();
  const { getProject, getDevices, saveDevice, deleteDevice } = useFirestore();
  
  const [project, setProject] = useState<Project | null>(null);
  const [devices, setDevices] = useState<Device[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingDevice, setEditingDevice] = useState<Device | undefined>();
  const [otaDevice, setOtaDevice] = useState<Device | undefined>();
  const [uploadDevice, setUploadDevice] = useState<Device | undefined>();

  const { isConnected, deviceStates, triggerOta } = useMqtt(project, devices);

  const loadData = async () => {
    setLoading(true);
    try {
      const p = await getProject(resolvedParams.id);
      if (!p) {
        toast.error("Project not found");
        router.push("/");
        return;
      }
      setProject(p);
      const devs = await getDevices(resolvedParams.id);
      setDevices(devs);
    } catch (err) {
      toast.error("Failed to load project details");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [getProject, getDevices, resolvedParams.id]);

  const handleSaveDevice = async (deviceData: Omit<Device, "id" | "projectId">) => {
    try {
      await saveDevice(resolvedParams.id, deviceData, editingDevice?.id);
      toast.success(`Device ${editingDevice ? "updated" : "added"}`);
      loadData(); // Reload to subscribe via useMqtt
    } catch (err) {
      toast.error("Failed to save device");
    }
  };

  const handleDeleteDevice = async (id: string) => {
    if (confirm("Are you sure you want to delete this device?")) {
      try {
        await deleteDevice(id);
        toast.success("Device deleted");
        loadData();
      } catch (err) {
        toast.error("Failed to delete device");
      }
    }
  };

  const { saveOtaHistory } = useFirestore();

  const handleOta = async (url: string, version: string) => {
    if (!otaDevice) return;
    
    try {
      triggerOta(otaDevice, url, version);
      await saveOtaHistory({
        deviceId: otaDevice.id,
        projectId: resolvedParams.id,
        url,
        version
      });
      toast.success("OTA command sent and saved!");
      setOtaDevice(undefined);
    } catch (err) {
      toast.error("Failed to save OTA history");
    }
  };

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col">
        <Navbar />
        
        {loading ? (
          <div className="flex-1 flex justify-center items-center">
            <div className="animate-pulse text-gray-500">Loading project...</div>
          </div>
        ) : !project ? null : (
          <>
            {/* Top Bar */}
            <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <Link href="/" className="p-2 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition">
                      <ArrowLeft size={20} />
                    </Link>
                    <div>
                      <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                        {project.name}
                      </h2>
                      <div className="flex items-center gap-3 mt-1 text-sm text-gray-500 dark:text-gray-400">
                        <span className="flex items-center gap-1.5 bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded-md">
                          <Server size={14} />
                          {project.mqttConfig.url}:{project.mqttConfig.port}
                        </span>
                        <span className="flex items-center gap-1">
                          {isConnected ? <CheckCircle2 size={16} className="text-green-500" /> : <XCircle size={16} className="text-red-500" />}
                          <span className={isConnected ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}>
                            {isConnected ? "MQTT Connected" : "MQTT Disconnected"}
                          </span>
                        </span>
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => { setEditingDevice(undefined); setShowForm(true); }}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition shadow-sm"
                  >
                    <Plus size={20} />
                    <span className="hidden sm:inline">Add Device</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Devices Grid */}
            <main className="flex-1 max-w-7xl w-full mx-auto py-8 px-4 sm:px-6 lg:px-8">
              {devices.length === 0 ? (
                <div className="bg-white dark:bg-gray-800 rounded-xl p-12 text-center border border-gray-200 dark:border-gray-700 shadow-sm mt-8 max-w-lg mx-auto">
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No devices mapped</h3>
                  <p className="text-gray-500 dark:text-gray-400 mb-6">Start by adding a new ESP device to this project.</p>
                  <button
                    onClick={() => { setEditingDevice(undefined); setShowForm(true); }}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
                  >
                    <Plus size={20} /> Add Device
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                  {devices.map(d => (
                    <DeviceCard 
                      key={d.id} 
                      device={d} 
                      state={deviceStates[d.id]}
                      isConnected={isConnected}
                      onEdit={() => { setEditingDevice(d); setShowForm(true); }}
                      onDelete={() => handleDeleteDevice(d.id)}
                      onUploadFirmware={() => setUploadDevice(d)}
                      onOta={() => setOtaDevice(d)}
                    />
                  ))}
                </div>
              )}
            </main>

            {showForm && (
              <DeviceForm
                device={editingDevice}
                onSave={handleSaveDevice}
                onClose={() => setShowForm(false)}
              />
            )}

            {otaDevice && (
              <OtaModal
                device={otaDevice}
                onSave={handleOta}
                onClose={() => setOtaDevice(undefined)}
              />
            )}

            {uploadDevice && (
              <UploadFirmwareModal
                device={uploadDevice}
                onClose={() => setUploadDevice(undefined)}
                onSuccess={() => {
                  setUploadDevice(undefined);
                  // Optionally automatically open OTA modal after upload
                  setOtaDevice(uploadDevice);
                }}
              />
            )}
          </>
        )}
      </div>
    </ProtectedRoute>
  );
}
