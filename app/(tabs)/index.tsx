import { View, Text, StyleSheet, ScrollView, Pressable, useColorScheme, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { colors, spacing, borderRadius, typography } from "../../src/theme/tokens";
import { useState, useEffect } from "react";
import Animated, { FadeInDown, ZoomIn, FadeOut, withRepeat, withSequence, withTiming, useAnimatedStyle, useSharedValue } from "react-native-reanimated";
import { Clock, Play, Square } from "lucide-react-native";
import { api } from "../../src/lib/api";
import { auth } from "../../src/lib/firebase";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { LifeArea, Activity, TimeEntry } from "../../src/types";

function PulseDot() {
    const opacity = useSharedValue(1);
    useEffect(() => {
        opacity.value = withRepeat(withSequence(withTiming(0.4, { duration: 800 }), withTiming(1, { duration: 800 })), -1);
    }, []);
    const style = useAnimatedStyle(() => ({ opacity: opacity.value }));
    return <Animated.View style={[styles.pulseDot, style]} />;
}

export default function TimerScreen() {
    const colorScheme = useColorScheme() || "light";
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
        }
    });

    const stopTimerMutation = useMutation({
        mutationFn: (entryId: string) => api.stopEntry(entryId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["timeEntries"] });
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
                        style={[
                            styles.activeTimerCard,
                            { backgroundColor: activeActivity?.color || colors.primary.cyan }
                        ]}
                    >
                        <View style={styles.activeCardContent}>
                            <View style={styles.activeInfoRow}>
                                <View style={styles.trackingBadge}>
                                    <PulseDot />
                                    <Text style={styles.trackingText}>TRACCIANDO</Text>
                                </View>
                            </View>

                            <View style={styles.mainTimerRow}>
                                <View style={styles.timerTextContainer}>
                                    <Text style={styles.activeActivityName}>{activeActivity?.name || "Attività"}</Text>
                                    <Text style={styles.activeAreaName}>{activeArea?.name || "Area"}</Text>
                                </View>
                                <Text style={styles.timerClockText}>{formatTime(elapsed)}</Text>
                                <Pressable
                                    onPress={() => stopTimerMutation.mutate(activeEntry.id)}
                                    style={styles.activeStopButton}
                                >
                                    <Square size={24} color={activeActivity?.color || colors.primary.cyan} fill={activeActivity?.color || colors.primary.cyan} />
                                </Pressable>
                            </View>
                        </View>
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

                            return (
                                <Animated.View
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
                                >
                                    <View style={styles.activityItemMain}>
                                        <View style={[styles.dot, { backgroundColor: activity.color }]} />
                                        <View style={styles.activityItemInfo}>
                                            <Text style={[styles.activityItemName, { color: themeColors.textPrimary }]}>{activity.name}</Text>
                                            <Text style={[styles.activityItemArea, { color: themeColors.textTertiary }]}>
                                                {isRunning ? formatTime(elapsed) : (area?.name || "Life Area")}
                                            </Text>
                                        </View>
                                        <Pressable
                                            onPress={() => isRunning ? stopTimerMutation.mutate(activeEntry!.id) : startTimerMutation.mutate(activity.id)}
                                            style={[styles.actionButton, { backgroundColor: isRunning ? activity.color + '20' : themeColors.background }]}
                                        >
                                            {isRunning ? (
                                                <Square size={20} color={activity.color} fill={activity.color} />
                                            ) : (
                                                <Play size={20} color={colors.primary.cyan} fill={colors.primary.cyan} />
                                            )}
                                        </Pressable>
                                    </View>
                                </Animated.View>
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
        padding: spacing.xl,
        marginBottom: spacing["2xl"],
        elevation: 8,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
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
    mainTimerRow: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
    },
    timerTextContainer: {
        flex: 1,
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
    timerClockText: {
        color: "#FFF",
        fontSize: typography.size["3xl"],
        fontWeight: typography.weight.bold,
        marginHorizontal: spacing.md,
    },
    activeStopButton: {
        width: 50,
        height: 50,
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
        gap: spacing.md,
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
    dot: {
        width: 12,
        height: 12,
        borderRadius: 6,
        marginRight: spacing.md,
    },
    activityItemInfo: {
        flex: 1,
    },
    activityItemName: {
        fontSize: typography.size.base,
        fontWeight: typography.weight.bold,
    },
    activityItemArea: {
        fontSize: typography.size.sm,
        marginTop: 2,
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
