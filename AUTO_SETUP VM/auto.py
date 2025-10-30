#!/usr/bin/env python3
"""
AUTO - Unified CLI Tool
Combines vm, scripts, and monitoring management
"""

import sys
import os
import subprocess
from pathlib import Path
import click
from rich.console import Console
from rich.panel import Panel
from rich.table import Table
from rich import box

# Use Console without emojis for Windows compatibility
console = Console(force_terminal=True, legacy_windows=False)

# Get project root
PROJECT_ROOT = Path(__file__).parent

@click.group()
@click.version_option(version="1.0.0", prog_name="auto")
def cli():
    """
    AUTO - Unified CLI Tool
    
    Manage VMs, Scripts, and Monitoring from one place
    """
    pass


# ============================================================================
# VM Management Commands
# ============================================================================

@cli.group()
def vm():
    """VM SSH Manager - Manage VMs and SSH connections"""
    pass


@vm.command('list')
def vm_list():
    """List all VMs"""
    _run_vm_command(['list'])


@vm.command('add')
@click.option('--name', '-n', help='VM name')
@click.option('--host', '-h', help='IP/Hostname')
@click.option('--user', '-u', help='SSH user')
@click.option('--key', '-k', help='SSH key path')
def vm_add(name, host, user, key):
    """Add new VM"""
    cmd = ['add']
    if name:
        cmd.extend(['-n', name])
    if host:
        cmd.extend(['-h', host])
    if user:
        cmd.extend(['-u', user])
    if key:
        cmd.extend(['-k', key])
    _run_vm_command(cmd)


@vm.command('connect')
@click.argument('vm_identifier')
def vm_connect(vm_identifier):
    """Connect to VM"""
    _run_vm_command(['connect', vm_identifier])


@vm.command('test')
@click.argument('vm_identifier')
def vm_test(vm_identifier):
    """Test VM connection"""
    _run_vm_command(['test', vm_identifier])


@vm.command('remove')
@click.argument('vm_name')
def vm_remove(vm_name):
    """Remove VM"""
    _run_vm_command(['remove', vm_name])


@vm.command('menu')
def vm_menu():
    """Interactive VM menu"""
    _run_vm_command(['menu'])


@vm.command('quick-add')
@click.argument('connection_string', required=False)
def vm_quick_add(connection_string):
    """Quick add VM from connection string (user@host[:port])"""
    if connection_string:
        _run_vm_command(['quick-add', connection_string])
    else:
        _run_vm_command(['quick-add'])


@vm.command('wizard')
def vm_wizard():
    """Interactive setup wizard"""
    _run_vm_command(['wizard'])


@vm.group()
def key():
    """SSH key management"""
    pass


@key.command('generate')
@click.option('--name', '-n', help='Key name')
@click.option('--type', '-t', help='Key type (rsa/ed25519)')
def key_generate(name, type):
    """Generate new SSH key"""
    cmd = ['key', 'generate']
    if name:
        cmd.extend(['--name', name])
    if type:
        cmd.extend(['--type', type])
    _run_vm_command(cmd)


@key.command('list')
def key_list():
    """List SSH keys"""
    _run_vm_command(['key', 'list'])


@key.command('copy')
@click.argument('key_name')
@click.argument('connection_string')
def key_copy(key_name, connection_string):
    """Copy SSH key to server"""
    _run_vm_command(['key', 'copy', key_name, connection_string])


@vm.group()
def batch():
    """Batch operations on multiple VMs"""
    pass


@batch.command('exec')
@click.argument('command')
@click.option('--pattern', '-p', help='VM name pattern (regex)')
@click.option('--parallel', '-P', is_flag=True, help='Run in parallel')
def batch_exec(command, pattern, parallel):
    """Execute command on multiple VMs"""
    cmd = ['batch', 'exec', command]
    if pattern:
        cmd.extend(['--pattern', pattern])
    if parallel:
        cmd.append('--parallel')
    _run_vm_command(cmd)


@batch.command('deploy')
@click.argument('script_path')
@click.option('--dest', '-d', help='Destination path on VMs')
@click.option('--pattern', '-p', help='VM name pattern')
@click.option('--execute', '-x', is_flag=True, help='Execute after deploy')
def batch_deploy(script_path, dest, pattern, execute):
    """Deploy script to multiple VMs"""
    cmd = ['batch', 'deploy', script_path]
    if dest:
        cmd.extend(['--dest', dest])
    if pattern:
        cmd.extend(['--pattern', pattern])
    if execute:
        cmd.append('--execute')
    _run_vm_command(cmd)


def _run_vm_command(args):
    """Run vm-ssh-manager.py with arguments"""
    vm_script = PROJECT_ROOT / 'vm-ssh-manager.py'
    if not vm_script.exists():
        console.print("[red]❌ vm-ssh-manager.py not found![/red]")
        return
    
    cmd = [sys.executable, str(vm_script)] + args
    subprocess.run(cmd)


# ============================================================================
# Script Panel Commands
# ============================================================================

