# Keyboard Compatibility System

## Project Purpose

This is a functional MVP prototype for a Software Requirements Engineering design package. It turns the UML/use-case logic into a small React frontend that helps a keyboard builder set up a build, search local mock parts, verify compatibility, view evidence, recover from incompatible choices, and evaluate uncertain group-buy/preorder components.

## Technology Stack

- React
- JavaScript ES modules
- A small local Node static server
- Local mock data only
- No backend, authentication, payment flow, vendor integration, or production database

## Install and Run

Install dependencies:

```bash
npm install
```

Run the app:

```bash
npm run dev
```

Open:

```text
http://127.0.0.1:5173
```

Do not open `index.html` directly from the file system. The app uses browser modules that need the local Node server.

## Demo Flows

- Compatible demo: starts a 65% build and filters to a compatible KBD67 case. Adding it shows a compatible result with structured reasoning and trusted sources.
- No results demo: applies a search that returns no matches. The empty state shows the current filters and gives a direct Clear Filters recovery action.
- Incompatible demo: starts a 65% build with a KBD67 case, then checks a DZ60 PCB. The system explains the layout/family mismatch and shows remove, replace, and suggested-parts actions.
- Group-buy demo: checks the Aurora65 preorder PCB. The result is uncertain, warns about incomplete final specs, possible shipping/spec changes, incomplete data, and kit/set inclusion risk.

## Second Iteration Improvements

- Added clearer spacing and wrapping for part tags, specs, and decision labels.
- Clarified search scope: search includes name, brand, mount, version, specs, and tags.
- Added Clear Filters in the search area and no-results state.
- Added active-filter text to no-results recovery.
- Added pre-selection clues on part cards, including current-layout matches, build compatibility, incomplete specs, and preference fit.
- Added mock prices, per-part prices, selected-part prices, and an estimated total before tax.
- Added simple trait-based preference scoring for sound and typing feel across the combined build.
- Added recommendation labels such as Recommended, Matches current layout, and Preference Match: High.
- Strengthened compatible, incompatible, and group-buy explanations.
- Added named saved builds using localStorage, with a saved-builds list and reopen action.

## Use Case Traceability

- Search for Parts: search/filter controls, clarified search scope, active filter display, and Clear Filters support the main and failure flows.
- Add Part to Build: part cards show price, pre-selection clues, recommendation labels, and replacement confirmation before changing an occupied slot.
- Verify Part Compatibility: the compatibility result explains layout support, mounting/family alignment, confidence, and trusted source references.
- Handle Incompatible Part: incompatible results show why the part failed, a suggested alternative, Remove incompatible part, Replace with compatible alternative, and View suggested compatible parts.
- Evaluate Group-Buy Component: group-buy parts are marked as uncertain when specs are incomplete and include realistic preorder warnings.
- View Trusted Compatibility Information: source references remain attached to compatibility results with title, source type, trust level, and description.
- Save Build: Save Build asks for a name, stores a local saved build, lists saved builds, and allows reopening them in the current session/browser.

## Preference Scoring Assumptions

The MVP uses simple mock traits instead of acoustic simulation. Sound and feel are estimated from the combination of case, plate, switches, keycaps, mounting style, and related part attributes.

Examples:

- Aluminum case or aluminum/brass plate: clacky, bright, firm
- Plastic/polycarbonate case: deep, muted, soft
- POM/FR4 plate: deep, soft
- Thick PBT keycaps: deep, muted
- ABS keycaps: bright, clacky
- Lubed linear switches: smooth, deep, linear
- Tactile/clicky switches: tactile, clacky, bright

Scores are intentionally coarse: High, Medium, or Low. They are meant to demonstrate decision support, not predict real keyboard acoustics.

## MVP Limitations and Assumptions

- All data is local mock/sample data.
- Prices are mock estimates and exclude tax, shipping, tools, stabilizers, and optional modifications.
- Compatibility rules are simplified to layout support, hardware family, mount type, and group-buy completeness.
- Saved builds are stored in browser localStorage only; there is no account or server sync.
- Source references are representative examples, not live vendor or community data.
- The UI is a single-page prototype intended for class demonstration rather than production use.

## Project Structure

- `src/App.js`: React view/state layer and demo interactions
- `src/styles.css`: layout, labels, tag spacing, and recovery styling
- `src/data/mockData.js`: layouts, parts, sources, mock prices, and mock traits
- `src/models/domain.js`: domain model classes from the design package
- `src/controllers/*.js`: build, search, and compatibility controllers
- `src/services/compatibilityEngine.js`: layout/family/group-buy compatibility rules
- `src/services/preferenceScoring.js`: sound/feel trait scoring
- `src/services/partCatalog.js`: mock catalog search and alternatives
- `src/services/sourceReferenceRepository.js`: trusted compatibility source lookup
