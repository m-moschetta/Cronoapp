import i18n from "i18next";
import { initReactI18next } from "react-i18next";

const resources = {
    it: {
        translation: {
            common: {
                loading: "Caricamento...",
                error: "Errore",
                save: "Salva",
                cancel: "Annulla",
                delete: "Elimina",
            },
            timer: {
                tracking: "TRACCIANDO",
                noActivities: "Nessuna attività",
                suggestAdd: "Vai in Impostazioni per aggiungerne",
            },
            auth: {
                welcomeBack: "Bentornato",
                login: "Accedi",
                or: "oppure",
            },
            // ... more keys
        },
    },
    en: {
        translation: {
            common: {
                loading: "Loading...",
                error: "Error",
                save: "Save",
                cancel: "Cancel",
                delete: "Delete",
            },
            timer: {
                tracking: "TRACKING",
                noActivities: "No activities",
                suggestAdd: "Go to Settings to add some",
            },
            auth: {
                welcomeBack: "Welcome Back",
                login: "Login",
                or: "or",
            },
            // ... more keys
        },
    },
};

i18n.use(initReactI18next).init({
    resources,
    lng: "it",
    fallbackLng: "en",
    interpolation: {
        escapeValue: false,
    },
});

export default i18n;
