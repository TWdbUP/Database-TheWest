PANTALONI — NATIVE REBUILD 30/09/2026

Base
----
Derivato dal modello Copricapi v5 approvato dall'utente, mantenendo la stessa UI e lo stesso motore bonus/miglioramenti.

Fonti
-----
- MASTER nativo 29/09/2026: ItemManager + ItemSetManager
- RAW ItemSetManager per componenti/nome/bonus set
- TWIR 2.205.1 esclusivamente come layer metadata per evento/anno/icone
- Formula miglioramenti dal motore nativo ItemManager / Item / BonusExtractor

Regole
------
- Categoria: pants
- Oggetti: 585
- Ordinamento iniziale: item_id crescente
- Nomi oggetto nascosti sotto le icone; restano nel popup e nella ricerca
- Miglioramento direttamente sull'oggetto con +/- e riordino dinamico
- Attributi e bonus forte/settore in grassetto
- TWIR evento+anno quando il set è catalogato
- TWIR evento null: anno mostrato senza icona
- Fallback nativo per set non ancora catalogati, inclusi i set 2026 con identificatore esplicito
- CS/Sale locale; se un set Sale è chiaramente collegato a un evento nell'ID nativo, il renderer supporta entrambe le icone

Verifica
--------
VALIDATION.json contiene conteggi, riferimenti set, metadata evento e controlli su casi noti.

Aprire
------
Estrarre lo ZIP e aprire index.html.
Le immagini degli oggetti e lo sfondo restano caricati dal CDN/sito di The West; le icone evento/prezzo sono locali.


Aggiornamento 30/09/2026: riga evento centrata (icona evento + evento/anno + CS). CS 2026 aggiunto solo su corrispondenza esatta item.short presente in TWIR.popupSales; nessuna deduzione a intuito.
