# Product

<!-- impeccable:product-schema 1 -->

## Platform

android

Ímpeto ships as an Android APK (EAS `apk` profile, `com.impeto.app`) with EAS Update for
over-the-air JS updates. The same Expo codebase runs on iOS through Expo Go during
development, but Android hardware is the only shipped target and the only place Health
Connect exists. The app carries one custom design language rather than adapting per OS.

## Stack

Existing codebase: React Native 0.81.5 / React 19.1.0 on Expo SDK 54, expo-router v6
(file routes, headless `expo-router/ui` tabs), zustand 5 + AsyncStorage for persistence,
react-native-reanimated 4 for motion, react-native-svg for drawn graphics. TypeScript
throughout. Source is Portuguese-named (`src/design`, `src/components`, `src/store`).

## Users

Primary user: the app's owner, an individual lifter training at a commercial gym.
There is no account system and no multi-user data model.

**Updated:** the owner now expects other people to use the app, and has said so
explicitly when asking for a light theme: they prefer dark, but "tem usuários que
preferem o claro". Distribution is still by APK, with no store listing and no
accounts — but design decisions may no longer assume a single pair of eyes.

The usage scene is confirmed and bimodal: **ambient light varies a lot** between a
bright, fluorescent-lit gym floor and low-light late-evening sessions. The app must stay
legible at both extremes, which forces high contrast independent of whether the ground is
light or dark. The device is held in one hand, often with a sweaty screen, and read in
glances of a few seconds between sets while the other hand is on a bar or a machine.

## Product Purpose

Record what actually happened in a training session — load and reps, set by set — and
make the record worth returning to. Success is a session logged without the logging
getting in the way of training, and a post-workout report that makes the effort feel
tangible enough to want to repeat.

## Positioning

Ímpeto is a private, offline-first log: no account, no server, no social graph, nothing
leaves the phone. Against Hevy and Strong, which are cloud products with social feeds, its
differentiator is that the whole product is the user's own record.

Two mechanisms are specific to it and not copyable as a checklist:

- **Effective sets, weighted by role.** Each exercise credits a full set to its primary
  muscle group and 0.4 to each assisting group, so the muscle totals reflect real load
  distribution rather than counting every set once against every muscle it touches.
- **The muscle map.** The session's work is rendered onto a human figure, front and back,
  each region's intensity driven by its share of the session's effort.

## Operating Context

- **The set-logging loop is the hot path.** Tapping ✓ with empty fields repeats the
  previous session's performance and starts the rest timer. Long-press removes a set;
  tapping the set number opens the technique picker. This loop runs dozens of times per
  session, one-handed, mid-workout.
- **Rest timer runs between sets**, when the user is not looking at the screen.
- **Routines and ready-made templates.** 14 templates across 5 classic splits
  (Upper·Lower A/B, Push·Pull·Legs, ABC, Full Body, first-weeks machines-only). Saving a
  template forks it into an editable routine with no link back to the original.
- **End-of-session report**, celebrated once on completion and then permanently readable
  from history, shareable as a PNG card.
- **Connections are optional and post-hoc**, except the BLE strap: Health Connect enriches
  the report after the fact; a Bluetooth heart-rate strap is the only live source.

## Capabilities and Constraints

- 299 exercises in Portuguese covering the machines of a common commercial gym, plus
  barbell, dumbbell, cable, kettlebell and bodyweight movements.
- Exercise demonstrations come from free-exercise-db (public domain) over jsDelivr CDN,
  two frames alternated to form the animation, cached on device after first view. This is
  the **only** networked feature; everything else works fully offline.
- 10 set techniques: normal, warm-up, failure, drop set, rest-pause, bi-set, cluster,
  isometric, negative, partial. Warm-up is the only one excluded from volume.
- Records are detected against all prior sessions: heaviest absolute load, and best
  estimated 1RM (Epley). One record per exercise, load takes priority. A first-ever
  performance is deliberately **not** a record.
- All data is local (AsyncStorage, key `impeto-v1`). No account, no server, no telemetry.
  Uninstalling erases the history. JSON export/import is the only backup path.
- Health Connect (Android) reads heart rate and calories for the session's time window and
  writes the strength session back. Requires `minSdkVersion 26`.
- A Redmi Watch 5 Lite **cannot** supply live heart rate: it speaks a proprietary protocol
  to Mi Fitness and does not expose the Bluetooth Heart Rate Service. Its data reaches the
  app only after Mi Fitness syncs to Health Connect. Live HR requires a BLE chest strap.
- Expo Go compatibility is pinned to SDK 54; the shipped APK does not depend on it.
- Known limitation: `expo export --platform web` produces a blank page on SDK 54
  (zustand's `devtools` middleware emits untransformed `import.meta`). Native is
  unaffected. Web is not a target.

## Brand Commitments

- **Name: Ímpeto.** Chosen by the user over alternatives. Portuguese; means momentum /
  impetus / drive. The accent on the Í is part of the name.
- **A lightning bolt is the app mark**, on the launcher icon and signing the share card.
  The user confirmed it may be redrawn, but the bolt remains the mark.
- **Portuguese throughout**, in the interface and in the source.
- **Both a light and a dark theme are required**, with the choice exposed to the
  user (system / light / dark, defaulting to system). The owner prefers dark.
- **Purple is explicitly released.** It was pinned earlier in the project and is now
  unpinned by the user, who asked for whatever produces the best result. Nothing else in
  the visual system is binding: the user confirmed flow, screens, muscle map and icon are
  all open to redesign as long as the functions survive.

## Evidence on Hand

- A working, shipped app: 13 routes, 25 components, a full exercise catalogue, real
  session history on the user's device.
- Real exercise demonstration imagery from free-exercise-db, live over CDN.
- The user's own training history in the app is the only real content; there is no
  synthetic user, testimonial, benchmark, or usage statistic, and none may be invented.
- Build pipeline is live: EAS build `6c94541e` finished, APK downloadable.

## Product Principles

1. **The log must never cost more attention than the lift.** Anything that adds a tap,
   a decision, or a read to the between-sets loop is a regression, however good it looks.
2. **Legible in a bright gym and a dark one.** The ambient light is not controllable, so
   contrast is not a style axis — it is a functional floor.
3. **The record is the reward.** Effort already spent is what the product has to show;
   the end-of-session report is where the product earns the next session.
4. **Local and private by construction.** No account, no server, no upload. Sharing is an
   image the user chooses to export, never a feed.
5. **Report honestly, including the estimates.** An estimated 1RM says it is an estimate;
   a first-ever lift is not dressed up as a record.

## Accessibility & Inclusion

- Type must survive the Android system font-size setting; the app already caps multipliers
  (1.2–1.4) on fixed-height controls rather than letting labels wrap out of their boxes.
- Touch targets in the set-logging loop are used one-handed, sometimes with wet fingers:
  48 dp minimum with real spacing is a functional requirement here, not a checkbox.
- No product-specific screen-reader requirement has been established.
