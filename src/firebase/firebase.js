import { initializeApp } from "firebase/app";
import { getStorage } from "firebase/storage";
import { getAuth, signInAnonymously as signInAnon } from "firebase/auth";

// Firebase configuration - using the config from FileUploadWithProgress.jsx
const firebaseConfig = {
  apiKey: "AIzaSyCDUx849oXn-A_mqfEtQI7lHLJoVD886d0",
  authDomain: "onehub-au-app.firebaseapp.com",
  databaseURL: "https://onehub-au-app-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "onehub-au-app",
  storageBucket: "onehub-au-app.firebasestorage.app",
  messagingSenderId: "535874592150",
  appId: "1:535874592150:web:8f0f9997021ac90fb111b7",
  measurementId: "G-PHM3R2CCB1"
};

// Initialize Firebase only once
const app = initializeApp(firebaseConfig);

// Get Firebase services
const storage = getStorage(app);
const auth = getAuth(app);

// Handle anonymous authentication
const signInAnonymously = async () => {
  try {
    const userCredential = await signInAnon(auth);
    console.log("Signed in anonymously", userCredential.user.uid);
    return userCredential.user;
  } catch (error) {
    console.error("Error signing in anonymously:", error);
    throw error;
  }
};

// Call signInAnonymously immediately and handle the promise
const authPromise = signInAnonymously();

// Export the Firebase services and auth functions
export { storage, auth, authPromise }; 