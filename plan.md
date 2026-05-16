# plan.md — Fork UDM (Unihedron Device Manager) en mode hybride (FastAPI + React + MongoDB)

## 1. Objectives
- Reproduire **toutes les fonctionnalités clés** de l’UDM officiel sur Linux via une UI web moderne.
- Implémenter un mode **hybride local** : backend Python (accès USB/série) + frontend React (UI).
- Assurer **Find USB** avec détection **FTDI + CH340** (SQM DIY ESP8266 NodeMCU) et sélection du port.
- Support du **protocole série Unihedron** (115200 8N1; commandes `rx/ix/cx/Lx/...`).
- Livrer **les sources** (repo GitHub prêt) + scripts d’installation/launch Linux + **mock/demo mode** sans matériel.

---

## 2. Implementation Steps

### Phase 1 — Core POC (isolation, à valider avant UI complète)
**But : prouver que “Find USB → connect → info/read → stream temps réel → logging” marche avec FTDI+CH340.**

1) Web search / best practices
- Rechercher les meilleures pratiques Linux pour :
  - identification USB via VID/PID/serial (pyserial + pyudev)
  - permissions (udev rules) pour accès /dev/ttyUSB*
  - robustesse lecture série (timeouts, reconnexion, framing)

2) POC backend minimal (scripts + mini API)
- Script Python `poc_detect_ports.py`:
  - liste ports (pyserial) + enrichissement USB (pyudev)
  - match FTDI (0x0403) + CH340 (0x1A86, PID 0x7523/0x5523)
- Script `poc_sqm_protocol.py`:
  - ouvrir port à 115200
  - envoyer `ix`, `rx`, `cx` (et parse réponses)
  - gestion erreurs (timeout, réponse incomplète)
- Mini FastAPI `poc_api.py`:
  - `/ports` (liste + type détecté)
  - `/connect` `/disconnect`
  - `/command` (envoyer commande brute)
  - WebSocket `/ws/telemetry` (push des readings)

3) Mock/demo mode
- Implémenter un “FakeSerial” (réponses déterministes) activable par env var `SQM_MOCK=1`.

4) Gate de validation (ne pas passer à la suite si KO)
- Critères POC :
  - CH340 et FTDI apparaissent correctement identifiés
  - `ix/rx/cx` fonctionnent en réel *ou* via mock
  - flux WS stable (au moins 1 reading/simulé)
  - logging CSV basique écrit sans corruption

User stories (Phase 1)
1. En tant qu’utilisateur, je veux lister les ports et voir clairement lesquels sont FTDI ou CH340.
2. En tant qu’utilisateur, je veux me connecter à un port et vérifier immédiatement l’identité via `ix`.
3. En tant qu’utilisateur, je veux recevoir des readings continus via WebSocket sans relancer l’app.
4. En tant qu’utilisateur, je veux un mode mock pour tester l’app sans SQM branché.
5. En tant qu’utilisateur, je veux exporter un CSV minimal pour valider le pipeline de logging.

---

### Phase 2 — V1 App Development (MVP complet, UI + backend intégrés)
**But : réimplémenter les écrans/flux UDM avec un socle robuste autour du core validé.**

1) Structure repo (prêt GitHub)
- `backend/` (FastAPI, pyserial, pyudev, services)
- `frontend/` (React)
- `docker-compose.yml` (MongoDB local optionnel)
- `scripts/` (install/run/udev)
- `docs/` (README, troubleshooting)

2) Backend FastAPI (prod-local)
- Services :
  - `PortDiscoveryService` (FTDI/CH340 + metadata)
  - `SQMSerialClient` (connect/reconnect, commandes Unihedron, parsing)
  - `LoggingService` (CSV/DAT, rotation, path, start/stop)
  - `FirmwareService` (upload/flash selon possibilités; sinon staging + doc)
- API :
  - Ports: list/refresh
  - Device: connect/disconnect/status
  - Commands: `ix/rx/cx/Lx/...` + “raw command”
  - Logging: start/stop/config
  - Files: download logs
  - WS: telemetry + events (connect/disconnect/errors)
- Persistance MongoDB (stack imposée) :
  - profils device, derniers réglages, chemins de logs, préférences UI

3) Frontend React (réplique UDM, UX moderne)
- Écrans (tabs) :
  - **Find USB / Connection** (détection, connect, status)
  - **Info** (résultats `ix`, modèle, features, serial, MAC)
  - **Readings** (lecture manuelle + auto)
  - **Logging** (intervalle `Lx`, start/stop, fichier, format CSV/DAT)
  - **Configuration/Calibration** (commandes `cx` + actions cal/offset)
  - **Firmware** (UI + validation fichier + exécution backend)
  - **Charts** (temps réel via WS)
  - **Help/Troubleshooting**
