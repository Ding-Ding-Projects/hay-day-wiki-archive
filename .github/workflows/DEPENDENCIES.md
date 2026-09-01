# Build dependency inventory

The `pages-release.yml` workflow uses the following pinned or manifest-derived inputs:

| Job | Tool or action | Version source | Purpose |
| --- | --- | --- | --- |
| `build` | Ubuntu 24.04 | Workflow label | Static build host |
| `build` | `actions/checkout` | `v4` | Source checkout |
| `build` | `actions/setup-node` | `v4` | Node.js runtime from `package.json` engines |
| `build` | Node.js and npm | `package.json` and lockfile | Vinext build and prerender |
| `build` | `actions/upload-pages-artifact` | `v3` | Pages bundle transfer |
| `build` | `actions/upload-artifact` | `v4` | Release input archive |
| `deploy` | Ubuntu 24.04 | Workflow label | Pages publication host |
| `deploy` | `actions/deploy-pages` | `v4` | Pages publication |
| `release` | Ubuntu 24.04 | Workflow label | Release host |
| `release` | `actions/download-artifact` | `v4` | Release input retrieval |
| `release` | GNU tar | Ubuntu image | Static bundle archive |
| `release` | GitHub CLI | Ubuntu image | Release publication |

The project dependency set is installed with `npm ci --no-audit --no-fund`, which verifies the
committed `package-lock.json`. The workflow intentionally contains no test, lint, type-check,
accessibility, or screenshot job. The static output check runs as part of the build publication
path and only validates route and size invariants.
