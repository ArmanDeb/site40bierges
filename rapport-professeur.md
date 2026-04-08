# Rapport de Sécurité — Exercice CTF
## IFOSUP Bierges — Cours Réseau

---

**Groupe :** 40 Bierges  
**Date :** 08 avril 2026  
**Cours :** Sécurité réseau / Ethical Hacking  

---

## 1. Description de la faille injectée

### Catégorie
Broken Access Control + Information Disclosure (OWASP Top 10 : A01, A02)

### Intitulé
**Page de logs non protégée avec exposition du secret utilisateur**

### Description technique
Deux vulnérabilités complémentaires ont été intentionnellement introduites dans l'application :

1. **Route `/logs` accessible sans authentification**  
   L'endpoint API `GET /logs` a été enregistré sur le routeur public de l'application Express, c'est-à-dire *avant* l'application du middleware de vérification JWT. Il ne requiert donc aucun token valide pour être consulté.

2. **Secret utilisateur loggé à chaque tentative de connexion**  
   À chaque appel à `POST /connection` (réussi ou échoué), le système de logging forensique enregistre l'intégralité du profil utilisateur dans le fichier `forensic.log`, incluant le champ `secret` — qu'il s'agisse d'une connexion réussie ou d'un simple essai avec un mauvais mot de passe.

---

## 2. Localisation dans le code

### Fichiers modifiés

| Fichier | Modification |
|---------|-------------|
| `api/controllers/dataController.js` | Ajout de la fonction `logEvent()` et appels dans `connectUser()` ; ajout de `getForensicLogs()` |
| `api/self_modules/routes/routes.js` | Ajout de `router.get('/logs', dataController.getForensicLogs)` sur le routeur public |
| `40bierges/src/views/logs/logs.jsx` | Création d'une page React sans vérification d'authentification |
| `40bierges/src/index.js` | Ajout de la route `/logs` dans le router React |

### Extrait clé — Logging du secret (`dataController.js`)

```javascript
// Connexion réussie — le secret est inclus dans le log via spread
logEvent({
    event: 'AUTH_ATTEMPT',
    mail: body.mail,
    status: 'SUCCESS',
    userProfile: { ...user }   // ← inclut user.secret
});

// Mot de passe invalide — le user a été trouvé, son secret est aussi loggé
logEvent({
    event: 'AUTH_ATTEMPT',
    mail: body.mail,
    status: 'INVALID_PASSWORD',
    userProfile: { ...user }   // ← inclut user.secret
});
```

### Extrait clé — Route publique (`routes.js`)

```javascript
router.post('/connection', dataController.connectUser)
router.get('/logs', dataController.getForensicLogs)  // ← pas de middleware JWT
```

---

## 3. Problématique

### Scénario d'attaque

Un attaquant souhaitant obtenir le secret de l'administrateur procède comme suit :

1. **Reconnaissance** : il visite `http://[ip]:3000/logs` directement (pas de redirection vers `/login`, pas de vérification d'auth)
2. **Consultation des logs** : si une connexion admin a déjà eu lieu, le secret est visible en clair dans les données affichées
3. **Forçage de log** : si aucune entrée admin n'existe, il tente une connexion avec `admin@admin.com` et n'importe quel mot de passe → le serveur log le profil admin (avec secret) dans `forensic.log`
4. **Lecture du secret** : il retourne sur `/logs` et récupère le secret admin

### Exemple de contenu du fichier `forensic.log`

```json
{
  "timestamp": "2026-04-08T14:32:11.042Z",
  "event": "AUTH_ATTEMPT",
  "mail": "admin@admin.com",
  "status": "INVALID_PASSWORD",
  "userProfile": {
    "id": 1,
    "mail": "admin@admin.com",
    "password": "$2a$12$5n24...",
    "role": "admin",
    "secret": "Je sais où se situe la chouette d'or !"
  }
}
```

### Impact
- **Confidentialité** : le secret admin est exposé sans aucune authentification
- **Escalade de privilèges** : connaissance du secret = victoire dans le contexte de l'exercice
- **Traçabilité insuffisante** : la page de logs est elle-même accessible sans auth, donc toute consultation par un attaquant ne laisse aucune trace

---

## 4. Comment réparer la faille

### Correctif 1 — Protéger la route `/logs`

Déplacer la route vers le routeur sécurisé (`routesSecure.js`) et y ajouter une vérification de rôle admin :

```javascript
// Dans routesSecure.js (protégé par JWT)
router.get('/logs', checkIfAdmin, dataController.getForensicLogs)
```

### Correctif 2 — Ne pas logger le secret

Dans `logEvent`, filtrer les champs sensibles avant écriture :

```javascript
// Remplacer { ...user } par :
const safeProfile = { id: user.id, mail: user.mail, role: user.role };
logEvent({ event: 'AUTH_ATTEMPT', mail: body.mail, status: 'SUCCESS', userProfile: safeProfile });
```

### Correctif 3 — Ajouter l'authentification côté frontend

Dans `logs.jsx`, ajouter la vérification comme dans `blog.jsx` :

```javascript
componentDidMount() {
    if (tools.checkIfConnected()) {
        this.fetchLogs();
    } else {
        this.setState({ redirected: true });
    }
}
```

---

## 5. Système de logging forensique

### Description
Un système de logging a été mis en place dans `api/controllers/dataController.js`. Il enregistre chaque tentative de connexion dans le fichier `api/forensic.log` sous forme de lignes JSON (une par événement).

### Structure d'un événement loggé

```json
{
  "timestamp": "ISO 8601",
  "event": "AUTH_ATTEMPT",
  "mail": "email de l'utilisateur",
  "status": "SUCCESS | INVALID_PASSWORD | USER_NOT_FOUND",
  "userProfile": { ... }
}
```

### Utilisation forensique légitime
Ce type de logging permet, en cas d'incident de sécurité, de retracer toutes les tentatives de connexion, identifier les brute-force attacks, et auditer les accès à l'application.

---

## 6. Lien vers le dépôt Git

> *[À compléter avec l'URL du dépôt Git public]*

---

## 7. Sections à compléter après le 15 avril

### Failles des autres groupes et plan d'attaque

> *[À remplir après le cours du 15 avril]*

### Quels groupes ont piraté notre système

> *[À remplir après le cours du 15 avril — noter la méthode utilisée par les attaquants]*
