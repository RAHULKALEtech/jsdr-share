---
name: Preview layout centering
description: A layout lesson from validating responsive UI in the Replit preview.
---

Shared content wrappers should declare an explicit responsive width with side
gutters and `margin-inline: auto`, rather than relying only on utility classes
for centering.

**Why:** Preview screenshots showed the app's max-width wrappers rendering
flush to the left even though they used auto-margin utilities. The explicit
width rule kept the receiver and home surfaces centered across the validated
preview.

**How to apply:** Use the shared page wrapper rule for new primary screens and
keep the narrow-screen gutter smaller through a media query.