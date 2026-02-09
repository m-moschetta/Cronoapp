import { Platform } from "react-native";
import * as Notifications from "expo-notifications";

let hasInitialized = false;

export const initNotifications = () => {
    if (hasInitialized) return;
    Notifications.setNotificationHandler({
        handleNotification: async () => ({
            shouldShowAlert: true,
            shouldShowBanner: true,
            shouldShowList: true,
            shouldPlaySound: true,
            shouldSetBadge: false,
        }),
    });
    hasInitialized = true;
};

export const ensureNotificationPermissions = async (): Promise<boolean> => {
    const permissions = await Notifications.getPermissionsAsync();
    let status = permissions.status;
    if (status !== "granted") {
        const request = await Notifications.requestPermissionsAsync();
        status = request.status;
    }
    if (status !== "granted") {
        return false;
    }
    if (Platform.OS === "android") {
        await Notifications.setNotificationChannelAsync("default", {
            name: "Default",
            importance: Notifications.AndroidImportance.DEFAULT,
        });
    }
    return true;
};
