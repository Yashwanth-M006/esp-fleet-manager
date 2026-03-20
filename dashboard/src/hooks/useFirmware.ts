"use client";

import { useState, useCallback } from "react";
import { collection, query, where, getDocs, doc, setDoc, deleteDoc, serverTimestamp } from "firebase/firestore";
import { ref, uploadBytesResumable, getDownloadURL, deleteObject } from "firebase/storage";
import { db, storage } from "@/lib/firebase";
import { useAuth } from "@/contexts/AuthContext";
import { Firmware } from "@/types";

export const useFirmware = () => {
  const { user } = useAuth();
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const getFirmwares = useCallback(async (deviceId: string): Promise<Firmware[]> => {
    if (!user) return [];
    const q = query(
      collection(db, "firmwares"), 
      where("deviceId", "==", deviceId),
      where("userId", "==", user.uid)
    );
    const snapshot = await getDocs(q);
    const results = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Firmware));
    return results.sort((a, b) => (b.uploadedAt?.toMillis() || 0) - (a.uploadedAt?.toMillis() || 0));
  }, [user]);

  const uploadFirmware = useCallback(async (
    projectId: string, 
    deviceId: string, 
    version: string, 
    description: string, 
    file: File
  ): Promise<Firmware | null> => {
    if (!user) throw new Error("Not authenticated");
    
    // Check duplicates
    const existing = await getFirmwares(deviceId);
    const isDuplicate = existing.some(f => f.version === version && f.description === description);
    if (isDuplicate) {
      throw new Error(`Firmware version ${version} with description "${description}" already exists.`);
    }

    return new Promise((resolve, reject) => {
      setUploading(true);
      setUploadProgress(0);

      // firmware/{project_id}/{device_id}/{version}/{description}.bin
      const filePath = `firmware/${projectId}/${deviceId}/${version}/${description}.bin`;
      const storageRef = ref(storage, filePath);
      
      const uploadTask = uploadBytesResumable(storageRef, file, { contentType: "application/macbinary" });

      uploadTask.on(
        "state_changed",
        (snapshot) => {
          const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
          setUploadProgress(Math.round(progress));
        },
        (error) => {
          setUploading(false);
          reject(error);
        },
        async () => {
          try {
            const downloadUrl = await getDownloadURL(uploadTask.snapshot.ref);
            
            // Save metadata
            const firmwareId = doc(collection(db, "firmwares")).id;
            const newFirmware: Omit<Firmware, "id"> = {
              projectId,
              deviceId,
              userId: user.uid,
              version,
              description,
              fileName: file.name,
              fileUrl: downloadUrl,
              uploadedAt: serverTimestamp()
            };
            
            await setDoc(doc(db, "firmwares", firmwareId), newFirmware);
            
            setUploading(false);
            resolve({ id: firmwareId, ...newFirmware } as Firmware);
          } catch(err) {
            setUploading(false);
            reject(err);
          }
        }
      );
    });
  }, [user, getFirmwares]);

  const deleteFirmware = useCallback(async (firmware: Firmware) => {
    if (!user) return;
    try {
      // Delete from storage
      const filePath = `firmware/${firmware.projectId}/${firmware.deviceId}/${firmware.version}/${firmware.description}.bin`;
      const storageRef = ref(storage, filePath);
      await deleteObject(storageRef);
    } catch (e) {
      console.warn("Storage object might already be deleted", e);
    }
    // Delete from db
    await deleteDoc(doc(db, "firmwares", firmware.id));
  }, [user]);

  return { getFirmwares, uploadFirmware, deleteFirmware, uploading, uploadProgress };
};
