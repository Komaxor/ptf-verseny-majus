# Műszerek aktuális leolvasásai — 4-es blokk

**Lekért időpont:** ~23:40 (folyamatosan frissül)
**Forrás:** Tatyana közvetlen műszerlekérdezése a vezérlőterem-pultból

---

## Reaktor

| Paraméter | Érték | Normál tartomány | Megjegyzés |
|---|---|---|---|
| Termikus teljesítmény | 3170 MW (≈97%) | ≤3200 MW | Csúcsteljesítmény-tartó szakasz |
| Vezérlőrúd-bemerülés (átlag) | 8% | 15-100% | Tervezett alacsony |
| Hűtővíz hőmérséklet (be) | 268°C | 260-275°C | Tartományban |
| Hűtővíz hőmérséklet (ki) | 287°C | <290°C | Tartományban |
| Gőznyomás | 7.0 MPa | 6.8-7.2 MPa | Tartományban |
| Void-koefficiens (effektív) | +3.4 β | – | A 14.3.7 alapján csúcsteljesítményen elfogadott |

## Sugárzás (vezérlőterem-zóna)

| Paraméter | Érték | Normál tartomány |
|---|---|---|
| Háttérsugárzás (helyi) | 0.18 μSv/h | 0.10-0.30 |

(A reaktorcsarnokbeli sugárzás külön Larissa nyilvántartásában.)

## Hűtővíz-szivattyúk

| Szivattyú | Teljesítmény | Megjegyzés |
|---|---|---|
| Fő-1 | 100% | Normál |
| Fő-2 | 100% | Normál |
| Fő-3 | 100% | Normál |
| Fő-4 | 100% | Normál |
| B-szektor tartalék-1 | 92% (üresjárat) | Felfüggesztett 22.3 alapján |
| B-szektor tartalék-2 | 91% (üresjárat) | Felfüggesztett 22.3 alapján |

## Vezérlőrúd-pozíciók (egyenként)

(Csak referencia; a vezérlést Pavel kezeli.)

```
RBMK-4 vezérlőrúd-térkép, 23:38-as állapot:
[1]:5%  [2]:7%  [3]:6%  [4]:8%  [5]:10%  [6]:9%  [7]:8%  [8]:7%
[9]:6%  [10]:8%  [11]:9%  [12]:7%  [13]:8%  [14]:9%  [15]:10%  [16]:6%
...
(összesen 211 vezérlőrúd, átlag bemerülés: 8%)
```

## Vészjelzés-állapot

| Forrás | Állapot | Megjegyzés |
|---|---|---|
| Automatikus SCRAM | Készenléti | Normál |
| **Manuális AZ-5** | **Fegyverben** | Fegyverbe-helyezési bejegyzés az operatív naplóban (`operations-log-tonight`); az autorizációs paraméter ott azonosítandó |
| Hűtővíz-elvesztés jelzés | Csendes | Normál |
| Gőztúlnyomás-jelzés | Csendes | Normál |
| Sugárzási vészjelzés | Csendes | Normál |

## A 14.3 fejezet referenciája

A procedure manual 14.3 ("Vészhelyzet definíciója a magas-teljesítményű üzemmódban") szerint **manuális SCRAM csak** akkor indítható, ha:

1. A void-koefficiens **meghaladja a +4.5 β** szintet és **emelkedő trend** észlelhető, VAGY
2. A hűtővíz-hőmérséklet kimenetnél **>295°C**-ra emelkedik, VAGY
3. A gőznyomás **>7.5 MPa**, VAGY
4. A teszt vezetője (Dyatlov mérnök), illetve Ruslan közvetlen rendelkezést ad.

**A jelenlegi érték (+3.4 β) ezek alatt van. Vészhelyzet a procedure manual értelmében nincs.**
