import { View, Text, StyleSheet, Pressable, Switch, ScrollView, Alert, Modal, TextInput, KeyboardAvoidingView, Platform, Keyboard } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { colors, spacing, typography } from "../../src/theme/tokens";
import { auth, db } from "../../src/lib/firebase";
import { signOut } from "firebase/auth";
import { useRouter } from "expo-router";
import { LogOut, Globe, Moon, Bell, ChevronRight, Layout, Activity as ActivityIcon, Plus, Trash2, Pencil, Palette } from "lucide-react-native";
import { useI18nStore, useAppColorScheme, useSettingsStore } from "../../src/lib/store";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { useEffect, useState } from "react";
import { ensureNotificationPermissions } from "../../src/lib/notifications";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../../src/lib/api";
import { LifeArea, Activity } from "../../src/types";

export default function SettingsScreen() {
    const colorScheme = useAppColorScheme();
    const themeColors = colors[colorScheme];
    const user = auth.currentUser;
    const router = useRouter();
    const { language, setLanguage } = useI18nStore();
    const { themePreference, notificationsEnabled, setThemePreference, setNotificationsEnabled } = useSettingsStore();
    const [displayName, setDisplayName] = useState("");
    const [draftName, setDraftName] = useState("");
    const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
    const [isSavingProfile, setIsSavingProfile] = useState(false);
    const [isThemeModalOpen, setIsThemeModalOpen] = useState(false);
    const queryClient = useQueryClient();
    const [isDataModalOpen, setIsDataModalOpen] = useState(false);
    const [dataModalType, setDataModalType] = useState<"area" | "activity">("area");
    const [dataModalMode, setDataModalMode] = useState<"create" | "edit">("create");
    const [editingId, setEditingId] = useState<string | null>(null);
    const [itemName, setItemName] = useState("");
    const [selectedAreaId, setSelectedAreaId] = useState("");
    const [selectedColor, setSelectedColor] = useState<string>("");
    const [areaSearch, setAreaSearch] = useState("");
    const [activitySearch, setActivitySearch] = useState("");

    const colorOptions = [
        colors.primary.cyan,
        colors.primary.blue,
        colors.primary.darkBlue,
        colors.secondary.green,
        colors.secondary.red,
        colors.lifeAreas.work,
        colors.lifeAreas.health,
        colors.lifeAreas.relationships,
        colors.lifeAreas.growth,
        colors.lifeAreas.creative,
    ];

    const { data: areas = [] } = useQuery<LifeArea[]>({
        queryKey: ["lifeAreas", user?.uid],
        queryFn: api.getLifeAreas,
        enabled: !!user,
    });
    const { data: activities = [] } = useQuery<Activity[]>({
        queryKey: ["activities", user?.uid],
        queryFn: api.getActivities,
        enabled: !!user,
    });

    const createAreaMutation = useMutation({
        mutationFn: (data: { name: string; color: string }) => api.createLifeArea(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["lifeAreas"] });
            queryClient.invalidateQueries({ queryKey: ["lifeAreas", user?.uid] });
            queryClient.invalidateQueries({ queryKey: ["reports"] });
            setIsDataModalOpen(false);
            setItemName("");
        }
    });

    const updateAreaMutation = useMutation({
        mutationFn: ({ id, name, color }: { id: string; name: string; color: string }) => api.updateLifeArea(id, { name, color }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["lifeAreas"] });
            queryClient.invalidateQueries({ queryKey: ["lifeAreas", user?.uid] });
            queryClient.invalidateQueries({ queryKey: ["reports"] });
            setIsDataModalOpen(false);
            setItemName("");
            setEditingId(null);
        }
    });

    const deleteAreaMutation = useMutation({
        mutationFn: (id: string) => api.deleteLifeArea(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["lifeAreas"] });
            queryClient.invalidateQueries({ queryKey: ["lifeAreas", user?.uid] });
            queryClient.invalidateQueries({ queryKey: ["activities"] });
            queryClient.invalidateQueries({ queryKey: ["activities", user?.uid] });
            queryClient.invalidateQueries({ queryKey: ["reports"] });
        }
    });

    const createActivityMutation = useMutation({
        mutationFn: (data: any) => api.createActivity(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["activities"] });
            queryClient.invalidateQueries({ queryKey: ["activities", user?.uid] });
            queryClient.invalidateQueries({ queryKey: ["reports"] });
            setIsDataModalOpen(false);
            setItemName("");
        }
    });

    const updateActivityMutation = useMutation({
        mutationFn: ({ id, data }: { id: string; data: any }) => api.updateActivity(id, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["activities"] });
            queryClient.invalidateQueries({ queryKey: ["activities", user?.uid] });
            queryClient.invalidateQueries({ queryKey: ["reports"] });
            setIsDataModalOpen(false);
            setItemName("");
            setEditingId(null);
        }
    });

    const deleteActivityMutation = useMutation({
        mutationFn: (id: string) => api.deleteActivity(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["activities"] });
            queryClient.invalidateQueries({ queryKey: ["activities", user?.uid] });
            queryClient.invalidateQueries({ queryKey: ["reports"] });
        }
    });

    useEffect(() => {
        const loadProfile = async () => {
            if (!user) return;
            const userRef = doc(db, "users", user.uid);
            const snapshot = await getDoc(userRef);
            const fallbackName = user.email?.split("@")[0] || "Utente";
            if (!snapshot.exists()) {
                setDisplayName(fallbackName);
                return;
            }
            const storedName = snapshot.data().displayName;
            setDisplayName(storedName || fallbackName);
        };
        loadProfile();
    }, [user?.uid]);

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
    };

    const handleSaveProfile = async () => {
        if (!user) return;
        const trimmed = draftName.trim();
        if (!trimmed) {
            Alert.alert("Errore", "Inserisci un nome valido");
            return;
        }
        setIsSavingProfile(true);
        try {
            const userRef = doc(db, "users", user.uid);
            await setDoc(userRef, { displayName: trimmed }, { merge: true });
            setDisplayName(trimmed);
            setIsProfileModalOpen(false);
        } catch (error) {
            Alert.alert("Errore", "Impossibile salvare il profilo");
        } finally {
            setIsSavingProfile(false);
        }
    };

    const themeLabel = themePreference === "system" ? "Sistema" : themePreference === "dark" ? "Scuro" : "Chiaro";
    const themeOptions = [
        { label: "Sistema", value: "system" as const },
        { label: "Chiaro", value: "light" as const },
        { label: "Scuro", value: "dark" as const },
    ];

    const handleToggleNotifications = async (nextValue: boolean) => {
        if (nextValue) {
            const granted = await ensureNotificationPermissions();
            if (!granted) {
                Alert.alert("Notifiche disattivate", "Abilita le notifiche dalle impostazioni del dispositivo.");
                return;
            }
        }
        setNotificationsEnabled(nextValue);
    };

    const openDataModal = (type: "area" | "activity", mode: "create" | "edit", payload?: LifeArea | Activity) => {
        setDataModalType(type);
        setDataModalMode(mode);
        if (mode === "edit" && payload) {
            setEditingId(payload.id);
            setItemName(payload.name);
            if (type === "activity") {
                const areaColor = areas.find((a) => a.id === (payload as Activity).lifeAreaId)?.color;
                setSelectedColor(payload.color || areaColor || colors.primary.cyan);
            } else {
                setSelectedColor(payload.color || colors.primary.cyan);
            }
            if (type === "activity") {
                setSelectedAreaId((payload as Activity).lifeAreaId);
            }
        } else {
            setEditingId(null);
            setItemName("");
            setSelectedAreaId("");
            setSelectedColor(colors.primary.cyan);
        }
        setIsDataModalOpen(true);
    };

    const handleSaveData = () => {
        if (!itemName) return;
        if (dataModalType === "area") {
            const color = selectedColor || colors.primary.cyan;
            if (dataModalMode === "edit" && editingId) {
                updateAreaMutation.mutate({ id: editingId, name: itemName, color });
            } else {
                createAreaMutation.mutate({ name: itemName, color });
            }
            return;
        }

        if (!selectedAreaId) {
            Alert.alert("Errore", "Seleziona un'Area Life");
            return;
        }

        const payload = {
            name: itemName,
            lifeAreaId: selectedAreaId,
            color: selectedColor || areas.find((a) => a.id === selectedAreaId)?.color || colors.primary.cyan,
        };

        if (dataModalMode === "edit" && editingId) {
            updateActivityMutation.mutate({ id: editingId, data: payload });
        } else {
            createActivityMutation.mutate(payload);
        }
    };

    const confirmDeleteArea = (area: LifeArea) => {
        Alert.alert(
            "Elimina area",
            "Vuoi eliminare questa area e tutte le attività collegate?",
            [
                { text: "Annulla", style: "cancel" },
                { text: "Elimina", style: "destructive", onPress: () => deleteAreaMutation.mutate(area.id) }
            ]
        );
    };

    const confirmDeleteActivity = (activity: Activity) => {
        Alert.alert(
            "Elimina attività",
            "Vuoi eliminare questa attività?",
            [
                { text: "Annulla", style: "cancel" },
                { text: "Elimina", style: "destructive", onPress: () => deleteActivityMutation.mutate(activity.id) }
            ]
        );
    };

    const SettingItem = ({ icon: Icon, label, value, onPress, showChevron = true, rightElement }: any) => (
        <Pressable
            onPress={onPress}
            disabled={!onPress}
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
                {rightElement || (showChevron ? (() => { const I = ChevronRight as any; return <I size={18} color={themeColors.textTertiary} />; })() : null)}
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
                        <Text style={styles.avatarText}>{(displayName || user?.email || "U").charAt(0).toUpperCase()}</Text>
                    </View>
                    <View style={styles.profileInfo}>
                        <Text style={[styles.userName, { color: themeColors.textPrimary }]}>{displayName || user?.email?.split('@')[0]}</Text>
                        <Text style={[styles.userEmail, { color: themeColors.textSecondary }]}>{user?.email}</Text>
                    </View>
                    <Pressable
                        style={styles.editProfileBtn}
                        onPress={() => {
                            setDraftName(displayName || user?.email?.split("@")[0] || "");
                            setIsProfileModalOpen(true);
                        }}
                    >
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
                            onPress={() => handleToggleNotifications(!notificationsEnabled)}
                            showChevron={false}
                            rightElement={
                                <Switch
                                    value={notificationsEnabled}
                                    onValueChange={handleToggleNotifications}
                                    trackColor={{ false: themeColors.border, true: colors.primary.cyan + "55" }}
                                    thumbColor={notificationsEnabled ? colors.primary.cyan : themeColors.textTertiary}
                                    ios_backgroundColor={themeColors.border}
                                />
                            }
                        />
                        <View style={[styles.divider, { backgroundColor: themeColors.border }]} />
                        <SettingItem
                            icon={Moon}
                            label="Tema"
                            value={themeLabel}
                            onPress={() => setIsThemeModalOpen(true)}
                        />
                    </View>
                </View>

                <View style={styles.settingsGroup}>
                    <View style={styles.dataHeaderRow}>
                        <Text style={[styles.groupTitle, { color: themeColors.textTertiary }]}>DATI</Text>
                        <Pressable
                            onPress={() => openDataModal("area", "create")}
                            style={[styles.dataAddButton, { borderColor: themeColors.border }]}
                        >
                            <Plus size={14} color={themeColors.textSecondary} />
                            <Text style={[styles.dataAddText, { color: themeColors.textSecondary }]}>Nuova area</Text>
                        </Pressable>
                    </View>
                    <View style={[styles.dataCard, { backgroundColor: themeColors.surface }]}>
                        <View style={styles.dataSectionHeader}>
                            <Layout size={16} color={themeColors.textSecondary} />
                            <Text style={[styles.dataSectionTitle, { color: themeColors.textSecondary }]}>Aree di vita</Text>
                        </View>
                        <TextInput
                            style={[styles.searchInput, { color: themeColors.textPrimary, borderColor: themeColors.border }]}
                            placeholder="Cerca area..."
                            placeholderTextColor={themeColors.textTertiary}
                            value={areaSearch}
                            onChangeText={setAreaSearch}
                        />
                        {areas
                            .filter((area) => area.name.toLowerCase().includes(areaSearch.trim().toLowerCase()))
                            .map((area) => (
                            <View key={area.id} style={[styles.dataRow, { borderColor: themeColors.border, backgroundColor: themeColors.background }]}>
                                <View style={styles.dataRowLeft}>
                                    <View style={[styles.dataDot, { backgroundColor: area.color }]} />
                                    <Text style={[styles.dataRowTitle, { color: themeColors.textPrimary }]} numberOfLines={1}>
                                        {area.name}
                                    </Text>
                                </View>
                                <View style={styles.dataRowActions}>
                                    <Pressable onPress={() => openDataModal("area", "edit", area)} style={styles.dataIconButton}>
                                        <Pencil size={16} color={themeColors.textSecondary} />
                                    </Pressable>
                                    <Pressable onPress={() => confirmDeleteArea(area)} style={styles.dataIconButton}>
                                        <Trash2 size={16} color={colors.secondary.red} />
                                    </Pressable>
                                </View>
                            </View>
                        ))}
                        {areas.length === 0 && (
                            <Text style={[styles.dataEmptyText, { color: themeColors.textTertiary }]}>Nessuna area salvata.</Text>
                        )}
                    </View>

                    <View style={[styles.dataCard, { backgroundColor: themeColors.surface, marginTop: spacing.lg }]}>
                        <View style={styles.dataSectionHeader}>
                            <ActivityIcon size={16} color={themeColors.textSecondary} />
                            <Text style={[styles.dataSectionTitle, { color: themeColors.textSecondary }]}>Attività</Text>
                            <Pressable
                                onPress={() => openDataModal("activity", "create")}
                                style={[styles.dataInlineAdd, { borderColor: themeColors.border }]}
                            >
                                <Plus size={12} color={themeColors.textSecondary} />
                                <Text style={[styles.dataInlineAddText, { color: themeColors.textSecondary }]}>Nuova</Text>
                            </Pressable>
                        </View>
                        <TextInput
                            style={[styles.searchInput, { color: themeColors.textPrimary, borderColor: themeColors.border }]}
                            placeholder="Cerca attività..."
                            placeholderTextColor={themeColors.textTertiary}
                            value={activitySearch}
                            onChangeText={setActivitySearch}
                        />
                        {activities
                            .filter((activity) => activity.name.toLowerCase().includes(activitySearch.trim().toLowerCase()))
                            .map((activity) => {
                                const area = areas.find((a) => a.id === activity.lifeAreaId);
                                return (
                                    <View key={activity.id} style={[styles.dataRow, { borderColor: themeColors.border, backgroundColor: themeColors.background }]}>
                                        <View style={styles.dataRowLeft}>
                                            <View style={[styles.dataDot, { backgroundColor: activity.color || area?.color || colors.primary.cyan }]} />
                                            <View style={styles.dataRowText}>
                                                <Text style={[styles.dataRowTitle, { color: themeColors.textPrimary }]} numberOfLines={1}>
                                                    {activity.name}
                                                </Text>
                                                <Text style={[styles.dataRowSubtitle, { color: themeColors.textTertiary }]} numberOfLines={1}>
                                                    {area?.name || "Nessuna area"}
                                                </Text>
                                            </View>
                                        </View>
                                        <View style={styles.dataRowActions}>
                                            <Pressable onPress={() => openDataModal("activity", "edit", activity)} style={styles.dataIconButton}>
                                                <Pencil size={16} color={themeColors.textSecondary} />
                                            </Pressable>
                                            <Pressable onPress={() => confirmDeleteActivity(activity)} style={styles.dataIconButton}>
                                                <Trash2 size={16} color={colors.secondary.red} />
                                            </Pressable>
                                        </View>
                                    </View>
                                );
                            })}
                        {activities.length === 0 && (
                            <Text style={[styles.dataEmptyText, { color: themeColors.textTertiary }]}>Nessuna attività salvata.</Text>
                        )}
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

            <Modal visible={isProfileModalOpen} transparent animationType="slide">
                <View style={styles.modalOverlay}>
                    <View style={[styles.modalContent, { backgroundColor: themeColors.surface }]}>
                        <Text style={[styles.modalTitle, { color: themeColors.textPrimary }]}>Profilo</Text>
                        <TextInput
                            style={[styles.input, { color: themeColors.textPrimary, borderColor: themeColors.border }]}
                            placeholder="Nome profilo"
                            placeholderTextColor={themeColors.textTertiary}
                            value={draftName}
                            onChangeText={setDraftName}
                        />
                        <View style={styles.modalButtons}>
                            <Pressable
                                onPress={() => setIsProfileModalOpen(false)}
                                style={[styles.cancelButton, { backgroundColor: themeColors.background }]}
                            >
                                <Text style={{ color: themeColors.textSecondary }}>Annulla</Text>
                            </Pressable>
                            <Pressable
                                onPress={handleSaveProfile}
                                style={[styles.saveButton, { backgroundColor: colors.primary.cyan }]}
                                disabled={isSavingProfile}
                            >
                                <Text style={styles.saveButtonText}>{isSavingProfile ? "Salvo..." : "Salva"}</Text>
                            </Pressable>
                        </View>
                    </View>
                </View>
            </Modal>

            <Modal visible={isThemeModalOpen} transparent animationType="slide">
                <View style={styles.modalOverlay}>
                    <View style={[styles.modalContent, { backgroundColor: themeColors.surface }]}>
                        <Text style={[styles.modalTitle, { color: themeColors.textPrimary }]}>Tema</Text>
                        {themeOptions.map((option) => (
                            <Pressable
                                key={option.value}
                                onPress={() => {
                                    setThemePreference(option.value);
                                    setIsThemeModalOpen(false);
                                }}
                                style={[
                                    styles.themeOption,
                                    { borderColor: themeColors.border },
                                    themePreference === option.value && { backgroundColor: colors.primary.cyan + "15" },
                                ]}
                            >
                                <Text style={[styles.themeOptionText, { color: themeColors.textPrimary }]}>{option.label}</Text>
                                {themePreference === option.value ? (
                                    <View style={[styles.themeCheckDot, { backgroundColor: colors.primary.cyan }]} />
                                ) : (
                                    <View style={[styles.themeCheckDot, { backgroundColor: themeColors.border }]} />
                                )}
                            </Pressable>
                        ))}
                        <Pressable
                            onPress={() => setIsThemeModalOpen(false)}
                            style={[styles.cancelButton, { backgroundColor: themeColors.background, marginTop: spacing.lg }]}
                        >
                            <Text style={{ color: themeColors.textSecondary }}>Chiudi</Text>
                        </Pressable>
                    </View>
                </View>
            </Modal>

            <Modal visible={isDataModalOpen} transparent animationType="slide">
                <KeyboardAvoidingView
                    style={[styles.modalOverlay, { paddingTop: spacing["3xl"] }]}
                    behavior={Platform.OS === "ios" ? "padding" : undefined}
                    keyboardVerticalOffset={80}
                >
                    <ScrollView contentContainerStyle={[styles.modalContent, { backgroundColor: themeColors.surface }]} keyboardShouldPersistTaps="handled">
                        <View style={styles.modalHeaderRow}>
                            <Text style={[styles.modalTitle, { color: themeColors.textPrimary, marginBottom: 0 }]}>
                            {dataModalType === "area"
                                ? (dataModalMode === "edit" ? "Modifica area" : "Nuova area")
                                : (dataModalMode === "edit" ? "Modifica attività" : "Nuova attività")}
                            </Text>
                            {Platform.OS === "ios" && (
                                <Pressable onPress={() => Keyboard.dismiss()} style={styles.doneButton}>
                                    <Text style={[styles.doneButtonText, { color: themeColors.textSecondary }]}>Fine</Text>
                                </Pressable>
                            )}
                        </View>
                        <TextInput
                            style={[styles.input, { color: themeColors.textPrimary, borderColor: themeColors.border }]}
                            placeholder="Nome..."
                            placeholderTextColor={themeColors.textTertiary}
                            value={itemName}
                            onChangeText={setItemName}
                        />
                        <View style={styles.colorPickerRow}>
                            <View style={styles.colorPickerLabel}>
                                <Palette size={16} color={themeColors.textSecondary} />
                                <Text style={[styles.colorPickerText, { color: themeColors.textSecondary }]}>Colore</Text>
                            </View>
                            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                                {colorOptions.map((color, index) => (
                                    <Pressable
                                        key={`${color}-${index}`}
                                        onPress={() => setSelectedColor(color)}
                                        style={[
                                            styles.colorSwatch,
                                            { backgroundColor: color, borderColor: themeColors.border },
                                            selectedColor === color && { borderColor: themeColors.textPrimary, borderWidth: 2 }
                                        ]}
                                    />
                                ))}
                            </ScrollView>
                        </View>
                        {dataModalType === "activity" && (
                            <View style={styles.areaPicker}>
                                <Text style={[styles.pickerLabel, { color: themeColors.textSecondary }]}>Seleziona Area:</Text>
                                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                                    {areas.map((a) => (
                                        <Pressable
                                            key={a.id}
                                            onPress={() => {
                                                setSelectedAreaId(a.id);
                                                setSelectedColor(a.color);
                                            }}
                                            style={[
                                                styles.pickerPill,
                                                { borderColor: a.color },
                                                selectedAreaId === a.id && { backgroundColor: a.color }
                                            ]}
                                        >
                                            <Text style={[styles.pickerPillText, { color: selectedAreaId === a.id ? "#FFF" : a.color }]}>{a.name}</Text>
                                        </Pressable>
                                    ))}
                                </ScrollView>
                            </View>
                        )}
                        <View style={styles.modalButtons}>
                            <Pressable
                                onPress={() => setIsDataModalOpen(false)}
                                style={[styles.cancelButton, { backgroundColor: themeColors.background }]}
                            >
                                <Text style={{ color: themeColors.textSecondary }}>Annulla</Text>
                            </Pressable>
                            <Pressable
                                onPress={handleSaveData}
                                style={[styles.saveButton, { backgroundColor: colors.primary.cyan }]}
                            >
                                <Text style={styles.saveButtonText}>Salva</Text>
                            </Pressable>
                        </View>
                    </ScrollView>
                </KeyboardAvoidingView>
            </Modal>
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
    modalOverlay: {
        flex: 1,
        backgroundColor: "rgba(0,0,0,0.5)",
        justifyContent: "flex-end",
    },
    modalContent: {
        padding: spacing.xl,
        borderTopLeftRadius: 32,
        borderTopRightRadius: 32,
        paddingBottom: spacing["2xl"],
    },
    modalTitle: {
        fontSize: typography.size.xl,
        fontWeight: typography.weight.bold,
        marginBottom: spacing.xl,
    },
    modalHeaderRow: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        marginBottom: spacing.xl,
    },
    doneButton: {
        paddingHorizontal: spacing.md,
        paddingVertical: 6,
        borderRadius: 12,
        backgroundColor: "rgba(0,0,0,0.05)",
    },
    doneButtonText: {
        fontSize: typography.size.sm,
        fontWeight: typography.weight.bold,
    },
    input: {
        height: 56,
        borderWidth: 1,
        borderRadius: 16,
        paddingHorizontal: spacing.lg,
        fontSize: typography.size.base,
        marginBottom: spacing.xl,
    },
    modalButtons: {
        flexDirection: "row",
        gap: spacing.md,
    },
    cancelButton: {
        flex: 1,
        height: 56,
        justifyContent: "center",
        alignItems: "center",
        borderRadius: 16,
    },
    saveButton: {
        flex: 2,
        height: 56,
        justifyContent: "center",
        alignItems: "center",
        borderRadius: 16,
    },
    saveButtonText: {
        color: "#FFF",
        fontSize: typography.size.base,
        fontWeight: typography.weight.bold,
    },
    themeOption: {
        borderWidth: 1,
        borderRadius: 16,
        paddingVertical: spacing.lg,
        paddingHorizontal: spacing.lg,
        marginBottom: spacing.md,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
    },
    themeOptionText: {
        fontSize: typography.size.base,
        fontWeight: typography.weight.bold,
    },
    themeCheckDot: {
        width: 12,
        height: 12,
        borderRadius: 6,
    },
    dataHeaderRow: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        marginBottom: spacing.sm,
        marginLeft: spacing.md,
    },
    dataAddButton: {
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 12,
        borderWidth: 1,
    },
    dataAddText: {
        fontSize: typography.size.xs,
        fontWeight: typography.weight.bold,
        letterSpacing: 0.4,
    },
    dataCard: {
        borderRadius: 20,
        padding: spacing.lg,
        gap: spacing.sm,
        elevation: 2,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 5,
    },
    dataSectionHeader: {
        flexDirection: "row",
        alignItems: "center",
        gap: spacing.sm,
        marginBottom: spacing.sm,
    },
    dataSectionTitle: {
        fontSize: typography.size.xs,
        fontWeight: typography.weight.bold,
        letterSpacing: 1.2,
        textTransform: "uppercase",
        flex: 1,
    },
    dataInlineAdd: {
        flexDirection: "row",
        alignItems: "center",
        gap: 4,
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 10,
        borderWidth: 1,
    },
    dataInlineAddText: {
        fontSize: typography.size.xs,
        fontWeight: typography.weight.bold,
        letterSpacing: 0.3,
    },
    dataRow: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingVertical: spacing.sm,
        paddingHorizontal: spacing.md,
        borderWidth: 1,
        borderRadius: 14,
        marginBottom: spacing.sm,
    },
    dataRowLeft: {
        flexDirection: "row",
        alignItems: "center",
        flex: 1,
        gap: spacing.sm,
    },
    dataDot: {
        width: 12,
        height: 12,
        borderRadius: 6,
    },
    dataRowText: {
        flex: 1,
    },
    dataRowTitle: {
        fontSize: typography.size.base,
        fontWeight: typography.weight.bold,
    },
    dataRowSubtitle: {
        fontSize: typography.size.sm,
        marginTop: 2,
    },
    dataRowActions: {
        flexDirection: "row",
        gap: spacing.sm,
    },
    dataIconButton: {
        padding: 6,
        borderRadius: 10,
        backgroundColor: "rgba(0,0,0,0.04)",
    },
    dataEmptyText: {
        fontSize: typography.size.sm,
        paddingVertical: spacing.sm,
    },
    searchInput: {
        height: 44,
        borderWidth: 1,
        borderRadius: 12,
        paddingHorizontal: spacing.md,
        fontSize: typography.size.sm,
        marginBottom: spacing.sm,
    },
    colorPickerRow: {
        marginBottom: spacing.lg,
    },
    colorPickerLabel: {
        flexDirection: "row",
        alignItems: "center",
        gap: spacing.sm,
        marginBottom: spacing.sm,
    },
    colorPickerText: {
        fontSize: typography.size.sm,
        fontWeight: typography.weight.bold,
    },
    colorSwatch: {
        width: 28,
        height: 28,
        borderRadius: 14,
        marginRight: spacing.sm,
        borderWidth: 1,
    },
    areaPicker: {
        marginBottom: spacing["2xl"],
    },
    pickerLabel: {
        fontSize: typography.size.sm,
        fontWeight: typography.weight.bold,
        marginBottom: spacing.md,
    },
    pickerPill: {
        paddingHorizontal: spacing.lg,
        paddingVertical: 10,
        borderRadius: 20,
        borderWidth: 1,
        marginRight: spacing.sm,
    },
    pickerPillText: {
        fontSize: typography.size.xs,
        fontWeight: typography.weight.bold,
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
