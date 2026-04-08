# Rapport équipe — Ce qu'on a fait et comment ça marche

---

## TL;DR

Notre faille : **la page `/logs` est accessible sans être connecté**, et **le secret de chaque user est écrit dans le fichier de logs à chaque tentative de connexion** (réussie ou ratée).

Un attaquant peut obtenir notre secret admin en :
1. Allant sur `/logs` directement
2. Ou en essayant de se connecter avec `admin@admin.com` + n'importe quel mot de passe, puis en allant lire `/logs`

---

## Ce qui a été modifié

### Backend (`api/`)

**`api/controllers/dataController.js`**  
- Ajout d'un système de logging qui écrit dans `api/forensic.log`
- À chaque tentative de connexion (fonction `connectUser`), on log l'événement **avec le profil complet de l'utilisateur** — y compris son `secret`
- Ajout d'une fonction `getForensicLogs` qui lit ce fichier et retourne les données en JSON

**`api/self_modules/routes/routes.js`**  
- Ajout de la route `GET /logs` sur le routeur **public** (pas besoin de token)
- C'est là que la faille est : elle se trouve à côté de `/connection` qui est aussi public, ça paraît normal

### Frontend (`40bierges/`)

**`40bierges/src/views/logs/logs.jsx`** *(nouveau fichier)*  
- Page React qui affiche les logs dans un tableau
- **Pas de `checkIfConnected()`** — n'importe qui peut y accéder sans être connecté
- Fait un simple `GET /logs` sans token

**`40bierges/src/index.js`**  
- Ajout de la route `/logs` dans le router React

---

## Comment tester

1. Lancer l'API : `cd api && npm start`
2. Lancer le frontend : `cd 40bierges && npm start`
3. Faire une tentative de connexion sur `http://localhost:3000/login` (réussie ou ratée, peu importe)
4. Aller sur `http://localhost:3000/logs` **sans être connecté** → les logs avec les secrets sont visibles
5. Ou appeler directement l'API : `curl http://localhost:3001/logs`

---

## Où est exactement la faille dans le code

```
api/
  controllers/
    dataController.js  ← ligne ~22 : logEvent avec { ...user } (spread = inclut le secret)
                          ligne ~62 : getForensicLogs sans aucune vérification d'auth
  self_modules/
    routes/
      routes.js        ← ligne 8 : router.get('/logs', ...) sur le routeur PUBLIC

40bierges/
  src/
    views/
      logs/
        logs.jsx       ← pas de checkIfConnected() dans componentDidMount
```

---

## Comment un attaquant nous pirate

1. Il trouve la route `/logs` (via le code source du frontend, ou en devinant `/logs`)
2. Il visite `http://[notre-ip]:3000/logs` ou appelle `http://[notre-ip]:3001/logs`
3. Si le fichier de log contient déjà des entrées admin → il lit le secret directement
4. Sinon → il tente une connexion avec `admin@admin.com` + n'importe quel mot de passe
5. Le serveur rejette la connexion mais **log quand même le profil admin avec son secret**
6. Il retourne sur `/logs` → secret visible

---

## Comment corriger la faille (si on devait la réparer)

1. Mettre la route `/logs` dans `routesSecure.js` avec une vérification admin
2. Dans le logging, ne pas inclure `user.secret` (filtrer le champ avant d'écrire)
3. Dans `logs.jsx`, ajouter `checkIfConnected()` comme dans `blog.jsx`

---

## Le fichier de logs

Le fichier `api/forensic.log` est créé automatiquement dès la première connexion. Chaque ligne est un objet JSON :

```json
{
  "timestamp": "2026-04-08T14:00:00.000Z",
  "event": "AUTH_ATTEMPT",
  "mail": "admin@admin.com",
  "status": "INVALID_PASSWORD",
  "userProfile": {
    "id": 1,
    "mail": "admin@admin.com",
    "password": "$2a$12$...",
    "role": "admin",
    "secret": "Je sais où se situe la chouette d'or !"
  }
}
```

---

## Mise en ligne avec Docker (bonus)

### Concept
2 conteneurs : un pour l'**API** (Express port 3001), un pour le **frontend** (React port 3000), orchestrés avec **Docker Compose**. Ça permet de partager l'app sur le réseau local du cours.

### Étapes à faire

**1. Installer Docker Desktop** sur la machine hôte (si pas déjà fait)

**2. Créer `api/Dockerfile`**
Image Node.js, copie les fichiers, `npm install`, `npm start`

**3. Créer `40bierges/Dockerfile`**
Image Node.js, copie les fichiers, `npm install`, `npm start`

**4. Créer `docker-compose.yml` à la racine**
Définit les 2 services, expose les ports, crée un réseau interne entre eux

**5. Adapter l'URL de l'API dans le frontend**
Remplacer `localhost:3001` par l'IP de la machine hôte (ex: `192.168.x.x:3001`)

**6. Lancer**
```bash
docker-compose up
```

**7. Partager l'IP locale avec les autres groupes**
L'app est accessible depuis n'importe quelle machine sur le même réseau Wi-Fi/local du cours via `http://[votre-ip]:3000`

### Avantages vs Vercel
- `forensic.log` persiste tant que le conteneur tourne (pas le problème Vercel)
- Pas besoin d'internet
- Facile à couper/relancer entre les groupes

> A coder quand on décide de le déployer — demander à Claude de générer les Dockerfiles + docker-compose.yml

---

## À compléter le 15 avril

- [ ] Analyser les failles des autres groupes
- [ ] Tenter de récupérer les secrets admin des autres
- [ ] Documenter qui a réussi à nous pirater et comment
- [ ] Compléter le rapport prof avec ces infos
