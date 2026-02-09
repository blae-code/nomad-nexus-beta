import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  createMobileArAnchor,
  listMobileArAnchors,
  listMobileLocationBeacons,
  projectArMarkers,
  publishMobileLocationBeacon,
  registerMobileDeviceToken,
  subscribeMobileCompanion,
} from '../../services/mobileCompanionService';

type InstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice?: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
};

function toVapidUint8Array(vapidKey: string): Uint8Array {
  const base64 = vapidKey.replace(/-/g, '+').replace(/_/g, '/');
  const padding = '='.repeat((4 - (base64.length % 4)) % 4);
  const normalized = base64 + padding;
  const raw = atob(normalized);
  return Uint8Array.from(raw, (char) => char.charCodeAt(0));
}

function inferHeadingFromPosition(position: GeolocationPosition): number | undefined {
  const heading = Number(position?.coords?.heading);
  if (!Number.isFinite(heading) || heading < 0) return undefined;
  return heading;
}

export interface MobileCompanionRuntimeState {
  online: boolean;
  serviceWorkerState: 'idle' | 'ready' | 'error' | 'unsupported';
  serviceWorkerError?: string;
  pushPermission: NotificationPermission | 'unsupported';
  pushEnabled: boolean;
  installAvailable: boolean;
  installResult?: string;
  locationTracking: boolean;
  locationError?: string;
  currentPosition: { latitude: number; longitude: number; accuracyMeters: number } | null;
  headingDeg?: number;
  beaconCount: number;
  anchorCount: number;
  arMarkers: ReturnType<typeof projectArMarkers>;
  requestInstall: () => Promise<void>;
  enablePush: () => Promise<void>;
  startLocationTracking: () => void;
  stopLocationTracking: () => void;
  dropAnchorAtCurrent: (label: string, note?: string) => void;
}

