// ============================================
// auth.js — Connexion / Déconnexion
// ============================================
import { auth } from "./firebase-config.js";
import {
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.7.0/firebase-auth.js";

// ── Connexion utilisateur ──────────────────
export async function connexion(email, motDePasse) {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, motDePasse);
    console.log("Connecté :", userCredential.user.email);
    window.location.href = "pages/dashboard.html";
  } catch (error) {
    let message = "Erreur de connexion.";
    if (error.code === "auth/user-not-found") message = "Utilisateur introuvable.";
    if (error.code === "auth/wrong-password") message = "Mot de passe incorrect.";
    if (error.code === "auth/invalid-email")  message = "Email invalide.";
    afficherErreur(message);
  }
}

// ── Déconnexion ───────────────────────────
export async function deconnexion() {
  await signOut(auth);
  window.location.href = "../index.html";
}

// ── Vérification si connecté ──────────────
// Redirige vers login si non connecté
export function verifierConnexion() {
  onAuthStateChanged(auth, (user) => {
    if (!user) {
      window.location.href = "../index.html";
    } else {
      // Afficher le nom de l'utilisateur connecté
      const emailEl = document.getElementById("user-email");
      if (emailEl) emailEl.textContent = user.email;
    }
  });
}

// ── Afficher message d'erreur ─────────────
function afficherErreur(message) {
  const errEl = document.getElementById("erreur");
  if (errEl) {
    errEl.textContent = message;
    errEl.style.display = "block";
  }
}

// ── Événement formulaire de login ─────────
const formLogin = document.getElementById("form-login");
if (formLogin) {
  formLogin.addEventListener("submit", (e) => {
    e.preventDefault();
    const email = document.getElementById("email").value;
    const mdp   = document.getElementById("motdepasse").value;
    connexion(email, mdp);
  });
}
