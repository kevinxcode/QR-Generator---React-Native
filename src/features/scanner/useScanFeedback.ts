import { setAudioModeAsync, useAudioPlayer } from 'expo-audio';
import * as Haptics from 'expo-haptics';
import { useCallback, useEffect } from 'react';

import { useSettings } from '@/store/settings.store';

const BEEP = require('../../../assets/beep.wav');

/** Haptic + optional sound feedback on scan, honouring user settings. */
export function useScanFeedback() {
  const sound = useSettings((s) => s.settings.scannerSound);
  const vibration = useSettings((s) => s.settings.scannerVibration);
  const player = useAudioPlayer(BEEP);

  useEffect(() => {
    // Respect the silent switch and don't interrupt the user's music.
    setAudioModeAsync({ playsInSilentMode: false, interruptionMode: 'mixWithOthers' }).catch(() => {});
  }, []);

  return useCallback(
    (kind: 'success' | 'duplicate' = 'success') => {
      if (vibration) {
        (kind === 'success'
          ? Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
          : Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
        ).catch(() => {});
      }
      if (sound && kind === 'success') {
        try {
          player.seekTo(0);
          player.play();
        } catch {
          // audio is optional
        }
      }
    },
    [sound, vibration, player],
  );
}
