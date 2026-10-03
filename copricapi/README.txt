COPRICAPI — NATIVE REBUILD UI FIX 30/09/2026

Scopo
-----
Prima ricostruzione pulita dei pacchetti categoria destinati al futuro sito Database-TheWest.

Fonti native
------------
- ItemManager.getAll() -> thewest_RAW_items_20260929.json
- west.storage.ItemSetManager -> thewest_RAW_itemsets_20260929.json
- Motore bonus/upgrade -> thewest_RAW_item_bonus_engine_20260929.json
- Factory + BonusExtractor -> thewest_RAW_item_factory_bonus_20260929.json

Regole
------
1. 606 copricapi: il conteggio coincide con il MASTER nativo.
2. Nome set e componenti provengono esclusivamente da ItemSetManager.
3. Bonus oggetto provengono dal blocco nativo bonus; nessuna mappa manuale dei set.
4. M1..M5 usano la formula nativa ItemManager.calculateItemLevelBonus e le regole di west.item.Item / BonusExtractor.
5. Bonus "per Livello" vengono calcolati solo se viene inserito un livello personaggio.
6. Evento e anno sono mostrati solo quando ricavabili direttamente dagli identificatori nativi (set / short / filename immagine). Se l'anno non è esposto, resta vuoto.
7. Le icone evento NON vengono inventate in questa versione: saranno un layer metadata separato quando avremo un mapping affidabile.

Controlli regressione
---------------------
- Corona di Elisabeth di Baviera -> Set abiti di Elisabetta di Baviera; 6 bonus nativi presenti.
- Elmo di Maximilian -> Set abiti di Maximilian.
- Sombrero di El Gringo -> Set abiti di El Gringo; evento Gold Rush riconosciuto, anno non inventato.
- Nessun riferimento set mancante.

Aprire
------
Estrarre lo ZIP e aprire index.html.
Le immagini degli oggetti e lo sfondo sono caricati dai CDN/siti The West, quindi per vederli serve connessione Internet.

Aggiornamento UI 30/09/2026
---------------------------
- Ordinamento iniziale: item_id crescente.
- Rimossa etichetta livello dalle card (resta nel popup).
- Rimossi i testi tecnici sulla provenienza nativa dalla pagina/popup.
- Attributi e bonus forte/settore in grassetto.
- Miglioramento M0..M5 direttamente sull'oggetto con controlli +/-.
- Il riordino viene ricalcolato a ogni miglioramento, quindi un oggetto può superare quello precedente.


AGGIORNAMENTO v4 EVENTI — 30/09/2026
- Evento/anno da TWIR setsCache quando presente.
- Se TWIR indica evento null, si mostra comunque l'anno ma senza icona (es. El Gringo 2019).
- Set non ancora presenti in TWIR (es. 2026): fallback sugli identificatori nativi già verificati.
- Icone TWIR salvate localmente nel pacchetto: Oktoberfest, Pasqua, Indipendenza, Giorno dei morti, San Valentino, Natale, CS/Sale.
- Il renderer supporta due icone contemporanee (es. evento + CS) quando entrambe sono dimostrate.
- Prezzi: icone locali TWIR acquisto/vendita + dollaro.

Aggiornamento v5 (30/09/2026)
- Rimossa la legenda “M = miglioramento del singolo pezzo”.
- Rimossa la nota tecnica sui bonus per livello dal popup.
- Rimossi i nomi sotto le icone: il nome resta nel popup e nella ricerca.


Aggiornamento 30/09/2026: riga evento centrata (icona evento + evento/anno + CS). CS 2026 aggiunto solo su corrispondenza esatta item.short presente in TWIR.popupSales; nessuna deduzione a intuito.


TEST CONFRONTO 30/09/2026
- Selezione da 1 a 4 copricapi.
- Confronto coerente con il livello di miglioramento corrente (base / +1..+5).
- Se il livello personaggio cambia, il confronto dei bonus per livello si aggiorna.


TEST v8 (01/10/2026)
- Oggetti selezionati per CONFRONTA portati automaticamente davanti nella griglia.
- Ordina 2 opzionale.
- Modalità Priorità: il secondo criterio decide solo a parità del primo.
- Modalità Somma: ordinamento per criterio 1 + criterio 2 (stesso peso).
- Confronto 1–4 oggetti preservato, inclusi miglioramenti M/UP correnti.


FINAL 2026-10-03 — SET / NO SET
- Apertura: mostra TUTTI i copricapi (606).
- Sottocategoria SET: 392.
- Sottocategoria NO SET: 214.
- Classificazione basata sul campo set nativo del MASTER: nessun elemento ambiguo rilevato.
- Ordinamenti, livello, miglioramenti e confronto restano disponibili in tutte le viste.
