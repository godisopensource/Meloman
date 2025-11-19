Guide de développement (commandes testées)
======================================

Ce document récapitule les commandes et étapes qui ont fonctionné pour lancer ce projet en mode développement (adaptées au shell `fish`). Inclut l'UI (Vite) et le backend (Go).

Prérequis
---------
- Go >= la version indiquée dans `go.mod` (ex: `1.25.4`). Vérifier :
  ```fish
  go version
  ```
- Node.js v24 (voir `.nvmrc`). Recommandé : `fnm` (Fast Node Manager).

Installer Node avec `fnm` (recommandé)
------------------------------------
```fish
# installer fnm
curl -fsSL https://fnm.vercel.app/install | bash

# ajouter le sourcing à fish
printf '\n[ -s "$HOME/.fnm/fnm.fish" ]; and source "$HOME/.fnm/fnm.fish"\n' >> ~/.config/fish/config.fish
source ~/.config/fish/config.fish

# installer Node 24 et définir par défaut
fnm install 24
fnm default 24

# vérifier
node --version; npm --version; npx --version
```

Initialisation du projet
-------------------------
Cette étape télécharge les dépendances Go et Node, installe `golangci-lint` si besoin et installe les hooks git.

```fish
make setup
```

Démarrage en développement (UI + backend)
-----------------------------------------
Par défaut l'UI écoute sur le port `4533`. Vite proxie certains chemins vers `PORT + 100` (backend). Exemple : UI=4533 → backend=4633.

Méthode simple (foreman via `make dev`)
```fish
set -lx ND_PORT 4633  # (optionnel) force le port backend
make dev
```

Si vous préférez démarrer séparément
```fish
# backend (avec reload)
set -lx ND_PORT 4633
make server

# dans un autre terminal : UI
cd ui
npm start
```

Arrêter les serveurs de dev
```fish
make stop
# ou tuer manuellement
pkill -f 'node .*vite'    # kill vite
pkill -f 'go run -race -tags netgo'  # kill backend go runs
```

Création d'un compte admin
--------------------------
1) Via l'UI : quand la base est vide la page affiche "Create Admin" — remplissez username/password.

2) Par variable d'environnement (auto création au démarrage du backend) :
```fish
set -lx ND_DEVAUTOCREATEADMINPASSWORD 'monMotDePasseDev'
make server
```
L'utilisateur aura le nom `admin` et le mot de passe fourni.

3) Par requête HTTP (curl)
```fish
# créer le premier admin (ne fonctionne que si la DB est vide)
curl -i -X POST http://localhost:4633/auth/createAdmin \
  -H 'Content-Type: application/json' \
  -d '{"username":"admin","password":"admin"}'

# tester le login
curl -i -X POST http://localhost:4633/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"username":"admin","password":"admin"}'
```

Base de données SQLite (inspection)
-----------------------------------
Par défaut le fichier est `navidrome.db` dans le répertoire du projet.
```fish
sqlite3 -header -column navidrome.db "SELECT id, user_name, name, is_admin, password FROM user;"
```

Dépannage courant
------------------
- Erreur `go:embed build/*: cannot embed directory build/3rdparty: contains no embeddable files` :
  - Cause : le backend compile des assets embarqués (`ui/build/*`) mais aucun fichier valide n'existe. Solution : construire l'UI d'abord ou fournir un `index.html` minimal.
  - Commandes recommandées :
    ```fish
    cd ui
    npm ci
    npm run build
    cd ..
    make server   # ou make dev
    ```

- Si Vite (frontend) écoute déjà sur `4533` et le backend tente de binder sur `4533`, le backend échouera. Assurez-vous que le backend utilise `PORT + 100` ou définissez `ND_PORT` explicitement :
  ```fish
  set -lx ND_PORT 4633; make dev
  ```

- Vérifier les processus et ports :
  ```fish
  ss -ltnp | grep -E '4533|4633' || true
  ps aux | grep -E 'reflex|go run|vite|node' | grep -v grep
  ```

- Logs du backend (si démarré manuellement) :
  ```fish
  # lancer en arrière-plan et logger
  env ND_PORT=4633 nohup go run -race -tags netgo . > navidrome.log 2>&1 &
  tail -f navidrome.log
  ```

Tests, lint et format
--------------------
```fish
make test          # tests Go
make test-race     # tests Go avec race
make test-js       # tests JS (ui)
make lint          # golangci-lint
make format        # goimports + prettier
```

Tests et locale (snapshots)
---------------------------
- Les tests UI peuvent être sensibles à la locale du système (format de date), ce qui provoque des échecs de snapshot si votre machine est configurée en `fr_FR` par exemple.
- Pour exécuter les tests JS de façon déterministe, préfixez la commande avec une locale `en_US` : 
```fish
# dans le repo racine
LANG=en_US.UTF-8 make test-js
# ou depuis `ui/`:
LANG=en_US.UTF-8 npm test --prefix ui
```
- J'ai aussi ajouté une modification aux scripts npm (`ui/package.json`) pour forcer `LANG=en_US.UTF-8` lors de l'exécution de `npm test`/`vitest` afin d'éviter ces diffs sur les snapshots.
- Si vous préférez conserver les snapshots en français, il est possible de mettre à jour les snapshots en local (vitest --updateSnapshot), mais cela casse la portabilité entre machines avec des locales différentes.

Notes importantes
-----------------
- Ports : UI = `4533`, backend = `PORT + 100` (p.ex. backend 4633 si UI 4533).
- L'UI (Vite) proxie `/auth`, `/api`, `/rest`, `/backgrounds` vers le backend (voir `ui/vite.config.js`).
- Pour développement, `make setup` doit être exécuté une seule fois par machine pour installer dépendances.
- Pour repartir à zéro : renommer/sauvegarder `navidrome.db`, puis redémarrer et recréer l'admin.
  ```fish
  mv navidrome.db navidrome.db.bak
  make server
  # puis créer admin via UI ou curl
  ```

Si vous voulez que je commette ce fichier dans le repo ou que j'ajoute un script `dev.fish` pour automatiser ces étapes, dites‑le et je le ferai.

-- Fin
