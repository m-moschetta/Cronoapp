import { db, auth } from "./firebase";
import {
    collection,
    addDoc,
    getDocs,
    query,
    where,
    updateDoc,
    doc,
    serverTimestamp,
    limit,
    onSnapshot,
    writeBatch,
    Timestamp,
    orderBy,
    deleteDoc
} from "firebase/firestore";
import { LifeArea, Activity, TimeEntry } from "../types";

export const api = {
    // Life Areas
    async getLifeAreas(): Promise<LifeArea[]> {
        const user = auth.currentUser;
        if (!user) throw new Error("Unauthorized");
        const q = query(collection(db, "lifeAreas"), where("userId", "==", user.uid));
        const snapshot = await getDocs(q);
        return snapshot.docs.map(d => ({ id: d.id, ...d.data() } as LifeArea));
    },

    async createLifeArea(data: Partial<LifeArea>) {
        const user = auth.currentUser;
        if (!user) throw new Error("Unauthorized");
        return addDoc(collection(db, "lifeAreas"), {
            ...data,
            userId: user.uid,
            createdAt: serverTimestamp(),
        });
    },

    // Activities
    async getActivities(): Promise<Activity[]> {
        const user = auth.currentUser;
        if (!user) throw new Error("Unauthorized");
        try {
            const q = query(collection(db, "activities"), where("userId", "==", user.uid));
            const snapshot = await getDocs(q);
            return snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Activity));
        } catch (error) {
            console.error("Error getting activities:", error);
            throw error;
        }
    },

    async createActivity(data: Partial<Activity>) {
        const user = auth.currentUser;
        if (!user) throw new Error("Unauthorized");
        return addDoc(collection(db, "activities"), {
            ...data,
            userId: user.uid,
            createdAt: serverTimestamp(),
        });
    },

    // Time Entries
    async getActiveEntry(callback: (entry: TimeEntry | null) => void) {
        const user = auth.currentUser;
        if (!user) return;
        const q = query(
            collection(db, "timeEntries"),
            where("userId", "==", user.uid),
            where("endTime", "==", null),
            limit(1)
        );
        return onSnapshot(q, (snapshot) => {
            const entry = snapshot.docs[0];
            callback(entry ? { id: entry.id, ...entry.data() } as TimeEntry : null);
        });
    },

    async getEntriesByRange(start: Date, end: Date): Promise<TimeEntry[]> {
        const user = auth.currentUser;
        if (!user) {
            console.log("getEntriesByRange: No user logged in");
            return [];
        }

        console.log(`Fetching entries for ${user.uid} between ${start.toISOString()} and ${end.toISOString()}`);

        try {
            // Priority 1: Optimized query (Requires Composite Index: userId ASC, startTime ASC)
            const q = query(
                collection(db, "timeEntries"),
                where("userId", "==", user.uid),
                where("startTime", ">=", Timestamp.fromDate(start)),
                where("startTime", "<=", Timestamp.fromDate(end)),
                orderBy("startTime", "asc")
            );

            const snapshot = await getDocs(q);
            const results = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as TimeEntry));
            console.log(`Found ${results.length} entries via optimized query`);
            return results;
        } catch (error: any) {
            console.warn("Optimized query failed (likely missing index). Falling back to in-memory filter.", error.message);

            try {
                // Priority 2: Simple query + In-memory filtering (No composite index needed)
                const qSimple = query(
                    collection(db, "timeEntries"),
                    where("userId", "==", user.uid)
                );
                const snapshot = await getDocs(qSimple);
                const allEntries = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as TimeEntry));

                const filtered = allEntries.filter(entry => {
                    const entryTime = entry.startTime.toDate();
                    return entryTime >= start && entryTime <= end;
                }).sort((a, b) => a.startTime.toMillis() - b.startTime.toMillis());

                console.log(`Found ${filtered.length} entries via fallback query`);
                return filtered;
            } catch (fallbackError) {
                console.error("Fallback query also failed:", fallbackError);
                return [];
            }
        }
    },

    async startEntry(activityId: string) {
        const user = auth.currentUser;
        if (!user) throw new Error("Unauthorized");

        return addDoc(collection(db, "timeEntries"), {
            activityId,
            userId: user.uid,
            startTime: serverTimestamp(),
            endTime: null,
            createdAt: serverTimestamp(),
        });
    },

    async stopEntry(entryId: string) {
        const entryRef = doc(db, "timeEntries", entryId);
        return updateDoc(entryRef, {
            endTime: serverTimestamp(),
        });
    },

    async updateEntry(entryId: string, data: Partial<TimeEntry>) {
        const entryRef = doc(db, "timeEntries", entryId);
        return updateDoc(entryRef, data as any);
    },

    async deleteEntry(entryId: string) {
        console.log("Deleting entry:", entryId);
        const entryRef = doc(db, "timeEntries", entryId);
        return deleteDoc(entryRef);
    },

    async addEntry(data: Partial<TimeEntry>) {
        const user = auth.currentUser;
        if (!user) throw new Error("Unauthorized");
        console.log("Adding manual entry:", data);
        return addDoc(collection(db, "timeEntries"), {
            ...data,
            userId: user.uid,
            createdAt: serverTimestamp(),
        });
    },

    async applyTemplate(templateData: any) {
        const user = auth.currentUser;
        if (!user) throw new Error("Unauthorized");

        const batch = writeBatch(db);

        // Firestore batches allow up to 500 operations. 
        // Our templates are small, so one batch is plenty.
        for (const area of templateData.lifeAreas) {
            const areaRef = doc(collection(db, "lifeAreas"));
            batch.set(areaRef, {
                name: area.name,
                color: area.color,
                userId: user.uid,
                createdAt: serverTimestamp(),
            });

            for (const activityName of area.activities) {
                const activityRef = doc(collection(db, "activities"));
                batch.set(activityRef, {
                    name: activityName,
                    lifeAreaId: areaRef.id,
                    userId: user.uid,
                    color: area.color,
                    createdAt: serverTimestamp(),
                });
            }
        }

        const userRef = doc(db, "users", user.uid);
        batch.update(userRef, { onboarded: true });

        await batch.commit();
    }
};
