"use client";

import { useState, useCallback } from "react";
import { 
  collection, 
  query, 
  where, 
  getDocs, 
  doc, 
  setDoc, 
  deleteDoc, 
  getDoc,
  serverTimestamp
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/contexts/AuthContext";
import { Project, Device, OtaHistory } from "@/types";

export const useFirestore = () => {
  const { user } = useAuth();

  // PROJECT CRUD
  const getProjects = useCallback(async (): Promise<Project[]> => {
    if (!user) return [];
    const q = query(collection(db, "projects"), where("userId", "==", user.uid));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Project));
  }, [user]);

  const getProject = useCallback(async (id: string): Promise<Project | null> => {
    if (!user) return null;
    const projectRef = doc(db, "projects", id);
    const snapshot = await getDoc(projectRef);
    if (snapshot.exists() && snapshot.data().userId === user.uid) {
      return { id: snapshot.id, ...snapshot.data() } as Project;
    }
    return null;
  }, [user]);

  const saveProject = useCallback(async (project: Omit<Project, "id" | "userId">, existingId?: string) => {
    if (!user) throw new Error("Not authenticated");
    const id = existingId || doc(collection(db, "projects")).id;
    const projectRef = doc(db, "projects", id);
    await setDoc(projectRef, {
      ...project,
      userId: user.uid,
      updatedAt: serverTimestamp(),
    }, { merge: true });
    return id;
  }, [user]);

  const deleteProject = useCallback(async (id: string) => {
    if (!user) return;
    // Also delete devices? Not implemented here for simplicity
    await deleteDoc(doc(db, "projects", id));
  }, [user]);


  // DEVICE CRUD
  const getDevices = useCallback(async (projectId: string): Promise<Device[]> => {
    if (!user) return [];
    const q = query(collection(db, "devices"), where("projectId", "==", projectId));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Device));
  }, [user]);

  const saveDevice = useCallback(async (projectId: string, device: Omit<Device, "id" | "projectId">, existingId?: string) => {
    if (!user) throw new Error("Not authenticated");
    const id = existingId || doc(collection(db, "devices")).id;
    const deviceRef = doc(db, "devices", id);
    await setDoc(deviceRef, {
      ...device,
      projectId,
      updatedAt: serverTimestamp(),
    }, { merge: true });
    return id;
  }, [user]);

  const deleteDevice = useCallback(async (id: string) => {
    if (!user) return;
    await deleteDoc(doc(db, "devices", id));
  }, [user]);

  // OTA HISTORY
  const getOtaHistory = useCallback(async (deviceId: string): Promise<OtaHistory[]> => {
    if (!user) return [];
    const q = query(
      collection(db, "ota_history"), 
      where("deviceId", "==", deviceId),
      where("userId", "==", user.uid)
    );
    const snapshot = await getDocs(q);
    const results = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as OtaHistory));
    return results.sort((a, b) => (b.timestamp?.toMillis() || 0) - (a.timestamp?.toMillis() || 0));
  }, [user]);

  const saveOtaHistory = useCallback(async (data: Omit<OtaHistory, "id" | "userId" | "timestamp">) => {
    if (!user) return;
    const ref = doc(collection(db, "ota_history"));
    await setDoc(ref, {
      ...data,
      userId: user.uid,
      timestamp: serverTimestamp()
    });
  }, [user]);

  return {
    getProjects,
    getProject,
    saveProject,
    deleteProject,
    getDevices,
    saveDevice,
    deleteDevice,
    getOtaHistory,
    saveOtaHistory
  };
};
