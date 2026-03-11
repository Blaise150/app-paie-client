// ============================================
// paie.js — Calcul de la fiche de paie
// Régime France — Régime général 2024
// ============================================
import { db } from "./firebase-config.js";
import { verifierConnexion } from "./auth.js";
import {
  collection, getDocs, addDoc, query, orderBy
} from "https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js";

verifierConnexion();

// ══════════════════════════════════════════
// TAUX COTISATIONS — Régime général France
// ══════════════════════════════════════════
const TAUX = {

  // ── Salarié (part salariale) ───────────
  SALARIE: {
    SS_MALADIE:           0.0000,  // 0% salarié (tout patronal)
    SS_VIEILLESSE_PLAF:   0.0690,  // 6.90% plafonné SS
    SS_VIEILLESSE_DEPLAF: 0.0040,  // 0.40% déplafonné
    CHOMAGE:              0.0000,  // 0% salarié depuis 2018
    IRCANTEC_A:           0.0300,  // 3.00% tranche A (si applicable)
    CSG_DEDUCTIBLE:       0.0668,  // 6.68% CSG déductible
    CSG_NON_DEDUCTIBLE:   0.0230,  // 2.30% CSG non déductible (2.4 - 0.1 CRDS)
    CRDS:                 0.0050,  // 0.50% CRDS
  },

  // ── Employeur (part patronale) ─────────
  PATRONAL: {
    SS_MALADIE:           0.1300,  // 13.00%
    SS_ALLOC_FAMILIALE:   0.0525,  // 5.25% (taux réduit < 3.5 SMIC)
    SS_AT:                0.0200,  // 2.00% (variable selon secteur)
    SS_VIEILLESSE_PLAF:   0.0855,  // 8.55% plafonné
    SS_VIEILLESSE_DEPLAF: 0.0190,  // 1.90% déplafonné
    CHOMAGE:              0.0405,  // 4.05%
    FNAL:                 0.0010,  // 0.10% FNAL
  },

  // ── Plafond SS 2024 ────────────────────
  PLAFOND_SS_MENSUEL: 3864,        // 3 864 €/mois en 2024

  // ── Indemnités forfaitaires ────────────
  INDEMNITE_REPAS:      6.91,      // Ticket repas exonéré /jour
  INDEMNITE_TRANSPORT:  50,        // Forfait transport mensuel (remboursement 50% navigo)
};

// ══════════════════════════════════════════
// CHARGER LA LISTE DES EMPLOYÉS
// ══════════════════════════════════════════
async function chargerListeEmployes() {
  const select = document.getElementById("select-employe");
  if (!select) return;

  const snapshot = await getDocs(query(collection(db, "employes"), orderBy("nom")));
  select.innerHTML = `<option value="">-- Choisir un employé --</option>`;

  snapshot.forEach((docSnap) => {
    const e = docSnap.data();
    const opt = document.createElement("option");
    opt.value = docSnap.id;
    opt.dataset.salaire   = e.salaireBase;
    opt.dataset.nom       = `${e.prenom} ${e.nom}`;
    opt.dataset.poste     = e.poste;
    opt.dataset.matricule = e.matricule  || "";
    opt.dataset.nss       = e.nss        || "";
    opt.dataset.adresse   = e.adresse    || "";
    opt.dataset.iban      = e.iban       || "";
    opt.textContent = `${e.prenom} ${e.nom} — ${e.poste}`;
    select.appendChild(opt);
  });
}

