import { db, auth } from "./firebase";
import {
    collection,
    addDoc,
    getDocs,
    getDoc,
    query,
    where,
    updateDoc,
    doc,
    serverTimestamp,
    onSnapshot,
    writeBatch,
    Timestamp,
    orderBy,
    deleteDoc
} from "firebase/firestore";
import { LifeArea, Activity, TimeEntry } from "../types";

const DELETE_BATCH_SIZE = 450;
const IN_QUERY_CHUNK_SIZE = 10;

type TemplateArea = {
    name: string;
    color: string;
    activities: string[];
};

type TemplateData = {
    lifeAreas: TemplateArea[];
};

const toUpdatePayload = (data: object): Record<string, unknown> => data as Record<string, unknown>;

function chunkArray<T>(items: T[], size: number): T[][]
{
    const chunks: T[][] = [];
    for (let i = 0; i < items.length; i += size) {
        chunks.push(items.slice(i, i + size));
    }
    return chunks;
}

async function commitDeleteRefs(refs: Array<ReturnType<typeof doc>>): Promise<void> {
    for (const chunk of chunkArray(refs, DELETE_BATCH_SIZE)) {
        const batch = writeBatch(db);
        chunk.forEach((ref) => batch.delete(ref));
        await batch.commit();
    }
}

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

    async updateLifeArea(id: string, data: Partial<LifeArea>) {
        const user = auth.currentUser;
        if (!user) throw new Error("Unauthorized");
        const areaRef = doc(db, "lifeAreas", id);
        return updateDoc(areaRef, toUpdatePayload(data));
    },

    async deleteLifeArea(id: string) {
        const user = auth.currentUser;
        if (!user) throw new Error("Unauthorized");
        const activitiesQ = query(
            collection(db, "activities"),
            where("userId", "==", user.uid),
            where("lifeAreaId", "==", id)
        );
        const activitiesSnap = await getDocs(activitiesQ);
        const activityRefs = activitiesSnap.docs.map((docSnap) => docSnap.ref);
        const activityIds = activitiesSnap.docs.map((docSnap) => docSnap.id);

        const entryRefs: Array<ReturnType<typeof doc>> = [];
        for (const activityIdChunk of chunkArray(activityIds, IN_QUERY_CHUNK_SIZE)) {
            if (activityIdChunk.length === 0) continue;
            const entriesQ = query(
                collection(db, "timeEntries"),
                where("userId", "==", user.uid),
                where("activityId", "in", activityIdChunk)
            );
            const entriesSnap = await getDocs(entriesQ);
            entryRefs.push(...entriesSnap.docs.map((docSnap) => docSnap.ref));
        }

        const refsToDelete: Array<ReturnType<typeof doc>> = [
            ...entryRefs,
            ...activityRefs,
            doc(db, "lifeAreas", id),
        ];

        await commitDeleteRefs(refsToDelete);
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

    async updateActivity(id: string, data: Partial<Activity>) {
        const user = auth.currentUser;
        if (!user) throw new Error("Unauthorized");
        const activityRef = doc(db, "activities", id);
        return updateDoc(activityRef, toUpdatePayload(data));
    },

    async deleteActivity(id: string) {
        const user = auth.currentUser;
        if (!user) throw new Error("Unauthorized");
        const entriesQ = query(
            collection(db, "timeEntries"),
            where("userId", "==", user.uid),
            where("activityId", "==", id)
        );
        const entriesSnap = await getDocs(entriesQ);
        const refsToDelete: Array<ReturnType<typeof doc>> = [
            ...entriesSnap.docs.map((docSnap) => docSnap.ref),
            doc(db, "activities", id),
        ];
        await commitDeleteRefs(refsToDelete);
    },

    // Time Entries
    async getActiveEntry(callback: (entry: TimeEntry | null) => void) {
        const user = auth.currentUser;
        if (!user) return;
        const q = query(
            collection(db, "timeEntries"),
            where("userId", "==", user.uid),
            where("endTime", "==", null)
        );
        return onSnapshot(q, (snapshot) => {
            const entries = snapshot.docs
                .map(doc => ({ id: doc.id, ...doc.data() } as TimeEntry))
                .filter(entry => entry.startTime && typeof entry.startTime.toDate === "function")
                .sort((a, b) => b.startTime.toMillis() - a.startTime.toMillis());
            callback(entries[0] || null);
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
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : "Unknown error";
            console.warn("Optimized query failed (likely missing index). Falling back to in-memory filter.", message);

            try {
                // Priority 2: Simple query + In-memory filtering (No composite index needed)
                const qSimple = query(
                    collection(db, "timeEntries"),
                    where("userId", "==", user.uid)
                );
                const snapshot = await getDocs(qSimple);
                const allEntries = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as TimeEntry));

                const filtered = allEntries.filter(entry => {
                    if (!entry.startTime || typeof entry.startTime.toDate !== "function") {
                        return false;
                    }
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
        const entrySnap = await getDoc(entryRef);
        const startTime = entrySnap.exists() ? entrySnap.data().startTime : null;
        const startMs = startTime?.toDate?.().getTime?.();
        const nowMs = Date.now();

        if (startMs && nowMs - startMs < 60 * 1000) {
            return deleteDoc(entryRef);
        }

        return updateDoc(entryRef, {
            endTime: serverTimestamp(),
        });
    },

    async updateEntry(entryId: string, data: Partial<TimeEntry>) {
        const entryRef = doc(db, "timeEntries", entryId);
        return updateDoc(entryRef, toUpdatePayload(data));
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

    async applyTemplate(templateData: TemplateData) {
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
