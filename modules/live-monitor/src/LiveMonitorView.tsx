import { requireNativeView } from 'expo';
import * as React from 'react';

import { LiveMonitorViewProps } from './LiveMonitor.types';

const NativeView: React.ComponentType<LiveMonitorViewProps> =
  requireNativeView('LiveMonitor');

export default function LiveMonitorView(props: LiveMonitorViewProps) {
  return <NativeView {...props} />;
}
