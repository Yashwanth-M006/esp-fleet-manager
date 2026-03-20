"use client";

import ProtectedRoute from "@/components/ProtectedRoute";
import Navbar from "@/components/Navbar";
import ProjectForm from "@/components/ProjectForm";
import { useEffect, useState } from "react";
import { useFirestore } from "@/hooks/useFirestore";
import { Project } from "@/types";
import { Cpu, Plus, Settings, Trash2, ArrowRight } from "lucide-react";
import Link from "next/link";
import toast from "react-hot-toast";

export default function Dashboard() {
  const { getProjects, saveProject, deleteProject } = useFirestore();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | undefined>();

  const loadProjects = async () => {
    setLoading(true);
    try {
      const data = await getProjects();
      setProjects(data);
    } catch (err) {
      toast.error("Failed to load projects");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProjects();
  }, [getProjects]);

  const handleSave = async (projectData: Omit<Project, "id" | "userId">) => {
    try {
      await saveProject(projectData, editingProject?.id);
      toast.success(`Project ${editingProject ? "updated" : "created"}`);
      loadProjects();
    } catch (err) {
      toast.error("Failed to save project");
    }
  };

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.preventDefault(); // Prevent navigating to project
    if (confirm("Are you sure you want to delete this project?")) {
      try {
        await deleteProject(id);
        toast.success("Project deleted");
        loadProjects();
      } catch (err) {
        toast.error("Failed to delete project");
      }
    }
  };

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <Navbar />
        
        <main className="max-w-7xl mx-auto py-8 text-black dark:text-white px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center mb-8">
            <div>
              <h2 className="text-3xl font-bold text-gray-900 dark:text-white">Your Projects</h2>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Manage your ESP fleet deployments</p>
            </div>
            <button
              onClick={() => { setEditingProject(undefined); setShowForm(true); }}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition shadow-sm"
            >
              <Plus size={20} />
              <span className="hidden sm:inline">New Project</span>
            </button>
          </div>

          {loading ? (
            <div className="flex justify-center py-12"><div className="animate-pulse flex items-center gap-2"><Cpu size={24} className="text-blue-500"/> <span>Loading projects...</span></div></div>
          ) : projects.length === 0 ? (
            <div className="bg-white dark:bg-gray-800 rounded-xl p-12 text-center border border-gray-200 dark:border-gray-700 shadow-sm">
              <div className="mx-auto w-16 h-16 bg-blue-50 dark:bg-gray-700 rounded-full flex items-center justify-center mb-4">
                <Cpu size={32} className="text-blue-500" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No projects yet</h3>
              <p className="text-gray-500 dark:text-gray-400 mb-6 max-w-sm mx-auto">Create a project to start managing your ESP devices with real-time MQTT data.</p>
              <button
                onClick={() => { setEditingProject(undefined); setShowForm(true); }}
                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition shadow-sm"
              >
                <Plus size={20} /> Get Started
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {projects.map(p => (
                <Link href={`/projects/${p.id}`} key={p.id}>
                  <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-md transition group overflow-hidden flex flex-col h-full">
                    <div className="p-6 flex-1">
                      <div className="flex justify-between items-start mb-4">
                        <div className="p-3 bg-blue-50 dark:bg-gray-700 rounded-lg text-blue-600 dark:text-blue-400">
                          <Cpu size={24} />
                        </div>
                        <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button 
                            className="p-1.5 text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
                            onClick={(e) => { e.preventDefault(); setEditingProject(p); setShowForm(true); }}
                          >
                            <Settings size={18} />
                          </button>
                          <button 
                            className="p-1.5 text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
                            onClick={(e) => handleDelete(e, p.id)}
                          >
                            <Trash2 size={18} />
                          </button>
                        </div>
                      </div>
                      <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">{p.name}</h3>
                      <div className="text-sm text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-900/50 p-3 rounded-lg border border-gray-100 dark:border-gray-700/50 space-y-1">
                        <div className="flex justify-between">
                          <span className="font-medium text-gray-600 dark:text-gray-300">Broker:</span>
                          <span className="truncate ml-2">{p.mqttConfig.url}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="font-medium text-gray-600 dark:text-gray-300">Port:</span>
                          <span>{p.mqttConfig.port}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="font-medium text-gray-600 dark:text-gray-300">TLS:</span>
                          <span>{p.mqttConfig.tls ? "Yes (wss)" : "No (ws)"}</span>
                        </div>
                      </div>
                    </div>
                    <div className="bg-gray-50 dark:bg-gray-800/80 px-6 py-3 border-t border-gray-100 dark:border-gray-700 flex justify-between items-center">
                      <span className="text-sm font-medium text-blue-600 dark:text-blue-400">View Devices</span>
                      <ArrowRight size={18} className="text-blue-600 dark:text-blue-400" />
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </main>

        {showForm && (
          <ProjectForm
            project={editingProject}
            onSave={handleSave}
            onClose={() => setShowForm(false)}
          />
        )}
      </div>
    </ProtectedRoute>
  );
}
