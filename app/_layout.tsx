import { DarkTheme, DefaultTheme, ThemeProvider } from "@react-navigation/native";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack, useRouter, useSegments } from "expo-router";
import { useEffect, useState } from "react";
import { useAppColorScheme } from "../src/lib/store";
import "../src/lib/i18n";
import { auth, db } from "../src/lib/firebase";
import { onAuthStateChanged, User } from "firebase/auth";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { initNotifications } from "../src/lib/notifications";

const queryClient = new QueryClient();

function useProtectedRoute(user: User | null, onboarded: boolean | null, isMounted: boolean) {
    const segments = useSegments();
    const router = useRouter();

    useEffect(() => {
        if (!isMounted) return;

        const inAuthGroup = segments[0] === "(tabs)";
        const inOnboarding = segments[0] === "onboarding";

        if (!user && inAuthGroup) {
            router.replace("/login");
            return;
        }

        if (user && onboarded === false && !inOnboarding) {
            router.replace("/onboarding");
            return;
        }

        if (user && onboarded === true && !inAuthGroup) {
            router.replace("/(tabs)");
        }
    }, [user, segments, onboarded, isMounted]);
}

import { GestureHandlerRootView } from "react-native-gesture-handler";

export default function RootLayout() {
    const colorScheme = useAppColorScheme();
    const [user, setUser] = useState<User | null>(null);
    const [onboarded, setOnboarded] = useState<boolean | null>(null);
    const [initializing, setInitializing] = useState(true);
    const [isMounted, setIsMounted] = useState(false);

    useEffect(() => {
        setIsMounted(true);
    }, []);

    useProtectedRoute(user, onboarded, isMounted);

    useEffect(() => {
        initNotifications();
    }, []);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (authUser) => {
            if (authUser) {
                // Check Firestore for user profile
                const userRef = doc(db, "users", authUser.uid);
                const userDoc = await getDoc(userRef);

                if (!userDoc.exists()) {
                    // Create user profile if it doesn't exist
                    await setDoc(userRef, {
                        email: authUser.email,
                        onboarded: false,
                        createdAt: new Date(),
                    });
                    setOnboarded(false);
                } else {
                    setOnboarded(userDoc.data().onboarded);
                }
            } else {
                setOnboarded(null);
            }

            setUser(authUser);
            if (initializing) setInitializing(false);
        });
        return unsubscribe;
    }, []);

    if (initializing) return null;

    return (
        <GestureHandlerRootView style={{ flex: 1 }}>
            <QueryClientProvider client={queryClient}>
                <ThemeProvider value={colorScheme === "dark" ? DarkTheme : DefaultTheme}>
                    <Stack
                        screenOptions={{
                            headerShown: false,
                        }}
                    >
                        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
                        <Stack.Screen name="login" options={{ headerShown: false }} />
                    <Stack.Screen name="onboarding/index" options={{ presentation: "modal", title: "Benvenuto" }} />
                    <Stack.Screen name="manage-data" options={{ headerShown: false }} />
                    </Stack>
                </ThemeProvider>
            </QueryClientProvider>
        </GestureHandlerRootView>
    );
}
