import { View, Text, StyleSheet, Pressable, ScrollView, useColorScheme, TextInput, Modal, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { colors, spacing, borderRadius, typography } from "../src/theme/tokens";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../src/lib/api";
import { Plus, Trash2, ChevronLeft, Layout, Activity as ActivityIcon } from "lucide-react-native";
import { useRouter } from "expo-router";

import { LifeArea, Activity } from "../src/types";
import { Dimensions } from "react-native";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

export default function ManageDataScreen() {
    const colorScheme = useColorScheme() || "light";
    const themeColors = colors[colorScheme];
    const queryClient = useQueryClient();
    const router = useRouter();

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [modalType, setModalType] = useState<"area" | "activity">("area");
    const [newItemName, setNewItemName] = useState("");
    const [selectedAreaId, setSelectedAreaId] = useState("");

    const { data: areas = [] } = useQuery<LifeArea[]>({ queryKey: ["lifeAreas"], queryFn: api.getLifeAreas });
    const { data: activities = [] } = useQuery<Activity[]>({ queryKey: ["activities"], queryFn: api.getActivities });

    const createAreaMutation = useMutation({
        mutationFn: (name: string) => api.createLifeArea({ name, color: colors.primary.cyan }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["lifeAreas"] });
            setIsModalOpen(false);
            setNewItemName("");
        }
    });

    const createActivityMutation = useMutation({
        mutationFn: (data: any) => api.createActivity(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["activities"] });
            setIsModalOpen(false);
            setNewItemName("");
        }
    });

    const handleSave = () => {
        if (!newItemName) return;
        if (modalType === "area") {
            createAreaMutation.mutate(newItemName);
        } else {
            if (!selectedAreaId) {
                Alert.alert("Errore", "Seleziona un'Area Life");
                return;
            }
            createActivityMutation.mutate({
                name: newItemName,
                lifeAreaId: selectedAreaId,
                color: areas.find((a) => a.id === selectedAreaId)?.color || colors.primary.cyan
            });
        }
    };

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: themeColors.background }]}>
            <View style={styles.header}>
                <Pressable onPress={() => router.back()} style={styles.backButton}>
                    <ChevronLeft size={28} color={themeColors.textPrimary} />
                </Pressable>
                <Text style={[styles.title, { color: themeColors.textPrimary }]}>Dati App</Text>
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                <View style={styles.introSection}>
                    <Text style={[styles.introTitle, { color: themeColors.textPrimary }]}>Personalizza</Text>
                    <Text style={[styles.introText, { color: themeColors.textSecondary }]}>
                        Gestisci le tue aree di vita e le attività per un monitoraggio accurato.
                    </Text>
                </View>

                {/* Aree Section */}
                <View style={styles.sectionHeader}>
                    <Text style={[styles.sectionTitle, { color: themeColors.textTertiary }]}>AREE LIFE</Text>
                </View>
                <View style={styles.areasGrid}>
                    {areas.map((area) => (
                        <View key={area.id} style={[styles.areaCard, { backgroundColor: themeColors.surface }]}>
                            <View style={[styles.areaIcon, { backgroundColor: area.color }]}>
                                <Layout size={20} color="#FFF" />
                            </View>
                            <Text style={[styles.areaName, { color: themeColors.textPrimary }]} numberOfLines={1}>
                                {area.name}
                            </Text>
                        </View>
                    ))}
                </View>

                {/* Attività Section */}
                <View style={[styles.sectionHeader, { marginTop: spacing["2xl"] }]}>
                    <View style={styles.sectionHeaderRow}>
                        <Text style={[styles.sectionTitle, { color: themeColors.textTertiary }]}>ATTIVITÀ</Text>
                        <Pressable
                            onPress={() => { setModalType("activity"); setSelectedAreaId(""); setIsModalOpen(true); }}
                            style={[styles.addButton, { borderColor: themeColors.border }]}
                        >
                            <Plus size={14} color={themeColors.textSecondary} />
                            <Text style={[styles.addButtonText, { color: themeColors.textSecondary }]}>Nuova</Text>
                        </Pressable>
                    </View>
                </View>
                <View style={styles.activitiesList}>
                    {activities.map((activity) => {
                        const area = areas.find((a) => a.id === activity.lifeAreaId);
                        return (
                            <View key={activity.id} style={[styles.activityCard, { backgroundColor: themeColors.surface }]}>
                                <View style={[styles.activityIconBox, { backgroundColor: (area?.color || colors.primary.cyan) + '15' }]}>
                                    <ActivityIcon size={20} color={area?.color || colors.primary.cyan} />
                                </View>
                                <View style={styles.activityInfo}>
                                    <Text style={[styles.activityName, { color: themeColors.textPrimary }]}>{activity.name}</Text>
                                    <Text style={[styles.activityArea, { color: themeColors.textSecondary }]}>
                                        {area?.name || "Nessuna Area"}
                                    </Text>
                                </View>
                                <Pressable style={styles.deleteBtn}>
                                    <Trash2 size={18} color={colors.secondary.red} opacity={0.5} />
                                </Pressable>
                            </View>
                        );
                    })}
                </View>
            </ScrollView>

            <Pressable
                style={styles.fab}
                onPress={() => { setModalType("area"); setSelectedAreaId(""); setIsModalOpen(true); }}
            >
                <Plus size={32} color="#FFF" />
            </Pressable>

            {/* Add Modal */}
            <Modal visible={isModalOpen} transparent animationType="slide">
                <View style={styles.modalOverlay}>
                    <View style={[styles.modalContent, { backgroundColor: themeColors.surface }]}>
                        <Text style={[styles.modalTitle, { color: themeColors.textPrimary }]}>
                            {modalType === "area" ? "Nuova Area Life" : "Nuova Attività"}
                        </Text>

                        <TextInput
                            style={[styles.input, { color: themeColors.textPrimary, borderColor: themeColors.border }]}
                            placeholder="Nome..."
                            placeholderTextColor={themeColors.textTertiary}
                            value={newItemName}
                            onChangeText={setNewItemName}
                        />

                        {modalType === "activity" && (
                            <View style={styles.areaPicker}>
                                <Text style={[styles.pickerLabel, { color: themeColors.textSecondary }]}>Seleziona Area:</Text>
                                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                                    {areas.map((a) => (
                                        <Pressable
                                            key={a.id}
                                            onPress={() => setSelectedAreaId(a.id)}
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
                            <Pressable onPress={() => setIsModalOpen(false)} style={styles.cancelButton}>
                                <Text style={{ color: themeColors.textSecondary }}>Annulla</Text>
                            </Pressable>
                            <Pressable onPress={handleSave} style={[styles.saveButton, { backgroundColor: colors.primary.cyan }]}>
                                <Text style={styles.saveButtonText}>Salva</Text>
                            </Pressable>
                        </View>
                    </View>
                </View>
            </Modal>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: spacing.xl,
        paddingTop: spacing.lg,
        paddingBottom: spacing.md,
        gap: spacing.md,
    },
    backButton: {
        marginLeft: -10,
        padding: 4,
    },
    title: {
        fontSize: typography.size["2xl"],
        fontWeight: typography.weight.bold,
    },
    scrollContent: {
        paddingHorizontal: spacing.xl,
        paddingTop: spacing.lg,
        paddingBottom: 100,
    },
    introSection: {
        marginBottom: spacing["2xl"],
    },
    introTitle: {
        fontSize: typography.size["3xl"],
        fontWeight: typography.weight.bold,
    },
    introText: {
        fontSize: typography.size.sm,
        marginTop: 4,
        opacity: 0.8,
    },
    sectionHeader: {
        marginBottom: spacing.lg,
    },
    sectionHeaderRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    sectionTitle: {
        fontSize: 10,
        fontWeight: typography.weight.bold,
        letterSpacing: 1.5,
    },
    addButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 12,
        borderWidth: 1,
    },
    addButtonText: {
        fontSize: typography.size.xs,
        fontWeight: typography.weight.bold,
        letterSpacing: 0.4,
    },
    areasGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: spacing.md,
    },
    areaCard: {
        width: (SCREEN_WIDTH - spacing.xl * 2 - spacing.md) / 2,
        padding: spacing.lg,
        borderRadius: 24,
        alignItems: 'center',
        elevation: 2,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 5,
    },
    areaIcon: {
        width: 44,
        height: 44,
        borderRadius: 22,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: spacing.sm,
    },
    areaName: {
        fontSize: typography.size.sm,
        fontWeight: typography.weight.bold,
    },
    activitiesList: {
        gap: spacing.md,
    },
    activityCard: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: spacing.lg,
        borderRadius: 24,
        elevation: 2,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 5,
    },
    activityIconBox: {
        width: 44,
        height: 44,
        borderRadius: 22,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: spacing.lg,
    },
    activityInfo: {
        flex: 1,
    },
    activityName: {
        fontSize: typography.size.base,
        fontWeight: typography.weight.bold,
    },
    activityArea: {
        fontSize: typography.size.xs,
        marginTop: 2,
    },
    deleteBtn: {
        padding: 8,
    },
    fab: {
        position: 'absolute',
        bottom: spacing.xl,
        right: spacing.xl,
        width: 64,
        height: 64,
        borderRadius: 32,
        backgroundColor: colors.primary.cyan,
        justifyContent: 'center',
        alignItems: 'center',
        elevation: 8,
        shadowColor: colors.primary.cyan,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'flex-end',
    },
    modalContent: {
        padding: spacing.xl,
        borderTopLeftRadius: 32,
        borderTopRightRadius: 32,
        paddingBottom: 40,
    },
    modalTitle: {
        fontSize: typography.size.xl,
        fontWeight: typography.weight.bold,
        marginBottom: spacing.xl,
    },
    input: {
        height: 56,
        borderWidth: 1,
        borderRadius: 16,
        paddingHorizontal: spacing.lg,
        fontSize: typography.size.base,
        marginBottom: spacing.xl,
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
    modalButtons: {
        flexDirection: 'row',
        gap: spacing.md,
    },
    cancelButton: {
        flex: 1,
        height: 56,
        justifyContent: 'center',
        alignItems: 'center',
        borderRadius: 16,
        backgroundColor: 'rgba(0,0,0,0.05)',
    },
    saveButton: {
        flex: 2,
        height: 56,
        justifyContent: 'center',
        alignItems: 'center',
        borderRadius: 16,
    },
    saveButtonText: {
        color: '#FFF',
        fontSize: typography.size.base,
        fontWeight: typography.weight.bold,
    }
});
