import { View, Text, StyleSheet, ScrollView, Pressable, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { colors, spacing, borderRadius, typography } from "../../src/theme/tokens";
import { useState, useEffect, useRef } from "react";
import Animated, { FadeInDown, ZoomIn, FadeOut, withRepeat, withSequence, withTiming, useAnimatedStyle, useSharedValue } from "react-native-reanimated";
import { Clock, Play, Square } from "lucide-react-native";
import { api } from "../../src/lib/api";
import { auth } from "../../src/lib/firebase";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { LifeArea, Activity, TimeEntry } from "../../src/types";
import { useAppColorScheme } from "../../src/lib/store";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import LiveMonitor from "../../modules/live-monitor";

function PulseDot() {
    const opacity = useSharedValue(1);
    useEffect(() => {
        opacity.value = withRepeat(withSequence(withTiming(0.4, { duration: 800 }), withTiming(1, { duration: 800 })), -1);
    }, []);
    const style = useAnimatedStyle(() => ({ opacity: opacity.value }));
    return <Animated.View style={[styles.pulseDot, style]} />;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export default function TimerScreen() {
    const colorScheme = useAppColorScheme();
    const themeColors = colors[colorScheme];
    const [activeTab, setActiveTab] = useState("Tutte");
    const [activeEntry, setActiveEntry] = useState<TimeEntry | null>(null);
    const queryClient = useQueryClient();

    // Fetch Life Areas
    const user = auth.currentUser;

    const { data: lifeAreas = [] } = useQuery<LifeArea[]>({
        queryKey: ["lifeAreas", user?.uid],
        queryFn: () => api.getLifeAreas(),
        enabled: !!user,
    });

    // Fetch Activities
    const { data: activities = [], isLoading: isLoadingActivities } = useQuery<Activity[]>({
        queryKey: ["activities", user?.uid],
        queryFn: () => api.getActivities(),
        enabled: !!user,
    });

    // Listener for Active Timer
    useEffect(() => {
        let unsubscribe: (() => void) | undefined;
        api.getActiveEntry((entry) => {
            setActiveEntry(entry);
        }).then(unsub => {
            unsubscribe = unsub;
        });
        return () => unsubscribe && unsubscribe();
    }, []);

    const startTimerMutation = useMutation({
        mutationFn: (activityId: string) => api.startEntry(activityId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["timeEntries"] });
            queryClient.invalidateQueries({ queryKey: ["reports"] });
        }
    });

    const stopTimerMutation = useMutation({
        mutationFn: (entryId: string) => api.stopEntry(entryId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["timeEntries"] });
            queryClient.invalidateQueries({ queryKey: ["reports"] });
        }
    });

    const filteredActivities = activeTab === "Tutte"
        ? activities
        : activities.filter((a) => a.lifeAreaId === lifeAreas.find((la) => la.name === activeTab)?.id);

    const formatTime = (seconds: number) => {
        const h = Math.floor(seconds / 3600);
        const m = Math.floor((seconds % 3600) / 60);
        const s = seconds % 60;
        return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    };

    const [elapsed, setElapsed] = useState(0);
    const timerGlow = useSharedValue(0);
    const timerAuraStyle = useAnimatedStyle(() => ({
        opacity: timerGlow.value * 0.25,
        transform: [{ scale: 1 + timerGlow.value * 0.08 }],
    }));
    const trackingBadgeStyle = useAnimatedStyle(() => ({
        transform: [{ scale: 1 + timerGlow.value * 0.02 }],
        opacity: 0.9 + timerGlow.value * 0.1,
    }));
    const prevEntryIdRef = useRef<string | null>(null);

    useEffect(() => {
        let interval: any;
        if (activeEntry?.startTime) {
            const start = activeEntry.startTime.toDate().getTime();
            interval = setInterval(() => {
                setElapsed(Math.floor((Date.now() - start) / 1000));
            }, 1000);
        } else {
            setElapsed(0);
        }
        return () => clearInterval(interval);
    }, [activeEntry]);

    const activeActivity = activities.find(a => a.id === activeEntry?.activityId);
    const activeArea = lifeAreas.find(la => la.id === activeActivity?.lifeAreaId);
    const activeColor = activeActivity?.color || colors.primary.cyan;

    useEffect(() => {
        timerGlow.value = withRepeat(withSequence(withTiming(1, { duration: 1200 }), withTiming(0, { duration: 1200 })), -1);
    }, []);

    useEffect(() => {
        const syncLiveActivity = async () => {
            if (activeEntry?.id && activeActivity) {
                const startTime = activeEntry.startTime?.toDate?.().getTime() || Date.now();
                try {
                    await LiveMonitor.update({
                        activityName: activeActivity.name,
                        activityColor: activeActivity.color || colors.primary.cyan,
                        startTime,
                    });
                } catch (error) {
                    console.warn("Failed to update live monitor:", error);
                }
                prevEntryIdRef.current = activeEntry.id;
                return;
            }

            if (!activeEntry?.id && prevEntryIdRef.current) {
                prevEntryIdRef.current = null;
                try {
                    await LiveMonitor.stop();
                } catch (error) {
                    console.warn("Failed to stop live monitor:", error);
                }
            }
        };

        syncLiveActivity();
    }, [activeEntry?.id, activeActivity?.id]);

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: themeColors.background }]} edges={['top']}>
            <View style={styles.header}>
                <Text style={[styles.screenTitle, { color: themeColors.textPrimary }]}>Timer</Text>
            </View>
            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                {/* Active Timer Box (Matching Mockup) */}
                {activeEntry ? (
                    <Animated.View
                        entering={ZoomIn.duration(400)}
                        exiting={FadeOut}
                        style={styles.activeTimerCard}
                    >
                        <LinearGradient
                            colors={[activeColor, "#0B1220"]}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 1 }}
                            style={styles.activeGradient}
                        >
                            <View style={[styles.activeGlowTop, { backgroundColor: activeColor }]} />
                            <View style={[styles.activeGlowBottom, { backgroundColor: activeColor }]} />
                            <View style={styles.activeCardContent}>
                                <View style={styles.activeInfoRow}>
                                    <Animated.View style={[styles.trackingBadge, trackingBadgeStyle]}>
                                        <PulseDot />
                                        <Text style={styles.trackingText}>IN CORSO</Text>
                                    </Animated.View>
                                    <Text style={styles.activeTimerLabel}>SESSIONE</Text>
                                </View>

                                <View style={styles.mainTimerRow}>
                                    <View style={styles.timerLeftColumn}>
                                        <Text style={styles.activeActivityName} numberOfLines={1}>
                                            {activeActivity?.name || "Attività"}
                                        </Text>
                                        <Text style={styles.activeAreaName} numberOfLines={1}>
                                            {activeArea?.name || "Area"}
                                        </Text>
                                    </View>
                                    <View style={styles.timerRightColumn}>
                                        <Animated.View style={[styles.timerAura, { backgroundColor: activeColor }, timerAuraStyle]} />
                                        <Animated.Text entering={ZoomIn.duration(250)} style={styles.timerClockText}>
                                            {formatTime(elapsed)}
                                        </Animated.Text>
                                        <Text style={styles.timerSubtext}>ore:min:sec</Text>
                                    </View>
                                </View>
                                <View style={styles.timerFooterRow}>
                                    <View style={styles.timerMetaRow}>
                                        <Text style={styles.timerMetaText}>Focus attivo</Text>
                                        <View style={styles.timerMetaDot} />
                                        <Text style={styles.timerMetaText}>Sessione in corso</Text>
                                    </View>
                                    <Pressable
                                        onPress={() => stopTimerMutation.mutate(activeEntry.id)}
                                        style={styles.activeStopButton}
                                    >
                                        <Square size={20} color={activeColor} fill={activeColor} />
                                    </Pressable>
                                </View>
                            </View>
                        </LinearGradient>
                    </Animated.View>
                ) : (
                    <View style={[styles.emptyTimerPlaceholder, { borderColor: themeColors.border, backgroundColor: themeColors.surface }]}>
                        <Clock size={40} color={themeColors.textTertiary} />
                        <Text style={[styles.emptyText, { color: themeColors.textTertiary }]}>Seleziona un'attività per iniziare</Text>
                    </View>
                )}

                {/* Life Area Filter (Horizontal Tabs) */}
                <View style={styles.sectionHeader}>
                    <Text style={[styles.sectionTitle, { color: themeColors.textPrimary }]}>Aree di Vita</Text>
                </View>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll} contentContainerStyle={styles.filterContainer}>
                    {["Tutte", ...lifeAreas.map(la => la.name)].map((area) => (
                        <Pressable
                            key={area}
                            onPress={() => setActiveTab(area)}
                            style={[
                                styles.filterPill,
                                { backgroundColor: activeTab === area ? colors.primary.cyan : themeColors.surface },
                            ]}
                        >
                            <Text style={[styles.filterText, { color: activeTab === area ? "#FFF" : themeColors.textSecondary }]}>
                                {area}
                            </Text>
                        </Pressable>
                    ))}
                </ScrollView>

                {/* Activities List (Matching Mockup) */}
                <View style={styles.sectionHeader}>
                    <Text style={[styles.sectionTitle, { color: themeColors.textPrimary }]}>Cambia Attività</Text>
                </View>

                {isLoadingActivities ? (
                    <ActivityIndicator color={colors.primary.cyan} style={{ marginTop: 20 }} />
                ) : (
                    <View style={styles.activitiesList}>
                        {filteredActivities.length > 0 ? filteredActivities.map((activity, i) => {
                            const isRunning = activeEntry?.activityId === activity.id;
                            const area = lifeAreas.find(la => la.id === activity.lifeAreaId);
                            const handleActivityPress = async () => {
                                Haptics.selectionAsync().catch(() => { });
                                try {
                                    if (isRunning) {
                                        await stopTimerMutation.mutateAsync(activeEntry!.id);
                                        return;
                                    }
                                    if (activeEntry?.id) {
                                        await stopTimerMutation.mutateAsync(activeEntry.id);
                                    }
                                    await startTimerMutation.mutateAsync(activity.id);
                                } catch (error) {
                                    console.warn("Failed to switch activity:", error);
                                }
                            };

                            return (
                                <AnimatedPressable
                                    key={activity.id}
                                    entering={FadeInDown.delay(i * 50).duration(400)}
                                    style={[
                                        styles.activityItemCard,
                                        {
                                            backgroundColor: themeColors.surface,
                                            borderColor: isRunning ? activity.color : 'transparent',
                                            borderWidth: isRunning ? 2 : 1
                                        }
                                    ]}
                                    onPress={handleActivityPress}
                                >
                                    <View style={styles.activityItemMain}>
                                        <View style={[styles.activityAccent, { backgroundColor: activity.color }]} />
                                        <View style={[styles.dot, { backgroundColor: activity.color }]} />
                                        <View style={styles.activityItemInfo}>
                                            <View style={styles.activityTitleRow}>
                                                <Text style={[styles.activityItemName, { color: themeColors.textPrimary }]} numberOfLines={1}>
                                                    {activity.name}
                                                </Text>
                                                {isRunning && (
                                                    <Animated.View
                                                        entering={ZoomIn.duration(200)}
                                                        style={[styles.livePill, { backgroundColor: activity.color + "20", borderColor: activity.color }]}
                                                    >
                                                        <Text style={[styles.livePillText, { color: activity.color }]}>{formatTime(elapsed)}</Text>
                                                    </Animated.View>
                                                )}
                                            </View>
                                            <Text style={[styles.activityItemArea, { color: themeColors.textTertiary }]}>
                                                {area?.name || "Life Area"}
                                            </Text>
                                        </View>
                                        <View style={[styles.actionButton, { backgroundColor: isRunning ? activity.color + '20' : themeColors.background }]}>
                                            {isRunning ? (
                                                <Square size={20} color={activity.color} fill={activity.color} />
                                            ) : (
                                                <Play size={20} color={colors.primary.cyan} fill={colors.primary.cyan} />
                                            )}
                                        </View>
                                    </View>
                                </AnimatedPressable>
                            );
                        }) : (
                            <View style={styles.emptyState}>
                                <Text style={{ color: themeColors.textTertiary }}>Nessuna attività in questa area.</Text>
                            </View>
                        )}
                    </View>
                )}
                <View style={{ height: 40 }} />
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {
        paddingHorizontal: spacing.xl,
        paddingVertical: spacing.lg,
    },
    screenTitle: {
        fontSize: typography.size["2xl"],
        fontWeight: typography.weight.bold,
    },
    scrollContent: {
        paddingHorizontal: spacing.xl,
    },
    activeTimerCard: {
        borderRadius: borderRadius.xl,
        marginBottom: spacing["2xl"],
        elevation: 8,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
        overflow: "hidden",
    },
    activeGradient: {
        padding: spacing.lg,
    },
    activeGlowTop: {
        position: "absolute",
        width: 200,
        height: 200,
        borderRadius: 100,
        top: -120,
        right: -80,
        opacity: 0.35,
    },
    activeGlowBottom: {
        position: "absolute",
        width: 260,
        height: 260,
        borderRadius: 130,
        bottom: -160,
        left: -120,
        opacity: 0.2,
    },
    activeCardContent: {
        gap: spacing.md,
    },
    activeInfoRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
    },
    trackingBadge: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "rgba(255,255,255,0.2)",
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: borderRadius.full,
    },
    pulseDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: "#FFF",
        marginRight: 6,
    },
    trackingText: {
        color: "#FFF",
        fontSize: typography.size.xs,
        fontWeight: typography.weight.bold,
        letterSpacing: 0.5,
    },
    activeTimerLabel: {
        color: "rgba(255,255,255,0.7)",
        fontSize: typography.size.xs,
        fontWeight: typography.weight.semibold,
        letterSpacing: 0.6,
        textTransform: "uppercase",
    },
    mainTimerRow: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        gap: spacing.md,
    },
    activeActivityName: {
        color: "#FFF",
        fontSize: typography.size.xl,
        fontWeight: typography.weight.bold,
    },
    activeAreaName: {
        color: "rgba(255,255,255,0.8)",
        fontSize: typography.size.sm,
        marginTop: 2,
    },
    timerLeftColumn: {
        flex: 1,
        minWidth: 0,
    },
    timerRightColumn: {
        alignItems: "flex-end",
    },
    timerAura: {
        position: "absolute",
        width: 140,
        height: 140,
        borderRadius: 70,
        right: -40,
        top: -40,
    },
    timerClockText: {
        color: "#FFF",
        fontSize: typography.size["3xl"],
        fontWeight: typography.weight.bold,
        fontVariant: ["tabular-nums"],
        letterSpacing: 1,
    },
    timerSubtext: {
        color: "rgba(255,255,255,0.7)",
        fontSize: typography.size.xs,
        marginTop: 4,
        letterSpacing: 0.4,
    },
    timerFooterRow: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
    },
    timerMetaRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
    },
    timerMetaText: {
        color: "rgba(255,255,255,0.7)",
        fontSize: typography.size.xs,
        letterSpacing: 0.3,
    },
    timerMetaDot: {
        width: 4,
        height: 4,
        borderRadius: 2,
        backgroundColor: "rgba(255,255,255,0.5)",
    },
    activeStopButton: {
        width: 40,
        height: 40,
        borderRadius: 12,
        backgroundColor: "#FFF",
        justifyContent: "center",
        alignItems: "center",
    },
    emptyTimerPlaceholder: {
        height: 140,
        borderRadius: borderRadius.xl,
        borderWidth: 2,
        borderStyle: "dashed",
        justifyContent: "center",
        alignItems: "center",
        marginBottom: spacing["2xl"],
    },
    emptyText: {
        marginTop: spacing.sm,
        fontSize: typography.size.base,
    },
    sectionHeader: {
        marginBottom: spacing.md,
    },
    sectionTitle: {
        fontSize: typography.size.lg,
        fontWeight: typography.weight.bold,
    },
    filterScroll: {
        marginBottom: spacing.xl,
        marginLeft: -spacing.xl,
        paddingLeft: spacing.xl,
    },
    filterContainer: {
        paddingRight: spacing.xl * 2,
        gap: spacing.sm,
    },
    filterPill: {
        paddingHorizontal: 20,
        paddingVertical: 10,
        borderRadius: borderRadius.full,
    },
    filterText: {
        fontSize: typography.size.base,
        fontWeight: typography.weight.semibold,
    },
    activitiesList: {
        gap: spacing.sm,
    },
    activityItemCard: {
        borderRadius: borderRadius.lg,
        padding: spacing.lg,
        borderWidth: 1,
        elevation: 2,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
    },
    activityItemMain: {
        flexDirection: "row",
        alignItems: "center",
    },
    activityAccent: {
        width: 4,
        height: 36,
        borderRadius: 2,
        marginRight: spacing.sm,
        opacity: 0.9,
    },
    dot: {
        width: 12,
        height: 12,
        borderRadius: 6,
        marginRight: spacing.md,
    },
    activityItemInfo: {
        flex: 1,
        paddingRight: spacing.sm,
    },
    activityTitleRow: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        gap: spacing.sm,
    },
    activityItemName: {
        fontSize: typography.size.lg,
        fontWeight: typography.weight.bold,
        flex: 1,
    },
    activityItemArea: {
        fontSize: typography.size.base,
        marginTop: 2,
    },
    livePill: {
        borderWidth: 1,
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: borderRadius.full,
    },
    livePillText: {
        fontSize: typography.size.sm,
        fontWeight: typography.weight.bold,
        fontVariant: ["tabular-nums"],
        letterSpacing: 0.4,
    },
    actionButton: {
        width: 44,
        height: 44,
        borderRadius: 12,
        justifyContent: "center",
        alignItems: "center",
    },
    emptyState: {
        alignItems: "center",
        paddingVertical: spacing.xl,
    }
});
