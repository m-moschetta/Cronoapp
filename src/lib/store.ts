import { create } from "zustand";
import i18n from "./i18n";

interface I18nState {
    language: string;
    setLanguage: (lang: string) => void;
}

export const useI18nStore = create<I18nState>((set) => ({
    language: i18n.language || "it",
    setLanguage: (lang: string) => {
        i18n.changeLanguage(lang);
        set({ language: lang });
    },
}));
