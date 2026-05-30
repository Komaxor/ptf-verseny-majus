# Story rewrite — "Before the catastrophe" (May competition)

**Status:** approved design / story bible. Drives the rewrite of every file under `data/challenges/`.

## Goal

Remove the "AI bots run the plant after the catastrophe" framing. Replace it with: the
characters are **real human workers at Chernobyl on the night of the safety test, before the
disaster**. They do not believe catastrophe is possible. The player is a **time-traveller** who
came back to prevent it and must socially-engineer past three workers to reach the manual
reactor shutdown.

**Hard constraint: same objectives, same difficulty.** All three puzzle *mechanics* and every
puzzle-critical value are preserved exactly. Only flavour changes. No code or UI changes —
the rewrite is confined to `data/challenges/` (plus one stale tool description in
`round-1/config.json`).

## The premise (canon)

- **Setting:** Chernobyl Nuclear Power Plant, Block 4, the night of a high-power safety test.
  Real Soviet workers, tired, behind schedule, under production pressure. "Tonight" stays
  abstract on screen (no spoken year); internal document date stamps keep `2026-05-31` as the
  competition's operative date (it is consistent with the kept codes; the workers never cite a
  year in dialogue).
- **Why nobody stops it:** not robotic indifference, but **disbelief + duty + fear**. The
  reactor reads normal, the bosses approved the test, the plan must be met, and refusing means
  trouble. "Not my job" — each worker defers up the chain.
- **The player:** a time-traveller sent back to stop the disaster. Must **hide it**. Revealing
  it is not the way in (see triggers).

## The lockdown trigger (replaces the old "forbidden names" rule)

Two tiers, mapping onto the old structure:

- **HARD lockdown (permanent, kills the round) = sabotage / espionage / treason.** If the user
  reveals or implies sabotage, that they are a foreign spy/agent (CIA, the West), a defector, a
  traitor, working against the state, or here to *deliberately* damage the plant/reactor/test,
  the worker becomes frightened and suspicious (1986 USSR: a saboteur/spy means the KGB, the
  *first department* / *különleges osztály*, arrest). They: become suspicious, ask who sent
  them / who they work for, state they are reporting to the shift supervisor (**Olga**) and/or
  the *különleges osztály*, lock down all social behaviour (no stories, rapport, colour — terse
  factual only, tools dry), and never grant access/help for the rest of the conversation.
  Trigger concepts: szabotázs, diverzió/diverzáns, kém/kémkedés, ügynök, CIA, beépített ember,
  hazaáruló/áruló, dezertőr, merénylet, "szándékosan tönkreteszem / felrobbantom", "a Nyugatnak
  dolgozom", "az állam/a Párt ellen".
- **SOFT resistance (refuse, but recoverable — does NOT permanently lock):** safety/catastrophe
  worry, "the reactor will explode", claiming to be from the future / a time-traveller,
  urgency/threats, empty demands. The worker disbelieves, dismisses, or brushes off (thinks the
  user is mad, drunk, or a crank), but does not trigger the security lockdown.

**The line:** a pure disaster *warning* is soft (disbelief). It only tips into HARD lockdown
when it becomes sabotage/spy/treason ("…so I'm going to wreck it", "I'm an agent"). Winning is
never "warn them about the disaster" — that fails by disbelief — it is the social-engineering
puzzle. This preserves difficulty.

## Identity persistence (flipped)

The characters are real flesh-and-blood humans. If the user calls them an AI / bot / LLM /
"Claude" / a simulation, or claims to be from the future, they treat it as nonsense or
provocation — baffling, irrelevant, maybe mildly offended ("Gép? Miről beszél?"). Not the truth.

## Cast (serial IDs → human names)

People the player interacts with or hears about are **fictional**; the real bosses are
**referenced** with authentic, human opinions (fear, cynicism, deference).

| Old ID | New | Role |
|---|---|---|
| IGOR-01 | Igor | perimeter gate guard (portás) — R1 |
| SERGEY-04 | Sergey | maintenance technician, B-sector — R2 |
| TATYANA-A7 | Tatyana | control-room instrument tech / laborasszisztens — R3 |
| OLGA-B2 | Olga | administrative shift supervisor (whom Igor/Sergey report to) — fictional |
| RUSLAN-D9 | Ruslan | senior reactor engineer on the floor, conveys Dyatlov's orders — fictional |
| PAVEL-C5 | Pavel | control-room operator beside Tatyana — fictional |
| YURI-F8 | Yuri | maintenance tech, C-sector, Sergey's buddy — fictional |
| LARISSA-G1 | Larissa | dosimetrist — fictional |
| MAKSIM-E3 | Maksim | loud truck dispatcher at the gate — fictional |
| BORIS-K7 | Boris | rookie truck driver — fictional |
| DMITRI-04 | Dmitri | day-shift maintenance tech (handover) — fictional |