// ══════════════════════════════════════════
// CALCUL PRINCIPAL DE LA PAIE
// ══════════════════════════════════════════
function calculerPaie(salaireBase, options = {}) {
  const {
    heuresSupp     = 0,
    primes         = 0,
    gardes         = 0,
    absences       = 0,
    joursRepas     = 0,   // nombre de jours travaillés (pour indemnité repas)
    avecTransport  = true,
  } = options;

  const tauxHoraire   = salaireBase / 151.67;  // Base légale France : 151h67/mois
  const heuresSuppMnt = heuresSupp * tauxHoraire * 1.25;  // Majoration 25%
  const absencesMnt   = absences   * tauxHoraire;

  // ── Indemnités (non soumises aux cotisations) ──
  const indemRepas     = joursRepas * TAUX.INDEMNITE_REPAS;
  const indemTransport = avecTransport ? TAUX.INDEMNITE_TRANSPORT : 0;

  // ── Rémunération brute (soumise aux cotisations) ──
  const salaireBrut = salaireBase + heuresSuppMnt + primes + gardes - absencesMnt;

  // ── Assiette plafonnée / déplafonnée ──
  const assiettePlaf   = Math.min(salaireBrut, TAUX.PLAFOND_SS_MENSUEL);
  const assietteDepl   = salaireBrut;
  // Assiette CSG/CRDS = 98.25% du brut
  const assietteCSG    = salaireBrut * 0.9825;

  // ════════════════════════════════════════
  // COTISATIONS SALARIALES
  // ════════════════════════════════════════
  const cot_sal_maladie        = assietteDepl  * TAUX.SALARIE.SS_MALADIE;
  const cot_sal_vieillesse_plaf= assiettePlaf  * TAUX.SALARIE.SS_VIEILLESSE_PLAF;
  const cot_sal_vieillesse_dep = assietteDepl  * TAUX.SALARIE.SS_VIEILLESSE_DEPLAF;
  const cot_sal_chomage        = assietteDepl  * TAUX.SALARIE.CHOMAGE;
  const cot_csg_deductible     = assietteCSG   * TAUX.SALARIE.CSG_DEDUCTIBLE;
  const cot_csg_non_deductible = assietteCSG   * TAUX.SALARIE.CSG_NON_DEDUCTIBLE;
  const cot_crds               = assietteCSG   * TAUX.SALARIE.CRDS;

  const totalCotSalariales =
    cot_sal_maladie +
    cot_sal_vieillesse_plaf +
    cot_sal_vieillesse_dep +
    cot_sal_chomage +
    cot_csg_deductible +
    cot_csg_non_deductible +
    cot_crds;

  // ── Montant net social ──
  const montantNetSocial = salaireBrut - totalCotSalariales + indemRepas + indemTransport;

  // ── Brut imposable (net social + CSG non déductible + CRDS) ──
  const brutImposable = montantNetSocial - indemTransport; // transport exonéré IR

  // ── PAS (Prélèvement à la source) ──
  const pas = calculerPAS(brutImposable);

  // ── Net à payer ──
  const netAPayer = montantNetSocial - pas;

  // ════════════════════════════════════════
  // COTISATIONS PATRONALES
  // ════════════════════════════════════════
  const cot_pat_maladie        = assietteDepl * TAUX.PATRONAL.SS_MALADIE;
  const cot_pat_alloc_fam      = assietteDepl * TAUX.PATRONAL.SS_ALLOC_FAMILIALE;
  const cot_pat_at             = assietteDepl * TAUX.PATRONAL.SS_AT;
  const cot_pat_vieillesse_plaf= assiettePlaf * TAUX.PATRONAL.SS_VIEILLESSE_PLAF;
  const cot_pat_vieillesse_dep = assietteDepl * TAUX.PATRONAL.SS_VIEILLESSE_DEPLAF;
  const cot_pat_chomage        = assietteDepl * TAUX.PATRONAL.CHOMAGE;
  const cot_pat_fnal           = assietteDepl * TAUX.PATRONAL.FNAL;

  const totalCotPatronales =
    cot_pat_maladie +
    cot_pat_alloc_fam +
    cot_pat_at +
    cot_pat_vieillesse_plaf +
    cot_pat_vieillesse_dep +
    cot_pat_chomage +
    cot_pat_fnal;

  return {
    // Rémunération
    salaireBase:          arrondir(salaireBase),
    heuresSuppMnt:        arrondir(heuresSuppMnt),
    primes:               arrondir(primes),
    gardes:               arrondir(gardes),
    indemRepas:           arrondir(indemRepas),
    indemTransport:       arrondir(indemTransport),
    absencesMnt:          arrondir(absencesMnt),
    salaireBrut:          arrondir(salaireBrut),

    // Cotisations salariales
    cot_sal_maladie:          arrondir(cot_sal_maladie),
    cot_sal_vieillesse_plaf:  arrondir(cot_sal_vieillesse_plaf),
    cot_sal_vieillesse_dep:   arrondir(cot_sal_vieillesse_dep),
    cot_sal_chomage:          arrondir(cot_sal_chomage),
    cot_csg_deductible:       arrondir(cot_csg_deductible),
    cot_csg_non_deductible:   arrondir(cot_csg_non_deductible),
    cot_crds:                 arrondir(cot_crds),
    totalCotSalariales:       arrondir(totalCotSalariales),

    // Nets
    montantNetSocial:     arrondir(montantNetSocial),
    brutImposable:        arrondir(brutImposable),
    pas:                  arrondir(pas),
    netAPayer:            arrondir(netAPayer),

    // Cotisations patronales
    cot_pat_maladie:          arrondir(cot_pat_maladie),
    cot_pat_alloc_fam:        arrondir(cot_pat_alloc_fam),
    cot_pat_at:               arrondir(cot_pat_at),
    cot_pat_vieillesse_plaf:  arrondir(cot_pat_vieillesse_plaf),
    cot_pat_vieillesse_dep:   arrondir(cot_pat_vieillesse_dep),
    cot_pat_chomage:          arrondir(cot_pat_chomage),
    cot_pat_fnal:             arrondir(cot_pat_fnal),
    totalCotPatronales:       arrondir(totalCotPatronales),
  };
}

