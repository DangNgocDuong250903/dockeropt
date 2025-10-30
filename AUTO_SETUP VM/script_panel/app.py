from __future__ import annotations

import os
import sys
import threading
import time
import uuid
import json
from pathlib import Path
from typing import Dict, List, Optional

from flask import Flask, redirect, render_template, request, send_file, url_for, abort, jsonify

# Base directory to scan scripts from (one level above this file by default)
BASE_DIR = Path(__file__).resolve().parents[1]
APP_DIR = Path(__file__).resolve().parent
LOG_DIR = APP_DIR / "logs"
LOG_DIR.mkdir(parents=True, exist_ok=True)

# In-memory run registry (best-effort; logs are the source of truth)
runs: Dict[str, Dict] = {}

app = Flask(__name__, template_folder=str(APP_DIR / "templates"), static_folder=str(APP_DIR / "static"))

# --- Script discovery -------------------------------------------------------
SKIP_DIRS = {".git", ".venv", "venv", "node_modules", APP_DIR.name}
SCRIPT_EXTS = {".ps1", ".py", ".sh", ".bat", ".cmd"}


def is_in_skip_dir(path: Path) -> bool:
    for part in path.parts:
        if part in SKIP_DIRS:
            return True
    return False


def discover_scripts(base_dir: Path) -> List[Dict]:
    scripts: List[Dict] = []
    for p in base_dir.rglob("*"):
        if not p.is_file():
            continue
        if p.suffix.lower() not in SCRIPT_EXTS:
            continue
        if is_in_skip_dir(p.relative_to(base_dir)):
            continue
        scripts.append(
            {
                "name": p.name,
                "ext": p.suffix.lower(),
                "path": str(p),
                "relpath": str(p.relative_to(base_dir)),
                "mtime": p.stat().st_mtime,
            }
        )
    # Sort by folder then name
    scripts.sort(key=lambda x: (x["relpath"].lower()))
    return scripts


# --- Command resolution -----------------------------------------------------

def _which(cmd: str) -> Optional[str]:
    from shutil import which

    return which(cmd)


def windows() -> bool:
    return os.name == "nt"


def resolve_command_for_script(path: Path) -> List[str]:
    ext = path.suffix.lower()
    if ext == ".py":
        return [sys.executable, str(path)]
    if ext in {".bat", ".cmd"}:
        return ["cmd.exe", "/c", str(path)]
    if ext == ".ps1":
        # Use PowerShell 7+ if available, fallback to Windows PowerShell
        pwsh = _which("pwsh") or _which("powershell") or "powershell"
        return [pwsh, "-ExecutionPolicy", "Bypass", "-File", str(path)]
    if ext == ".sh":
        # Try WSL, then Git Bash, then bash in PATH
        if windows() and _which("wsl.exe"):
            # Best effort: call via WSL's bash; convert path using wslpath
            return [
                "wsl.exe",
                "bash",
                "-lc",
                # Convert Windows path to WSL path inline
                f"bash \"$($(wslpath -a '{str(path)}'))\"",
            ]
        git_bash = Path(r"C:\Program Files\Git\bin\bash.exe")
        if git_bash.exists():
            return [str(git_bash), "-lc", f"bash '{str(path)}'"]
        bash = _which("bash")
        if bash:
            return [bash, str(path)]
        # As last resort, try sh
        sh = _which("sh")
        if sh:
            return [sh, str(path)]
        raise RuntimeError("No shell found to run .sh scripts. Install WSL or Git Bash.")
    raise RuntimeError(f"Unsupported script type: {ext}")


# --- Runner ----------------------------------------------------------------
import subprocess


