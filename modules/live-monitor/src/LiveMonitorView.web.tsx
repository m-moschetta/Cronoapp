import * as React from 'react';

import { LiveMonitorViewProps } from './LiveMonitor.types';

export default function LiveMonitorView(props: LiveMonitorViewProps) {
  return (
    <div>
      <iframe
        style={{ flex: 1 }}
        src={props.url}
        onLoad={() => props.onLoad?.({ nativeEvent: { url: props.url } })}
      />
    </div>
  );
}
