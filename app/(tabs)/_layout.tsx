import { Tabs } from "expo-router";
import { Timer, Calendar, BarChart2, Settings } from "lucide-react-native";
import { colors } from "../../src/theme/tokens";
import { useColorScheme, Platform } from "react-native";

export default function TabsLayout() {
    const colorScheme = useColorScheme() || "light";
    const themeColors = colors[colorScheme];

    return (
        <Tabs
            screenOptions={{
                tabBarActiveTintColor: colors.primary.cyan,
                tabBarInactiveTintColor: themeColors.textTertiary,
                tabBarStyle: {
                    backgroundColor: themeColors.background,
                    borderTopColor: themeColors.border,
                    paddingTop: 8,
                    height: Platform.OS === 'ios' ? 88 : 60,
                },
                headerShown: false,
            }}
        >
            <Tabs.Screen
                name="index"
                options={{
                    title: "Timer",
                    tabBarIcon: ({ color }) => <Timer size={24} color={color} />,
                }}
            />
            <Tabs.Screen
                name="calendar"
                options={{
                    title: "Calendar",
                    tabBarIcon: ({ color }) => <Calendar size={24} color={color} />,
                }}
            />
            <Tabs.Screen
                name="reports"
                options={{
                    title: "Reports",
                    tabBarIcon: ({ color }) => <BarChart2 size={24} color={color} />,
                }}
            />
            <Tabs.Screen
                name="settings"
                options={{
                    title: "Settings",
                    tabBarIcon: ({ color }) => <Settings size={24} color={color} />,
                }}
            />
        </Tabs>
    );
}
