#!/usr/bin/env python3
"""Static checks for .github/workflows/dependabot-automerge.yml (no network).

Pins the token rights (OpenSSF Scorecard Token-Permissions) and the merge logic:
  - top-level `permissions: {}`; every job declares its own; the only writes are the minimum below,
  - only the pull_request_target trigger (no workflow_run fallback, no checkout of PR code),
  - every job runs for `dependabot[bot]` PRs only,
  - auto-merge only for semver patch/minor (never major), only via `gh pr merge --auto`
    (GitHub then waits for all required checks; there is no immediate merge),
  - every action is pinned to a 40-char commit SHA.
Exit 0 = all checks pass. Needs python3 + PyYAML.
"""
import re
import sys
from pathlib import Path

import yaml

path = Path(__file__).resolve().parent.parent / ".github/workflows/dependabot-automerge.yml"
text = path.read_text()
wf = yaml.safe_load(text)
fails = 0


def check(name, ok):
    global fails
    print(("ok   " if ok else "FAIL ") + name)
    if not ok:
        fails += 1


MINIMUM = {
    "enable": {"contents": "write", "pull-requests": "write", "issues": "write"},
    "post-merge-dispatch": {"actions": "write"},
}
triggers = wf.get(True, wf.get("on"))  # PyYAML reads the key `on` as True
jobs = wf["jobs"]

check("top-level permissions is {}", wf.get("permissions") == {})
check("only the pull_request_target trigger", list(triggers) == ["pull_request_target"])
check("jobs are exactly " + ", ".join(MINIMUM), set(jobs) == set(MINIMUM))
for name, job in jobs.items():
    check(f"{name}: permissions are exactly the minimum", job.get("permissions") == MINIMUM.get(name))
    cond = str(job.get("if", ""))
    check(f"{name}: runs for dependabot[bot] PRs only", "github.event.pull_request.user.login == 'dependabot[bot]'" in cond)
    check(f"{name}: no checkout of PR code", not any("checkout" in str(s.get("uses", "")) for s in job["steps"]))
    for step in job["steps"]:
        uses = step.get("uses")
        if uses:
            check(f"{name}: {uses.split('@')[0]} pinned to a commit sha", bool(re.fullmatch(r".+@[0-9a-f]{40}", uses)))

enable = jobs["enable"]
check("enable: not on the closed event", "github.event.action != 'closed'" in str(enable["if"]))
guarded = [s for s in enable["steps"] if "gh pr merge" in s.get("run", "") or "gh pr edit" in s.get("run", "")]
check("enable: label + auto-merge steps exist", len(guarded) == 2)
for s in guarded:
    cond = str(s.get("if", ""))
    check(f"enable: '{s['name']}' only for semver patch/minor, never major",
          "semver-patch" in cond and "semver-minor" in cond and "semver-major" not in cond)
merges = re.findall(r"gh pr merge[^\n]*", text)
check("every `gh pr merge` uses --auto (waits for required checks)", bool(merges) and all("--auto" in m for m in merges))
check("auto-merge is skipped unless allow_auto_merge and required checks exist",
      "allow_auto_merge" in text and "required_status_checks" in text and "exit 0" in text)

dispatch = jobs["post-merge-dispatch"]["if"]
check("dispatch: only after a merged PR", "merged == true" in str(dispatch) and "action == 'closed'" in str(dispatch))

sys.exit(1 if fails else 0)
