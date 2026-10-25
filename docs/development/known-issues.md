# Known Issues

## 3D physique visual

The Phase 1 R3F physique visual can fail to render or behave inconsistently in some browser/WebGL environments. It is intentionally isolated and lazy-loaded so it cannot block the workout flow. Fix it as a focused follow-up task; retain the CSS fallback and reduced-motion behavior while diagnosing it.
