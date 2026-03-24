// FirebaseUI requires the compat (namespaced) API — not the modular API.
import firebase from 'firebase/compat/app';
import 'firebase/compat/auth';

const firebaseConfig = {
  apiKey: "AIzaSyDocKEiKp65rSyq_JDvs4tnFBt_j5PSZ0k",
  authDomain: "iris-orthopedic.firebaseapp.com",
  projectId: "iris-orthopedic",
  storageBucket: "iris-orthopedic.firebasestorage.app",
  messagingSenderId: "727915261975",
  appId: "1:727915261975:web:25e9593dd22633ad8d2c52"
};

// Initialize Firebase
const app = firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();

export { auth, firebase };
export default app;