// ══════════════════════════════════════════
// CALCUL PAS (Prélèvement à la source)
// Barème mensuel 2024 — taux neutre
// ══════════════════════════════════════════
function calculerPAS(brutImposable) {
  const annuel = brutImposable * 12;
  let taux = 0;

  if      (annuel <= 10777)  taux = 0;
  else if (annuel <= 27478)  taux = 0.11;
  else if (annuel <= 78570)  taux = 0.30;
  else if (annuel <= 168994) taux = 0.41;
  else                       taux = 0.45;

  return brutImposable * taux;
}

// ══════════════════════════════════════════
// AFFICHER LA FICHE — dans la page courante
// ══════════════════════════════════════════
function afficherFichePaie(employe, periode, paie) {
  // garde les données pour le bouton "Ouvrir bulletin"
  window._bulletinData = { employe, periode, paie };

  // Affichage résumé dans la page (optionnel)
  setTxt("fiche-nom",         employe.nom);
  setTxt("fiche-poste",       employe.poste);
  setTxt("fiche-periode",     periode);
  setTxt("fiche-matricule",   employe.matricule  || "—");
  setTxt("fiche-nss",         employe.nss        || "—");
  setTxt("fiche-adresse",     employe.adresse    || "—");
  setTxt("fiche-iban",        employe.iban       || "—");
  setTxt("fiche-contrat",     employe.contrat    || "—");
  setTxt("fiche-date-entree", employe.dateEntree || "—");
  setMnt("fiche-base",        paie.salaireBase);
  setMnt("fiche-hsup",        paie.heuresSuppMnt);
  setMnt("fiche-primes",      paie.primes);
  setMnt("fiche-gardes",      paie.gardes);
  setMnt("fiche-indem-repas", paie.indemRepas);
  setMnt("fiche-indem-transp",paie.indemTransport);
  setMnt("fiche-absences",    paie.absencesMnt);
  setMnt("fiche-brut",        paie.salaireBrut);
  setMnt("fiche-cot-maladie",        paie.cot_sal_maladie);
  setMnt("fiche-cot-vieill-plaf",    paie.cot_sal_vieillesse_plaf);
  setMnt("fiche-cot-vieill-dep",     paie.cot_sal_vieillesse_dep);
  setMnt("fiche-cot-chomage",        paie.cot_sal_chomage);
  setMnt("fiche-csg-deductible",     paie.cot_csg_deductible);
  setMnt("fiche-csg-non-deductible", paie.cot_csg_non_deductible);
  setMnt("fiche-crds",               paie.cot_crds);
  setMnt("fiche-total-cot-sal",      paie.totalCotSalariales);
  setMnt("fiche-net-social",         paie.montantNetSocial);
  setMnt("fiche-brut-imposable",     paie.brutImposable);
  setMnt("fiche-pas",                paie.pas);
  setMnt("fiche-net",                paie.netAPayer);
  setMnt("fiche-pat-maladie",        paie.cot_pat_maladie);
  setMnt("fiche-pat-alloc-fam",      paie.cot_pat_alloc_fam);
  setMnt("fiche-pat-at",             paie.cot_pat_at);
  setMnt("fiche-pat-vieill-plaf",    paie.cot_pat_vieillesse_plaf);
  setMnt("fiche-pat-vieill-dep",     paie.cot_pat_vieillesse_dep);
  setMnt("fiche-pat-chomage",        paie.cot_pat_chomage);
  setMnt("fiche-pat-fnal",           paie.cot_pat_fnal);
  setMnt("fiche-total-cot-pat",      paie.totalCotPatronales);

  document.getElementById("fiche-paie").style.display = "block";
}

