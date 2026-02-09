import { View, Text, StyleSheet, Pressable, TextInput, KeyboardAvoidingView, Platform, Alert, ScrollView, TouchableWithoutFeedback, Keyboard } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { colors, spacing, borderRadius, typography } from "../src/theme/tokens";
import { useState } from "react";
import Animated, { FadeInDown, FadeInUp } from "react-native-reanimated";
import { Clock, Mail, Lock, Eye, EyeOff } from "lucide-react-native";
import { LinearGradient } from "expo-linear-gradient";
import { auth } from "../src/lib/firebase";
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from "firebase/auth";
import { useRouter } from "expo-router";
import { useAppColorScheme } from "../src/lib/store";

export default function LoginScreen() {
    const colorScheme = useAppColorScheme();
    const themeColors = colors[colorScheme];
    const [isLogin, setIsLogin] = useState(true);
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    const handleSubmit = async () => {
        if (!email || !password) return;
        setLoading(true);
        try {
            if (isLogin) {
                await signInWithEmailAndPassword(auth, email, password);
            } else {
                await createUserWithEmailAndPassword(auth, email, password);
            }
            router.replace("/(tabs)");
        } catch (error: any) {
            Alert.alert("Errore", error.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: themeColors.background }]}>
            <KeyboardAvoidingView
                behavior={Platform.OS === "ios" ? "padding" : "height"}
                style={{ flex: 1 }}
                keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 20}
            >
                <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
                    <ScrollView
                        contentContainerStyle={{ flexGrow: 1 }}
                        bounces={false}
                        showsVerticalScrollIndicator={false}
                    >
                        <View style={styles.header}>
                            <Animated.View entering={FadeInUp.duration(700)} style={styles.logoContainer}>
                                <LinearGradient colors={[colors.primary.cyan, colors.primary.blue]} style={styles.logoGradient}>
                                    <Clock size={40} color="#FFF" />
                                </LinearGradient>
                            </Animated.View>
                            <Animated.Text entering={FadeInDown.delay(200)} style={[styles.title, { color: themeColors.textPrimary }]}>
                                {isLogin ? "Bentornato" : "Benvenuto"}
                            </Animated.Text>
                            <Animated.Text entering={FadeInDown.delay(300)} style={[styles.subtitle, { color: themeColors.textSecondary }]}>
                                {isLogin ? "Gestisci il tuo tempo in modo consapevole" : "Inizia a tracciare la tua vita oggi"}
                            </Animated.Text>
                        </View>

                        <View style={styles.content}>
                            <View style={styles.dividerContainer}>
                                <View style={[styles.divider, { backgroundColor: themeColors.border }]} />
                                <Text style={[styles.dividerText, { color: themeColors.textTertiary }]}>accedi</Text>
                                <View style={[styles.divider, { backgroundColor: themeColors.border }]} />
                            </View>

                            <Animated.View entering={FadeInDown.delay(500)} style={styles.form}>
                                <View style={[styles.inputContainer, { backgroundColor: colorScheme === 'light' ? 'rgba(0,0,0,0.05)' : 'rgba(255,255,255,0.05)', borderColor: themeColors.border }]}>
                                    <Mail size={16} color={themeColors.textTertiary} style={styles.inputIcon} />
                                    <TextInput
                                        placeholder="Email"
                                        placeholderTextColor={themeColors.textTertiary}
                                        style={[styles.input, { color: themeColors.textPrimary }]}
                                        value={email}
                                        onChangeText={setEmail}
                                        autoCapitalize="none"
                                        keyboardType="email-address"
                                    />
                                </View>

                                <View style={[styles.inputContainer, { backgroundColor: colorScheme === 'light' ? 'rgba(0,0,0,0.05)' : 'rgba(255,255,255,0.05)', borderColor: themeColors.border }]}>
                                    <Lock size={16} color={themeColors.textTertiary} style={styles.inputIcon} />
                                    <TextInput
                                        placeholder="Password"
                                        placeholderTextColor={themeColors.textTertiary}
                                        secureTextEntry={!showPassword}
                                        style={[styles.input, { color: themeColors.textPrimary }]}
                                        value={password}
                                        onChangeText={setPassword}
                                    />
                                    <Pressable onPress={() => setShowPassword(!showPassword)}>
                                        {showPassword ? <EyeOff size={16} color={themeColors.textTertiary} /> : <Eye size={16} color={themeColors.textTertiary} />}
                                    </Pressable>
                                </View>

                                <Pressable
                                    style={[styles.submitButton, loading && { opacity: 0.7 }]}
                                    onPress={handleSubmit}
                                    disabled={loading}
                                >
                                    <LinearGradient
                                        colors={[colors.primary.cyan, colors.primary.blue]}
                                        style={styles.gradientButton}
                                    >
                                        <Text style={styles.submitButtonText}>{loading ? "Caricamento..." : (isLogin ? "Accedi" : "Registrati")}</Text>
                                    </LinearGradient>
                                </Pressable>
                            </Animated.View>

                            <View style={[styles.footer, { paddingBottom: spacing.xl }]}>
                                <Text style={[styles.footerText, { color: themeColors.textSecondary }]}>
                                    {isLogin ? "Non hai un account?" : "Hai già un account?"}
                                </Text>
                                <Pressable onPress={() => setIsLogin(!isLogin)}>
                                    <Text style={styles.signUpText}> {isLogin ? "Registrati" : "Accedi"}</Text>
                                </Pressable>
                            </View>
                        </View>
                    </ScrollView>
                </TouchableWithoutFeedback>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {
        alignItems: "center",
        marginTop: 60,
        marginBottom: 40,
    },
    logoContainer: {
        width: 100,
        height: 100,
        borderRadius: 50,
        backgroundColor: "rgba(6, 182, 212, 0.1)",
        justifyContent: "center",
        alignItems: "center",
        marginBottom: spacing.xl,
    },
    logoGradient: {
        width: 80,
        height: 80,
        borderRadius: 40,
        justifyContent: "center",
        alignItems: "center",
    },
    title: {
        fontSize: typography.size["3xl"],
        fontWeight: typography.weight.bold,
        marginBottom: spacing.sm,
    },
    subtitle: {
        fontSize: typography.size.base,
        textAlign: "center",
        paddingHorizontal: 40,
    },
    content: {
        paddingHorizontal: spacing.xl,
    },
    gradientButton: {
        paddingVertical: 16,
        alignItems: "center",
        justifyContent: "center",
    },
    dividerContainer: {
        flexDirection: "row",
        alignItems: "center",
        marginVertical: 32,
    },
    divider: {
        flex: 1,
        height: 1,
    },
    dividerText: {
        marginHorizontal: spacing.md,
        fontSize: typography.size.sm,
    },
    form: {
        gap: spacing.md,
    },
    inputContainer: {
        flexDirection: "row",
        alignItems: "center",
        height: 52,
        borderRadius: borderRadius.md,
        paddingHorizontal: spacing.lg,
        borderWidth: 1,
    },
    inputIcon: {
        marginRight: spacing.sm,
    },
    input: {
        flex: 1,
        fontSize: typography.size.base,
    },
    submitButton: {
        borderRadius: borderRadius.lg,
        overflow: "hidden",
        marginTop: spacing.md,
    },
    submitButtonText: {
        color: "#FFF",
        fontSize: typography.size.lg,
        fontWeight: typography.weight.bold,
    },
    footer: {
        flexDirection: "row",
        justifyContent: "center",
        marginTop: 40,
    },
    footerText: {
        fontSize: typography.size.base,
    },
    signUpText: {
        color: colors.primary.cyan,
        fontSize: typography.size.base,
        fontWeight: typography.weight.bold,
    },
});
