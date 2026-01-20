import { View, Text, StyleSheet, Pressable, ScrollView, useColorScheme, ActivityIndicator, Alert, Platform } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { colors, spacing, borderRadius, typography } from "../../src/theme/tokens";
import { useState } from "react";
import Animated, { FadeInDown, ZoomIn } from "react-native-reanimated";
import { Check, ArrowRight, Briefcase, Heart, Palette, GraduationCap, Sparkles } from "lucide-react-native";
import { api } from "../../src/lib/api";
import { useRouter } from "expo-router";

const TEMPLATES = [
    {
        id: "standard",
        title: "Standard",
        icon: Heart,
        color: "#8B5CF6", // Purple
        description: "Semplice e bilanciato: Lavoro, Salute, Tempo libero.",
        lifeAreas: [
            { name: "Lavoro", color: colors.lifeAreas.work, activities: ["Riunioni", "Deep Work", "Email"] },
            { name: "Salute", color: colors.lifeAreas.health, activities: ["Palestra", "Corsa", "Meditazione"] },
            { name: "Personale", color: colors.lifeAreas.creative, activities: ["Lettura", "Hobby"] },
        ]
    },
    {
        id: "freelance",
        title: "Freelance",
        icon: Briefcase,
        color: "#06B6D4", // Cyan
        description: "Per chi gestisce più progetti e clienti.",
        lifeAreas: [
            { name: "Progetti", color: colors.lifeAreas.work, activities: ["Sviluppo", "Design", "Call"] },
            { name: "Admin", color: colors.lifeAreas.growth, activities: ["Fatture", "Clienti"] },
            { name: "Crescita", color: colors.lifeAreas.creative, activities: ["Studio", "Podcast"] },
        ]
    },
    {
        id: "student",
        title: "Studente",
        icon: GraduationCap,
        color: "#F59E0B", // Orange/Amber
        description: "Organizza lo studio e la vita universitaria.",
        lifeAreas: [
            { name: "Studio", color: colors.lifeAreas.growth, activities: ["Lezioni", "Ripasso", "Tesi"] },
            { name: "Social", color: colors.lifeAreas.relationships, activities: ["Uscite", "Sport"] },
            { name: "Skill", color: colors.lifeAreas.creative, activities: ["Corsi online", "Lab"] },
        ]
    }
];

