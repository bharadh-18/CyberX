import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyAVuCqvvny15UKHf46mjkifHDgE9qN3u0Q",
  authDomain: "cyberx-b72d0.firebaseapp.com",
  projectId: "cyberx-b72d0",
  storageBucket: "cyberx-b72d0.firebasestorage.app",
  messagingSenderId: "474759444575",
  appId: "1:474759444575:web:4ae83273d68540ab7d43ea",
  measurementId: "G-W72G4M53TE"
};

const app = initializeApp(firebaseConfig);
export const firebaseAuth = getAuth(app);
