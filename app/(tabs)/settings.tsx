import { View, Text, StyleSheet, Pressable, useColorScheme, Switch, ScrollView, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { colors, spacing, borderRadius, typography } from "../../src/theme/tokens";
import { auth } from "../../src/lib/firebase";
import { signOut } from "firebase/auth";
import { useRouter } from "expo-router";
import { LogOut, User, Globe, Moon, Bell, ChevronRight, Layout } from "lucide-react-native";
import { useTranslation } from "react-i18next";
import { useI18nStore } from "../../src/lib/store";

export default function SettingsScreen() {
    const colorScheme = useColorScheme() || "light";
    const themeColors = colors[colorScheme];
    const user = auth.currentUser;
    const router = useRouter();
    const { t, i18n } = useTranslation();
    const { language, setLanguage } = useI18nStore();

    const handleLogout = async () => {
        Alert.alert(
            "Logout",
            "Sicuro di voler uscire?",
            [
                { text: "Annulla", style: "cancel" },
                {
                    text: "Esci",
                    style: "destructive",
                    onPress: async () => {
                        await signOut(auth);
                        router.replace("/login");
                    }
                }
            ]
        );
    };

    const toggleLanguage = () => {
        const newLang = language === "it" ? "en" : "it";
        setLanguage(newLang);
        i18n.changeLanguage(newLang);
    };

    const SettingItem = ({ icon: Icon, label, value, onPress, showChevron = true }: any) => (
        <Pressable
            onPress={onPress}
            style={[styles.settingItem, { backgroundColor: themeColors.surface, borderColor: themeColors.border }]}
        >
            <View style={styles.settingMain}>
                <View style={[styles.iconBox, { backgroundColor: colors.primary.cyan + '15' }]}>
                    {(() => { const I = Icon as any; return <I size={20} color={colors.primary.cyan} />; })()}
                </View>
                <Text style={[styles.settingLabel, { color: themeColors.textPrimary }]}>{label}</Text>
            </View>
            <View style={styles.settingRight}>
                {value && <Text style={[styles.settingValue, { color: themeColors.textSecondary }]}>{value}</Text>}
                {(() => { const I = ChevronRight as any; return <I size={18} color={themeColors.textTertiary} />; })()}
            </View>
        </Pressable>
    );

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: themeColors.background }]}>
            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                <View style={styles.header}>
                    <Text style={[styles.title, { color: themeColors.textPrimary }]}>Gestione</Text>
                </View>

                {/* Profile Section */}
                <View style={[styles.profileCard, { backgroundColor: themeColors.surface }]}>
                    <View style={[styles.avatar, { backgroundColor: colors.primary.cyan }]}>
                        <Text style={styles.avatarText}>{user?.email?.charAt(0).toUpperCase()}</Text>
                    </View>
                    <View style={styles.profileInfo}>
                        <Text style={[styles.userName, { color: themeColors.textPrimary }]}>{user?.email?.split('@')[0]}</Text>
                        <Text style={[styles.userEmail, { color: themeColors.textSecondary }]}>{user?.email}</Text>
                    </View>
                    <Pressable style={styles.editProfileBtn}>
                        <ChevronRight size={20} color={themeColors.textTertiary} />
                    </Pressable>
                </View>

                {/* Settings Groups */}
                <View style={styles.settingsGroup}>
                    <Text style={[styles.groupTitle, { color: themeColors.textTertiary }]}>PREFERENZE</Text>
                    <View style={[styles.groupCard, { backgroundColor: themeColors.surface }]}>
                        <SettingItem
                            icon={Globe}
                            label="Lingua"
                            value={language === "it" ? "Italiano" : "English"}
                            onPress={toggleLanguage}
                        />
                        <View style={[styles.divider, { backgroundColor: themeColors.border }]} />
                        <SettingItem
                            icon={Bell}
                            label="Notifiche"
                            value="Attive"
                            onPress={() => { }}
                        />
                        <View style={[styles.divider, { backgroundColor: themeColors.border }]} />
                        <SettingItem
                            icon={Moon}
                            label="Tema Dark"
                            onPress={() => { }}
                        />
                    </View>
                </View>

                <View style={[styles.settingsGroup, { marginTop: spacing.xl }]}>
                    <Text style={[styles.groupTitle, { color: themeColors.textTertiary }]}>PERSONALIZZAZIONE</Text>
                    <View style={[styles.groupCard, { backgroundColor: themeColors.surface }]}>
                        <SettingItem
                            icon={Layout}
                            label="Aree e Attività"
                            onPress={() => router.push("/manage-data")}
                        />
                    </View>
                </View>

                <Pressable
                    onPress={handleLogout}
                    style={[styles.logoutButton, { backgroundColor: colors.secondary.red + '10' }]}
                >
                    <LogOut size={20} color={colors.secondary.red} />
                    <Text style={[styles.logoutText, { color: colors.secondary.red }]}>Esci dall'Account</Text>
                </Pressable>

                <View style={styles.footer}>
                    <Text style={[styles.versionText, { color: themeColors.textTertiary }]}>Cronoapp Premium v1.0.0</Text>
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    scrollContent: {
        padding: spacing.xl,
    },
    header: {
        marginBottom: spacing.xl,
    },
    title: {
        fontSize: typography.size["3xl"],
        fontWeight: typography.weight.bold,
    },
    profileCard: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: spacing.xl,
        borderRadius: 24,
        marginBottom: spacing["2xl"],
        elevation: 4,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.05,
        shadowRadius: 10,
    },
    avatar: {
        width: 64,
        height: 64,
        borderRadius: 32,
        justifyContent: 'center',
        alignItems: 'center',
    },
    avatarText: {
        color: '#FFF',
        fontSize: 28,
        fontWeight: typography.weight.bold,
    },
    profileInfo: {
        flex: 1,
        marginLeft: spacing.lg,
    },
    userName: {
        fontSize: typography.size.xl,
        fontWeight: typography.weight.bold,
    },
    userEmail: {
        fontSize: typography.size.sm,
        marginTop: 2,
    },
    editProfileBtn: {
        width: 32,
        height: 32,
        justifyContent: 'center',
        alignItems: 'center',
    },
    settingsGroup: {
        marginBottom: spacing.lg,
    },
    groupTitle: {
        fontSize: 10,
        fontWeight: typography.weight.bold,
        letterSpacing: 1.5,
        marginBottom: spacing.sm,
        marginLeft: spacing.md,
    },
    groupCard: {
        borderRadius: 24,
        overflow: 'hidden',
        elevation: 2,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 5,
    },
    divider: {
        height: 1,
        opacity: 0.1,
        marginHorizontal: spacing.xl,
    },
    settingItem: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: spacing.lg,
        paddingHorizontal: spacing.xl,
    },
    settingMain: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    iconBox: {
        width: 40,
        height: 40,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: spacing.lg,
    },
    settingLabel: {
        fontSize: typography.size.base,
        fontWeight: typography.weight.semibold,
    },
    settingRight: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    settingValue: {
        fontSize: typography.size.sm,
        marginRight: spacing.sm,
    },
    logoutButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        padding: spacing.xl,
        borderRadius: 24,
        marginTop: spacing["2xl"],
        gap: spacing.md,
    },
    logoutText: {
        fontSize: typography.size.base,
        fontWeight: typography.weight.bold,
    },
    footer: {
        alignItems: 'center',
        marginTop: spacing["2xl"],
        paddingBottom: spacing.xl,
    },
    versionText: {
        fontSize: typography.size.xs,
        letterSpacing: 0.5,
    }
});
