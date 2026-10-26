# docs-drift template

A small, dependency-free guard that stops documentation from contradicting the code and the current facts
(retired names, outdated version numbers, concrete image digests, dead health URLs). It is repo-independent:
all repo knowledge lives in one rules file; the script and workflow are copied 1:1.

## Install (5 minutes)

```sh
mkdir -p tools .github/workflows
cp docs/templates/docs-drift/docs-drift.sh tools/docs-drift.sh && chmod +x tools/docs-drift.sh
cp docs/templates/docs-drift/docs-drift.yml .github/workflows/docs-drift.yml
cp docs/templates/docs-drift/docs-drift-rules.example.txt .github/docs-drift-rules.txt
bash tools/docs-drift.sh        # exit 0 = clean, 1 = hits (file:line: reason), 2 = config error
```

Then pin the `actions/checkout` line in the workflow to the full commit SHA you use elsewhere.

## What you adapt (only the rules file)

| Point | Where | Notes |
|---|---|---|
| Which docs are checked | `@files <glob> ...` | Bash globstar, repeatable. Default: `AGENTS.md MEMORY.md README*.md CLAUDE.md .github/copilot-instructions.md .cursor/rules/** .grok/**`. |
| Against which facts | one rule per line: `regex<TAB>reason[<TAB>allow-regex[<TAB>file-regex]]` | A hit is a line matching `regex` (POSIX ERE, case-sensitive: use `[0-9]`, not `\d`). Write the rule for the WRONG statement (old name, old version, banned wording). TABs, not spaces. |
| Allowed history | `@allow <regex>` (global) or the third column (per rule) | Dated or "formerly/renamed/superseded" lines should not trigger. Third column `!` = no allow at all; `-` = none. |
| Limit a rule to files | fourth column, a path regex | e.g. `^AGENTS\.md$`. |
| Live check | `@health-url <url>` | Must answer HTTP 200, otherwise it is reported as a hit. |
| Case | `@ignorecase` | Applies to all rules. |

Code-derived rules (for example "docs must name the same runtime as `package.json`/the `.toc`") are best written
as one regex per superseded value; when a value changes, add the old value as a new rule in the same commit.

## Fail vs. warn mode (repository variable `DOCS_DRIFT_MODE`)

| Mode | Runs | On hits |
|---|---|---|
| `issue` (default) | weekly + manual | creates/updates ONE open issue "Docs-Drift", closes it when clean; the run stays green |
| `warn` | every push/PR + weekly | `::warning` annotations, run stays green |
| `fail` | every push/PR + weekly | the run fails |

Start with `issue` or `warn`, tune false positives with `@allow`, then switch to `fail`.
Config or usage errors (exit code 2: missing rules file, unknown directive, rule without TAB) always fail the run.
Optional variable `DOCS_DRIFT_ASSIGNEE` assigns the issue to a GitHub user.

## Notes

- Needs only bash, grep and (for `@health-url`) curl; no network otherwise, no third-party actions besides checkout.
- Permissions: `contents: read`, `issues: write` (issue mode only).
- The unit test `tests/unit/docsDriftTemplate.test.ts` in the origin repo runs the script against a temp repo
  (hit, allow, scope, clean, config error); copy it if you want the same guard.
