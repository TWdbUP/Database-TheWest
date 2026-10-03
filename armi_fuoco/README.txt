ARMI DA DUELLO — FUOCO — NATIVE REBUILD 30/09/2026

Modello
-------
Derivato dal Copricapi v5 FINAL già verificato visivamente.

Filtro categoria
----------------
type = right_arm + sub_type = shot + for_duel = true

Dati
----
- 425 oggetti dal MASTER nativo 29/09/2026.
- 321 set referenziati, nomi/componenti da ItemSetManager.
- Bonus e miglioramenti dal motore nativo Item/BonusExtractor.
- Eventi/anni: TWIR setsCache quando presente; fallback da identificatori nativi per i set non ancora catalogati.
- Se TWIR conosce l'anno ma lascia evento null, viene mostrato solo l'anno.
- Current Sales usa l'icona CS locale.
- Se un set è collegabile con certezza a un evento ma TWIR lo classifica Sale, vengono mostrate entrambe le icone evento + CS.
- Oggetti con doppia icona in questa categoria: 12.

Danni armi
----------
- Danno minimo/massimo e miglioramenti usano la formula nativa west.item.Weapon.
- Il bonus danno per livello usa la regola nativa Weapon.getDamageBonus.
- Ordinamento disponibile per Danno medio e Danno massimo.

Interfaccia
-----------
- Ordinamento iniziale ID crescente.
- Nome oggetto nel popup/ricerca, non sotto l'icona.
- Miglioramento direttamente sulla card con +/− e riordino automatico.
- Attributi e bonus forte/settore in grassetto.
- Icone evento e prezzi locali nel pacchetto.


Aggiornamento 30/09/2026: riga evento centrata (icona evento + evento/anno + CS). CS 2026 aggiunto solo su corrispondenza esatta item.short presente in TWIR.popupSales; nessuna deduzione a intuito.
