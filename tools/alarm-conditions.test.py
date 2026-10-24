#!/usr/bin/env python3
"""Dry-run of the `if:` conditions and wiring of the six failure-alarm callers (no network, no webhook).

For every workflow that has an `alarm` job: evaluates its `if:` for a set of (event, ref, upstream-failed)
scenarios with a tiny evaluator for the subset of GitHub expressions used here, and checks that
  - a failure on main fires for each trigger the workflow really has (push, schedule, workflow_run),
  - nothing fires on pull requests, on other branches or when nothing failed,
  - `needs` lists every other job of the workflow (a failing job outside `needs` would never alarm),
  - the caller grants `actions: read` + `contents: read` (the reusable workflow asks for both, otherwise the
    run fails at startup), uses ./.github/workflows/failure-alarm.yml and passes both secrets explicitly.
Exit 0 = all checks pass. Needs python3 + PyYAML.
"""
import re
import sys
from pathlib import Path

import yaml

ROOT = Path(__file__).resolve().parent.parent
WORKFLOWS = ["build", "codeql", "docker", "drift", "post-deploy-smoke", "quality"]
fails = 0


def check(name, ok):
    global fails
    print(("ok   " if ok else "FAIL ") + name)
    if not ok:
        fails += 1


def evaluate(expr, event, ref, failed):
    """Evaluate failure() / github.event_name / github.ref comparisons joined by && and ||."""
    e = expr.strip()
    m = re.fullmatch(r"\$\{\{(.*)\}\}", e, re.S)
    if m:
        e = m.group(1).strip()
    if not re.fullmatch(r"[\w\s.()'=&|/!-]+", e):
        raise ValueError(f"unsupported expression: {expr}")
    py = e.replace("&&", " and ").replace("||", " or ")
    py = re.sub(r"\bfailure\(\)", "FAILED", py)
    py = py.replace("github.event_name", "EVENT").replace("github.ref", "REF")
    return bool(eval(py, {"__builtins__": {}}, {"FAILED": failed, "EVENT": event, "REF": ref}))  # noqa: S307


for name in WORKFLOWS:
    data = yaml.safe_load((ROOT / ".github/workflows" / f"{name}.yml").read_text())
    on = data.get(True) or data.get("on")  # PyYAML parses a bare `on:` key as boolean True
    jobs = data["jobs"]
    alarm = jobs.get("alarm")
    check(f"{name}: has an alarm job", alarm is not None)
    if alarm is None:
        continue
    cond = alarm.get("if", "")
    # Triggers that run on main. workflow_run runs get github.ref = default branch.
    fires_on_main = {
        "push": "push" in on,
        "schedule": "schedule" in on,
        "workflow_run": "workflow_run" in on,
    }
    for event, expected in fires_on_main.items():
        if not expected:
            continue
        check(f"{name}: {event} failure on main fires", evaluate(cond, event, "refs/heads/main", True))
        check(f"{name}: {event} success on main stays quiet", not evaluate(cond, event, "refs/heads/main", False))
    check(f"{name}: pull_request failure stays quiet", not evaluate(cond, "pull_request", "refs/pull/1/merge", True))
    check(f"{name}: push failure on another branch stays quiet", not evaluate(cond, "push", "refs/heads/feature", True))
    check(f"{name}: tag failure stays quiet (main only)", not evaluate(cond, "push", "refs/tags/v1.0.0", True))

    needs = set(alarm.get("needs") or [])
    others = {j for j in jobs if j != "alarm"}
    check(f"{name}: needs covers every job ({sorted(others)})", needs == others)
    perms = alarm.get("permissions") or {}
    check(f"{name}: caller grants actions: read and contents: read", perms.get("actions") == "read" and perms.get("contents") == "read")
    check(f"{name}: uses the reusable workflow", alarm.get("uses") == "./.github/workflows/failure-alarm.yml")
    secrets = alarm.get("secrets") or {}
    check(f"{name}: both secrets passed explicitly", set(secrets) == {"ESCALATION_WEBHOOK_URL", "ESCALATION_BEARER"})
    if name == "post-deploy-smoke":
        check("post-deploy-smoke: passes the docker run's head_sha", "workflow_run.head_sha" in str((alarm.get("with") or {}).get("commit_sha", "")))

reusable = yaml.safe_load((ROOT / ".github/workflows/failure-alarm.yml").read_text())
rperms = reusable["jobs"]["alarm"]["permissions"]
check("failure-alarm.yml: job permissions are within what callers grant", set(rperms.items()) <= {("actions", "read"), ("contents", "read")})

print("alarm-conditions: all checks passed" if fails == 0 else f"alarm-conditions: {fails} check(s) failed")
sys.exit(1 if fails else 0)
