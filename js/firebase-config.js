// js/firebase-config.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.0/firebase-app.js";
import { getAuth }       from "https://www.gstatic.com/firebasejs/10.7.0/firebase-auth.js";
import { getFirestore }  from "https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey:            "AIzaSyCTeToDdyD5zUAPgWO6rm2y8E8SOYjJqzs",
  authDomain:        "app-paie-client.firebaseapp.com",
  projectId:         "app-paie-client",
  storageBucket:     "app-paie-client.firebasestorage.app",
  messagingSenderId: "978291133411",
  appId:             "1:978291133411:web:128030a936e9f97a3faed6"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db   = getFirestore(app);