@cli.group()
def scripts():
    """Script Panel - Manage and run scripts"""
    pass


@scripts.command('start')
@click.option('--port', '-p', default=5173, help='Port to run on')
@click.option('--host', '-h', default='127.0.0.1', help='Host to bind to')
def scripts_start(port, host):
    """Start Script Control Panel web server"""
    console.print(f"[cyan]Starting Script Control Panel...[/cyan]")
    console.print(f"[dim]   URL: http://{host}:{port}[/dim]\n")
    
    app_script = PROJECT_ROOT / 'script_panel' / 'app.py'
    if not app_script.exists():
        console.print("[red]❌ script_panel/app.py not found![/red]")
        return
    
    env = os.environ.copy()
    env['HOST'] = host
    env['PORT'] = str(port)
    
    try:
        subprocess.run([sys.executable, str(app_script)], env=env)
    except KeyboardInterrupt:
        console.print("\n[yellow]Script Panel stopped[/yellow]")


@scripts.command('list')
@click.option('--type', '-t', help='Filter by type (.py, .ps1, .sh)')
def scripts_list(type):
    """List all available scripts"""
    from pathlib import Path
    
    SCRIPT_EXTS = {".ps1", ".py", ".sh", ".bat", ".cmd"}
    SKIP_DIRS = {".git", ".venv", "venv", "node_modules", "script_panel"}
    
    scripts = []
    for p in PROJECT_ROOT.rglob("*"):
        if not p.is_file():
            continue
        if p.suffix.lower() not in SCRIPT_EXTS:
            continue
        
        # Skip dirs
        skip = False
        for part in p.relative_to(PROJECT_ROOT).parts:
            if part in SKIP_DIRS:
                skip = True
                break
        if skip:
            continue
        
        if type and p.suffix.lower() != type:
            continue
        
        scripts.append(p)
    
    if not scripts:
        console.print("[yellow]No scripts found[/yellow]")
        return
    
    table = Table(
        title=f"Scripts in {PROJECT_ROOT.name}",
        box=box.ROUNDED,
        show_header=True,
        header_style="bold cyan"
    )
    
    table.add_column("#", style="dim", width=4)
    table.add_column("Name", style="bold green")
    table.add_column("Path", style="cyan")
    table.add_column("Type", justify="center")
    
    for idx, script in enumerate(sorted(scripts), 1):
        table.add_row(
            str(idx),
            script.name,
            str(script.relative_to(PROJECT_ROOT)),
            script.suffix
        )
    
    console.print(table)
    console.print(f"\n[dim]Total: {len(scripts)} scripts[/dim]")
    console.print(f"[dim]Tip: Use 'auto scripts start' to run web interface[/dim]")


# ============================================================================
# Monitoring Commands
# ============================================================================

@cli.group()
def monitor():
    """Monitoring - Check system status"""
    pass


@monitor.command('status')
def monitor_status():
    """Show monitoring dashboard status"""
    console.print("[cyan]Checking monitoring services...[/cyan]\n")
    
    services = [
        'xray',
        'monitoring-dashboard',
        'traffic-monitor',
        'connection-monitor'
    ]
    
    table = Table(box=box.ROUNDED, show_header=True, header_style="bold cyan")
    table.add_column("Service", style="bold")
    table.add_column("Status", justify="center")
    
    for service in services:
        try:
            result = subprocess.run(
                ['systemctl', 'is-active', service],
                capture_output=True,
                text=True
            )
            status = result.stdout.strip()
            
            if status == 'active':
                table.add_row(service, "[green]Active[/green]")
            else:
                table.add_row(service, f"[red]{status}[/red]")
        except FileNotFoundError:
            table.add_row(service, "[yellow]N/A (systemctl not found)[/yellow]")
    
    console.print(table)


@monitor.command('dashboard')
def monitor_dashboard():
    """Open monitoring dashboard info"""
    console.print(Panel(
        "[bold cyan]Monitoring Dashboard[/bold cyan]\n\n"
        "Local:  http://localhost:5000\n"
        "VPS:    http://YOUR_VPS_IP:5000\n\n"
        "[yellow]Login:[/yellow]\n"
        "Username: Ngocduong2509\n"
        "Password: Ngocduong2509\n\n"
        "[dim]To start: sudo bash monitoring/setup-monitoring.sh[/dim]",
        border_style="cyan"
    ))


# ============================================================================
# Info & Help Commands
# ============================================================================

@cli.command()
def info():
    """Show project information"""
    console.print(Panel.fit(
        "[bold cyan]AUTO Project[/bold cyan]\n\n"
        "[bold]Components:[/bold]\n"
        "  * VM SSH Manager     - Manage VMs & SSH\n"
        "  * Script Panel       - Web-based script runner\n"
        "  * Monitoring         - Xray VPS monitoring\n\n"
        "[bold]Quick Commands:[/bold]\n"
        "  auto vm list          - List VMs\n"
        "  auto scripts start    - Start web UI\n"
        "  auto monitor status   - Check services\n"
        "  auto --help           - Show all commands\n\n"
        "[dim]Docs: README.md, script_panel/README.md, VM-SSH-MANAGER-GUIDE.md[/dim]",
        border_style="cyan"
    ))


