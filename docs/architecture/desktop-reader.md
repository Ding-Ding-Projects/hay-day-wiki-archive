# Desktop reader architecture

## Behavior

The Windows desktop reader bundles the generated `dist/pages` archive and opens it in a frameless application window with a custom title bar. The title bar exposes working minimize, maximize or restore, and close controls through a narrow preload bridge. Internal archive links remain inside the reader. Approved HTTPS source and attribution links open in the operating system browser.

## Local serving boundary

The main process starts a server on an ephemeral loopback-only port. The first request carries a random launch-specific value and receives an HttpOnly, SameSite session cookie. Later requests require that cookie. Paths are decoded once, checked for traversal and separators, resolved beneath the packaged archive root, and limited to `GET` and `HEAD`.

Responses disable MIME sniffing, disable caching, and apply a restrictive content security policy. The renderer has context isolation and sandboxing enabled, Node.js integration disabled, developer tools disabled, and an in-memory partition.

## Packaging

`build.bat /s` builds and verifies the static archive, then creates an unpacked desktop application. `build-installer.bat /s` creates genuine Squirrel.Windows output and validates `Setup.exe`, `RELEASES`, and the full NuGet package. The verifier recalculates the `RELEASES` SHA-1 and byte count, calculates the setup SHA-256, and directly inspects the PE certificate table.

Code signing is permanently disabled. The generated installer is unsigned and may trigger an unknown-publisher or SmartScreen warning.

## Failure modes

- A missing static archive stops the build before packaging.
- A request without the launch session cookie receives 404.
- A traversal path receives 404.
- An unapproved external host is not opened.
- Missing Squirrel.Windows files, an invalid `RELEASES` row, a digest mismatch, or a PE certificate table fails package verification.
- If the required headless service is unavailable, built-interface interaction remains unverified and must not be inferred from source or package checks.

## Verification

Focused tests exercise session establishment, authenticated home and article requests, malformed-cookie refusal, unauthorized requests, traversal and symlink rejection, content security policy, renderer isolation settings, approved external navigation wiring, and explicit signing controls. Package verification reads the real generated files and inspects the packaged main and preload code.

The packaged runtime was launched on an isolated hidden desktop at commit `f2f8df109084f6985785c01125eced55647a9c88`. The verified flow rendered Home, activated All articles, rendered all 1,362 rows, opened the first article, displayed attribution, maximized and restored the custom title bar, and reported no body overflow, runtime exception, error log, failed request, or HTTP error response.

## Suggested articles

- [Reader architecture](reader-architecture.md)
- [Verification plan](../verification/verification-plan.md)
- [Security checks](../verification/security-checks.md)
