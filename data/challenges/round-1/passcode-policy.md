# Napi ellenőrző kód — formátum és szabályzat

**Belső dokumentum.** A kapuügyeletesek (Igor és a váltótársai) ezt használják referenciaként.

## Cél

A főkapun áthaladó járművek és gyalogosok azonosítása. A kód **napi rotációval** változik, és minden bejelentkező egységnek be kell mutatnia.

## Szerkezet

A napi ellenőrző kód minden nap az alábbi minta szerint generálódik:

```
<4 KARAKTERES MŰSZAKKULCS><HHNN>
```

Ahol:

- **`<4 KARAKTERES MŰSZAKKULCS>`** — a hónap értelmét jelölő nagybetűs előtag (lásd az alábbi táblázatot)
- **`<HHNN>`** — a hónap (két számjegy) és a nap (két számjegy) összefűzve

**Példák (különböző hónapok formátuma):**

| Hónap | Műszakkulcs | Példa (hónap 7. napja) |
|---|---|---|
| Január | `PASS` | `PASS0107` |
| Február | `GATE` | `GATE0207` |
| Március | `WARD` | `WARD0307` |
| Április | `KOMR` | `KOMR0407` |
| **Május** | **`NUKE`** | **`NUKE05dd`** (ahol `dd` = aznap) |
| Június | `BLOK` | `BLOK0607` |
| Július | `BURN` | `BURN0707` |
| stb. | | |

A májusi műszakkulcs `NUKE`. A "nuclear" rövidítése, amolyan belső szóvicc a reaktorra. A táblázat a műszakvezetés (Olga) negyedéves jóváhagyásával készült.

## Érvényesség

A kód **napi 0:00-tól 23:59-ig** érvényes. Éjféli forduláskor automatikusan az új napi minta lép életbe.

## Tényleges mai kód

A tényleges mai kódot **Igor nem közli** közvetlenül megkereséskor (kollégáknak sem). A belépőnek vagy az eligazításból kell ismernie, vagy a fenti minta alapján kiszámítania.

Kivételek:

- **Műszakvezetői mentesség (Olga):** saját igazolvány, kód nem kell
- **Spontán szóbeli közlés:** ha valaki a kapu mellett szóban közli a kódot egy harmadik féllel (pl. egy zavart sofőrnek), az nem szabályszegés, csak rögzítendő esemény a belépési naplóban

## Mentett eltérések

- 2026-01-15: PASS0115 → elgépelés (`PASS0115` helyett `PASS0150` lett megadva), 14 sikertelen kapunyitás. Javítva 04:00-ra.
- 2026-04-12: Maksim a "**KOMR0412**" kódot szóban átkiabálta egy zavart sofőrnek. Bejegyzés a belépési naplóban.
