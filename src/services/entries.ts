import { collection, doc, deleteDoc, updateDoc, serverTimestamp, getDocs, query, where, orderBy, limit as fbLimit, QueryConstraint } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { Entry } from '@/types';

export async function deleteEntry(entryId: string): Promise<void> {
  await deleteDoc(doc(db, 'entries', entryId));
}

export async function updateEntry(entryId: string, updates: Partial<Entry>, updatedBy: string): Promise<void> {
  const docRef = doc(db, 'entries', entryId);
  await updateDoc(docRef, {
    ...updates,
    updatedAt: serverTimestamp(),
    updatedBy,
  });
}

// Generic entries getter
interface GetEntriesOptions {
  userIds?: string[];
  userId?: string;
  startTime?: number; // ms epoch
  endTime?: number;   // ms epoch
  order?: 'asc' | 'desc';
  limit?: number;
}

export async function getEntries(options: GetEntriesOptions = {}): Promise<Entry[]> {
  const { userIds, userId, startTime, endTime, order = 'desc', limit } = options;

  const constraints: QueryConstraint[] = [];
  if (userIds && userIds.length > 0) {
    constraints.push(where('userId', 'in', userIds.slice(0, 10))); // Firestore 'in' supports up to 10
  } else if (userId) {
    constraints.push(where('userId', '==', userId));
  }
  if (startTime) {
    constraints.push(where('date', '>=', new Date(startTime)));
  }
  if (endTime) {
    constraints.push(where('date', '<=', new Date(endTime)));
  }
  constraints.push(orderBy('date', order));
  if (limit && limit > 0) {
    constraints.push(fbLimit(limit));
  }

  const snap = await getDocs(query(collection(db, 'entries'), ...constraints));
  type FirestoreEntryData = {
    type: Entry['type'];
    userId: string;
    originalAmount?: unknown;
    amount?: unknown;
    currency?: unknown;
    category?: unknown;
    description?: unknown;
    date?: unknown & { toDate?: () => Date };
    createdBy: string;
    createdAt?: unknown & { toDate?: () => Date };
    updatedAt?: unknown & { toDate?: () => Date };
    updatedBy?: unknown;
    location?: unknown;
    recurringTemplateId?: unknown;
    isRecurringInstance?: unknown;
    isModified?: unknown;
  };
  return snap.docs.map(d => {
    const data = d.data() as FirestoreEntryData;
    const dateVal = data.date?.toDate ? data.date.toDate() : (typeof data.date === 'string' ? new Date(data.date) : new Date());
    const createdAt = data.createdAt?.toDate ? data.createdAt.toDate() : (typeof data.createdAt === 'string' ? new Date(data.createdAt) : new Date());
    const updatedAt = data.updatedAt?.toDate ? data.updatedAt.toDate() : (typeof data.updatedAt === 'string' ? new Date(data.updatedAt) : undefined);
    return {
      id: d.id,
      type: data.type,
      userId: data.userId,
      originalAmount: Number(data.originalAmount ?? data.amount ?? 0),
      currency: String(data.currency ?? ''),
      category: String(data.category ?? ''),
      description: (data.description as string | undefined) ?? undefined,
      date: dateVal,
      createdBy: data.createdBy,
      createdAt,
      updatedAt,
      updatedBy: (data.updatedBy as string | undefined) ?? undefined,
      location: (data.location as { lat: number; lng: number } | undefined) ?? undefined,
      recurringTemplateId: (data.recurringTemplateId as string | undefined) ?? undefined,
      isRecurringInstance: (data.isRecurringInstance as boolean | undefined) ?? undefined,
      isModified: (data.isModified as boolean | undefined) ?? undefined,
    } as Entry;
  });
}

export async function getEntriesSummary(options: { userId: string; limit?: number }): Promise<Array<{ amount: number; currency: string; category: string; date: string }>> {
  const { userId, limit = 25 } = options;
  const entries = await getEntries({ userId, order: 'desc', limit });
  return entries.map(e => ({
    amount: Number(e.originalAmount ?? 0),
    currency: e.currency,
    category: e.category,
    date: e.date.toISOString().split('T')[0],
  }));
}