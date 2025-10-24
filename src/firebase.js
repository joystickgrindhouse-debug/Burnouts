import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { getAnalytics } from "firebase/analytics";

const firebaseConfig = {
  apiKey: "AIzaSyB68ZwHdbSKc_KmYu_UBEPdde6_1giTvy4",
  authDomain: "rivalis-fitness-reimagined.firebaseapp.com",
  projectId: "rivalis-fitness-reimagined",
  storageBucket: "rivalis-fitness-reimagined.firebasestorage.app",
  messagingSenderId: "87398106759",
  appId: "1:87398106759:web:5048a04e7130f8a027da22",
  measurementId: "G-18CRL1DDT8",
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);
export const analytics = getAnalytics(app);
