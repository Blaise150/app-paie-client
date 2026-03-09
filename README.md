Paie — Guide complet

Application de gestion de la paie en HTML/CSS/JS pur avec Firebase.

---

## 📁 Structure du projet
app-paie/
│
├── index.html                  ← Page de connexion (login)
│
├── css/
│   └── style.css               ← Tous les styles CSS
│
├── js/
│   ├── firebase-config.js      ← Configuration Firebase
│   ├── auth.js                 ← Connexion / Déconnexion
│   ├── employes.js             ← Gestion des employés
│   └── paie.js                 ← Calcul de la fiche de paie
│
└── pages/
├── dashboard.html          ← Tableau de bord
├── employes.html           ← Liste & ajout d'employés
└── fiche-paie.html         ← Génération de la fiche de paie
---

## 🚀 Mise en place Firebase (étape par étape)

### 1. Créer le projet Firebase
1. Allez sur https://console.firebase.google.com
2. Cliquez "Ajouter un projet"
3. Nommez-le `app-paie` → Suivant → Créer

### 2. Activer Authentication
1. Dans Firebase Console → Authentication → Commencer
2. Onglet "Méthode de connexion"
3. Activez Email/Mot de passe
4. Allez dans Users → Ajouter un utilisateur
   - Email: admin@monentreprise.com
   - Mot de passe: MonMotDePasse123!

### 3. Créer la base de données Firestore
1. Dans Firebase Console → Firestore Database → Créer une base de données
2. Choisir Mode de production
3. Sélectionner la région (ex: europe-west1)

### 4. Configurer les règles de sécurité Firestore
Dans Firestore → Règles, collez ceci :
rules_version = '2';
service cloud.firestore {
match /databases/{database}/documents {
match /{document=**} {
allow read, write: if request.auth != null;
}
}
}
### 5. Récupérer la configuration
1. Dans Firebase Console → ⚙️ Paramètres du projet
2. Descendez jusqu'à "Vos applications"
3. Cliquez sur l'icône Web </>
4. Copiez l'objet firebaseConfig
5. Collez-le dans js/firebase-config.js

---

## 💻 Lancer l'application

### Option 1 — Extension VS Code (recommandé)
1. Installer l'extension "Live Server" dans VS Code
2. Clic droit sur index.html → "Open with Live Server"

### Option 2 — Serveur local Python
cd app-paie
python -m http.server 8000
Ouvrir : http://localhost:8000
### Option 3 — Serveur local Node.js
npx serve .
> ⚠️ Ne pas ouvrir directement le fichier HTML (file://)
> car les modules ES6 ne fonctionnent pas sans serveur HTTP.

---

## 📊 Collections Firestore créées automatiquement

| Collection    | Description                             |
|---------------|-----------------------------------------|
| employes      | Données des employés                    |
| fiches-paie   | Fiches de paie générées et sauvegardées |

---

## 🧮 Calculs de paie intégrés

| Élément               | Formule                             |
|-----------------------|-------------------------------------|
| Heures supplémentaires| Taux horaire × 1.5 × nbre heures   |
| Taux horaire          | Salaire base ÷ 173.33               |
| CNSS employé          | Salaire brut × 3.6%                 |
| CNSS patronale        | Salaire brut × 16.8%                |
| IRPP                  | Barème progressif par tranches      |
| Net à payer           | Brut − Total retenues               |

> Adaptez les taux dans js/paie.js selon la législation de votre pays.

---

## 🔧 Technologies utilisées

- HTML5        — Structure des pages
- CSS3         — Mise en forme et responsive design
- JavaScript ES6+ — Logique applicative (modules)
- Firebase Authentication — Sécurisation de l'accès
- Firebase Firestore — Base de données en temps réel

---

## 📬 Support

Pour toute question, relisez les commentaires dans chaque fichier JS —
tout y est expliqué ligne par ligne pour les développeurs juniors ! 🎓