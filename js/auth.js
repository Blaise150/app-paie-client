// ================================================================
// js/auth.js — MyPaie Application
// Authentification Firebase : connexion, déconnexion,
// réinitialisation mot de passe, vérification session
// ================================================================

import { auth } from "./firebase-config.js";
import {
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  sendPasswordResetEmail
} from "https://www.gstatic.com/firebasejs/10.7.0/firebase-auth.js";


// ── Connexion utilisateur ──────────────────────────────────────
export async function connexion(email, motDePasse) {
  try {
    await signInWithEmailAndPassword(auth, email, motDePasse);
    window.location.href = "pages/dashboard.html";
  } catch (error) {
    let message = "Identifiants incorrects. Veuillez réessayer.";
    if (error.code === "auth/user-not-found")     message = "Aucun compte associé à cet email.";
    if (error.code === "auth/wrong-password")     message = "Mot de passe incorrect.";
    if (error.code === "auth/invalid-email")      message = "Adresse email invalide.";
    if (error.code === "auth/too-many-requests")  message = "Trop de tentatives. Réessayez plus tard.";
    if (error.code === "auth/invalid-credential") message = "Email ou mot de passe incorrect.";
    afficherMessage(message, "erreur");
  }
}


// ── Mot de passe oublié ────────────────────────────────────────
export async function motDePasseOublie(email) {
  if (!email) {
    afficherMessage("Saisissez votre email ci-dessus puis cliquez sur le lien.", "info");
    return;
  }
  try {
    await sendPasswordResetEmail(auth, email);
    afficherMessage("✅ Email de réinitialisation envoyé ! Vérifiez votre boîte mail.", "succes");
  } catch (error) {
    let message = "Erreur lors de l'envoi de l'email.";
    if (error.code === "auth/user-not-found") message = "Aucun compte avec cet email.";
    if (error.code === "auth/invalid-email")  message = "Adresse email invalide.";
    afficherMessage(message, "erreur");
  }
}


// ── Déconnexion ────────────────────────────────────────────────
export async function deconnexion() {
  await signOut(auth);
  window.location.href = "../index.html";
}


// ── Vérification session (pages protégées) ─────────────────────
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


// ── Afficher un message dans #erreur ──────────────────────────
// type : "erreur" | "succes" | "info"
function afficherMessage(message, type = "erreur") {
  const el = document.getElementById("erreur");
  if (!el) return;
  el.classList.remove("msg-erreur", "msg-succes", "msg-info");
  el.classList.add("msg-" + type);
  el.textContent = message;
  // Pour succès/info : effacement automatique après 6 s
  if (type !== "erreur") {
    setTimeout(() => masquerMessage(), 6000);
  }
}

function masquerMessage() {
  const el = document.getElementById("erreur");
  if (!el) return;
  el.style.display = "none";
  el.textContent = "";
  el.classList.remove("msg-erreur", "msg-succes", "msg-info");
}


// ── Événement : soumission du formulaire ───────────────────────
const formLogin = document.getElementById("form-login");
if (formLogin) {
  formLogin.addEventListener("submit", (e) => {
    e.preventDefault();
    masquerMessage(); // efface le message précédent avant chaque tentative
    const email = document.getElementById("email").value.trim();
    const mdp   = document.getElementById("motdepasse").value;
    connexion(email, mdp);
  });
}


// ── Événement : lien "Mot de passe oublié ?" ───────────────────
const lienOublie = document.getElementById("forgot-link");
if (lienOublie) {
  lienOublie.addEventListener("click", (e) => {
    e.preventDefault();
    e.stopPropagation(); // empêche le formulaire de se soumettre
    const email = document.getElementById("email").value.trim();
    motDePasseOublie(email);
  });
}


// ── Événement : toggle affichage mot de passe ─────────────────
const toggleMdp = document.getElementById("toggle-mdp");
if (toggleMdp) {
  toggleMdp.addEventListener("click", () => {
    const input = document.getElementById("motdepasse");
    const visible = input.type === "text";
    input.type = visible ? "password" : "text";
    toggleMdp.textContent = visible ? "👁" : "🙈";
  });
}

// ================================================================
// FIN — js/auth.js
// ================================================================
