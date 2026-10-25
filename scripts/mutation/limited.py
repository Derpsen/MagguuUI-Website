"""Hard-limited process runner shared by the mutation check and its self-test (no dependency).

Every child starts in its OWN session / process group (start_new_session) under `nice -n 19`. On timeout, and also
after a normal exit (to catch stragglers), the whole group is killed with SIGKILL via killpg, so a runaway node
child (while(true)) can never outlive the run, unlike killing only the wrapper. `leftovers(marker)` lists processes
whose command line still contains a marker (used for the post-run check)."""
import os, signal, subprocess, tempfile, time

def _kill_group(pgid):
    try: os.killpg(pgid, signal.SIGKILL)
    except (ProcessLookupError, PermissionError): pass

def run_limited(cmd, cwd=None, env=None, timeout=90):
    """Run argv list `cmd`; returns (status, returncode, output) with status 'OK' or 'TIMEOUT'.
    Output goes to a temp file (not a pipe) so a background straggler holding the pipe can never block the wait."""
    with tempfile.TemporaryFile() as sink:
        p = subprocess.Popen(['nice', '-n', '19'] + list(cmd), cwd=cwd, env=env, stdin=subprocess.DEVNULL,
                             stdout=sink, stderr=subprocess.STDOUT, start_new_session=True)
        pgid = p.pid  # new session => the child is its own group leader
        try:
            p.wait(timeout=timeout)
            status = 'OK'
        except subprocess.TimeoutExpired:
            _kill_group(pgid)
            status = 'TIMEOUT'
        _kill_group(pgid)  # stragglers of a finished run (grandchildren in the same group)
        try: p.wait(timeout=10)
        except subprocess.TimeoutExpired: pass
        sink.seek(0)
        return status, p.returncode, sink.read().decode('utf8', 'replace')

def leftovers(marker, own_pid=None):
    """PIDs of processes (other than this one) whose cmdline contains `marker`."""
    own = own_pid or os.getpid(); found = []
    for d in os.listdir('/proc'):
        if not d.isdigit() or int(d) == own: continue
        try: line = open(f'/proc/{d}/cmdline', 'rb').read().replace(b'\0', b' ').decode('utf8', 'replace')
        except OSError: continue
        if marker in line: found.append(int(d))
    return found

def kill_leftovers(marker):
    pids = leftovers(marker)
    for pid in pids:
        try: os.kill(pid, signal.SIGKILL)
        except ProcessLookupError: pass
    time.sleep(0.2)
    return pids

def in_dir(path):
    """PIDs of processes whose working directory is inside `path` (catches orphans of a run in a scratch copy)."""
    path = os.path.realpath(path); own = os.getpid(); found = []
    for d in os.listdir('/proc'):
        if not d.isdigit() or int(d) == own: continue
        try: cwd = os.readlink(f'/proc/{d}/cwd')
        except OSError: continue
        if cwd == path or cwd.startswith(path + '/'): found.append(int(d))
    return found

def kill_in_dir(path):
    pids = in_dir(path)
    for pid in pids:
        try: os.kill(pid, signal.SIGKILL)
        except ProcessLookupError: pass
    time.sleep(0.2)
    return pids
