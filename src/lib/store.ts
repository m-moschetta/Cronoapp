import AsyncStorage from "@react-native-async-storage/async-storage";
import { useColorScheme } from "react-native";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import i18n from "./i18n";

interface I18nState {
    language: string;
    setLanguage: (lang: string) => void;
}

export const useI18nStore = create<I18nState>()(
    persist(
        (set) => ({
            language: i18n.language || "it",
            setLanguage: (lang: string) => {
                i18n.changeLanguage(lang);
                set({ language: lang });
            },
        }),
        {
            name: "cronoapp.i18n",
            storage: createJSONStorage(() => AsyncStorage),
            onRehydrateStorage: () => (state) => {
                if (state?.language) {
                    i18n.changeLanguage(state.language);
                }
            },
        }
    )
);

type ThemePreference = "light" | "dark" | "system";

interface SettingsState {
    themePreference: ThemePreference;
    notificationsEnabled: boolean;
    setThemePreference: (theme: ThemePreference) => void;
    setNotificationsEnabled: (enabled: boolean) => void;
}

const getInitialTheme = (): ThemePreference => "system";

export const useSettingsStore = create<SettingsState>()(
    persist(
        (set) => ({
            themePreference: getInitialTheme(),
            notificationsEnabled: true,
            setThemePreference: (themePreference) => set({ themePreference }),
            setNotificationsEnabled: (notificationsEnabled) => set({ notificationsEnabled }),
        }),
        {
            name: "cronoapp.settings",
            storage: createJSONStorage(() => AsyncStorage),
        }
    )
);

export const useAppColorScheme = (): "light" | "dark" => {
    const preference = useSettingsStore((state) => state.themePreference);
    const systemScheme = useColorScheme();
    if (preference === "system") {
        return systemScheme === "dark" ? "dark" : "light";
    }
    return preference;
};