// ══════════════════════════════════════════
// OUVRIR LE BULLETIN A4 DANS UN NOUVEL ONGLET
// ══════════════════════════════════════════
window.imprimerFiche = function () {
  const d = window._bulletinData;
  if (!d) return;
  const { employe, periode, paie } = d;

  // Formatage période lisible
  const [annee, mois] = periode.split("-");
  const moisNom = new Date(annee, mois - 1).toLocaleString("fr-FR", { month: "long", year: "numeric" });

  const f = (n) => n.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " €";

  // Ouvre le template et injecte les données via localStorage
  const data = JSON.stringify({ employe, periode: moisNom, paie });
  localStorage.setItem("bulletin_data", data);
  window.open("../pages/bulletin-print.html", "_blank");
};

// ══════════════════════════════════════════
// SAUVEGARDER DANS FIREBASE
// ══════════════════════════════════════════
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

// ══════════════════════════════════════════
// UTILITAIRES
// ══════════════════════════════════════════
function arrondir(n) {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}
function setTxt(id, val) {
  const el = document.getElementById(id);
  if (el) el.textContent = val;
}
function setMnt(id, val) {
  const el = document.getElementById(id);
  if (el) el.textContent = val.toLocaleString("fr-FR", {
    minimumFractionDigits: 2, maximumFractionDigits: 2
  }) + " €";
}

// ══════════════════════════════════════════
// ÉVÉNEMENTS
// ══════════════════════════════════════════
const formPaie = document.getElementById("form-paie");
if (formPaie) {
  formPaie.addEventListener("submit", (e) => {
    e.preventDefault();

    const select  = document.getElementById("select-employe");
    const option  = select.options[select.selectedIndex];
    if (!option.value) { alert("Sélectionnez un employé !"); return; }

    const periode      = document.getElementById("periode").value;
    const typeContrat  = document.getElementById("type-contrat")?.value   || "—";
    const dateEntree   = document.getElementById("date-entree")?.value    || "";
    const heuresSupp   = Number(document.getElementById("heures-supp").value  || 0);
    const primes      = Number(document.getElementById("primes").value        || 0);
    const gardes      = Number(document.getElementById("gardes").value        || 0);
    const absences    = Number(document.getElementById("absences").value      || 0);
    const joursRepas  = Number(document.getElementById("jours-repas").value   || 0);
    const avecTransp  = document.getElementById("avec-transport")?.checked ?? true;

    const salaireBase = Number(option.dataset.salaire);
    const paie = calculerPaie(salaireBase, {
      heuresSupp, primes, gardes, absences, joursRepas, avecTransport: avecTransp
    });

    afficherFichePaie({
      nom:        option.dataset.nom,
      poste:      option.dataset.poste,
      matricule:  option.dataset.matricule,
      nss:        option.dataset.nss,
      adresse:    option.dataset.adresse,
      iban:       option.dataset.iban,
      contrat:    typeContrat,
      dateEntree: dateEntree ? new Date(dateEntree).toLocaleDateString("fr-FR") : "—",
    }, periode, paie);

    document.getElementById("btn-sauvegarder").onclick = () =>
      sauvegarderFiche(option.value, option.dataset.nom, periode, paie);
  });
}

chargerListeEmployes();