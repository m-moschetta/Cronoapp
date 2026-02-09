// Legacy types for View component (not used in main module)
export type LiveMonitorViewProps = {
  url?: string;
  style?: unknown;
  onLoad?: (event: { nativeEvent: { url?: string } }) => void;
};

export type ChangeEventPayload = {
  value: string;
};

export interface LiveActivityData {
  activityName: string;
  activityColor: string;
  startTime: number; // Unix timestamp in milliseconds
}

export interface LiveMonitorModule {
  /**
   * Start a live activity/foreground service
   * @param data Activity data to display
   * @returns Promise that resolves when the activity is started
   */
  start(data: LiveActivityData): Promise<void>;

  /**
   * Update the current live activity/foreground service
   * @param data Updated activity data
   * @returns Promise that resolves when the activity is updated
   */
  update(data: LiveActivityData): Promise<void>;

  /**
   * Stop the current live activity/foreground service
   * @returns Promise that resolves when the activity is stopped
   */
  stop(): Promise<void>;

  /**
   * Check if live monitoring is currently active
   * @returns Promise that resolves to true if active, false otherwise
   */
  isActive(): Promise<boolean>;
}
