# Testing Strategy

Use unit tests for pure domain rules and calculations, integration tests for server/data boundaries, and Playwright for critical mobile-first workflows. Every phase must run the narrowest relevant checks plus a production build when configuration changes. Record commands and outcomes; never claim an unrun check passed.