def start_run(abs_path: Path) -> str:
    if not abs_path.exists() or not abs_path.is_file():
        raise FileNotFoundError(str(abs_path))
    # Ensure the path is within BASE_DIR
    abs_path = abs_path.resolve()
    if BASE_DIR not in abs_path.parents and abs_path != BASE_DIR:
        raise PermissionError("Path outside base directory")

    run_id = uuid.uuid4().hex[:12]
    log_file = LOG_DIR / f"{run_id}.log"

    cmd = resolve_command_for_script(abs_path)

    runs[run_id] = {
        "path": str(abs_path),
        "cmd": cmd,
        "status": "running",
        "log_file": str(log_file),
        "start": time.time(),
        "end": None,
        "returncode": None,
    }

    def _worker():
        with open(log_file, "w", encoding="utf-8", errors="replace") as lf:
            lf.write(f"# RUN {run_id}\n")
            lf.write(f"# PWD {os.getcwd()}\n")
            lf.write(f"# CMD {' '.join(cmd)}\n\n")
            lf.flush()
            try:
                proc = subprocess.Popen(
                    cmd,
                    stdout=subprocess.PIPE,
                    stderr=subprocess.STDOUT,
                    cwd=str(BASE_DIR),
                    text=True,
                    encoding="utf-8",
                    errors="replace",
                )
                assert proc.stdout is not None
                for line in proc.stdout:
                    lf.write(line)
                    lf.flush()
                rc = proc.wait()
                runs[run_id]["returncode"] = rc
                runs[run_id]["status"] = "success" if rc == 0 else "failed"
            except Exception as e:
                lf.write(f"\n[runner-error] {e}\n")
                runs[run_id]["status"] = "error"
                runs[run_id]["returncode"] = -1
            finally:
                runs[run_id]["end"] = time.time()

    t = threading.Thread(target=_worker, daemon=True)
    t.start()
    return run_id


# --- Routes ----------------------------------------------------------------
@app.route("/")
def index():
    scripts = discover_scripts(BASE_DIR)
    return render_template("index.html", scripts=scripts, base_dir=str(BASE_DIR))


@app.post("/run")
def run_script():
    path = request.form.get("path")
    if not path:
        abort(400, "Missing path")
    abs_path = (BASE_DIR / path).resolve() if not os.path.isabs(path) else Path(path)
    try:
        run_id = start_run(abs_path)
    except Exception as e:
        abort(400, f"Cannot start: {e}")
    return redirect(url_for("view_log", run_id=run_id))


@app.get("/logs")
def list_logs():
    entries = []
    for p in sorted(LOG_DIR.glob("*.log"), key=lambda x: x.stat().st_mtime, reverse=True):
        entries.append({"run_id": p.stem, "mtime": p.stat().st_mtime, "size": p.stat().st_size})
    return render_template("logs.html", entries=entries)


@app.get("/logs/<run_id>")
def view_log(run_id: str):
    log_path = LOG_DIR / f"{run_id}.log"
    if not log_path.exists():
        abort(404)
    meta = runs.get(run_id)
    return render_template("log_view.html", run_id=run_id, meta=meta)


@app.get("/logs/<run_id>/raw")
def log_raw(run_id: str):
    log_path = LOG_DIR / f"{run_id}.log"
    if not log_path.exists():
        abort(404)
    return send_file(log_path, mimetype="text/plain")


# --- VM Integration Routes ------------------------------------------------

def load_vm_config():
    """Load VMs from vm-ssh-manager config"""
    vm_config_path = Path.home() / ".xray-vm-manager" / "config.json"
    if not vm_config_path.exists():
        return None
    
    try:
        with open(vm_config_path, 'r', encoding='utf-8') as f:
            config = json.load(f)
        
        # Get current profile
        current_profile = config.get("current_profile", "default")
        profile = config.get("profiles", {}).get(current_profile, {})
        
        return {
            "profile_name": profile.get("name", current_profile),
            "vms": profile.get("vms", [])
        }
    except Exception as e:
        print(f"Error loading VM config: {e}")
        return None


@app.route("/deploy/<path:script_path>")
def deploy_page(script_path: str):
    """Deploy script to VMs page"""
    abs_path = (BASE_DIR / script_path).resolve()
    if not abs_path.exists() or not abs_path.is_file():
        abort(404, "Script not found")
    
    # Security check
    if BASE_DIR not in abs_path.parents and abs_path.parent != BASE_DIR:
        abort(403, "Path outside base directory")
    
    vm_data = load_vm_config()
    
    script_info = {
        "name": abs_path.name,
        "path": script_path,
        "abs_path": str(abs_path),
        "size": abs_path.stat().st_size,
        "ext": abs_path.suffix
    }
    
    return render_template("deploy.html", 
                         script=script_info,
                         vm_data=vm_data,
                         base_dir=str(BASE_DIR))


