// ============================================
// auth.js — Connexion / Déconnexion
// ============================================
import { auth } from "./firebase-config.js";
import {
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  sendPasswordResetEmail
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
    if (error.code === "auth/wrong-password")  message = "Mot de passe incorrect.";
    if (error.code === "auth/invalid-email")   message = "Email invalide.";
    afficherErreur(message);
  }
}

// ── Mot de passe oublié ───────────────────
export async function motDePasseOublie(email) {
  if (!email) {
    afficherErreur("Entrez votre email ci-dessus puis cliquez sur le lien.");
    return;
  }
  try {
    await sendPasswordResetEmail(auth, email);
    afficherSucces("Email de réinitialisation envoyé ! Vérifiez votre boîte mail.");
  } catch (error) {
    let message = "Erreur lors de l'envoi.";
    if (error.code === "auth/user-not-found") message = "Aucun compte avec cet email.";
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
export function verifierConnexion() {
  onAuthStateChanged(auth, (user) => {
    if (!user) {
      window.location.href = "../index.html";
    } else {
      const emailEl = document.getElementById("user-email");
      if (emailEl) emailEl.textContent = user.email;
    }
  });
}

// ── Afficher message d'erreur ─────────────
function afficherErreur(message) {
  const errEl = document.getElementById("erreur");
  if (errEl) {
    errEl.style.color = "#EF4444";
    errEl.textContent = message;
    errEl.style.display = "block";
  }
}

// ── Afficher message de succès ────────────
function afficherSucces(message) {
  const errEl = document.getElementById("erreur");
  if (errEl) {
    errEl.style.color = "#10B981";
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

// ── Événement lien mot de passe oublié ────
const lienOublie = document.getElementById("forgot-link");
if (lienOublie) {
  lienOublie.addEventListener("click", (e) => {
    e.preventDefault();
    e.stopPropagation(); // empêche le formulaire de se soumettre

    const email = document.getElementById("email").value.trim();
    motDePasseOublie(email);
  });
}
// ── Afficher / Masquer mot de passe ───────
const toggleMdp = document.getElementById("toggle-mdp");
if (toggleMdp) {
  toggleMdp.addEventListener("click", () => {
    const input = document.getElementById("motdepasse");
    if (input.type === "password") {
      input.type = "text";
      toggleMdp.textContent = "🙈";
    } else {
      input.type = "password";
      toggleMdp.textContent = "👁";
    }
  });
}