// ============================================
// paie.js — Calcul de la fiche de paie
// ============================================
import { db } from "./firebase-config.js";
import { verifierConnexion } from "./auth.js";
import {
  collection, getDocs, addDoc, query, orderBy
} from "https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js";

verifierConnexion();

// ── Taux de cotisations (adaptez selon votre pays) ──
const TAUX = {
  CNSS_EMPLOYE:   0.036,   // 3.6% retenu sur employé
  CNSS_PATRONALE: 0.168,   // 16.8% payé par employeur
  IRPP:           0.0,     // À calculer selon le barème
  MUTUELLE:       50,    // Montant fixe mutuelle
};

// ── Charger la liste des employés ─────────
async function chargerListeEmployes() {
  const select = document.getElementById("select-employe");
  if (!select) return;

  const snapshot = await getDocs(query(collection(db, "employes"), orderBy("nom")));
  select.innerHTML = `<option value="">-- Choisir un employé --</option>`;

  snapshot.forEach((docSnap) => {
    const e = docSnap.data();
    const opt = document.createElement("option");
    opt.value = docSnap.id;
    opt.dataset.salaire = e.salaireBase;
    opt.dataset.nom = `${e.prenom} ${e.nom}`;
    opt.dataset.poste = e.poste;
    opt.textContent = `${e.prenom} ${e.nom} — ${e.poste}`;
    select.appendChild(opt);
  });
}

// ── Calculer la paie ──────────────────────
function calculerPaie(salaireBase, heuresSupp = 0, primes = 0, absences = 0) {
  const tauxHoraire    = salaireBase / 173.33; // Base 173h33 par mois
  const heuresSuppMnt  = heuresSupp * tauxHoraire * 1.5;
  const absencesMnt    = absences   * tauxHoraire;
  const salaireBrut    = salaireBase + heuresSuppMnt + primes - absencesMnt;

  const cotisationCNSS = salaireBrut * TAUX.CNSS_EMPLOYE;
  const mutuelle       = TAUX.MUTUELLE;
  const irpp           = calculerIRPP(salaireBrut - cotisationCNSS);
  const totalRetenues  = cotisationCNSS + mutuelle + irpp;
  const salaireNet     = salaireBrut - totalRetenues;

  return {
    salaireBase:    Math.round(salaireBase),
    heuresSuppMnt:  Math.round(heuresSuppMnt),
    primes:         Math.round(primes),
    absencesMnt:    Math.round(absencesMnt),
    salaireBrut:    Math.round(salaireBrut),
    cotisationCNSS: Math.round(cotisationCNSS),
    mutuelle:       Math.round(mutuelle),
    irpp:           Math.round(irpp),
    totalRetenues:  Math.round(totalRetenues),
    salaireNet:     Math.round(salaireNet),
    cnssPatronale:  Math.round(salaireBrut * TAUX.CNSS_PATRONALE),
  };
}

// ── Calcul IRPP simplifié (barème progressif) ─
function calculerIRPP(revenuImposable) {
  if (revenuImposable <= 75000)  return 0;
  if (revenuImposable <= 200000) return (revenuImposable - 75000) * 0.10;
  if (revenuImposable <= 400000) return 12500 + (revenuImposable - 200000) * 0.15;
  return 42500 + (revenuImposable - 400000) * 0.25;
}

// ── Afficher la fiche de paie ─────────────
function afficherFichePaie(employe, periode, paie) {
  document.getElementById("fiche-nom").textContent    = employe.nom;
  document.getElementById("fiche-poste").textContent  = employe.poste;
  document.getElementById("fiche-periode").textContent = periode;

  document.getElementById("fiche-base").textContent      = paie.salaireBase.toLocaleString("fr-FR");
  document.getElementById("fiche-hsup").textContent       = paie.heuresSuppMnt.toLocaleString("fr-FR");
  document.getElementById("fiche-primes").textContent     = paie.primes.toLocaleString("fr-FR");
  document.getElementById("fiche-absences").textContent   = paie.absencesMnt.toLocaleString("fr-FR");
  document.getElementById("fiche-brut").textContent       = paie.salaireBrut.toLocaleString("fr-FR");
  document.getElementById("fiche-cnss").textContent       = paie.cotisationCNSS.toLocaleString("fr-FR");
  document.getElementById("fiche-mutuelle").textContent   = paie.mutuelle.toLocaleString("fr-FR");
  document.getElementById("fiche-irpp").textContent       = paie.irpp.toLocaleString("fr-FR");
  document.getElementById("fiche-retenues").textContent   = paie.totalRetenues.toLocaleString("fr-FR");
  document.getElementById("fiche-net").textContent        = paie.salaireNet.toLocaleString("fr-FR");

  document.getElementById("fiche-paie").style.display = "block";
}

// ── Sauvegarder la fiche dans Firebase ───
async function sauvegarderFiche(employeId, nomEmploye, periode, paie) {
  await addDoc(collection(db, "fiches-paie"), {
    employeId,
    nomEmploye,
    periode,
    ...paie,
    createdAt: new Date()
  });
  alert("✅ Fiche de paie sauvegardée !");
}

// ── Imprimer la fiche ─────────────────────
window.imprimerFiche = function() {
  window.print();
};

// ── Événements ────────────────────────────
const formPaie = document.getElementById("form-paie");
if (formPaie) {
  formPaie.addEventListener("submit", (e) => {
    e.preventDefault();
    const select   = document.getElementById("select-employe");
    const option   = select.options[select.selectedIndex];
    const periode  = document.getElementById("periode").value;
    const heuresSupp = Number(document.getElementById("heures-supp").value || 0);
    const primes     = Number(document.getElementById("primes").value || 0);
    const absences   = Number(document.getElementById("absences").value || 0);

    if (!option.value) { alert("Sélectionnez un employé !"); return; }

    const salaireBase = Number(option.dataset.salaire);
    const paie = calculerPaie(salaireBase, heuresSupp, primes, absences);

    afficherFichePaie(
      { nom: option.dataset.nom, poste: option.dataset.poste },
      periode, paie
    );

    // Bouton sauvegarder
    document.getElementById("btn-sauvegarder").onclick = () =>
      sauvegarderFiche(option.value, option.dataset.nom, periode, paie);
  });
}

chargerListeEmployes();
