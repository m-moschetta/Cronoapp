import { NativeModule, requireOptionalNativeModule } from 'expo';

import { LiveMonitorModule, LiveActivityData } from './LiveMonitor.types';

// This call loads the native module object from the JSI.
const NativeLiveMonitor = requireOptionalNativeModule<LiveMonitorModule>('LiveMonitor');
let hasWarnedMissing = false;

const warnIfMissing = () => {
  if (!NativeLiveMonitor && !hasWarnedMissing) {
    hasWarnedMissing = true;
    console.warn("LiveMonitor native module not available. Live activity features are disabled.");
  }
};

export default {
  async start(data: LiveActivityData): Promise<void> {
    if (!NativeLiveMonitor) {
      warnIfMissing();
      return;
    }
    return await NativeLiveMonitor.start(data);
  },

  async update(data: LiveActivityData): Promise<void> {
    if (!NativeLiveMonitor) {
      warnIfMissing();
      return;
    }
    return await NativeLiveMonitor.update(data);
  },

  async stop(): Promise<void> {
    if (!NativeLiveMonitor) {
      warnIfMissing();
      return;
    }
    return await NativeLiveMonitor.stop();
  },

  async isActive(): Promise<boolean> {
    if (!NativeLiveMonitor) {
      warnIfMissing();
      return false;
    }
    return await NativeLiveMonitor.isActive();
  },
};
