import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';

const firebaseConfig = {
  apiKey: "AIzaSyDocKEiKp65rSyq_JDvs4tnFBt_j5PSZ0k",
  authDomain: "iris-orthopedic.firebaseapp.com",
  projectId: "iris-orthopedic",
  storageBucket: "iris-orthopedic.firebasestorage.app",
  messagingSenderId: "727915261975",
  appId: "1:727915261975:web:25e9593dd22633ad8d2c52"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

export { auth };
export default app;