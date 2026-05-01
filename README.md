# Keyboard Compatibility System

## Project Purpose

This is a functional MVP prototype for a Software Requirements Engineering design package. It turns the provided UML/use-case logic into a small React frontend that helps a keyboard builder set up a build, search local mock parts, verify compatibility, view evidence, and handle incompatible or uncertain selections.

## Design Package Summary

The provided materials describe a layout-first Keyboard Compatibility System. The user starts or opens a build, selects a layout and preferences, searches for parts, adds a selected part, and then the system verifies compatibility. Search is intentionally separate from verification. If a part is incompatible, the system explains the problem and suggests recovery. If a part is a group-buy/preorder item, the system shows uncertainty and trusted source references.

The implementation follows the MVC-oriented class diagram names from the package:

- Model classes: `User`, `Build`, `Layout`, `Part`, `GroupBuyPart`, `CompatibilityResult`, `SourceReference`
- Controller/support classes: `BuildController`, `SearchController`, `CompatibilityController`, `PartCatalog`, `CompatibilityEngine`, `SourceReferenceRepository`
- React components act as the View layer.

## Implemented Use Cases

- Search for Parts
- Add Part to Build
- Verify Part Compatibility
- Handle Incompatible Part
- View Trusted Compatibility Information
- Evaluate Group-Buy Component
- Save/Finalize Build confirmation

## Technology Stack

- React
- React browser bundles served by a small local Node static server
- JavaScript ES modules
- Local mock data only
- No backend, database, paid API, or external data calls

## Install Dependencies

```bash
npm install
```

## Run the App

```bash
npm run dev
```

Open:

```text
http://127.0.0.1:5173
```

Do not open `index.html` directly from the file system. The app uses JavaScript modules and browser bundles that need to be served through the local Node server.

## Demo the App

Use the scenario buttons at the top of the app:

- Compatible demo: filters the list to a compatible 65% case. Add it to see success.
- No results demo: applies a search that returns no results.
- Incompatible demo: starts a 65% build with a KBD67 case, then checks a DZ60 PCB and shows an incompatibility warning.
- Group-buy demo: checks the Aurora65 preorder PCB and shows uncertainty plus source references.

Manual demo flow:

1. Select a layout in Build Setup.
2. Search or filter parts.
3. Select Add or Replace on a result.
4. Review the compatibility result and trusted evidence.
5. For group-buy parts, select Include with warning if you want to keep the part.
6. Save the build to show the confirmation state.

## UML and Use-Case Logic Followed

- Search happens before compatibility verification.
- Compatibility verification happens only after a user selects or adds a part.
- `CompatibilityEngine` checks layout support first, then hardware family conflicts across case, PCB, and plate.
- `CompatibilityController` adds alternatives when a selected part is incompatible.
- `SourceReferenceRepository` attaches trusted evidence to compatibility results.
- `GroupBuyPart` extends `Part` and returns uncertain or conditional results when specs are incomplete.

## MVP Limitations and Assumptions

- All data is local mock data.
- Compatibility rules are simplified to layout support, hardware family, mount type, and group-buy completeness.
- User accounts, real saved builds, authentication, and database persistence are not implemented.
- Source references are representative examples, not live vendor or community data.
- The UI is a single-page prototype rather than a full production workflow.

## Files Created

- `package.json`
- `index.html`
- `src/main.js`
- `src/App.js`
- `src/styles.css`
- `src/data/mockData.js`
- `src/models/domain.js`
- `src/controllers/buildController.js`
- `src/controllers/searchController.js`
- `src/controllers/compatibilityController.js`
- `src/services/partCatalog.js`
- `src/services/compatibilityEngine.js`
- `src/services/sourceReferenceRepository.js`
