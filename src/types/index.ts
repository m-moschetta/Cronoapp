import type { Timestamp } from "firebase/firestore";

export interface LifeArea {
    id: string;
    name: string;
    color: string;
    userId: string;
    createdAt: Timestamp;
}

export interface Activity {
    id: string;
    name: string;
    lifeAreaId: string;
    userId: string;
    color: string;
    createdAt: Timestamp;
}

export interface TimeEntry {
    id: string;
    activityId: string;
    userId: string;
    startTime: Timestamp;
    endTime: Timestamp | null;
    createdAt: Timestamp;
}

export interface UserProfile {
    uid: string;
    email: string | null;
    onboarded: boolean;
    createdAt: Timestamp;
}
