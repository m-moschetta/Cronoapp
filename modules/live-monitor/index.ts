// Reexport the native module. On web, it will be resolved to LiveMonitorModule.web.ts
// and on native platforms to LiveMonitorModule.ts
export { default } from './src/LiveMonitorModule';
export * from  './src/LiveMonitor.types';
