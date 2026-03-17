
/**
 * ============================================================
 *  email-paie.js — Envoi des fiches de paie par email
 *  Utilise EmailJS (https://www.emailjs.com) — Gratuit jusqu'à
 *  200 emails/mois, aucun backend requis.
 * ============================================================
 *
 *  INSTALLATION :
 *  1. Créez un compte sur https://www.emailjs.com
 *  2. Ajoutez un "Email Service" (Gmail, Outlook, etc.)
 *  3. Créez un "Email Template" avec les variables ci-dessous
 *  4. Copiez vos clés dans la section CONFIGURATION
 *  5. Ajoutez dans votre fiche-paie.html, avant </body> :
 *       <script src="https://cdn.jsdelivr.net/npm/@emailjs/browser@4/dist/email.min.js"></script>
 *       <script type="module" src="../js/email-paie.js"></script>
 *
 *  VARIABLES À UTILISER DANS VOTRE TEMPLATE EMAILJS :
 *    {{to_email}}        → Email du destinataire
 *    {{to_name}}         → Nom de l'employé
 *    {{mois_annee}}      → Ex : "Mars 2026"
 *    {{salaire_net}}     → Ex : "1 850 000 FCFA"
 *    {{salaire_brut}}    → Ex : "2 100 000 FCFA"
 *    {{from_name}}       → Nom de l'entreprise
 * ============================================================
 */

// ============================================================
//  CONFIGURATION — À REMPLIR AVEC VOS CLÉS EMAILJS
// ============================================================

const EMAILJS_CONFIG = {
  publicKey:   "4bPqY9uW4ov1HEDMJ",
  serviceId:   "service_bgrakyi",
  templateId:  "template_iv2k22d",
};

const ENTREPRISE_NOM = "Mon Entreprise";   // ← Nom affiché comme expéditeur

// ============================================================
//  INITIALISATION EMAILJS
// ============================================================

function initEmailJS() {
  if (typeof emailjs === "undefined") {
    console.error("❌ EmailJS non chargé. Vérifiez le script dans votre HTML.");
    return false;
  }
  emailjs.init({ publicKey: EMAILJS_CONFIG.publicKey });
  return true;
}

// ============================================================
//  FONCTION PRINCIPALE — Envoyer la fiche de paie
// ============================================================

/**
 * Envoie la fiche de paie d'un employé par email.
 *
 * @param {Object} employe       - Données de l'employé depuis Firestore
 * @param {Object} fiche         - Données de la fiche de paie calculée
 * @param {string} pdfBase64     - (optionnel) PDF en base64 si vous utilisez jsPDF
 * @returns {Promise<boolean>}   - true si envoi réussi
 */
export async function envoyerFicheParEmail(employe, fiche, pdfBase64 = null) {

  if (!initEmailJS()) return false;

  // Vérification email employé
  if (!employe.email) {
    afficherNotification("❌ Cet employé n'a pas d'adresse email enregistrée.", "erreur");
    return false;
  }

  // Préparer les paramètres du template
  const parametresEmail = {
    to_email:     employe.email,
    to_name:      `${employe.prenom} ${employe.nom}`,
    mois_annee:   fiche.moisAnnee || formaterMoisAnnee(fiche.mois, fiche.annee),
    salaire_net:  formaterMontant(fiche.netAPayer),
    salaire_brut: formaterMontant(fiche.salaireBrut),
    from_name:    ENTREPRISE_NOM,
  };

  // Ajouter le PDF en pièce jointe si disponible
  if (pdfBase64) {
    parametresEmail.pdf_base64 = pdfBase64;
  }

  try {
    afficherChargement(true);

    await emailjs.send(
      EMAILJS_CONFIG.serviceId,
      EMAILJS_CONFIG.templateId,
      parametresEmail
    );

    afficherNotification(
      `✅ Fiche de paie envoyée à ${employe.email}`,
      "succes"
    );

    // Optionnel : enregistrer l'envoi dans Firestore
    await enregistrerEnvoiFirestore(employe.id, fiche);

    return true;

  } catch (erreur) {
    console.error("Erreur envoi email :", erreur);
    afficherNotification(
      `❌ Échec de l'envoi : ${erreur.text || erreur.message}`,
      "erreur"
    );
    return false;

  } finally {
    afficherChargement(false);
  }
}

// ============================================================
//  ENVOI EN MASSE — Tous les employés du mois
// ============================================================

/**
 * Envoie les fiches de paie à tous les employés d'un mois donné.
 * Récupère automatiquement les fiches depuis Firestore.
 *
 * @param {string} mois   - Ex : "03"
 * @param {string} annee  - Ex : "2026"
 */
