import {
  collection,
  doc,
  setDoc,
  getDocs,
  getDoc,
  deleteDoc,
  serverTimestamp,
} from 'firebase/firestore';
import { db as firestoreDb } from '../firebase';
import { Company, User, Condominium, InspectionTemplate, Inspection } from '../types';

/**
 * Sync / Backup collections directly to Firebase Firestore
 * to ensure persistent storage across deploys and container rebuilds.
 */

export const FirestoreService = {
  // Sync full database state to Firestore
  async pushFullStateToFirestore(data: {
    companies?: Company[];
    users?: User[];
    condominiums?: Condominium[];
    templates?: InspectionTemplate[];
    inspections?: Inspection[];
  }) {
    try {
      // 1. Companies
      if (data.companies) {
        for (const comp of data.companies) {
          await setDoc(doc(firestoreDb, 'companies', comp.id), {
            ...comp,
            updatedAt: serverTimestamp(),
          }, { merge: true });
        }
      }

      // 2. Users
      if (data.users) {
        for (const u of data.users) {
          await setDoc(doc(firestoreDb, 'users', u.id), {
            ...u,
            updatedAt: serverTimestamp(),
          }, { merge: true });
        }
      }

      // 3. Condominiums
      if (data.condominiums) {
        for (const cond of data.condominiums) {
          await setDoc(doc(firestoreDb, 'condominiums', cond.id), {
            ...cond,
            updatedAt: serverTimestamp(),
          }, { merge: true });
        }
      }

      // 4. Templates
      if (data.templates) {
        for (const tmpl of data.templates) {
          await setDoc(doc(firestoreDb, 'templates', tmpl.id), {
            ...tmpl,
            updatedAt: serverTimestamp(),
          }, { merge: true });
        }
      }

      // 5. Inspections
      if (data.inspections) {
        for (const insp of data.inspections) {
          await setDoc(doc(firestoreDb, 'inspections', insp.id), {
            ...insp,
            updatedAt: serverTimestamp(),
          }, { merge: true });
        }
      }

      return { success: true };
    } catch (error) {
      console.error('Erro ao sincronizar com Firestore:', error);
      throw error;
    }
  },

  // Pull all data from Firestore
  async pullFullStateFromFirestore() {
    try {
      const companiesSnap = await getDocs(collection(firestoreDb, 'companies'));
      const companies = companiesSnap.docs.map((d) => d.data() as Company);

      const usersSnap = await getDocs(collection(firestoreDb, 'users'));
      const users = usersSnap.docs.map((d) => d.data() as User);

      const condsSnap = await getDocs(collection(firestoreDb, 'condominiums'));
      const condominiums = condsSnap.docs.map((d) => d.data() as Condominium);

      const tmplsSnap = await getDocs(collection(firestoreDb, 'templates'));
      const templates = tmplsSnap.docs.map((d) => d.data() as InspectionTemplate);

      const inspsSnap = await getDocs(collection(firestoreDb, 'inspections'));
      const inspections = inspsSnap.docs.map((d) => d.data() as Inspection);

      return {
        companies,
        users,
        condominiums,
        templates,
        inspections,
      };
    } catch (error) {
      console.error('Erro ao baixar dados do Firestore:', error);
      throw error;
    }
  },

  // Clear templates and inspections in Firestore
  async clearTemplatesAndInspectionsInFirestore() {
    try {
      const tmplsSnap = await getDocs(collection(firestoreDb, 'templates'));
      for (const d of tmplsSnap.docs) {
        await deleteDoc(d.ref);
      }

      const inspsSnap = await getDocs(collection(firestoreDb, 'inspections'));
      for (const d of inspsSnap.docs) {
        await deleteDoc(d.ref);
      }

      return { success: true };
    } catch (error) {
      console.error('Erro ao limpar modelos e vistorias no Firestore:', error);
      throw error;
    }
  },

  // Save single inspection directly to Firestore
  async saveInspectionToFirestore(inspection: Inspection) {
    try {
      await setDoc(doc(firestoreDb, 'inspections', inspection.id), {
        ...inspection,
        updatedAt: serverTimestamp(),
      }, { merge: true });
      return true;
    } catch (err) {
      console.error('Falha ao salvar vistoria no Firestore:', err);
      return false;
    }
  },
};
