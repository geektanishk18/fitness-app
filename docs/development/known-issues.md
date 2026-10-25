# Known Issues

## Resolved visual performance issue

The decorative Three.js physique renderer was replaced by an SVG wireframe treatment. This preserves the approved shape and removes WebGL startup cost and the Three.js bundle from the client.
# Offline and integration limitations

- Service worker caches the shell and same-origin assets after they have been requested. First install requires a successful online load.
- New post-sign-in profile, training, nutrition, workout, measurement, check-in, and photo mutations are queued and sent through the authenticated Supabase client. Binary photo uploads require an online signed-in session. Pre-existing local mutations and records are intentionally retained on-device.
- The Supabase migration history versions are registered, but dashboard-applied history rows have empty statement arrays; run Supabase CLI migration repair after linking/authenticating if remote `migration fetch` history is needed. Do not rerun the SQL files.
- Marketplace Supabase public variables currently target Production only, so Preview/Development builds remain local-only until those public variables are scoped there.
- Offline records can be lost if the user clears site data or the browser evicts storage. Export/import UI is a production prerequisite.
- Queue conflict responses are represented as a blocked state. There is no interactive conflict-resolution UI until a remote adapter exists.
- Browser storage quota can reject new writes. The workout view surfaces a warning; device availability and quota vary.
- SVG app icons are used for broad install metadata; a generated PNG icon set may be needed for platform-specific store packaging.
