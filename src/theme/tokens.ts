export const colors = {
    primary: {
        cyan: "#06B6D4",
        blue: "#3B82F6",
        darkBlue: "#1D4ED8",
    },
    secondary: {
        red: "#EF4444",
        green: "#10B981",
    },
    light: {
        background: "#FFFFFF",
        surface: "#F8FAFC",
        textPrimary: "#1E293B",
        textSecondary: "#64748B",
        textTertiary: "#94A3B8",
        border: "#E2E8F0",
    },
    dark: {
        background: "#0F172A",
        surface: "#1E293B",
        textPrimary: "#F8FAFC",
        textSecondary: "#CBD5E1",
        textTertiary: "#94A3B8",
        border: "#334155",
    },
    lifeAreas: {
        work: "#06B6D4",
        health: "#10B981",
        relationships: "#EC4899",
        growth: "#F59E0B",
        creative: "#8B5CF6",
    },
};

export const spacing = {
    xs: 4,
    sm: 8,
    md: 12,
    lg: 16,
    xl: 24,
    "2xl": 32,
    "3xl": 48,
};

export const borderRadius = {
    sm: 8,
    md: 12,
    lg: 16,
    xl: 24,
    full: 9999,
};

export const typography = {
    size: {
        xs: 10,
        sm: 12,
        base: 14,
        lg: 18,
        xl: 20,
        "2xl": 24,
        "3xl": 32,
        "4xl": 40,
    },
    weight: {
        regular: "400",
        semibold: "600",
        bold: "700",
    },
} as const;
