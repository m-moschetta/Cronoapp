import ExpoModulesCore
import Foundation
#if canImport(ActivityKit)
import ActivityKit
#endif

// MARK: - Activity Attributes
#if canImport(ActivityKit)
@available(iOS 16.1, *)
struct CronoActivityAttributes: ActivityAttributes {
    public struct ContentState: Codable, Hashable {
        var activityName: String
        var activityColor: String
        var startTime: TimeInterval
    }

    // Static data (doesn't change during the activity)
    var appName: String = "Cronoapp"
}
#endif

public class LiveMonitorModule: Module {
    private var currentActivity: Any?
    
#if canImport(ActivityKit)
    @available(iOS 16.1, *)
    private func resolveCurrentActivity() -> Activity<CronoActivityAttributes>? {
        if let activity = self.currentActivity as? Activity<CronoActivityAttributes> {
            return activity
        }
        let first = Activity<CronoActivityAttributes>.activities.first
        if let first {
            self.currentActivity = first
        }
        return first
    }
    
    @available(iOS 16.1, *)
    private func endAllActivities() async {
        for activity in Activity<CronoActivityAttributes>.activities {
            await activity.end(dismissalPolicy: .immediate)
        }
        self.currentActivity = nil
    }
#endif
    
    public func definition() -> ModuleDefinition {
        Name("LiveMonitor")
        
        // Start a new Live Activity
        AsyncFunction("start") { (data: [String: Any]) -> Void in
            guard let activityName = data["activityName"] as? String,
                  let activityColor = data["activityColor"] as? String,
                  let startTime = data["startTime"] as? Double else {
                throw NSError(domain: "LiveMonitor", code: 1, userInfo: [NSLocalizedDescriptionKey: "Invalid data"])
            }
            
            if #available(iOS 16.1, *) {
#if canImport(ActivityKit)
                let attributes = CronoActivityAttributes()
                let contentState = CronoActivityAttributes.ContentState(
                    activityName: activityName,
                    activityColor: activityColor,
                    startTime: startTime
                )
                if let existingActivity = self.resolveCurrentActivity() {
                    Task {
                        await existingActivity.update(using: contentState)
                    }
                    self.currentActivity = existingActivity
                    print("✅ Live Activity resumed: \(activityName)")
                } else {
                    do {
                        let activity = try Activity<CronoActivityAttributes>.request(
                            attributes: attributes,
                            contentState: contentState,
                            pushType: nil
                        )
                        self.currentActivity = activity
                        print("✅ Live Activity started: \(activityName)")
                    } catch {
                        print("❌ Failed to start Live Activity: \(error.localizedDescription)")
                        throw error
                    }
                }
#else
                self.currentActivity = nil
                print("⚠️ Live Activities not supported on this build")
#endif
            } else {
                // Ensure property compiles on older iOS
                self.currentActivity = nil
                print("⚠️ Live Activities not supported on this iOS version")
            }
        }
        
        // Update the current Live Activity
        AsyncFunction("update") { (data: [String: Any]) -> Void in
            guard let activityName = data["activityName"] as? String,
                  let activityColor = data["activityColor"] as? String,
                  let startTime = data["startTime"] as? Double else {
                throw NSError(domain: "LiveMonitor", code: 1, userInfo: [NSLocalizedDescriptionKey: "Invalid data"])
            }
            
            if #available(iOS 16.1, *) {
#if canImport(ActivityKit)
                let contentState = CronoActivityAttributes.ContentState(
                    activityName: activityName,
                    activityColor: activityColor,
                    startTime: startTime
                )
                if let activity = self.resolveCurrentActivity() {
                    Task {
                        await activity.update(using: contentState)
                        print("🔄 Live Activity updated: \(activityName)")
                    }
                } else {
                    let attributes = CronoActivityAttributes()
                    do {
                        let activity = try Activity<CronoActivityAttributes>.request(
                            attributes: attributes,
                            contentState: contentState,
                            pushType: nil
                        )
                        self.currentActivity = activity
                        print("✅ Live Activity started from update: \(activityName)")
                    } catch {
                        print("❌ Failed to start Live Activity from update: \(error.localizedDescription)")
                    }
                }
#else
                print("ℹ️ Update ignored: Live Activities not supported on this build")
#endif
            } else {
                // No-op on older iOS versions
                print("ℹ️ Update ignored: Live Activities not supported on this iOS version")
            }
        }
        
        // Stop the current Live Activity
        AsyncFunction("stop") { () -> Void in
            if #available(iOS 16.1, *) {
#if canImport(ActivityKit)
                Task {
                    await self.endAllActivities()
                    print("🛑 Live Activity stopped")
                }
#else
                self.currentActivity = nil
                print("ℹ️ Stop ignored: Live Activities not supported on this build")
#endif
            } else {
                self.currentActivity = nil
                print("ℹ️ Stop ignored: Live Activities not supported on this iOS version")
            }
        }
        
        // Check if a Live Activity is currently active
        AsyncFunction("isActive") { () -> Bool in
            if #available(iOS 16.1, *) {
                #if canImport(ActivityKit)
                return !Activity<CronoActivityAttributes>.activities.isEmpty
                #else
                return false
                #endif
            } else {
                return false
            }
        }
    }
}
