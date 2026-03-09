import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  projectId: "gen-lang-client-0155031439",
  appId: "1:404649856908:web:7bdff4ced33ebbe0a390a9",
  apiKey: "AIzaSyDPPPkCzuicjcxz1a5vdyK8ZJCRrcLLRr4",
  authDomain: "gen-lang-client-0155031439.firebaseapp.com",
  firestoreDatabaseId: "ai-studio-084b1d39-7f0d-4622-8c31-0236bb1492f8",
  storageBucket: "gen-lang-client-0155031439.firebasestorage.app",
  messagingSenderId: "404649856908"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);