@app.post("/api/deploy")
def api_deploy():
    """API endpoint to deploy script to VMs"""
    script_path = request.json.get("script_path")
    vm_names = request.json.get("vm_names", [])
    dest_path = request.json.get("dest_path", "/tmp/deployed_script")
    execute = request.json.get("execute", False)
    
    if not script_path or not vm_names:
        return jsonify({"error": "Missing script_path or vm_names"}), 400
    
    abs_path = (BASE_DIR / script_path).resolve()
    if not abs_path.exists():
        return jsonify({"error": "Script not found"}), 404
    
    # Load VM config
    vm_data = load_vm_config()
    if not vm_data:
        return jsonify({"error": "VM configuration not found"}), 404
    
    # Filter selected VMs
    selected_vms = [vm for vm in vm_data["vms"] if vm["name"] in vm_names]
    
    if not selected_vms:
        return jsonify({"error": "No valid VMs selected"}), 400
    
    # Import paramiko for SSH
    try:
        import paramiko
    except ImportError:
        return jsonify({"error": "paramiko not installed"}), 500
    
    def deploy_to_vm(vm):
        """Deploy script to a single VM"""
        try:
            ssh = paramiko.SSHClient()
            ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
            
            ssh_key_path = vm.get("ssh_key_path")
            if ssh_key_path:
                ssh_key_path = os.path.expanduser(ssh_key_path)
            
            ssh.connect(
                hostname=vm["host"],
                port=vm.get("port", 22),
                username=vm["user"],
                key_filename=ssh_key_path if ssh_key_path else None,
                timeout=15
            )
            
            # Upload file
            sftp = ssh.open_sftp()
            sftp.put(str(abs_path), dest_path)
            sftp.chmod(dest_path, 0o755)
            sftp.close()
            
            output = f"Deployed to {dest_path}"
            
            # Execute if requested
            if execute:
                ext = abs_path.suffix
                if ext == '.sh':
                    exec_cmd = f"bash {dest_path}"
                elif ext == '.py':
                    exec_cmd = f"python3 {dest_path}"
                elif ext == '.ps1':
                    exec_cmd = f"pwsh {dest_path}"
                else:
                    exec_cmd = dest_path
                
                stdin, stdout, stderr = ssh.exec_command(exec_cmd)
                exec_output = stdout.read().decode()
                exec_error = stderr.read().decode()
                exit_code = stdout.channel.recv_exit_status()
                
                output += f"\n\n=== Execution ===\nExit Code: {exit_code}\n\nOutput:\n{exec_output}"
                if exec_error:
                    output += f"\n\nErrors:\n{exec_error}"
            
            ssh.close()
            
            return {
                "vm": vm["name"],
                "host": vm["host"],
                "success": True,
                "output": output
            }
        except Exception as e:
            return {
                "vm": vm["name"],
                "host": vm.get("host", "unknown"),
                "success": False,
                "error": str(e)
            }
    
    # Deploy to all selected VMs (parallel)
    from concurrent.futures import ThreadPoolExecutor, as_completed
    results = []
    
    with ThreadPoolExecutor(max_workers=min(len(selected_vms), 10)) as executor:
        futures = {executor.submit(deploy_to_vm, vm): vm for vm in selected_vms}
        
        for future in as_completed(futures):
            result = future.result()
            results.append(result)
    
    # Count successes
    success_count = sum(1 for r in results if r["success"])
    
    return jsonify({
        "success": True,
        "results": results,
        "summary": {
            "total": len(results),
            "succeeded": success_count,
            "failed": len(results) - success_count
        }
    })


@app.get("/api/vms")
def api_vms():
    """API endpoint to get VMs list"""
    vm_data = load_vm_config()
    if not vm_data:
        return jsonify({"error": "VM configuration not found"}), 404
    
    return jsonify(vm_data)


@app.get("/docs")
def documentation():
    """Documentation page with syntax highlighting"""
    return render_template("docs.html", base_dir=str(BASE_DIR))


if __name__ == "__main__":
    port = int(os.environ.get("PORT", "5173"))
    host = os.environ.get("HOST", "127.0.0.1")
    app.run(host=host, port=port, debug=True)
