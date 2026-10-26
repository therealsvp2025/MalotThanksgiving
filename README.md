# Thanksgiving at The Malot Family House

A single-page Thanksgiving itinerary site (countdown, events, meals, outings, restaurants, entertainment, lodging).
The shared lists (snacks, games, menu, meal plan, events, lodging, and the lock) are stored in Firebase Firestore,
so everyone who opens the page sees the same entries, with no account needed.

## Put it on GitLab Pages

1. Create a new GitLab project, then unzip this folder's contents into its root (keep `.gitlab-ci.yml` at the top level).
2. Commit and push to the default branch. The pipeline builds the page and publishes it.
3. Your link is under **Deploy > Pages** in the project.
4. So people without a GitLab account can open it: **Settings > General > Visibility**, set the project to **Public**,
   or set **Pages** to **Everyone**.

No installs are needed: the build uses plain Python 3 and nothing else.

## Firebase

- The connection settings are in `src/firebase-config.json`.
- `firestore.rules` is the rule set to paste into Firestore > Rules. It lets anyone with the link read and write
  until Dec 15, 2026, after which the lists stop saving. Change the date to extend it.

## Open it locally

`index.html` is the finished page. Double-click it to open it in a browser (it needs internet for the lists).
To rebuild after editing anything in `src/`: `python3 src/build.py index.html --firebase`

## What is in `src/`

- `app.js`: all page behavior
- `style.css`: all styling
- `data.json`: the restaurant, brewery, and activity lists
- `firebase-config.json` and `firebase-shim.js`: connect the shared lists to Firebase
- `build.py`: combines everything into one HTML file