export function useMobileCompanionRuntime(actorId: string, opId?: string): MobileCompanionRuntimeState {
  const [online, setOnline] = useState<boolean>(() => (typeof navigator === 'undefined' ? true : navigator.onLine));
  const [serviceWorkerState, setServiceWorkerState] = useState<MobileCompanionRuntimeState['serviceWorkerState']>('idle');
  const [serviceWorkerError, setServiceWorkerError] = useState<string>('');
  const [pushPermission, setPushPermission] = useState<MobileCompanionRuntimeState['pushPermission']>(() => {
    if (typeof window === 'undefined' || typeof Notification === 'undefined') return 'unsupported';
    return Notification.permission;
  });
  const [pushEnabled, setPushEnabled] = useState(false);
  const [installAvailable, setInstallAvailable] = useState(false);
  const [installResult, setInstallResult] = useState('');
  const [locationTracking, setLocationTracking] = useState(false);
  const [locationError, setLocationError] = useState('');
  const [currentPosition, setCurrentPosition] = useState<MobileCompanionRuntimeState['currentPosition']>(null);
  const [headingDeg, setHeadingDeg] = useState<number | undefined>(undefined);
  const [mobileVersion, setMobileVersion] = useState(0);

  const swRegistrationRef = useRef<ServiceWorkerRegistration | null>(null);
  const installPromptRef = useRef<InstallPromptEvent | null>(null);
  const locationWatchRef = useRef<number | null>(null);

  useEffect(() => {
    const onOnline = () => setOnline(true);
    const onOffline = () => setOnline(false);
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    return () => {
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
    };
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
      setServiceWorkerState('unsupported');
      return;
    }
    let active = true;
    navigator.serviceWorker
      .register('/service-worker.js', { scope: '/' })
      .then((registration) => {
        if (!active) return;
        swRegistrationRef.current = registration;
        setServiceWorkerState('ready');
      })
      .catch((error) => {
        if (!active) return;
        setServiceWorkerState('error');
        setServiceWorkerError(String(error?.message || error));
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    const onBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      installPromptRef.current = event as InstallPromptEvent;
      setInstallAvailable(true);
    };
    window.addEventListener('beforeinstallprompt', onBeforeInstallPrompt as EventListener);
    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstallPrompt as EventListener);
    };
  }, []);

  useEffect(() => {
    const onOrientation = (event: DeviceOrientationEvent) => {
      const alpha = Number(event.alpha);
      if (Number.isFinite(alpha)) {
        setHeadingDeg((360 - alpha + 360) % 360);
      }
    };
    window.addEventListener('deviceorientation', onOrientation);
    return () => {
      window.removeEventListener('deviceorientation', onOrientation);
    };
  }, []);

  useEffect(() => {
    const unsubscribe = subscribeMobileCompanion(() => setMobileVersion((prev) => prev + 1));
    return unsubscribe;
  }, []);

  const beacons = useMemo(() => listMobileLocationBeacons({ opId, includeStale: false }), [opId, mobileVersion]);
  const anchors = useMemo(() => listMobileArAnchors({ opId, includeStale: false }), [opId, mobileVersion]);

  const arMarkers = useMemo(() => {
    if (!currentPosition) return [];
    return projectArMarkers({
      viewerPosition: {
        latitude: currentPosition.latitude,
        longitude: currentPosition.longitude,
        accuracyMeters: currentPosition.accuracyMeters,
        capturedAt: new Date().toISOString(),
      },
      viewerHeadingDeg: headingDeg,
      opId,
      includeStale: false,
    });
  }, [currentPosition, headingDeg, opId, mobileVersion]);

  const requestInstall = useCallback(async () => {
    const prompt = installPromptRef.current;
    if (!prompt) return;
    await prompt.prompt();
    const choice = await prompt.userChoice;
    setInstallResult(choice?.outcome || 'dismissed');
    installPromptRef.current = null;
    setInstallAvailable(false);
  }, []);

  const enablePush = useCallback(async () => {
    if (typeof window === 'undefined' || typeof Notification === 'undefined') {
      setPushPermission('unsupported');
      return;
    }
    const permission = await Notification.requestPermission();
    setPushPermission(permission);
    if (permission !== 'granted') {
      setPushEnabled(false);
      return;
    }

    const registration = swRegistrationRef.current;
    const vapidKey = String(import.meta.env.VITE_WEB_PUSH_PUBLIC_KEY || '').trim();
    if (!registration || !('pushManager' in registration)) {
      registerMobileDeviceToken({
        memberProfileId: actorId,
        platform: 'WEB_PWA',
        pushProvider: 'UNSPECIFIED',
        tokenPayload: { permission, fallback: true },
        notes: 'Push manager unavailable; notification permission granted only.',
      });
      setPushEnabled(true);
      return;
    }

    try {
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: vapidKey ? toVapidUint8Array(vapidKey) : undefined,
      });
      registerMobileDeviceToken({
        memberProfileId: actorId,
        platform: 'WEB_PWA',
        pushProvider: 'WEB_PUSH',
        tokenPayload: subscription.toJSON(),
      });
      setPushEnabled(true);
    } catch (error) {
      registerMobileDeviceToken({
        memberProfileId: actorId,
        platform: 'WEB_PWA',
        pushProvider: 'UNSPECIFIED',
        tokenPayload: { permission, error: String(error?.message || error) },
        notes: 'Push subscribe failed; token stored for diagnostics only.',
      });
      setPushEnabled(false);
      setServiceWorkerError(String(error?.message || error));
    }
  }, [actorId]);

  const stopLocationTracking = useCallback(() => {
    if (typeof navigator === 'undefined' || !('geolocation' in navigator)) return;
    if (locationWatchRef.current !== null) {
      navigator.geolocation.clearWatch(locationWatchRef.current);
      locationWatchRef.current = null;
    }
    setLocationTracking(false);
  }, []);

  const startLocationTracking = useCallback(() => {
    if (typeof navigator === 'undefined' || !('geolocation' in navigator)) {
      setLocationError('Geolocation is not supported on this device.');
      return;
    }
    if (locationWatchRef.current !== null) return;
    setLocationError('');
    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        const next = {
          latitude: Number(position.coords.latitude),
          longitude: Number(position.coords.longitude),
          accuracyMeters: Number(position.coords.accuracy),
        };
        setCurrentPosition(next);
        const heading = inferHeadingFromPosition(position);
        if (Number.isFinite(heading)) setHeadingDeg(heading);

        publishMobileLocationBeacon({
          subjectId: actorId,
          opId,
          confidence: position.coords.accuracy <= 15 ? 0.9 : position.coords.accuracy <= 35 ? 0.75 : 0.55,
          ttlSeconds: 120,
          source: 'MOBILE_GPS',
          position: {
            latitude: next.latitude,
            longitude: next.longitude,
            accuracyMeters: next.accuracyMeters,
            headingDeg: heading,
            speedMps: Number.isFinite(position.coords.speed) ? Number(position.coords.speed) : undefined,
            capturedAt: new Date(position.timestamp).toISOString(),
          },
        });
        setLocationTracking(true);
      },
      (error) => {
        setLocationError(error?.message || 'Location permission denied.');
        setLocationTracking(false);
      },
      {
        enableHighAccuracy: true,
        maximumAge: 5000,
        timeout: 15000,
      }
    );
    locationWatchRef.current = watchId;
  }, [actorId, opId]);

  const dropAnchorAtCurrent = useCallback(
    (label: string, note?: string) => {
      if (!currentPosition) return;
      createMobileArAnchor({
        label: label || 'Field Marker',
        opId,
        createdBy: actorId,
        confidence: 0.72,
        ttlSeconds: 900,
        position: {
          latitude: currentPosition.latitude,
          longitude: currentPosition.longitude,
          accuracyMeters: currentPosition.accuracyMeters,
          headingDeg,
          capturedAt: new Date().toISOString(),
        },
        narrativeNote: note,
      });
    },
    [currentPosition, opId, actorId, headingDeg]
  );

  useEffect(
    () => () => {
      stopLocationTracking();
    },
    [stopLocationTracking]
  );

  return {
    online,
    serviceWorkerState,
    serviceWorkerError: serviceWorkerError || undefined,
    pushPermission,
    pushEnabled,
    installAvailable,
    installResult: installResult || undefined,
    locationTracking,
    locationError: locationError || undefined,
    currentPosition,
    headingDeg,
    beaconCount: beacons.length,
    anchorCount: anchors.length,
    arMarkers,
    requestInstall,
    enablePush,
    startLocationTracking,
    stopLocationTracking,
    dropAnchorAtCurrent,
  };
}

