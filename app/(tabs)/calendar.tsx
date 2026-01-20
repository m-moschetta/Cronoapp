import { View, Text, StyleSheet, ScrollView, useColorScheme, ActivityIndicator, Pressable, Dimensions, Alert, Platform } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { colors, spacing, borderRadius, typography } from "../../src/theme/tokens";
import { useState, useMemo, useRef, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../../src/lib/api";
import { auth } from "../../src/lib/firebase";
import { Timestamp } from "firebase/firestore";
import {
    format,
    startOfDay,
    endOfDay,
    addDays,
    startOfWeek,
    eachDayOfInterval,
    isSameDay,
    differenceInMinutes,
    addMinutes,
    subMinutes,
    setHours,
    setMinutes
} from "date-fns";
import { it } from "date-fns/locale";
import Animated, { FadeIn, SlideInRight, useSharedValue, useAnimatedStyle, withSpring, runOnJS } from "react-native-reanimated";
import { ChevronLeft, ChevronRight, Plus, Minus, MoreVertical, Trash2, Clock, GripHorizontal, Calendar } from "lucide-react-native";
import { TimeEntry, Activity } from "../../src/types";
import {
    Gesture,
    GestureDetector,
    GestureHandlerRootView
} from "react-native-gesture-handler";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const HOUR_HEIGHT = 80;
const TIMELINE_LEFT_WIDTH = 60;

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

const EntryCard = ({
    entry,
    activities,
    adjustTime,
    updateEntryMutation,
    themeColors,
    isSelected,
    onPress
}: {
    entry: TimeEntry,
    activities: Activity[],
    adjustTime: (entry: TimeEntry, minutes: number, type: 'start' | 'end') => void,
    updateEntryMutation: any,
    themeColors: any,
    isSelected: boolean,
    onPress: () => void
}) => {
    const start = entry.startTime.toDate();
    const end = entry.endTime?.toDate() || new Date();
    const durationMin = differenceInMinutes(end, start);
    const activity = activities.find(a => a.id === entry.activityId);
    const initialHeight = Math.max((durationMin / 60 * HOUR_HEIGHT), 40);

    const isResizing = useSharedValue(false);
    const translateY = useSharedValue(0);
    const heightValue = useSharedValue(initialHeight);

    useEffect(() => {
        heightValue.value = initialHeight;
    }, [initialHeight]);

    const animatedStyle = useAnimatedStyle(() => ({
        height: heightValue.value,
        transform: [{ translateY: translateY.value }],
        zIndex: translateY.value !== 0 ? 100 : 1,
    }));

    const handleMove = (y: number) => {
        const minutesDelta = (y / HOUR_HEIGHT) * 60;
        const newStart = addMinutes(start, minutesDelta);
        const newEnd = addMinutes(end, minutesDelta);
        updateEntryMutation.mutate({
            id: entry.id,
            data: {
                startTime: Timestamp.fromDate(newStart),
                endTime: Timestamp.fromDate(newEnd)
            }
        });
        runOnJS(onPress)();
    };

    const handleResize = (h: number) => {
        const newDurationMin = (h / HOUR_HEIGHT) * 60;
        const newEndTime = addMinutes(start, newDurationMin);
        updateEntryMutation.mutate({
            id: entry.id,
            data: { endTime: Timestamp.fromDate(newEndTime) }
        });
    };

    const pan = Gesture.Pan()
        .onBegin((event) => {
            isResizing.value = event.y > (heightValue.value - 30);
        })
        .onUpdate((event) => {
            if (isResizing.value) {
                heightValue.value = Math.max(initialHeight + event.translationY, 30);
            } else {
                translateY.value = event.translationY;
            }
        })
        .onEnd(() => {
            if (isResizing.value) {
                runOnJS(handleResize)(heightValue.value);
            } else {
                if (Math.abs(translateY.value) > 5) {
                    runOnJS(handleMove)(translateY.value);
                }
                translateY.value = withSpring(0);
            }
        });

    const tap = Gesture.Tap()
        .onEnd(() => {
            runOnJS(onPress)();
        });

    const top = (start.getHours() * HOUR_HEIGHT) + (start.getMinutes() / 60 * HOUR_HEIGHT);

    return (
        <GestureDetector gesture={Gesture.Exclusive(pan, tap)}>
            <Animated.View
                style={[
                    styles.entryCardAbsolute,
                    animatedStyle,
                    {
                        top,
                        backgroundColor: (activity?.color || colors.primary.cyan) + '20',
                        borderLeftColor: activity?.color || colors.primary.cyan,
                        borderWidth: isSelected ? 2 : 0,
                        borderColor: activity?.color || colors.primary.cyan,
                    }
                ]}
            >
                <View style={styles.entryCardContent}>
                    <Text style={[styles.entryTitle, { color: themeColors.textPrimary }]} numberOfLines={1}>
                        {activity?.name || "Attività"}
                    </Text>
                    <Text style={[styles.entryDurationText, { color: themeColors.textSecondary }]}>
                        {format(start, "HH:mm")} - {entry.endTime ? format(end, "HH:mm") : "In corso"}
                    </Text>
                </View>

                {/* Resize Handle Indicator */}
                <View style={styles.resizeHandle}>
                    <View style={[styles.resizeBar, { backgroundColor: activity?.color || colors.primary.cyan }]} />
                </View>
            </Animated.View>
        </GestureDetector>
    );
};

export default function CalendarScreen() {
    const colorScheme = useColorScheme() || "light";
    const themeColors = colors[colorScheme];
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [selectedEntryId, setSelectedEntryId] = useState<string | null>(null);
    const [now, setNow] = useState(new Date());
    const queryClient = useQueryClient();
    const scrollRef = useRef<ScrollView>(null);

    // Update current time indicator
    useEffect(() => {
        const timer = setInterval(() => setNow(new Date()), 60000);
        return () => clearInterval(timer);
    }, []);

    // Fetch Activities for colors/names
    const user = auth.currentUser;

    const { data: activities = [] } = useQuery<Activity[]>({
        queryKey: ["activities", user?.uid],
        queryFn: () => api.getActivities(),
        staleTime: 5 * 60 * 1000,
        enabled: !!user,
    });

    // Fetch Entries for selected date
    const { data: entries = [], isLoading } = useQuery<TimeEntry[]>({
        queryKey: ["timeEntries", user?.uid, format(selectedDate, "yyyy-MM-dd")],
        queryFn: async () => {
            const start = startOfDay(selectedDate);
            const end = endOfDay(selectedDate);
            return api.getEntriesByRange(start, end);
        },
        enabled: !!user,
    });

    // Selection helper
    const selectedEntry = useMemo(() => {
        return entries.find(e => e.id === selectedEntryId);
    }, [selectedEntryId, entries]);

    const updateEntryMutation = useMutation({
        mutationFn: ({ id, data }: { id: string, data: Partial<TimeEntry> }) => api.updateEntry(id, data),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ["timeEntries"] }),
        onError: (err) => {
            console.error("Update mutation error:", err);
            // Alert.alert("Errore", "Impossibile aggiornare l'ora.");
        }
    });

    const deleteEntryMutation = useMutation({
        mutationFn: (id: string) => api.deleteEntry(id),
        onSuccess: () => {
            setSelectedEntryId(null);
            queryClient.invalidateQueries({ queryKey: ["timeEntries"] });
        },
        onError: (err) => {
            console.error("Delete mutation error:", err);
            Alert.alert("Errore", "Impossibile eliminare l'attività.");
        }
    });

    const adjustTime = (entry: TimeEntry, minutes: number, type: 'start' | 'end') => {
        const date = type === 'start' ? entry.startTime.toDate() : (entry.endTime?.toDate() || new Date());
        const newDate = addMinutes(date, minutes);

        const updateData: any = {};
        if (type === 'start') updateData.startTime = Timestamp.fromDate(newDate);
        else updateData.endTime = Timestamp.fromDate(newDate);

        updateEntryMutation.mutate({ id: entry.id, data: updateData });
    };

    const handleDelete = () => {
        if (!selectedEntryId) return;
        Alert.alert(
            "Elimina voce",
            "Sei sicuro di voler eliminare questa attività?",
            [
                { text: "Annulla", style: "cancel" },
                {
                    text: "Elimina", style: "destructive", onPress: () => {
                        deleteEntryMutation.mutate(selectedEntryId);
                        setSelectedEntryId(null);
                    }
                }
            ]
        );
    };

    const addEntryMutation = useMutation({
        mutationFn: (data: Partial<TimeEntry>) => api.addEntry(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["timeEntries"] });
            Alert.alert("Successo", "Attività salvata nel calendario!");
        },
        onError: (err) => {
            console.error("Error adding entry:", err);
            Alert.alert("Errore", "Impossibile salvare l'attività. Riprova.");
        }
    });

    const handleAddManual = () => {
        if (activities.length === 0) {
            Alert.alert("Nessuna attività", "Crea prima delle attività nelle Impostazioni > Gestione Dati.");
            return;
        }

        // For simplicity, let's pick the first activity and add 1 hour from now
        // A more advanced implementation would show a picker
        const activity = activities[0];
        const start = new Date();
        const end = addMinutes(start, 60);

        addEntryMutation.mutate({
            activityId: activity.id,
            startTime: Timestamp.fromDate(start),
            endTime: Timestamp.fromDate(end),
        });
    };

    const renderTimeline = () => {
        const hours = Array.from({ length: 24 }, (_, i) => i);
        const isToday = isSameDay(selectedDate, new Date());
        const nowPos = (now.getHours() * HOUR_HEIGHT) + (now.getMinutes() / 60 * HOUR_HEIGHT);

        return (
            <View style={styles.timelineContainer}>
                {hours.map(hour => (
                    <View key={hour} style={styles.hourRow}>
                        <View style={styles.hourLabelContainer}>
                            <Text style={[styles.hourLabel, { color: themeColors.textTertiary }]}>
                                {hour.toString().padStart(2, '0')}:00
                            </Text>
                        </View>
                        <View style={[styles.hourLine, { borderTopColor: themeColors.border }]} />
                    </View>
                ))}

                {/* Current Time Indicator */}
                {isToday && (
                    <View style={[styles.currentTimeContainer, { top: nowPos }]}>
                        <View style={styles.currentTimeDot} />
                        <View style={styles.currentTimeLine} />
                    </View>
                )}

                {entries.map((entry: TimeEntry) => (
                    <EntryCard
                        key={entry.id}
                        entry={entry}
                        activities={activities}
                        adjustTime={adjustTime}
                        updateEntryMutation={updateEntryMutation}
                        themeColors={themeColors}
                        isSelected={selectedEntryId === entry.id}
                        onPress={() => setSelectedEntryId(entry.id)}
                    />
                ))}
            </View>
        );
    };

    const SelectedEventPanel = () => {
        if (!selectedEntry) return null;
        const activity = activities.find((a: Activity) => a.id === selectedEntry.activityId);
        const start = selectedEntry.startTime.toDate();
        const end = selectedEntry.endTime?.toDate() || new Date();
        const durationMin = differenceInMinutes(end, start);

        return (
            <Animated.View entering={FadeIn} style={[styles.panelContainer, { backgroundColor: themeColors.surface }]}>
                <View style={styles.panelHeader}>
                    <View style={styles.panelInfo}>
                        <View style={[styles.panelDot, { backgroundColor: activity?.color || colors.primary.cyan }]} />
                        <View>
                            <Text style={[styles.panelTitle, { color: themeColors.textPrimary }]}>{activity?.name || "Attività"}</Text>
                            <Text style={[styles.panelDuration, { color: colors.primary.cyan }]}>{durationMin}m</Text>
                        </View>
                    </View>
                    <Pressable onPress={handleDelete} style={styles.trashCircle}>
                        <Trash2 size={18} color={colors.secondary.red} />
                    </Pressable>
                </View>

                <View style={styles.adjustmentGrid}>
                    {[-15, -10, -5, 5, 10, 15].map(val => (
                        <Pressable
                            key={val}
                            onPress={() => adjustTime(selectedEntry, val, 'end')}
                            style={[
                                styles.adjPill,
                                { backgroundColor: val < 0 ? colors.secondary.red + '15' : colors.secondary.green + '15' }
                            ]}
                        >
                            <Text style={[styles.adjText, { color: val < 0 ? colors.secondary.red : colors.secondary.green }]}>
                                {val > 0 ? `+ ${val}` : `${val}`}
                            </Text>
                        </Pressable>
                    ))}
                </View>
            </Animated.View>
        );
    };

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: themeColors.background }]} edges={['top']}>
            <View style={styles.header}>
                <View style={styles.headerDaily}>
                    <Pressable onPress={() => setSelectedDate(addDays(selectedDate, -1))} style={styles.navBtn}>
                        <ChevronLeft size={24} color={colors.primary.cyan} />
                    </Pressable>
                    <View style={styles.dateDisplay}>
                        <Calendar size={20} color={colors.primary.cyan} style={{ marginRight: 8 }} />
                        <Text style={[styles.dateText, { color: themeColors.textPrimary }]}>
                            {format(selectedDate, "d MMM (EEE)", { locale: it })}
                        </Text>
                    </View>
                    <Pressable onPress={() => setSelectedDate(addDays(selectedDate, 1))} style={styles.navBtn}>
                        <ChevronRight size={24} color={colors.primary.cyan} />
                    </Pressable>
                </View>

                <SelectedEventPanel />
            </View>

            <ScrollView
                ref={scrollRef}
                style={styles.timelineScroll}
                contentContainerStyle={styles.timelineScrollContent}
                showsVerticalScrollIndicator={false}
            >
                {isLoading ? (
                    <View style={styles.loadingContainer}>
                        <ActivityIndicator color={colors.primary.cyan} size="large" />
                    </View>
                ) : (
                    renderTimeline()
                )}
            </ScrollView>

            <Pressable style={styles.fab} onPress={handleAddManual}>
                <Plus size={32} color="#FFF" />
            </Pressable>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {
        backgroundColor: 'transparent',
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(0,0,0,0.05)',
    },
    headerDaily: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: spacing.xl,
        paddingVertical: spacing.lg,
    },
    navBtn: {
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: colors.primary.cyan + '10',
    },
    dateDisplay: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    dateText: {
        fontSize: typography.size.lg,
        fontWeight: typography.weight.bold,
    },
    panelContainer: {
        padding: spacing.xl,
        paddingTop: 0,
    },
    panelHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: spacing.md,
    },
    panelInfo: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    panelDot: {
        width: 12,
        height: 12,
        borderRadius: 6,
        marginRight: 10,
    },
    panelTitle: {
        fontSize: typography.size.base,
        fontWeight: typography.weight.bold,
    },
    panelDuration: {
        fontSize: typography.size.sm,
        fontWeight: typography.weight.bold,
    },
    trashCircle: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: colors.secondary.red + '15',
        justifyContent: 'center',
        alignItems: 'center',
    },
    adjustmentGrid: {
        flexDirection: 'row',
        gap: spacing.xs,
        flexWrap: 'wrap',
    },
    adjPill: {
        flex: 1,
        minWidth: 50,
        height: 32,
        borderRadius: 8,
        justifyContent: 'center',
        alignItems: 'center',
    },
    adjText: {
        fontSize: 12,
        fontWeight: 'bold',
    },
    timelineScroll: {
        flex: 1,
    },
    timelineScrollContent: {
        paddingBottom: 100, // Space for FAB
    },
    timelineContainer: {
        paddingLeft: TIMELINE_LEFT_WIDTH,
        position: 'relative',
    },
    hourRow: {
        height: HOUR_HEIGHT,
        flexDirection: 'row',
        alignItems: 'flex-start',
    },
    hourLabelContainer: {
        position: 'absolute',
        left: -TIMELINE_LEFT_WIDTH,
        width: TIMELINE_LEFT_WIDTH,
        alignItems: 'center',
        paddingTop: 4,
    },
    hourLabel: {
        fontSize: typography.size.xs,
        fontWeight: typography.weight.bold,
    },
    hourLine: {
        flex: 1,
        borderTopWidth: 1,
        marginTop: 10,
    },
    entryCardAbsolute: {
        position: 'absolute',
        left: 10,
        right: 20,
        borderRadius: 12,
        borderLeftWidth: 6,
        padding: 10,
        overflow: 'hidden',
    },
    entryCardContent: {
        flex: 1,
    },
    entryTitle: {
        fontSize: typography.size.sm,
        fontWeight: typography.weight.bold,
    },
    entryDurationText: {
        fontSize: typography.size.xs,
        marginTop: 2,
    },
    entryQuickActions: {
        flexDirection: 'row',
        marginTop: 6,
        borderTopWidth: 1,
        borderTopColor: 'rgba(0,0,0,0.05)',
        paddingTop: 4,
    },
    adjustmentGroup: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    adjLabel: {
        fontSize: 10,
        fontWeight: 'bold',
        marginRight: 4,
        color: 'rgba(0,0,0,0.5)',
    },
    adjButtons: {
        flexDirection: 'row',
        gap: 4,
    },
    adjBtn: {
        width: 18,
        height: 18,
        borderRadius: 4,
        backgroundColor: 'rgba(0,0,0,0.05)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    loadingContainer: {
        height: 400,
        justifyContent: 'center',
        alignItems: 'center',
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
    resizeHandle: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        height: 24,
        justifyContent: 'center',
        alignItems: 'center',
    },
    resizeBar: {
        width: 30,
        height: 4,
        borderRadius: 2,
        opacity: 0.5,
    },
    currentTimeContainer: {
        position: 'absolute',
        left: -TIMELINE_LEFT_WIDTH + 8,
        right: 0,
        height: 2,
        zIndex: 10,
        flexDirection: 'row',
        alignItems: 'center',
    },
    currentTimeDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: colors.secondary.red,
    },
    currentTimeLine: {
        flex: 1,
        height: 2,
        backgroundColor: colors.secondary.red,
    }
});
