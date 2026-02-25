# Supercell Stats Hub - Guida all'avvio su un nuovo PC

Questa guida ti spiegherà passo passo come scaricare, configurare e avviare il progetto su un nuovo computer da zero.

## 1. Prerequisiti
Prima di iniziare, assicurati di avere installati sul nuovo PC i seguenti programmi:
- **Git**: Per scaricare il codice (scaricalo da [git-scm.com](https://git-scm.com/))
- **Node.js**: L'ambiente per far girare il server e il sito (scaricalo da [nodejs.org](https://nodejs.org/) - la versione LTS va benissimo)
- **Visual Studio Code** (raccomandato): Per modificare il codice.

## 2. Scaricare il Progetto (Clone)
Apri il terminale (Prompt dei comandi o PowerShell su Windows, o il terminale integrato in VS Code) e naviga nella cartella dove vuoi salvare il progetto (es: `cd Documenti`).

Esegui questo comando per scaricare tutto il codice da GitHub:
```bash
git clone https://github.com/Tha-Nixo/SUPERCELL-STATS.git
```

Entra nella cartella appena creata:
```bash
cd SUPERCELL-STATS
```

## 3. Installare le dipendenze
Il progetto usa diverse librerie (React, Tailwind, ecc.). Per installarle tutte in un colpo solo, esegui:
```bash
npm install
```
*(Questo comando creerà la cartella `node_modules` che contiene tutto il necessario per far funzionare il progetto).*

## 4. Configurare le Chiavi API (Il file .env)
Il file con le chiavi segrete (`.env`) **NON** viene caricato su GitHub per motivi di sicurezza! Quindi sul nuovo PC dovrai ricrearlo.

1. Nella cartella principale del progetto, crea un nuovo file e chiamalo esattemente `.env`
2. Apri il file appena creato e incollaci questo contenuto, sostituendo `TUA_CHIAVE_QUI` con i tuoi veri token presi dai portali sviluppatori di Supercell:

```env
# Sostituisci questi valori con le tue chiavi API corrette
VITE_CLASH_ROYALE_API_KEY=TUA_CHIAVE_QUI
VITE_BRAWL_STARS_API_KEY=TUA_CHIAVE_QUI
VITE_CLASH_OF_CLANS_API_KEY=TUA_CHIAVE_QUI
```

*(Se non ricordi le chiavi, puoi recuperare dal vecchio PC aprendo il file `.env` originale, o rigenerarle sui portali Supercell Dev).*

## 5. Avviare il server
Ora sei pronto! Per far partire il sito in modalità sviluppo (esattamente come facevi sul PC originale), digita:
```bash
npm run dev
```

Il sito sarà visibile nel browser all'indirizzo che ti compare (di solito `http://localhost:5173/`).

## 6. Salvare le nuove modifiche su GitHub (Routine)
Quando farai modifiche sul nuovo PC e vorrai salvarle su GitHub per non perderle:
```bash
git add .
git commit -m "Descrizione di cosa hai modificato"
git push
```

Quando tornerai invece sul computer originale (o viceversa), ti basterà scaricare le novità salvate con:
```bash
git pull
```

Buon coding!