@cli.command()
def docs():
    """Show documentation paths"""
    docs = [
        ("README.md", "Main project documentation"),
        ("script_panel/README.md", "Script Panel guide"),
        ("VM-SSH-MANAGER-GUIDE.md", "VM Manager complete guide"),
        ("QUICK-START-VM-MANAGER.md", "VM Manager quick start"),
        ("IMPROVEMENTS-SUMMARY.md", "Recent improvements summary"),
    ]
    
    table = Table(
        title="Documentation",
        box=box.ROUNDED,
        show_header=True,
        header_style="bold cyan"
    )
    
    table.add_column("File", style="bold green")
    table.add_column("Description", style="cyan")
    table.add_column("Exists", justify="center")
    
    for doc_path, desc in docs:
        exists = (PROJECT_ROOT / doc_path).exists()
        status = "[green]OK[/green]" if exists else "[red]MISSING[/red]"
        table.add_row(doc_path, desc, status)
    
    console.print(table)


@cli.command()
def setup():
    """Show setup instructions"""
    console.print(Panel(
        "[bold cyan]Setup Instructions[/bold cyan]\n\n"
        "[bold]1. VM SSH Manager:[/bold]\n"
        "   [yellow]Windows:[/yellow]  .\\setup-vm-manager.ps1\n"
        "   [yellow]Linux/Mac:[/yellow] ./setup-vm-manager.sh && source ~/.bashrc\n\n"
        "[bold]2. Script Panel:[/bold]\n"
        "   cd script_panel\n"
        "   pip install -r requirements.txt\n"
        "   python app.py\n\n"
        "[bold]3. Monitoring (on VPS):[/bold]\n"
        "   sudo bash monitoring/setup-monitoring.sh\n\n"
        "[dim]Then use: auto vm list, auto scripts start, etc.[/dim]",
        border_style="cyan"
    ))


# ============================================================================
# Quick Actions
# ============================================================================

@cli.command()
def quick():
    """Quick action menu"""
    console.print(Panel.fit(
        "[bold cyan]Quick Actions[/bold cyan]\n\n"
        "[bold]Choose an action:[/bold]\n"
        "  1. Start Script Panel (web UI)\n"
        "  2. List VMs\n"
        "  3. VM Interactive Menu\n"
        "  4. Check Monitoring Status\n"
        "  5. Show All Scripts\n"
        "  6. Project Info\n"
        "  7. Show Examples\n"
        "  8. Quick Reference\n"
        "  0. Exit\n",
        border_style="cyan"
    ))
    
    from rich.prompt import Prompt
    
    choice = Prompt.ask("Select", choices=['0', '1', '2', '3', '4', '5', '6', '7', '8'], default='0')
    
    if choice == '1':
        scripts_start.callback(port=5173, host='127.0.0.1')
    elif choice == '2':
        _run_vm_command(['list'])
    elif choice == '3':
        _run_vm_command(['menu'])
    elif choice == '4':
        monitor_status.callback()
    elif choice == '5':
        scripts_list.callback(type=None)
    elif choice == '6':
        info.callback()
    elif choice == '7':
        examples.callback()
    elif choice == '8':
        reference.callback()
    else:
        console.print("[yellow]Goodbye![/yellow]")


@cli.command()
def examples():
    """Show real-world examples with syntax highlighting"""
    try:
        from cli_helpers import print_examples
        print_examples()
    except ImportError:
        console.print("[yellow]Examples feature requires cli_helpers module[/yellow]")
        console.print("\n[bold cyan]Example 1: Setup New VPS[/bold cyan]")
        console.print("```bash\nvm wizard\nvm connect 1\nvm batch deploy setup.sh --execute\n```")


@cli.command()
def reference():
    """Show quick reference card"""
    try:
        from cli_helpers import print_quick_reference
        print_quick_reference()
    except ImportError:
        console.print("[yellow]Reference feature requires cli_helpers module[/yellow]")
        console.print("\n[bold]Quick Commands:[/bold]")
        console.print("  vm wizard - Interactive setup")
        console.print("  vm quick-add user@host - Quick add VM")
        console.print("  vm list - List all VMs")


@cli.command()
def guide():
    """Show interactive setup guide"""
    try:
        from cli_helpers import print_setup_guide
        print_setup_guide()
    except ImportError:
        console.print("[yellow]Guide feature requires cli_helpers module[/yellow]")
        console.print("\n[bold]Setup Steps:[/bold]")
        console.print("1. Run setup script")
        console.print("2. Add VM with wizard")
        console.print("3. Start using!")


if __name__ == '__main__':
    # Show info if no args
    if len(sys.argv) == 1:
        info.callback()
        console.print("\n[dim]Type 'auto --help' for all commands[/dim]")
        console.print("[dim]Type 'auto quick' for quick actions menu[/dim]\n")
    else:
        cli()

