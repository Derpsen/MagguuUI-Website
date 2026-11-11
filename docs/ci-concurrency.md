# CI concurrency and expensive jobs

Audit item J: keep the Actions queue small, and never abort a GHCR publish.

## Docker publish

`.github/workflows/docker.yml` uses `concurrency.group: docker-${{ github.ref }}` with
`cancel-in-progress: false`. A second push to `main` (or the same `v*.*.*` tag)
waits for the in-progress verify / e2e / build-and-push to finish, then runs
and publishes its own SHA. Intermediate commits are not skipped mid-sign.

## Expensive advisory jobs on feature branches

These run on feature branches **only as `pull_request`**, never on a branch push:

| Workflow | Feature branches | `main` |
|---|---|---|
| `lighthouse.yml` | PR to `main` (path-filtered) | weekly schedule + dispatch |
| `link-check.yml` | PR (path-filtered) | dispatch |
| `quality.yml` | PR | push to `main` + dispatch |

They keep `cancel-in-progress: true` on a per-ref group so a newer commit on
the same PR or on `main` cancels the superseded advisory run. That must not be
copied onto `docker.yml`.

Guarded by `tests/unit/ciWorkflows.test.ts`.
