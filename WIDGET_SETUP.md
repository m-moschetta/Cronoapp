# CronoActivityWidget - SwiftUI Setup Guide

This guide explains how to create the Widget Extension in Xcode to display the timer in the Dynamic Island.

## 📋 Step 1: Create Widget Extension Target

1. Open Xcode: `open ios/Cronoapp.xcworkspace`
2. **File → New → Target**
3. Select **"Widget Extension"**
4. Configuration:
   - **Product Name**: `CronoActivityWidget`
   - **Team**: Select your development team
   - **Deselect** "Include Configuration Intent"
   - Click **Finish**
5. When prompted "Activate CronoActivityWidget scheme?", click **Activate**

## 📋 Step 2: Add ActivityKit Framework

1. Select the **CronoActivityWidget** target in the project navigator
2. Go to **"Frameworks and Libraries"**
3. Click the **"+"** button
4. Search for and add **"ActivityKit.framework"**

## 📋 Step 3: Replace Widget Code

Replace the contents of `CronoActivityWidget.swift` with the code below:

```swift
import ActivityKit
import WidgetKit
import SwiftUI

// MARK: - Activity Attributes (must match LiveMonitorModule.swift)
struct CronoActivityAttributes: ActivityAttributes {
    public struct ContentState: Codable, Hashable {
        var activityName: String
        var activityColor: String
        var startTime: TimeInterval
    }
    
    var appName: String = "Cronoapp"
}

// MARK: - Live Activity Widget
@main
struct CronoActivityWidget: Widget {
    var body: some WidgetConfiguration {
        ActivityConfiguration(for: CronoActivityAttributes.self) { context in
            // Lock Screen UI
            LockScreenView(context: context)
        } dynamicIsland: { context in
            DynamicIsland {
                // Expanded View (when long-pressed)
                DynamicIslandExpandedRegion(.leading) {
                    HStack(spacing: 8) {
                        Circle()
                            .fill(Color(hex: context.state.activityColor))
                            .frame(width: 12, height: 12)
                        Text(context.state.activityName)
                            .font(.headline)
                            .lineLimit(1)
                    }
                }
                
                DynamicIslandExpandedRegion(.trailing) {
                    TimerText(startTime: context.state.startTime)
                        .font(.system(.title2, design: .rounded).monospacedDigit())
                        .fontWeight(.semibold)
                }
                
                DynamicIslandExpandedRegion(.bottom) {
                    HStack {
                        Image(systemName: "timer")
                            .foregroundColor(.secondary)
                        Text("Timer attivo")
                            .font(.caption)
                            .foregroundColor(.secondary)
                        Spacer()
                    }
                    .padding(.top, 8)
                }
            } compactLeading: {
                // Compact Leading (left side of Dynamic Island)
                Circle()
                    .fill(Color(hex: context.state.activityColor))
                    .frame(width: 12, height: 12)
            } compactTrailing: {
                // Compact Trailing (right side of Dynamic Island)
                TimerText(startTime: context.state.startTime)
                    .font(.system(.caption, design: .rounded).monospacedDigit())
                    .fontWeight(.medium)
            } minimal: {
                // Minimal (when multiple activities are active)
                Circle()
                    .fill(Color(hex: context.state.activityColor))
                    .frame(width: 12, height: 12)
            }
        }
    }
}

// MARK: - Lock Screen View
struct LockScreenView: View {
    let context: ActivityViewContext<CronoActivityAttributes>
    
    var body: some View {
        HStack(spacing: 12) {
            Circle()
                .fill(Color(hex: context.state.activityColor))
                .frame(width: 16, height: 16)
            
            VStack(alignment: .leading, spacing: 4) {
                Text(context.state.activityName)
                    .font(.headline)
                Text("Timer attivo")
                    .font(.caption)
                    .foregroundColor(.secondary)
            }
            
            Spacer()
            
            TimerText(startTime: context.state.startTime)
                .font(.system(.title3, design: .rounded).monospacedDigit())
                .fontWeight(.semibold)
        }
        .padding()
    }
}

// MARK: - Timer Text Component
struct TimerText: View {
    let startTime: TimeInterval
    @State private var currentTime = Date()
    
    let timer = Timer.publish(every: 1, on: .main, in: .common).autoconnect()
    
    var body: some View {
        Text(formattedElapsedTime)
            .onReceive(timer) { _ in
                currentTime = Date()
            }
    }
    
    private var formattedElapsedTime: String {
        let elapsed = Int(currentTime.timeIntervalSince1970 - startTime)
        let hours = elapsed / 3600
        let minutes = (elapsed % 3600) / 60
        let seconds = elapsed % 60
        return String(format: "%02d:%02d:%02d", hours, minutes, seconds)
    }
}

// MARK: - Color Extension
extension Color {
    init(hex: String) {
        let hex = hex.trimmingCharacters(in: CharacterSet.alphanumerics.inverted)
        var int: UInt64 = 0
        Scanner(string: hex).scanHexInt64(&int)
        let a, r, g, b: UInt64
        switch hex.count {
        case 3: // RGB (12-bit)
            (a, r, g, b) = (255, (int >> 8) * 17, (int >> 4 & 0xF) * 17, (int & 0xF) * 17)
        case 6: // RGB (24-bit)
            (a, r, g, b) = (255, int >> 16, int >> 8 & 0xFF, int & 0xFF)
        case 8: // ARGB (32-bit)
            (a, r, g, b) = (int >> 24, int >> 16 & 0xFF, int >> 8 & 0xFF, int & 0xFF)
        default:
            (a, r, g, b) = (255, 0, 0, 0)
        }
        self.init(
            .sRGB,
            red: Double(r) / 255,
            green: Double(g) / 255,
            blue: Double(b) / 255,
            opacity: Double(a) / 255
        )
    }
}
```

## 📋 Step 4: Build & Run

1. Select your **iPhone 14 Pro or newer** (physical device)
2. Select the **Cronoapp** scheme (not CronoActivityWidget)
3. Press **Cmd + R** to build and run
4. Start a timer in the app
5. The Dynamic Island should activate! 🎉

## ⚠️ Important Notes

- **Physical Device Required**: Dynamic Island only works on iPhone 14 Pro and newer
- **Simulator Limitation**: The simulator will show the Lock Screen widget but NOT the Dynamic Island
- **Matching Attributes**: The `CronoActivityAttributes` struct must match exactly between the widget and the native module

## 🎨 Customization

You can customize the colors, fonts, and layout in the SwiftUI code above. The timer updates every second automatically.
