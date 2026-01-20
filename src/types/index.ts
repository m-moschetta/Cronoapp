export interface LifeArea {
    id: string;
    name: string;
    color: string;
    userId: string;
    createdAt: any;
}

export interface Activity {
    id: string;
    name: string;
    lifeAreaId: string;
    userId: string;
    color: string;
    createdAt: any;
}

export interface TimeEntry {
    id: string;
    activityId: string;
    userId: string;
    startTime: any; // Firestore Timestamp
    endTime: any | null;
    createdAt: any;
}

export interface UserProfile {
    uid: string;
    email: string | null;
    onboarded: boolean;
    createdAt: any;
}
