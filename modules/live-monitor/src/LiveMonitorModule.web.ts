import { registerWebModule, NativeModule } from 'expo';

import { ChangeEventPayload } from './LiveMonitor.types';

type LiveMonitorModuleEvents = {
  onChange: (params: ChangeEventPayload) => void;
}

class LiveMonitorModule extends NativeModule<LiveMonitorModuleEvents> {
  PI = Math.PI;
  async setValueAsync(value: string): Promise<void> {
    this.emit('onChange', { value });
  }
  hello() {
    return 'Hello world! 👋';
  }
};

export default registerWebModule(LiveMonitorModule, 'LiveMonitorModule');
