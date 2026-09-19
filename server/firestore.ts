import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  initializeFirestore,
  collection,
  doc,
  getDocs,
  setDoc,
  deleteDoc,
  Firestore,
} from 'firebase/firestore';
import fs from 'fs';
import path from 'path';

let firestoreInstance: Firestore | null = null;

export function getFirestoreDb(): Firestore | null {
  if (firestoreInstance) return firestoreInstance;

  try {
    const configPath = path.join(process.cwd(), 'firebase-applet-config.json');
    if (!fs.existsSync(configPath)) {
      console.warn('[Firestore] firebase-applet-config.json not found');
      return null;
    }

    const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    const app = getApps().length === 0 ? initializeApp(config) : getApp();
    const dbId = config.firestoreDatabaseId || '(default)';
    firestoreInstance = initializeFirestore(app, {}, dbId);
    console.log(`[Firestore] Connected to database: ${dbId}`);
    return firestoreInstance;
  } catch (err: any) {
    console.error('[Firestore] Initialization error:', err.message);
    return null;
  }
}

function withTimeout<T>(promise: Promise<T>, ms: number, fallback: T): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((resolve) => setTimeout(() => resolve(fallback), ms)),
  ]);
}

export async function loadCollectionFromFirestore<T>(collectionName: string): Promise<T[]> {
  const db = getFirestoreDb();
  if (!db) return [];
  try {
    const fetchPromise = getDocs(collection(db, collectionName)).then((snapshot) =>
      snapshot.docs.map((d) => d.data() as T)
    );
    return await withTimeout(fetchPromise, 8000, []);
  } catch (err: any) {
    console.warn(`[Firestore] Failed to read collection ${collectionName}:`, err.message);
    return [];
  }
}

export async function saveDocumentToFirestore(
  collectionName: string,
  docId: string,
  data: any
): Promise<void> {
  const db = getFirestoreDb();
  if (!db) return;
  try {
    const savePromise = setDoc(doc(db, collectionName, docId), data, { merge: true });
    await withTimeout(savePromise, 8000, undefined);
  } catch (err: any) {
    console.error(`[Firestore] Failed to write to ${collectionName}/${docId}:`, err.message);
  }
}

export async function deleteDocumentFromFirestore(
  collectionName: string,
  docId: string
): Promise<void> {
  const db = getFirestoreDb();
  if (!db) return;
  try {
    const deletePromise = deleteDoc(doc(db, collectionName, docId));
    await withTimeout(deletePromise, 8000, undefined);
  } catch (err: any) {
    console.error(`[Firestore] Failed to delete from ${collectionName}/${docId}:`, err.message);
  }
}
