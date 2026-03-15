// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyCTeToDdyD5zUAPgWO6rm2y8E8SOYjJqzs",
  authDomain: "app-paie-client.firebaseapp.com",
  projectId: "app-paie-client",
  storageBucket: "app-paie-client.firebasestorage.app",
  messagingSenderId: "978291133411",
  appId: "1:978291133411:web:128030a936e9f97a3faed6",
  measurementId: "G-B0FB3LZXZ3"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);