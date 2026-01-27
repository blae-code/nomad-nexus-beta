import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { base44 } from '@/api/base44Client';

export default function BootSplashOverlay() {
  const [config, setConfig] = useState(null);
  const [shouldShow, setShouldShow] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  const videoRef = useRef(null);
  const timerRef = useRef(null);

  useEffect(() => {
    // Check for prefers-reduced-motion
    const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(motionQuery.matches);

    // Watchdog: force dismiss after 5s if still loading config
    const watchdog = setTimeout(() => {
      console.warn('[BOOT OVERLAY] Config load timeout - dismissing');
      setIsLoading(false);
      setShouldShow(false);
    }, 5000);

    // Load AppConfig
    const loadConfig = async () => {
      try {
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Config fetch timeout')), 3000)
        );
        
        const configs = await Promise.race([
          base44.entities.AppConfig.filter({ key: 'global' }),
          timeoutPromise
        ]);
        const appConfig = configs.length > 0 ? configs[0] : null;

        if (!appConfig) {
          setIsLoading(false);
          clearTimeout(watchdog);
          return;
        }

        setConfig(appConfig);

        // Determine if we should show the boot video
        const shouldDisplay =
          appConfig.boot_video_enabled &&
          appConfig.boot_video_url &&
          appConfig.boot_video_mode !== 'OFF';

        let display = false;
        if (shouldDisplay) {
          if (appConfig.boot_video_mode === 'ALWAYS') {
            display = true;
          } else if (appConfig.boot_video_mode === 'FIRST_VISIT') {
            const hasSeenBoot = localStorage.getItem('hasSeenBootVideo');
            display = !hasSeenBoot;
          }
        }

        setShouldShow(display);
        setIsLoading(false);
        clearTimeout(watchdog);
      } catch (error) {
        console.error('[BOOT OVERLAY] Failed to load AppConfig:', error);
        setIsLoading(false);
        setShouldShow(false);
        clearTimeout(watchdog);
      }
    };

    loadConfig();
    
    return () => clearTimeout(watchdog);
  }, []);

  const handleDismiss = () => {
    setShouldShow(false);
    localStorage.setItem('hasSeenBootVideo', 'true');
  };

  const handleVideoEnded = () => {
    handleDismiss();
  };

  const handleTimeUpdate = () => {
    if (!videoRef.current || !config) return;
    if (videoRef.current.currentTime * 1000 >= config.boot_video_max_ms) {
      handleDismiss();
    }
  };

  const handleVideoError = () => {
    console.error('Boot video failed to load');
    handleDismiss();
  };

  if (isLoading || !shouldShow || !config) {
    return null;
  }

  // Reduced motion: show static screen with button
  if (prefersReducedMotion) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.3 }}
        className="fixed inset-0 z-[999] bg-black flex items-center justify-center"
      >
        <div className="text-center space-y-4">
          <div className="w-16 h-16 border-2 border-[#ea580c] rounded-full mx-auto" />
          <h1 className="text-lg font-bold text-white">Welcome to Nexus</h1>
          <p className="text-sm text-zinc-400">Loading operational systems...</p>
          <button
            onClick={handleDismiss}
            className="mt-6 px-4 py-2 bg-[#ea580c] text-white text-sm font-bold hover:bg-[#ea580c]/90 transition-colors"
          >
            Enter Nexus
          </button>
        </div>
      </motion.div>
    );
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.3 }}
        className="fixed inset-0 z-[999] bg-black flex items-center justify-center overflow-hidden"
      >
        <video
          ref={videoRef}
          src={config.boot_video_url}
          autoPlay
          muted
          playsInline
          preload="auto"
          onEnded={handleVideoEnded}
          onTimeUpdate={handleTimeUpdate}
          onError={handleVideoError}
          className="w-full h-full object-cover"
          style={{ WebkitPlaysinline: 'true' }}
        />

        {config.boot_video_skip_enabled && (
          <motion.button
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            onClick={handleDismiss}
            className="absolute top-4 right-4 z-10 p-2 bg-black/50 hover:bg-black/70 transition-colors rounded"
            title="Skip video"
          >
            <X className="w-5 h-5 text-white" />
          </motion.button>
        )}

        {/* Fallback: loading indicator if video takes too long */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 2 }}
          className="absolute bottom-4 left-1/2 transform -translate-x-1/2 text-[10px] text-zinc-400 font-mono"
        >
          <span className="animate-pulse">● Loading...</span>
          <span className="text-[8px] text-zinc-700 ml-2">BOOT OVERLAY</span>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}