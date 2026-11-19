import { initializeApp, getApps, getApp } from "firebase/app";
import { connectFirestoreEmulator, Firestore, getFirestore, initializeFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { getStorage } from "firebase/storage";

// Configuración de Firebase
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

const DATABASE_ID = "gtm2";

// Inicializar Firebase solo si no está ya inicializado
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// ignoreUndefinedProperties evita el error "Unsupported field value: undefined"
// cuando un campo opcional (precioCosto, productoId, etc.) queda sin valor.
let firestore: Firestore;
try {
  firestore = initializeFirestore(app, { ignoreUndefinedProperties: true }, DATABASE_ID);
  // Para probar en local sin tocar datos reales: NEXT_PUBLIC_FIRESTORE_EMULATOR_HOST=127.0.0.1:8080
  const emulador = process.env.NEXT_PUBLIC_FIRESTORE_EMULATOR_HOST;
  if (emulador) {
    const [host, port] = emulador.split(":");
    connectFirestoreEmulator(firestore, host, Number(port));
  }
} catch {
  // Ya inicializado (recarga en caliente en desarrollo)
  firestore = getFirestore(app, DATABASE_ID);
}

export const db = firestore;
export const auth = getAuth(app);
export const storage = getStorage(app);

export default app;
