---
name: GitHub sync path
description: Durable fallback for syncing repository files when the local Git remote cannot authenticate.
---

When the local Git remote rejects HTTPS authentication, use the attached GitHub connection's authenticated proxy and the repository Contents API instead of requesting or exposing a token. Update files serially, including the current blob SHA for existing files, because concurrent writes to the same branch can conflict.

**Why:** In this workspace, the Git remote had no usable credential helper even after GitHub was securely attached, while the connector API could authenticate repository reads and writes.

**How to apply:** Confirm the target branch first, compare the local changed-file set with the remote, then update each changed file through the authenticated connector with its current SHA. Verify the final remote branch head afterward.