- États UI : loading/connected/disconnected/error; toasts; journal d’événements.

4) Installation & exécution Linux
- `scripts/install.sh` (venv + deps, node build)
- `scripts/run_dev.sh` / `scripts/run_prod.sh`
- `udev/99-sqm.rules` (permissions CH340/FTDI) + doc.

5) Test E2E V1
- Parcours : Find USB → Connect → Info → Readings → Charts → Logging → Download log → Disconnect.
- Vérif en mock + (si possible) sur matériel de l’utilisateur.

User stories (Phase 2)
1. En tant qu’utilisateur, je veux une page Find USB qui détecte automatiquement FTDI et CH340 et me laisse choisir le bon port.
2. En tant qu’utilisateur, je veux voir les infos appareil (ix) dans un écran clair et exportable.
3. En tant qu’utilisateur, je veux démarrer/arrêter un logging continu avec intervalle et format configurables.
4. En tant qu’utilisateur, je veux un graphe temps réel stable (mpsas + température) pendant le logging.
5. En tant qu’utilisateur, je veux accéder à une console “commandes avancées” pour envoyer une commande Unihedron brute.

---

### Phase 3 — Parité UDM (feature-complete) + robustesse
1) Compléter la couverture des commandes UDM
- Implémenter toutes commandes nécessaires (incl. calibration avancée, offsets, paramètres).
- Valider parsing multi-firmwares/variantes.

2) Firmware
- Finaliser le workflow (pré-check device, mode bootloader si applicable, progression, rollback/erreurs).
- Si dépendant d’outils externes (esptool/avrdude), intégrer détection + exécution contrôlée.

3) Hardening série
- Reconnexion auto, backoff, lock d’accès port, gestion hot-unplug.
- Buffering, validation checksum si applicable.

4) Observabilité
- Logs applicatifs (niveau debug), export diagnostic.

5) Tests
- Unit tests parsing + services
- Tests d’intégration API

User stories (Phase 3)
1. En tant qu’utilisateur, je veux que l’app se reconnecte automatiquement si je débranche/rebranche le SQM.
2. En tant qu’utilisateur, je veux flasher un firmware avec une barre de progression et un résumé de succès/échec.
3. En tant qu’utilisateur, je veux sauvegarder plusieurs profils (DIY CH340 vs FTDI) et les réutiliser.
4. En tant qu’utilisateur, je veux un export diagnostic (logs + config) pour demander de l’aide.
5. En tant qu’utilisateur, je veux que toutes les fonctions UDM existantes soient disponibles et cohérentes.

---

### Phase 4 — Extension (Windows plus tard, packaging)
- Portage Windows : détection COM, permissions, packaging.
- Packaging : AppImage / .deb (Linux) ; éventuellement Electron/Tauri si besoin.
- Auto-update (optionnel).

User stories (Phase 4)
1. En tant qu’utilisateur, je veux une installation en 1 commande sur Linux (ou un .deb).
2. En tant qu’utilisateur, je veux une version Windows qui détecte aussi CH340/FTDI.
3. En tant qu’utilisateur, je veux lancer l’app au démarrage pour du monitoring continu.
4. En tant qu’utilisateur, je veux des mises à jour faciles sans casser ma config.
5. En tant qu’utilisateur, je veux conserver la compatibilité avec différents SQM/firmwares.

---

## 3. Next Actions
1) Confirmer la liste exacte VID/PID à supporter (CH340 PID 0x7523/0x5523; FTDI 0x6001/0x6015) et noms attendus dans UDM.
2) Rassembler (ou décrire) des exemples de réponses réelles `ix/rx/cx` de votre SQM DIY pour valider le parsing.
3) Démarrer Phase 1 : scripts POC + mini FastAPI + mock mode, puis validation.

---

## 4. Success Criteria
- Repo clonable, installable sur Linux, exécution locale (backend+frontend) documentée.
- Find USB détecte correctement **FTDI + CH340** et affiche une identification fiable.
- Connexion stable + commandes `ix/rx/cx/Lx` fonctionnelles + lecture temps réel via WS.
- Logging continu CSV/DAT fiable (start/stop, téléchargement).
- UI couvre les onglets UDM et fournit une expérience V1 utilisable sans matériel via mock mode.
