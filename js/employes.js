// ============================================
// employes.js — Gestion des employés
// ============================================
import { db } from "./firebase-config.js";
import { verifierConnexion } from "./auth.js";
import {
  collection, getDocs, addDoc, deleteDoc, doc, query, orderBy
} from "https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js";

verifierConnexion();

// ══════════════════════════════════════════
// CHARGER ET AFFICHER LES EMPLOYÉS
// ══════════════════════════════════════════
async function chargerEmployes() {
  const tbody = document.getElementById("tableau-employes");
  tbody.innerHTML = `<tr><td colspan="10" style="text-align:center;color:#6b7280;">Chargement...</td></tr>`;

  const snapshot = await getDocs(query(collection(db, "employes"), orderBy("nom")));

  if (snapshot.empty) {
    tbody.innerHTML = `<tr><td colspan="10" style="text-align:center;color:#6b7280;">Aucun employé enregistré.</td></tr>`;
    return;
  }

  tbody.innerHTML = "";
  snapshot.forEach((docSnap) => {
    const e   = docSnap.data();
    const id  = docSnap.id;

    // Badge contrat
    let badgeContrat = "";
    if (e.typeContrat?.startsWith("CDI"))       badgeContrat = "badge-cdi";
    else if (e.typeContrat === "CDD")            badgeContrat = "badge-cdd";
    else if (e.typeContrat === "Intérimaire")    badgeContrat = "badge-interim";

    // Badge statut
    const badgeStatut = e.statut === "Actif" ? "badge-actif" : "badge-inactif";

    // Date formatée
    const dateEntree = e.dateEntree
      ? new Date(e.dateEntree).toLocaleDateString("fr-FR")
      : "—";

    // Salaire formaté
    const salaire = e.salaireBase
      ? Number(e.salaireBase).toLocaleString("fr-FR") + " €"
      : "—";

    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td><strong>${e.nom} ${e.prenom}</strong></td>
      <td>${e.poste || "—"}</td>
      <td>${e.departement || "—"}</td>
      <td><span class="badge ${badgeContrat}">${e.typeContrat || "—"}</span></td>
      <td>${dateEntree}</td>
      <td>${e.email ? `<a href="mailto:${e.email}">${e.email}</a>` : "—"}</td>
      <td>${e.telephone || "—"}</td>
      <td><span class="badge ${badgeStatut}">${e.statut || "—"}</span></td>
      <td>${salaire}</td>
      <td>
        <button class="btn btn-rouge btn-sm" onclick="supprimerEmploye('${id}')">🗑️ Supprimer</button>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

// ══════════════════════════════════════════
// AJOUTER UN EMPLOYÉ
// ══════════════════════════════════════════
async function ajouterEmploye(e) {
  e.preventDefault();

  const employe = {
    nom:          val("nom").toUpperCase(),
    prenom:       val("prenom"),
    email:        val("email"),
    telephone:    val("telephone"),
    adresse:      val("adresse"),
    poste:        val("poste"),
    departement:  val("departement"),
    typeContrat:  val("typeContrat"),
    dateEntree:   val("dateEntree"),
    statut:       val("statut") || "Actif",
    salaireBase:  Number(val("salaire")),
    nss:          val("nss"),
    cnss:         val("cnss"),
    iban:         val("iban"),
    createdAt:    new Date(),
  };

  try {
    await addDoc(collection(db, "employes"), employe);
    afficherNotification("✅ Employé enregistré avec succès !", "succes");
    document.getElementById("form-employe").reset();
    chargerEmployes();
  } catch (err) {
    afficherNotification("❌ Erreur lors de l'enregistrement.", "erreur");
    console.error(err);
  }
}

// ══════════════════════════════════════════
// SUPPRIMER UN EMPLOYÉ
// ══════════════════════════════════════════
window.supprimerEmploye = async function(id) {
  if (!confirm("Supprimer cet employé définitivement ?")) return;
  try {
    await deleteDoc(doc(db, "employes", id));
    afficherNotification("🗑️ Employé supprimé.", "info");
    chargerEmployes();
  } catch (err) {
    afficherNotification("❌ Erreur lors de la suppression.", "erreur");
    console.error(err);
  }
};

// ══════════════════════════════════════════
// UTILITAIRES
// ══════════════════════════════════════════
function val(id) {
  return document.getElementById(id)?.value?.trim() || "";
}

function afficherNotification(message, type = "succes") {
  const el = document.getElementById("notification");
  if (!el) return;
  el.textContent = message;
  el.className   = `notification ${type}`;
  el.style.display = "block";
  setTimeout(() => { el.style.display = "none"; }, 4000);
}

// ══════════════════════════════════════════
// ÉVÉNEMENTS
// ══════════════════════════════════════════
const formEmploye = document.getElementById("form-employe");
if (formEmploye) {
  formEmploye.addEventListener("submit", ajouterEmploye);
}

chargerEmployes();