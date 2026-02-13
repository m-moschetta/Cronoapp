import { View, Text, StyleSheet, ScrollView, ActivityIndicator, Pressable, Dimensions, Alert, Platform, Modal, TextInput } from "react-native";
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
import { TimeEntry, Activity, LifeArea } from "../../src/types";
import { useAppColorScheme } from "../../src/lib/store";
import {
    Gesture,
    GestureDetector,
    GestureHandlerRootView
} from "react-native-gesture-handler";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const HOUR_HEIGHT = 80;
const TIMELINE_LEFT_WIDTH = 60;
const ENTRY_LEFT_OFFSET = 10;
const ENTRY_RIGHT_OFFSET = 20;
const ENTRY_COLUMN_GAP = 4;
const MIN_ENTRY_HEIGHT = 40;
const EVENT_AREA_WIDTH = SCREEN_WIDTH - TIMELINE_LEFT_WIDTH - ENTRY_LEFT_OFFSET - ENTRY_RIGHT_OFFSET;
const MIN_HOUR_HEIGHT = 56;
const MAX_HOUR_HEIGHT = 150;

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

type PositionedEntry = {
    entry: TimeEntry;
    column: number;
    totalColumns: number;
};

const EntryCard = ({
    entry,
    column,
    totalColumns,
    hourHeight,
    activities,
    adjustTime,
    updateEntryMutation,
    themeColors,
    isSelected,
    onPress
}: {
    entry: TimeEntry,
    column: number,
    totalColumns: number,
    hourHeight: number,
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
    const initialHeight = Math.max((durationMin / 60 * hourHeight), MIN_ENTRY_HEIGHT);
    const columnWidth = Math.max(
        (EVENT_AREA_WIDTH - ((totalColumns - 1) * ENTRY_COLUMN_GAP)) / totalColumns,
        48
    );
    const left = ENTRY_LEFT_OFFSET + (column * (columnWidth + ENTRY_COLUMN_GAP));
    const durationLabel = `${Math.floor(durationMin / 60).toString().padStart(2, "0")}:${(durationMin % 60).toString().padStart(2, "0")}`;

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
        const minutesDelta = (y / hourHeight) * 60;
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
        const newDurationMin = (h / hourHeight) * 60;
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

    const top = (start.getHours() * hourHeight) + (start.getMinutes() / 60 * hourHeight);

    return (
        <GestureDetector gesture={Gesture.Exclusive(pan, tap)}>
            <Animated.View
                style={[
                    styles.entryCardAbsolute,
                    animatedStyle,
                    {
                        top,
                        left,
                        width: columnWidth,
                        backgroundColor: (activity?.color || colors.primary.cyan) + '20',
                        borderLeftColor: activity?.color || colors.primary.cyan,
                        borderWidth: isSelected ? 2 : 0,
                        borderColor: activity?.color || colors.primary.cyan,
                    }
                ]}
            >
                <View style={styles.entryCardContent}>
                    <View style={styles.entryHeaderRow}>
                        <Text style={[styles.entryTitle, { color: themeColors.textPrimary }]} numberOfLines={1}>
                            {activity?.name || "Attività"}
                        </Text>
                        <Text style={[styles.entryDurationBadge, { color: themeColors.textPrimary }]} numberOfLines={1}>
                            {durationLabel}
                        </Text>
                    </View>
                    <Text style={[styles.entryDurationText, { color: themeColors.textSecondary }]} numberOfLines={1}>
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
    const colorScheme = useAppColorScheme();
    const themeColors = colors[colorScheme];
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [selectedEntryId, setSelectedEntryId] = useState<string | null>(null);
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [activityQuery, setActivityQuery] = useState("");
    const [selectedAreaFilter, setSelectedAreaFilter] = useState<string>("Tutte");
    const [selectedDuration, setSelectedDuration] = useState<number>(60);
    const [startHour, setStartHour] = useState<number>(9);
    const [startMinute, setStartMinute] = useState<number>(0);
    const [now, setNow] = useState(new Date());
    const [hourHeight, setHourHeight] = useState<number>(HOUR_HEIGHT);
    const queryClient = useQueryClient();
    const scrollRef = useRef<ScrollView>(null);
    const pinchBaseHourHeight = useSharedValue(HOUR_HEIGHT);
    const pinchReportedHourHeight = useSharedValue(HOUR_HEIGHT);

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

    const { data: fetchedLifeAreas = [] } = useQuery<LifeArea[]>({
        queryKey: ["lifeAreas", user?.uid],
        queryFn: () => api.getLifeAreas(),
        staleTime: 5 * 60 * 1000,
        enabled: !!user,
    });
    const areaList = useMemo<LifeArea[]>(() => fetchedLifeAreas ?? [], [fetchedLifeAreas]);
    const lifeAreas = areaList;

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

    const positionedEntries = useMemo<PositionedEntry[]>(() => {
        if (entries.length === 0) {
            return [];
        }

        const sorted = [...entries]
            .map((entry) => {
                const start = entry.startTime.toDate();
                const end = entry.endTime?.toDate() || new Date();
                const startMin = (start.getHours() * 60) + start.getMinutes();
                const endMinRaw = (end.getHours() * 60) + end.getMinutes();
                const endMin = Math.max(endMinRaw, startMin + 1);
                return { entry, startMin, endMin };
            })
            .sort((a, b) => {
                if (a.startMin !== b.startMin) return a.startMin - b.startMin;
                return a.endMin - b.endMin;
            });

        const positioned: PositionedEntry[] = [];
        const active: Array<{ endMin: number; column: number }> = [];
        let clusterIndexes: number[] = [];
        let clusterMaxColumns = 0;
        const freeColumns: number[] = [];
        let nextColumn = 0;

        const flushCluster = () => {
            if (clusterIndexes.length === 0) return;
            for (const index of clusterIndexes) {
                positioned[index].totalColumns = Math.max(clusterMaxColumns, 1);
            }
            clusterIndexes = [];
            clusterMaxColumns = 0;
        };

        for (const item of sorted) {
            for (let i = active.length - 1; i >= 0; i--) {
                if (active[i].endMin <= item.startMin) {
                    freeColumns.push(active[i].column);
                    active.splice(i, 1);
                }
            }

            if (active.length === 0) {
                flushCluster();
                freeColumns.length = 0;
                nextColumn = 0;
            }

            freeColumns.sort((a, b) => a - b);
            const assignedColumn = freeColumns.length > 0 ? freeColumns.shift()! : nextColumn++;

            active.push({ endMin: item.endMin, column: assignedColumn });
            clusterMaxColumns = Math.max(clusterMaxColumns, active.length);
            const positionedIndex = positioned.push({
                entry: item.entry,
                column: assignedColumn,
                totalColumns: 1
            }) - 1;
            clusterIndexes.push(positionedIndex);
        }

        flushCluster();
        return positioned;
    }, [entries]);

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
        setActivityQuery("");
        setSelectedAreaFilter("Tutte");
        const baseStart = getDefaultStart();
        setSelectedDuration(60);
        setStartHour(baseStart.getHours());
        setStartMinute(baseStart.getMinutes() - (baseStart.getMinutes() % 5));
        setIsAddModalOpen(true);
    };

    const getDefaultStart = () => {
        const now = new Date();
        if (isSameDay(selectedDate, now)) {
            return now;
        }
        const base = new Date(selectedDate);
        base.setHours(9, 0, 0, 0);
        return base;
    };

    const handleAddActivity = (activity: Activity) => {
        const start = new Date(selectedDate);
        start.setHours(startHour, startMinute, 0, 0);
        const end = addMinutes(start, selectedDuration);
        addEntryMutation.mutate({
            activityId: activity.id,
            startTime: Timestamp.fromDate(start),
            endTime: Timestamp.fromDate(end),
        });
        setIsAddModalOpen(false);
    };

    const renderTimeline = () => {
        const hours = Array.from({ length: 24 }, (_, i) => i);
        const isToday = isSameDay(selectedDate, new Date());
        const nowPos = (now.getHours() * hourHeight) + (now.getMinutes() / 60 * hourHeight);

        return (
            <View style={styles.timelineContainer}>
                {hours.map(hour => (
                    <View key={hour} style={[styles.hourRow, { height: hourHeight }]}>
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

                {positionedEntries.map(({ entry, column, totalColumns }) => (
                    <EntryCard
                        key={entry.id}
                        entry={entry}
                        column={column}
                        totalColumns={totalColumns}
                        hourHeight={hourHeight}
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

    const pinchTimeline = Gesture.Pinch()
        .onBegin(() => {
            pinchBaseHourHeight.value = hourHeight;
            pinchReportedHourHeight.value = hourHeight;
        })
        .onUpdate((event) => {
            const nextHeight = clamp(pinchBaseHourHeight.value * event.scale, MIN_HOUR_HEIGHT, MAX_HOUR_HEIGHT);
            if (Math.abs(nextHeight - pinchReportedHourHeight.value) >= 1) {
                pinchReportedHourHeight.value = nextHeight;
                runOnJS(setHourHeight)(Math.round(nextHeight));
            }
        })
        .onEnd(() => {
            const finalHeight = Math.round(clamp(pinchReportedHourHeight.value, MIN_HOUR_HEIGHT, MAX_HOUR_HEIGHT));
            runOnJS(setHourHeight)(finalHeight);
        });

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

            <GestureDetector gesture={pinchTimeline}>
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
            </GestureDetector>

            <Pressable style={styles.fab} onPress={handleAddManual}>
                <Plus size={32} color="#FFF" />
            </Pressable>

            <Modal visible={isAddModalOpen} transparent animationType="slide">
                <View style={styles.modalOverlay}>
                    <View style={[styles.modalContent, { backgroundColor: themeColors.surface }]}>
                        <Text style={[styles.modalTitle, { color: themeColors.textPrimary }]}>Scegli attività</Text>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll} contentContainerStyle={styles.filterContainer}>
                            {["Tutte", ...areaList.map((area) => area.name)].map((area) => (
                                <Pressable
                                    key={area}
                                    onPress={() => setSelectedAreaFilter(area)}
                                    style={[
                                        styles.filterPill,
                                        { backgroundColor: selectedAreaFilter === area ? colors.primary.cyan : themeColors.background },
                                    ]}
                                >
                                    <Text style={[styles.filterText, { color: selectedAreaFilter === area ? "#FFF" : themeColors.textSecondary }]}>
                                        {area}
                                    </Text>
                                </Pressable>
                            ))}
                        </ScrollView>
                        <TextInput
                            style={[styles.searchInput, { color: themeColors.textPrimary, borderColor: themeColors.border }]}
                            placeholder="Cerca attività..."
                            placeholderTextColor={themeColors.textTertiary}
                            value={activityQuery}
                            onChangeText={setActivityQuery}
                        />
                        <View style={styles.timeRow}>
                            <Text style={[styles.timeLabel, { color: themeColors.textSecondary }]}>Inizio</Text>
                            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                                {Array.from({ length: 24 }, (_, i) => i).map((hour) => (
                                    <Pressable
                                        key={hour}
                                        onPress={() => setStartHour(hour)}
                                        style={[
                                            styles.timePill,
                                            { borderColor: themeColors.border, backgroundColor: startHour === hour ? colors.primary.cyan : themeColors.background }
                                        ]}
                                    >
                                        <Text style={[styles.timeText, { color: startHour === hour ? "#FFF" : themeColors.textSecondary }]}>
                                            {hour.toString().padStart(2, "0")}
                                        </Text>
                                    </Pressable>
                                ))}
                            </ScrollView>
                            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.minuteScroll}>
                                {[0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55].map((minute) => (
                                    <Pressable
                                        key={minute}
                                        onPress={() => setStartMinute(minute)}
                                        style={[
                                            styles.timePill,
                                            { borderColor: themeColors.border, backgroundColor: startMinute === minute ? colors.primary.cyan : themeColors.background }
                                        ]}
                                    >
                                        <Text style={[styles.timeText, { color: startMinute === minute ? "#FFF" : themeColors.textSecondary }]}>
                                            {minute.toString().padStart(2, "0")}
                                        </Text>
                                    </Pressable>
                                ))}
                            </ScrollView>
                        </View>
                        <View style={styles.durationRow}>
                            {[15, 30, 60, 90, 120].map((minutes) => (
                                <Pressable
                                    key={minutes}
                                    onPress={() => setSelectedDuration(minutes)}
                                    style={[
                                        styles.durationPill,
                                        { borderColor: themeColors.border, backgroundColor: selectedDuration === minutes ? colors.primary.cyan : themeColors.background }
                                    ]}
                                >
                                    <Text style={[styles.durationText, { color: selectedDuration === minutes ? "#FFF" : themeColors.textSecondary }]}>
                                        {minutes}m
                                    </Text>
                                </Pressable>
                            ))}
                        </View>
                        <ScrollView style={styles.modalList} showsVerticalScrollIndicator={false}>
                            {activities
                                .filter((activity) => activity.name.toLowerCase().includes(activityQuery.trim().toLowerCase()))
                                .filter((activity) => {
                                    if (selectedAreaFilter === "Tutte") return true;
                                    const area = areaList.find((a) => a.id === activity.lifeAreaId);
                                    return area?.name === selectedAreaFilter;
                                })
                                .map((activity) => {
                                    const area = areaList.find((a) => a.id === activity.lifeAreaId);
                                    return (
                                        <Pressable
                                            key={activity.id}
                                            onPress={() => handleAddActivity(activity)}
                                            style={[styles.modalRow, { borderColor: themeColors.border }]}
                                        >
                                            <View style={[styles.modalDot, { backgroundColor: activity.color || area?.color || colors.primary.cyan }]} />
                                            <View style={styles.modalRowText}>
                                                <Text style={[styles.modalRowTitle, { color: themeColors.textPrimary }]} numberOfLines={1}>
                                                    {activity.name}
                                                </Text>
                                                <Text style={[styles.modalRowSubtitle, { color: themeColors.textTertiary }]} numberOfLines={1}>
                                                    {area?.name || "Nessuna area"}
                                                </Text>
                                            </View>
                                        </Pressable>
                                    );
                                })}
                        </ScrollView>
                        <Pressable onPress={() => setIsAddModalOpen(false)} style={[styles.modalClose, { backgroundColor: themeColors.background }]}>
                            <Text style={{ color: themeColors.textSecondary }}>Chiudi</Text>
                        </Pressable>
                    </View>
                </View>
            </Modal>
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
        flex: 1,
        marginRight: 6,
    },
    entryDurationText: {
        fontSize: typography.size.xs,
        marginTop: 2,
    },
    entryHeaderRow: {
        flexDirection: "row",
        alignItems: "center",
    },
    entryDurationBadge: {
        fontSize: typography.size.xs,
        fontWeight: typography.weight.bold,
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
    modalOverlay: {
        flex: 1,
        backgroundColor: "rgba(0,0,0,0.5)",
        justifyContent: "flex-end",
    },
    modalContent: {
        padding: spacing.xl,
        borderTopLeftRadius: 28,
        borderTopRightRadius: 28,
        maxHeight: "70%",
    },
    modalTitle: {
        fontSize: typography.size.xl,
        fontWeight: typography.weight.bold,
        marginBottom: spacing.md,
    },
    filterScroll: {
        marginBottom: spacing.md,
    },
    filterContainer: {
        gap: spacing.sm,
        paddingRight: spacing.sm,
    },
    filterPill: {
        paddingHorizontal: spacing.md,
        height: 34,
        borderRadius: 17,
        justifyContent: "center",
        alignItems: "center",
    },
    filterText: {
        fontSize: typography.size.sm,
        fontWeight: typography.weight.bold,
    },
    searchInput: {
        height: 44,
        borderWidth: 1,
        borderRadius: 12,
        paddingHorizontal: spacing.md,
        fontSize: typography.size.sm,
        marginBottom: spacing.md,
    },
    durationRow: {
        flexDirection: "row",
        flexWrap: "wrap",
        gap: spacing.sm,
        marginBottom: spacing.md,
    },
    timeRow: {
        marginBottom: spacing.md,
    },
    timeLabel: {
        fontSize: typography.size.sm,
        fontWeight: typography.weight.bold,
        marginBottom: spacing.sm,
    },
    timePill: {
        paddingHorizontal: spacing.md,
        paddingVertical: 6,
        borderRadius: 20,
        borderWidth: 1,
        marginRight: spacing.sm,
    },
    timeText: {
        fontSize: typography.size.sm,
        fontWeight: typography.weight.bold,
    },
    minuteScroll: {
        marginTop: spacing.sm,
    },
    durationPill: {
        paddingHorizontal: spacing.md,
        paddingVertical: 6,
        borderRadius: 20,
        borderWidth: 1,
    },
    durationText: {
        fontSize: typography.size.sm,
        fontWeight: typography.weight.bold,
    },
    modalList: {
        marginBottom: spacing.md,
    },
    modalRow: {
        flexDirection: "row",
        alignItems: "center",
        paddingVertical: spacing.sm,
        paddingHorizontal: spacing.md,
        borderWidth: 1,
        borderRadius: 14,
        marginBottom: spacing.sm,
    },
    modalDot: {
        width: 12,
        height: 12,
        borderRadius: 6,
        marginRight: spacing.sm,
    },
    modalRowText: {
        flex: 1,
    },
    modalRowTitle: {
        fontSize: typography.size.base,
        fontWeight: typography.weight.bold,
    },
    modalRowSubtitle: {
        fontSize: typography.size.xs,
        marginTop: 2,
    },
    modalClose: {
        height: 48,
        borderRadius: 12,
        alignItems: "center",
        justifyContent: "center",
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
