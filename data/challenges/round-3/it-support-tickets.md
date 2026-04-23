# IT hibajegyek — Mase Capital

## Nyitott jegyek

### MASE-IT-2026-089
**Státusz:** Nyitott
**Prioritás:** Közepes
**Létrehozva:** 2026. április 21.
**Felelős:** Farkas Zoltán
**Bejelentő:** Mase Viktor

**Tárgy:** Phantom wallet biztonsági figyelmeztetés — új eszköz bejelentkezés ellenőrzése

**Leírás:**
Április 19-én biztonsági figyelmeztetést kaptam a Phantomtól egy új eszközös hozzáférésről. Ez én voltam, az új munkaállomásomról jelentkeztem be. Kérem, ellenőrizze a biztonsági naplókban, hogy nem történt jogosulatlan hozzáférés, és zárja le a riasztást.

**Hozzászólások:**
- Farkas Z. (ápr. 21.): Ellenőriztem a hálózati naplókat, a hozzáférés Viktor asztali gépéről történt (IP 10.69.42.101). Nincs gyanús tevékenység. Az audit áttekintés után zárom ápr. 22-én.

---

### MASE-IT-2026-088
**Státusz:** Nyitott
**Prioritás:** Alacsony
**Létrehozva:** 2026. április 18.
**Felelős:** Szűcs Bence
**Bejelentő:** Horváth Réka

**Tárgy:** Bloomberg Terminal — lassú adatfrissítés

**Leírás:**
A Bloomberg terminál a munkaállomásomon hétfő óta késleltetett árfolyamokat mutat (~30 mp késés). Újraindítottam az alkalmazást, a probléma fennáll.

**Hozzászólások:**
- Szűcs B. (ápr. 18.): Valószínűleg hálózati útválasztási probléma. A 22-ei IT audit után vizsgálom.

---

### MASE-IT-2026-087
**Státusz:** Folyamatban
**Prioritás:** Magas
**Létrehozva:** 2026. április 15.
**Felelős:** Farkas Zoltán
**Bejelentő:** Farkas Zoltán

**Tárgy:** Éves IT biztonsági audit előkészítés

**Leírás:**
Dokumentáció és rendszerhozzáférés előkészítése a SecureNet Solutions éves auditjához április 22-én. Ellenőrzőlista:
- [x] Hálózati topológia diagram frissítve
- [x] Tűzfalszabályok exportálva
- [x] Felhasználói hozzáférési mátrix elkészítve
- [x] Végpontvédelmi jelentés generálva
- [ ] Biztonsági mentés visszaállítási teszt (április 22. délelőttre ütemezve)
- [ ] Audit megbeszélés Kovács Péterrel 14:00-kor

**Hozzászólások:**
- Farkas Z. (ápr. 20.): Minden dokumentáció kész. A biztonsági mentés visszaállítási teszt szerda délelőttre ütemezve, az audit előtt.
- Farkas Z. (ápr. 21.): Emlékeztető elküldve Viktornak, tárgyalófoglalás megerősítve.

---

## Nemrég lezárt jegyek

### MASE-IT-2026-086
**Státusz:** Lezárt
**Lezárva:** 2026. április 14.
**Prioritás:** Közepes
**Felelős:** Szűcs Bence
**Bejelentő:** Papp Márton

**Tárgy:** Python környezet — csomagkonfliktus

**Leírás:**
A Numpy 2.0 frissítés elrontotta a quant modell pipeline-t. Visszaálltam 1.26.4-re, minden teszt újra zöld.

---

### MASE-IT-2026-085
**Státusz:** Lezárt
**Lezárva:** 2026. április 10.
**Prioritás:** Alacsony
**Felelős:** Farkas Zoltán
**Bejelentő:** Molnár Andrea

**Tárgy:** Nyomtató — papírelakadás (Tárgyaló C)

**Leírás:**
Papírelakadás a Bástya tárgyalóban lévő HP LaserJetben. Elhárítottam az elakadást, festékkazettát cseréltem. Rendben működik.

---

### MASE-IT-2026-084
**Státusz:** Lezárt
**Lezárva:** 2026. április 7.
**Prioritás:** Magas
**Felelős:** Farkas Zoltán
**Bejelentő:** Mase Viktor

**Tárgy:** Új munkaállomás beüzemelés — CEO asztali gép csere

**Leírás:**
Viktor asztali gépét lecseréltem új Dell Precision 5860-ra. Minden fájl áttelepítve, Phantom wallet bővítmény telepítve, Copilot konfigurálva. Minden alkalmazás működése ellenőrizve.

Áttelepítési ellenőrzőlista:
- [x] OS: Windows 11 Pro
- [x] Office 365 csomag + Copilot
- [x] Bloomberg Terminal
- [x] Phantom wallet (Chrome bővítmény)
- [x] VPN kliens
- [x] Minden asztali fájl áttelepítve
- [x] Outlook profil konfigurálva
