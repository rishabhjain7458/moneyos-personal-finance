import { initializeApp } from "firebase/app";
import {
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithPopup,
  signOut,
  getAuth,
} from "firebase/auth";
import {
  collection,
  doc,
  getFirestore,
  onSnapshot,
  setDoc,
} from "firebase/firestore";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

export const hasFirebaseConfig = Object.values(firebaseConfig).every(Boolean);

const app = hasFirebaseConfig ? initializeApp(firebaseConfig) : null;
export const auth = app ? getAuth(app) : null;
export const db = app ? getFirestore(app) : null;

export function watchAuth(callback) {
  if (!auth) {
    callback(null);
    return () => {};
  }

  return onAuthStateChanged(auth, callback);
}

export function signInWithGoogle() {
  if (!auth) return Promise.reject(new Error("Firebase config is missing."));
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: "select_account" });
  return signInWithPopup(auth, provider);
}

export function signOutUser() {
  if (!auth) return Promise.resolve();
  return signOut(auth);
}

export function watchTransactions(uid, callback, onError) {
  if (!db || !uid) return () => {};
  return onSnapshot(collection(db, "users", uid, "transactions"), callback, onError);
}

export function saveTransaction(uid, transaction) {
  if (!db || !uid) return Promise.resolve();
  return setDoc(doc(db, "users", uid, "transactions", String(transaction.id)), transaction);
}

export function watchUserCollection(uid, collectionName, callback, onError) {
  if (!db || !uid) return () => {};
  return onSnapshot(collection(db, "users", uid, collectionName), callback, onError);
}

export function saveUserDocument(uid, collectionName, item) {
  if (!db || !uid) return Promise.resolve();
  return setDoc(doc(db, "users", uid, collectionName, String(item.id)), item);
}