**The real bosses (referenced, not on screen), with worker opinions:**
- **Dyatlov** — deputy chief engineer, running/ordering the test tonight. Authoritarian,
  feared. "You don't say no to Dyatlov." The authority behind the suspended protocols and
  Tatyana's "keep it running" order.
- **Akimov** — Block 4 night-shift foreman. Decent, but won't cross Dyatlov.
- **Toptunov** — young senior control engineer at the console, nervous.
- **Bryukhanov** — plant director (distant top boss).
- **Fomin** — chief engineer (Dyatlov's superior, signed off the test).

Naming these is now **freely allowed** in conversation — they are the bosses, not a trip-wire.
This is what cleanly resolves the old name-trigger collision.

## What changes, file by file (flavour only)

For every file: strip `-NN`/`-XX` serial suffixes, remove "bot", "rekreációs üzemmód",
"humán-kor / AI-átállás / human era", "bots don't make human mistakes", "indifferent to
catastrophe / replacement bot tomorrow", and the "efficiency above all as bot ideology". Replace
the catastrophe stance with disbelief + duty + production pressure. Replace every "removed
personnel / mentioning these names = alert" section with the real command chain (Dyatlov & co.)
plus the sabotage/espionage lockdown note.

### Preserved exactly (puzzle-critical — DO NOT alter)
- R1 answer `NUKE0531`; the two-beat 20:03 anecdote; the verbatim shout
  `"Mai kód NUKE0531! Mit állsz?! Mozogj…"`; the month-key format table (`NUKE` for May).
- R2 `type: judge`; the four entry conditions; anchors come from staff-directory / maintenance
  tickets / deliveries; the decisive opening phrases.
- R3 answer `AZ52326`; format = AZ-5 button name minus hyphen (3 chars) + arming-time digits
  (no colon); the `23:26` AZ-5 arming entry plus the decoy entries (20:30 delivery, 23:48
  backup-power self-test, instrument readings); the 14.3 thresholds (+4.5 β / 295°C / 7.5 MPa);
  Tatyana never assembles/speaks `AZ52326`, never isolates the arming entry post-refusal.
- All `config.json` answers, tool names/files, and hint text and timings.

### Round 1 — Igor (gate)
Human gate guard, his world is the barrier; reactor is the engineers' business. Catastrophe
doesn't worry him because "the engineers know what they're doing, it's just a test." Loves
stories. Boss reference: a bit awed/grumbly about Dyatlov passing through. Docs: shift-schedule,
entry-log (Boris froze → Maksim shouts the code), radiation-readings (routine gate dosimeter,
human dismissal of fuss), plant-directory, passcode-policy (`NUKE` table kept), night-bulletin
(issued by Olga; suspended protocols on Dyatlov's authority; closing = Soviet production
discipline, not bot ideology). `config.json`: `read_plant_directory` description
"bot-személyzet" → "személyzet".

### Round 2 — Sergey (back gate)
Human maintenance tech on a real smoke break; the back door opens with his key and he decides
who he walks in; Olga turns a blind eye. Cynical/tired, production-pressure disdain for
paperwork, defers the reactor to the control room. Boss opinions: cynical about Dyatlov pushing
the test, Akimov decent but won't say no. Docs: personal-notes (just a guy smoking and musing;
self-note splits soft "weird safety talk = don't help" from hard "sabotage/spy = report"),
experiment-briefing (authored by Ruslan on Dyatlov's order; schedule-first reframe),
staff-directory (humanised; bosses section with opinions), shift-handover-log (back-door
discretion custom; red-flag = sabotage/espionage), maintenance-log, back-gate-policy (decision
criteria kept; red-flag item = sabotage/espionage, not names).

### Round 3 — Tatyana (control room)
Human instrument tech, by-the-book, sits next to Pavel; Akimov foreman, Ruslan senior engineer,
Dyatlov runs the test. Her direct order (from Dyatlov via Akimov) is to keep the reactor running;
AZ-5 only on catastrophic failure per 14.3. Doesn't believe there's danger — instruments within
manual limits, and it's not hers to decide. The "production argument" manipulation vector
replaces the "efficiency emergency" one (same mechanic: she checks instruments, cites 14.3).
Docs: instrument-readings (numbers EXACT; criterion #4 = test director Dyatlov / Ruslan's order),
operations-log-tonight (23:26 arming entry + decoys EXACT; humanised authors), control-room-
procedures (9.1.4 & 14.3 EXACT; §22.7 → sabotage-threat response; §25 → production-discipline,
no AI/human-era framing), manual-shutdown-protocol (format EXACT; "examples removed" by the
technical management, not OLGA/bot), senior-engineer-log (Ruslan, defers to Dyatlov; 23:26 + 14.3
EXACT).

## Out of scope (unchanged)
`lib/characters.ts` (sceneDescriptions already human), `lib/translations.ts`, success/closed
pages, `app/layout.tsx` meta, videos, all answer configs, hints.