export async function envoyerToutesLesFiches(mois, annee) {

  if (!initEmailJS()) return;

  // Import Firebase (déjà configuré dans votre app)
  const { db } = await import("./firebase-config.js");
  const { collection, query, where, getDocs } = await import(
    "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js"
  );

  try {
    afficherChargement(true);

    // Récupérer toutes les fiches du mois depuis Firestore
    const q = query(
      collection(db, "fiches-paie"),
      where("mois",  "==", mois),
      where("annee", "==", annee)
    );

    const snapshot = await getDocs(q);

    if (snapshot.empty) {
      afficherNotification("⚠️ Aucune fiche trouvée pour ce mois.", "avertissement");
      return;
    }

    let succes = 0;
    let echecs  = 0;

    for (const doc of snapshot.docs) {
      const fiche    = doc.data();
      const employe  = await recupererEmploye(fiche.employeId);

      if (!employe) { echecs++; continue; }

      const ok = await envoyerFicheParEmail(employe, fiche);
      ok ? succes++ : echecs++;

      // Pause entre chaque envoi (évite le spam)
      await pause(500);
    }

    afficherNotification(
      `📬 Envoi terminé : ${succes} succès, ${echecs} échec(s)`,
      succes > 0 ? "succes" : "erreur"
    );

  } catch (erreur) {
    console.error("Erreur envoi en masse :", erreur);
    afficherNotification("❌ Une erreur est survenue.", "erreur");

  } finally {
    afficherChargement(false);
  }
}

// ============================================================
//  FONCTIONS UTILITAIRES
// ============================================================

/** Récupère un employé depuis Firestore par son ID */
async function recupererEmploye(employeId) {
  try {
    const { db } = await import("./firebase-config.js");
    const { doc, getDoc } = await import(
      "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js"
    );
    const snap = await getDoc(doc(db, "employes", employeId));
    return snap.exists() ? { id: snap.id, ...snap.data() } : null;
  } catch {
    return null;
  }
}

/** Enregistre la date d'envoi dans Firestore */
async function enregistrerEnvoiFirestore(employeId, fiche) {
  try {
    const { db } = await import("./firebase-config.js");
    const { collection, addDoc, serverTimestamp } = await import(
      "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js"
    );
    await addDoc(collection(db, "envois-email"), {
      employeId,
      mois:       fiche.mois,
      annee:      fiche.annee,
      envoyeAt:   serverTimestamp(),
    });
  } catch (e) {
    console.warn("Impossible d'enregistrer l'envoi dans Firestore :", e);
  }
}

/** Formate un montant : 1850000 → "1 850 000 FCFA" */
function formaterMontant(montant) {
  if (!montant && montant !== 0) return "—";
  return new Intl.NumberFormat("fr-FR").format(montant) + " FCFA";
}

/** Formate le mois/année : ("03", "2026") → "Mars 2026" */
function formaterMoisAnnee(mois, annee) {
  const moisNoms = [
    "Janvier","Février","Mars","Avril","Mai","Juin",
    "Juillet","Août","Septembre","Octobre","Novembre","Décembre"
  ];
  const index = parseInt(mois, 10) - 1;
  return `${moisNoms[index] || mois} ${annee}`;
}

/** Pause asynchrone en millisecondes */
function pause(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ============================================================
//  NOTIFICATIONS UI
// ============================================================

/** Affiche une notification dans la page */
function afficherNotification(message, type = "info") {
  // Cherche un élément #notification existant dans votre HTML
  let notif = document.getElementById("notification-email");

  if (!notif) {
    // Crée l'élément s'il n'existe pas
    notif = document.createElement("div");
    notif.id = "notification-email";
    notif.style.cssText = `
      position: fixed; bottom: 20px; right: 20px;
      padding: 14px 20px; border-radius: 8px; font-size: 14px;
      font-weight: 500; z-index: 9999; max-width: 350px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      transition: opacity 0.3s;
    `;
    document.body.appendChild(notif);
  }

  const couleurs = {
    succes:        "background:#d4edda; color:#155724; border:1px solid #c3e6cb;",
    erreur:        "background:#f8d7da; color:#721c24; border:1px solid #f5c6cb;",
    avertissement: "background:#fff3cd; color:#856404; border:1px solid #ffeeba;",
    info:          "background:#d1ecf1; color:#0c5460; border:1px solid #bee5eb;",
  };

  notif.style.cssText += couleurs[type] || couleurs.info;
  notif.textContent   = message;
  notif.style.opacity = "1";

  setTimeout(() => { notif.style.opacity = "0"; }, 4000);
}

/** Affiche/masque un indicateur de chargement */
function afficherChargement(actif) {
  const btn = document.getElementById("btn-envoyer-email");
  if (!btn) return;
  btn.disabled    = actif;
  btn.textContent = actif ? "⏳ Envoi en cours..." : "📧 Envoyer par email";
}
