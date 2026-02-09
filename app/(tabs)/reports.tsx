import { View, Text, StyleSheet, ScrollView, ActivityIndicator, Dimensions, Pressable } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { colors, spacing, borderRadius, typography } from "../../src/theme/tokens";
import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "../../src/lib/api";
import { auth } from "../../src/lib/firebase";
import {
    startOfWeek,
    endOfWeek,
    startOfMonth,
    endOfMonth,
    format,
    differenceInSeconds,
    eachDayOfInterval,
    startOfDay,
    endOfDay
} from "date-fns";
import { it } from "date-fns/locale";
import Animated, { FadeInDown, FadeIn } from "react-native-reanimated";
import { Clock, TrendingUp, Calendar, Zap } from "lucide-react-native";
import { useAppColorScheme } from "../../src/lib/store";

const SCREEN_WIDTH = Dimensions.get("window").width;

import { LifeArea, Activity, TimeEntry } from "../../src/types";

export default function ReportsScreen() {
    const colorScheme = useAppColorScheme();
    const themeColors = colors[colorScheme];
    const [selectedPeriod, setSelectedPeriod] = useState("Settimana");

    const user = auth.currentUser;
    const { data: reportData, isLoading } = useQuery({
        queryKey: ["reports", user?.uid, selectedPeriod],
        queryFn: async () => {
            if (!user) return null;

            const now = new Date();
            const { start, end, labelFormat } = (() => {
                if (selectedPeriod === "Giorno") {
                    return { start: startOfDay(now), end: endOfDay(now), labelFormat: "HH" };
                }
                if (selectedPeriod === "Mese") {
                    return { start: startOfMonth(now), end: endOfMonth(now), labelFormat: "d" };
                }
                return { start: startOfWeek(now, { weekStartsOn: 1 }), end: endOfWeek(now, { weekStartsOn: 1 }), labelFormat: "EE" };
            })();

            // Fetch Time Entries via optimized API
            const entries = await api.getEntriesByRange(start, end);

            // Fetch Activities via API
            const activities = await api.getActivities();
            const activitiesMap = activities.reduce((acc: Record<string, Activity>, act) => {
                acc[act.id] = act;
                return acc;
            }, {});

            // Aggregate by Life Area & Day
            const aggregation: Record<string, { id: string; name: string; duration: number; color: string }> = {};
            const dailyData: Record<string, number> = {};
            let totalSeconds = 0;
            let sessionCount = 0;

            const days = eachDayOfInterval({ start, end });
            days.forEach((day: Date) => {
                dailyData[format(day, "yyyy-MM-dd")] = 0;
            });

            entries.forEach((entry: TimeEntry) => {
                const activity = activitiesMap[entry.activityId];
                if (!activity) return;

                const start = entry.startTime.toDate();
                const end = entry.endTime ? entry.endTime.toDate() : new Date();
                const duration = differenceInSeconds(end, start);

                if (duration <= 0) return;

                sessionCount++;
                totalSeconds += duration;

                // Area Aggregation
                const areaId = activity.lifeAreaId;
                if (!aggregation[areaId]) {
                    aggregation[areaId] = {
                        id: areaId,
                        name: "...",
                        duration: 0,
                        color: activity.color || colors.primary.cyan
                    };
                }
                aggregation[areaId].duration += duration;

                // Daily Aggregation
                const dayKey = format(entry.startTime.toDate(), "yyyy-MM-dd");
                if (dailyData[dayKey] !== undefined) {
                    dailyData[dayKey] += duration;
                }
            });

            // Fetch Area names via API
            const areas = await api.getLifeAreas();
            areas.forEach(area => {
                if (aggregation[area.id]) {
                    aggregation[area.id].name = area.name;
                }
            });

            return {
                totalSeconds,
                sessionCount,
                areas: Object.values(aggregation).sort((a, b) => b.duration - a.duration),
                dailyBreakdown: days.map(day => ({
                    date: day,
                    label: format(day, labelFormat, { locale: it }),
                    seconds: dailyData[format(day, "yyyy-MM-dd")]
                }))
            };
        },
        enabled: !!auth.currentUser,
    });

    const formatDuration = (seconds: number) => {
        const h = Math.floor(seconds / 3600);
        const m = Math.floor((seconds % 3600) / 60);
        return `${h}h ${m}m`;
    };

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: themeColors.background }]}>
            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                <View style={styles.header}>
                    <Text style={[styles.title, { color: themeColors.textPrimary }]}>Analisi Attività</Text>
                    <View style={styles.periodSelector}>
                        {["Giorno", "Settimana", "Mese"].map((p) => (
                            <Pressable
                                key={p}
                                onPress={() => setSelectedPeriod(p)}
                                style={[styles.periodPill, selectedPeriod === p && { backgroundColor: themeColors.surface, elevation: 4 }]}
                            >
                                <Text style={[styles.periodText, { color: selectedPeriod === p ? themeColors.textPrimary : themeColors.textTertiary }]}>{p}</Text>
                            </Pressable>
                        ))}
                    </View>
                </View>

                {isLoading ? (
                    <View style={styles.loader}>
                        <ActivityIndicator color={colors.primary.cyan} size="large" />
                    </View>
                ) : reportData ? (
                    <Animated.View entering={FadeIn}>
                        {/* Summary Cards */}
                        <View style={styles.statsRow}>
                            <View style={[styles.statCard, { backgroundColor: themeColors.surface }]}>
                                <View style={[styles.statIcon, { backgroundColor: colors.primary.cyan + '15' }]}>
                                    <Clock size={20} color={colors.primary.cyan} />
                                </View>
                                <View>
                                    <Text style={[styles.statLabel, { color: themeColors.textSecondary }]}>ORE TOTALI</Text>
                                    <Text style={[styles.statValue, { color: themeColors.textPrimary }]}>
                                        {formatDuration(reportData.totalSeconds)}
                                    </Text>
                                </View>
                            </View>
                            <View style={[styles.statCard, { backgroundColor: themeColors.surface }]}>
                                <View style={[styles.statIcon, { backgroundColor: '#8B5CF6' + '15' }]}>
                                    <Zap size={20} color="#8B5CF6" />
                                </View>
                                <View>
                                    <Text style={[styles.statLabel, { color: themeColors.textSecondary }]}>SESSIONI</Text>
                                    <Text style={[styles.statValue, { color: themeColors.textPrimary }]}>
                                        {reportData.sessionCount}
                                    </Text>
                                </View>
                            </View>
                        </View>

                        {/* Period Chart */}
                        <Text style={[styles.sectionTitle, { color: themeColors.textPrimary }]}>Attività {selectedPeriod}</Text>
                        <View style={[styles.chartBox, { backgroundColor: themeColors.surface }]}>
                            <View style={styles.barContainer}>
                                {reportData.dailyBreakdown.map((day, i) => {
                                    const maxSeconds = Math.max(...reportData.dailyBreakdown.map(d => d.seconds), 1);
                                    const height = (day.seconds / maxSeconds) * 120;
                                    return (
                                        <View key={i} style={[styles.barColumn, { width: (SCREEN_WIDTH - 80) / reportData.dailyBreakdown.length }]}>
                                            <View style={[styles.barWrapper]}>
                                                <Animated.View
                                                    entering={FadeInDown.delay(i * 50)}
                                                    style={[
                                                        styles.bar,
                                                        { height: Math.max(height, 4), backgroundColor: colors.primary.cyan }
                                                    ]}
                                                />
                                            </View>
                                            <Text style={[styles.barLabel, { color: themeColors.textTertiary }]}>{day.label}</Text>
                                        </View>
                                    );
                                })}
                            </View>
                        </View>

                        {/* Distribution */}
                        <Text style={[styles.sectionTitle, { color: themeColors.textPrimary }]}>Distribuzione Aree</Text>
                        <View style={styles.distributionList}>
                            {reportData.areas.map((area: any, i: number) => {
                                const percentage = (area.duration / (reportData.totalSeconds || 1)) * 100;
                                return (
                                    <Animated.View
                                        key={area.id}
                                        entering={FadeInDown.delay(i * 100 + 400)}
                                        style={[styles.distributionCard, { backgroundColor: themeColors.surface }]}
                                    >
                                        <View style={styles.distHeader}>
                                            <View style={[styles.distColor, { backgroundColor: area.color }]} />
                                            <View style={styles.distText}>
                                                <Text style={[styles.distName, { color: themeColors.textPrimary }]}>{area.name}</Text>
                                                <Text style={[styles.distDuration, { color: themeColors.textSecondary }]}>
                                                    {formatDuration(area.duration)}
                                                </Text>
                                            </View>
                                            <Text style={[styles.distPercentage, { color: themeColors.textPrimary }]}>
                                                {Math.round(percentage)}%
                                            </Text>
                                        </View>
                                        <View style={[styles.distProgressContainer, { backgroundColor: themeColors.background }]}>
                                            <View style={[styles.distProgressBar, { backgroundColor: area.color, width: `${percentage}%` }]} />
                                        </View>
                                    </Animated.View>
                                );
                            })}
                        </View>
                    </Animated.View>
                ) : (
                    <View style={styles.emptyState}>
                        <Text style={{ color: themeColors.textTertiary }}>Nessun dato per questo periodo.</Text>
                    </View>
                )}
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
        paddingBottom: 40,
    },
    header: {
        marginBottom: spacing["2xl"],
    },
    title: {
        fontSize: typography.size["3xl"],
        fontWeight: typography.weight.bold,
        marginBottom: spacing.lg,
    },
    periodSelector: {
        flexDirection: 'row',
        backgroundColor: 'rgba(0,0,0,0.05)',
        borderRadius: 16,
        padding: 4,
    },
    periodPill: {
        flex: 1,
        paddingVertical: 10,
        alignItems: 'center',
        borderRadius: 12,
    },
    periodText: {
        fontSize: typography.size.sm,
        fontWeight: typography.weight.bold,
    },
    statsRow: {
        flexDirection: 'row',
        gap: spacing.md,
        marginBottom: spacing["2xl"],
    },
    statCard: {
        flex: 1,
        padding: spacing.lg,
        borderRadius: 24,
        flexDirection: 'row',
        alignItems: 'center',
        elevation: 2,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 5,
    },
    statIcon: {
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    statLabel: {
        fontSize: 10,
        fontWeight: typography.weight.bold,
        letterSpacing: 0.5,
    },
    statValue: {
        fontSize: typography.size.lg,
        fontWeight: typography.weight.bold,
        marginTop: 2,
    },
    sectionTitle: {
        fontSize: typography.size.xl,
        fontWeight: typography.weight.bold,
        marginBottom: spacing.lg,
    },
    chartBox: {
        padding: spacing.xl,
        borderRadius: 24,
        marginBottom: spacing["2xl"],
        elevation: 2,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 10,
    },
    barContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-end',
        height: 150,
    },
    barColumn: {
        alignItems: 'center',
        width: (SCREEN_WIDTH - 80) / 7,
    },
    barWrapper: {
        height: 130,
        width: 12,
        backgroundColor: 'rgba(0,0,0,0.03)',
        borderRadius: 6,
        justifyContent: 'flex-end',
        overflow: 'hidden',
    },
    bar: {
        width: '100%',
        borderRadius: 6,
    },
    barLabel: {
        fontSize: 10,
        fontWeight: 'bold',
        marginTop: 8,
    },
    distributionList: {
        gap: spacing.md,
    },
    distributionCard: {
        padding: spacing.lg,
        borderRadius: 20,
        elevation: 2,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 5,
    },
    distHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
    },
    distColor: {
        width: 12,
        height: 12,
        borderRadius: 6,
        marginRight: 12,
    },
    distText: {
        flex: 1,
    },
    distName: {
        fontSize: typography.size.base,
        fontWeight: typography.weight.bold,
    },
    distDuration: {
        fontSize: typography.size.xs,
        marginTop: 2,
    },
    distPercentage: {
        fontSize: typography.size.base,
        fontWeight: typography.weight.bold,
    },
    distProgressContainer: {
        height: 8,
        borderRadius: 4,
        overflow: 'hidden',
    },
    distProgressBar: {
        height: '100%',
        borderRadius: 4,
    },
    loader: {
        height: 300,
        justifyContent: 'center',
    },
    emptyState: {
        alignItems: 'center',
        marginTop: 60,
    }
});
