"use client";

import { useEffect, useCallback } from "react";
import { useDeviceStore, useSettingsStore } from "@/stores";
import { DeviceInfo } from "@/types";

export function useDevices() {
  const {
    audioInputId,
    audioOutputId,
    microphones,
    speakers,
    permissionStatus,
    setAudioInputId,
    setAudioOutputId,
    setMicrophones,
    setSpeakers,
    setPermissionStatus,
  } = useDeviceStore();

  const { noiseSuppression, echoCancellation, autoGainControl } = useSettingsStore();

  // Enumerate connected devices
  const updateDeviceList = useCallback(async () => {
    if (typeof navigator === "undefined" || !navigator.mediaDevices?.enumerateDevices) {
      return;
    }

    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const mics: DeviceInfo[] = [];
      const spks: DeviceInfo[] = [];

      devices.forEach((device) => {
        const info: DeviceInfo = {
          deviceId: device.deviceId,
          label: device.label || `${device.kind} (${device.deviceId.slice(0, 5)})`,
          kind: device.kind,
          groupId: device.groupId,
        };

        if (device.kind === "audioinput") {
          mics.push(info);
        } else if (device.kind === "audiooutput") {
          spks.push(info);
        }
      });

      if (mics.length > 0) setMicrophones(mics);
      if (spks.length > 0) setSpeakers(spks);
    } catch {
      // enumeration failed
    }
  }, [setMicrophones, setSpeakers]);

  // Request audio permission and get a stream
  const requestMediaStream = useCallback(
    async (preferredDeviceId?: string): Promise<MediaStream | null> => {
      if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
        return null;
      }

      const deviceIdToUse = preferredDeviceId || audioInputId;
      const constraints: MediaStreamConstraints = {
        audio: {
          deviceId: deviceIdToUse && deviceIdToUse !== "default" ? { exact: deviceIdToUse } : undefined,
          noiseSuppression,
          echoCancellation,
          autoGainControl,
        },
        video: false,
      };

      try {
        const stream = await navigator.mediaDevices.getUserMedia(constraints);
        setPermissionStatus("granted");
        await updateDeviceList();
        return stream;
      } catch (err: any) {
        if (err.name === "NotAllowedError" || err.name === "PermissionDeniedError") {
          setPermissionStatus("denied");
        }
        return null;
      }
    },
    [audioInputId, noiseSuppression, echoCancellation, autoGainControl, setPermissionStatus, updateDeviceList]
  );

  useEffect(() => {
    updateDeviceList();

    if (typeof navigator !== "undefined" && navigator.mediaDevices) {
      navigator.mediaDevices.addEventListener?.("devicechange", updateDeviceList);
      return () => {
        navigator.mediaDevices.removeEventListener?.("devicechange", updateDeviceList);
      };
    }
  }, [updateDeviceList]);

  return {
    audioInputId,
    audioOutputId,
    microphones,
    speakers,
    permissionStatus,
    setAudioInputId,
    setAudioOutputId,
    requestMediaStream,
    refreshDevices: updateDeviceList,
  };
}
