// ============================================
// employes.js — Gestion des employés
// ============================================
import { db } from "./firebase-config.js";
import { verifierConnexion } from "./auth.js";
import {
  collection, addDoc, getDocs,
  doc, deleteDoc, updateDoc, query, orderBy
} from "https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js";

// Vérifier que l'admin est connecté
verifierConnexion();

const collectionEmployes = collection(db, "employes");

// ── Charger et afficher tous les employés ─
export async function chargerEmployes() {
  const q = query(collectionEmployes, orderBy("nom"));
  const snapshot = await getDocs(q);
  const tableau = document.getElementById("tableau-employes");
  if (!tableau) return;

  tableau.innerHTML = "";

  snapshot.forEach((docSnap) => {
    const e = docSnap.data();
    const id = docSnap.id;
    const ligne = `
      <tr>
        <td>${e.nom}</td>
        <td>${e.prenom}</td>
        <td>${e.poste}</td>
        <td>${e.departement}</td>
        <td>${Number(e.salaireBase).toLocaleString("fr-FR")} € </td>
        <td>
          <button onclick="modifierEmploye('${id}')" class="btn-modifier">✏️</button>
          <button onclick="supprimerEmploye('${id}')" class="btn-supprimer">🗑️</button>
        </td>
      </tr>`;
    tableau.innerHTML += ligne;
  });
}

// ── Ajouter un employé ────────────────────
export async function ajouterEmploye(data) {
  try {
    await addDoc(collectionEmployes, {
      nom:          data.nom,
      prenom:       data.prenom,
      poste:        data.poste,
      departement:  data.departement,
      salaireBase:  Number(data.salaireBase),
      cnss:         data.cnss || "",
      dateEmbauche: data.dateEmbauche,
      createdAt:    new Date()
    });
    afficherNotification("✅ Employé ajouté avec succès !");
    chargerEmployes();
  } catch (error) {
    console.error("Erreur ajout:", error);
    afficherNotification("❌ Erreur lors de l'ajout.", "erreur");
  }
}

// ── Supprimer un employé ──────────────────
window.supprimerEmploye = async function(id) {
  if (!confirm("Voulez-vous vraiment supprimer cet employé ?")) return;
  await deleteDoc(doc(db, "employes", id));
  afficherNotification("🗑️ Employé supprimé.");
  chargerEmployes();
};

// ── Modifier un employé ───────────────────
window.modifierEmploye = async function(id) {
  const nouveauSalaire = prompt("Nouveau salaire de base (FCFA) :");
  if (!nouveauSalaire) return;
  await updateDoc(doc(db, "employes", id), {
    salaireBase: Number(nouveauSalaire)
  });
  afficherNotification("✅ Employé mis à jour !");
  chargerEmployes();
};

// ── Notification à l'écran ────────────────
function afficherNotification(msg, type = "succes") {
  const notif = document.getElementById("notification");
  if (!notif) return;
  notif.textContent = msg;
  notif.className = `notification ${type}`;
  notif.style.display = "block";
  setTimeout(() => (notif.style.display = "none"), 3000);
}

// ── Événement formulaire ajout employé ───
const formEmploye = document.getElementById("form-employe");
if (formEmploye) {
  formEmploye.addEventListener("submit", (e) => {
    e.preventDefault();
    ajouterEmploye({
      nom:          document.getElementById("nom").value,
      prenom:       document.getElementById("prenom").value,
      poste:        document.getElementById("poste").value,
      departement:  document.getElementById("departement").value,
      salaireBase:  document.getElementById("salaire").value,
      cnss:         document.getElementById("cnss").value,
      dateEmbauche: document.getElementById("dateEmbauche").value,
    });
    formEmploye.reset();
  });
}

// Charger au démarrage
chargerEmployes();