export default function OnboardingScreen() {
    const colorScheme = useColorScheme() || "light";
    const themeColors = colors[colorScheme];
    const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    const handleComplete = async () => {
        if (!selectedTemplate) return;
        const template = TEMPLATES.find(t => t.id === selectedTemplate);
        if (!template) return;

        setLoading(true);
        try {
            await api.applyTemplate(template);
            router.replace("/(tabs)");
        } catch (error: any) {
            Alert.alert("Errore", error.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: themeColors.background }]}>
            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                <Animated.View entering={FadeInDown.duration(600)} style={styles.header}>
                    <View style={styles.sparkleBox}>
                        <Sparkles size={24} color={colors.primary.cyan} />
                    </View>
                    <Text style={[styles.title, { color: themeColors.textPrimary }]}>Configura Crono</Text>
                    <Text style={[styles.subtitle, { color: themeColors.textSecondary }]}>
                        Scegli come organizzare il tuo tempo. Potrai cambiare tutto in seguito.
                    </Text>
                </Animated.View>

                <View style={[styles.templateGrid]}>
                    {TEMPLATES.map((template, i) => {
                        const isSelected = selectedTemplate === template.id;
                        return (
                            <Animated.View key={template.id} entering={FadeInDown.delay(200 + i * 100)}>
                                <Pressable
                                    onPress={() => setSelectedTemplate(template.id)}
                                    style={[
                                        styles.templateCard,
                                        {
                                            backgroundColor: isSelected ? template.color : themeColors.surface,
                                            borderColor: isSelected ? template.color : themeColors.border,
                                            borderWidth: 2,
                                        }
                                    ]}
                                >
                                    <View style={styles.cardHeader}>
                                        <View style={[styles.iconBox, { backgroundColor: isSelected ? 'rgba(255,255,255,0.2)' : template.color + '20' }]}>
                                            {(() => { const Icon = template.icon as any; return <Icon size={24} color={isSelected ? "#FFF" : template.color} />; })()}
                                        </View>
                                        <View style={styles.cardText}>
                                            <Text style={[styles.cardTitle, { color: isSelected ? "#FFF" : themeColors.textPrimary }]}>{template.title}</Text>
                                            <Text style={[styles.cardDesc, { color: isSelected ? "rgba(255,255,255,0.8)" : themeColors.textSecondary }]}>{template.description}</Text>
                                        </View>
                                        {isSelected && (
                                            <Animated.View entering={ZoomIn} style={styles.checkCircle}>
                                                <Check size={16} color={template.color} />
                                            </Animated.View>
                                        )}
                                    </View>

                                    <View style={styles.areaRow}>
                                        {template.lifeAreas.map((area) => (
                                            <View key={area.name} style={[styles.pill, { backgroundColor: isSelected ? 'rgba(255,255,255,0.15)' : area.color + '15' }]}>
                                                <Text style={[styles.pillText, { color: isSelected ? "#FFF" : area.color }]}>{area.name}</Text>
                                            </View>
                                        ))}
                                    </View>
                                </Pressable>
                            </Animated.View>
                        );
                    })}
                </View>
            </ScrollView>

            <View style={[styles.footer, { paddingBottom: Platform.OS === 'ios' ? spacing.xl + 20 : spacing.xl }]}>
                <Pressable
                    onPress={handleComplete}
                    disabled={!selectedTemplate || loading}
                    style={[
                        styles.button,
                        {
                            backgroundColor: selectedTemplate ? colors.primary.cyan : themeColors.border,
                            opacity: loading ? 0.7 : 1,
                        }
                    ]}
                >
                    {loading ? (
                        <ActivityIndicator color="#FFF" />
                    ) : (
                        <>
                            <Text style={styles.buttonText}>Iniziamo</Text>
                            <ArrowRight size={20} color="#FFF" style={{ marginLeft: 8 }} />
                        </>
                    )}
                </Pressable>
            </View>
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
        alignItems: 'center',
        marginBottom: spacing["2xl"],
        marginTop: spacing.xl,
    },
    sparkleBox: {
        width: 56,
        height: 56,
        borderRadius: 16,
        backgroundColor: colors.primary.cyan + '15',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: spacing.lg,
    },
    title: {
        fontSize: typography.size["3xl"],
        fontWeight: typography.weight.bold,
        textAlign: 'center',
        marginBottom: spacing.sm,
    },
    subtitle: {
        fontSize: typography.size.base,
        textAlign: 'center',
        lineHeight: 22,
        paddingHorizontal: spacing.xl,
    },
    templateGrid: {
        gap: spacing.md,
    },
    templateCard: {
        padding: spacing.xl,
        borderRadius: borderRadius.xl,
        borderWidth: 2,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 5,
        elevation: 2,
    },
    cardHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: spacing.lg,
    },
    iconBox: {
        width: 52,
        height: 52,
        borderRadius: 14,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: spacing.lg,
    },
    cardText: {
        flex: 1,
    },
    cardTitle: {
        fontSize: typography.size.xl,
        fontWeight: typography.weight.bold,
    },
    cardDesc: {
        fontSize: typography.size.sm,
        marginTop: 2,
        lineHeight: 18,
    },
    checkCircle: {
        width: 28,
        height: 28,
        borderRadius: 14,
        backgroundColor: "#FFF",
        justifyContent: 'center',
        alignItems: 'center',
    },
    areaRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: spacing.xs,
    },
    pill: {
        paddingHorizontal: spacing.md,
        paddingVertical: 6,
        borderRadius: 8,
    },
    pillText: {
        fontSize: typography.size.xs,
        fontWeight: typography.weight.bold,
    },
    footer: {
        padding: spacing.xl,
        backgroundColor: 'transparent',
    },
    button: {
        height: 60,
        borderRadius: borderRadius.lg,
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
    },
    buttonText: {
        color: "#FFF",
        fontSize: typography.size.lg,
        fontWeight: typography.weight.bold,
    },
});
