"""
CLI Helper Functions
Provides pretty printing with syntax highlighting for code examples
"""

from rich.console import Console
from rich.syntax import Syntax
from rich.panel import Panel
from rich.markdown import Markdown
from rich import box

console = Console(force_terminal=True, legacy_windows=False)


def print_code_example(code, language="bash", title=None):
    """Print code example with syntax highlighting"""
    syntax = Syntax(code, language, theme="monokai", line_numbers=False, word_wrap=True)
    
    if title:
        console.print(Panel(syntax, title=title, border_style="cyan", box=box.ROUNDED))
    else:
        console.print(syntax)


def print_command_help(command, description, examples):
    """Print command help with formatted examples"""
    console.print(f"\n[bold cyan]{command}[/bold cyan]")
    console.print(f"[dim]{description}[/dim]\n")
    
    for example in examples:
        if isinstance(example, dict):
            console.print(f"[yellow]{example['desc']}:[/yellow]")
            print_code_example(example['code'], example.get('lang', 'bash'))
            console.print()
        else:
            print_code_example(example)
            console.print()


def print_setup_guide():
    """Print formatted setup guide"""
    console.print("\n[bold cyan]Setup Guide[/bold cyan]\n")
    
    console.print("[bold]Step 1: Setup VM Manager[/bold]\n")
    console.print("[yellow]Windows:[/yellow]")
    print_code_example("cd E:\\AUTO\n.\\setup-vm-manager.ps1", "powershell")
    
    console.print("\n[yellow]Linux/Mac:[/yellow]")
    print_code_example("cd ~/AUTO\nchmod +x setup-vm-manager.sh\n./setup-vm-manager.sh\nsource ~/.bashrc", "bash")
    
    console.print("\n[bold]Step 2: Add First VM[/bold]\n")
    console.print("[yellow]Option 1: Wizard (Easiest)[/yellow]")
    print_code_example("python auto.py vm wizard", "bash")
    
    console.print("\n[yellow]Option 2: Quick Add[/yellow]")
    print_code_example("python auto.py vm quick-add root@1.2.3.4", "bash")
    
    console.print("\n[bold]Step 3: Start Using[/bold]\n")
    print_code_example("# Connect to VM\npython auto.py vm connect 1\n\n# Or start web UI\npython auto.py scripts start", "bash")


def print_examples():
    """Print real-world examples"""
    console.print("\n[bold cyan]Real-World Examples[/bold cyan]\n")
    
    # Example 1
    console.print("[bold green]Example 1: Setup New VPS[/bold green]")
    example1 = """# Run wizard
vm wizard
# Follow prompts
# Generate SSH key
# Copy to server
# Test connection

# Connect
vm connect 1

# Deploy
vm batch deploy setup.sh --execute"""
    
    print_code_example(example1, "bash")
    console.print()
    
    # Example 2
    console.print("[bold green]Example 2: Manage Multiple Servers[/bold green]")
    example2 = """# Generate shared key
vm key generate --name prod-servers

# Copy to all servers
vm key copy prod-servers root@server1.com
vm key copy prod-servers root@server2.com
vm key copy prod-servers root@server3.com

# Quick add all
vm quick-add root@server1.com
vm quick-add root@server2.com
vm quick-add root@server3.com

# Deploy to all
vm batch deploy update.sh --execute --parallel"""
    
    print_code_example(example2, "bash")
    console.print()
    
    # Example 3
    console.print("[bold green]Example 3: Health Check[/bold green]")
    example3 = """# Check all servers
vm batch exec "systemctl status xray" --parallel

# Check disk space
vm batch exec "df -h" --parallel

# Check memory
vm batch exec "free -m" --parallel"""
    
    print_code_example(example3, "bash")


def print_quick_reference():
    """Print quick reference card"""
    console.print("\n[bold cyan]Quick Reference[/bold cyan]\n")
    
    commands = [
        {
            "cmd": "vm wizard",
            "desc": "Interactive setup (easiest)",
            "example": "vm wizard"
        },
        {
            "cmd": "vm quick-add",
            "desc": "Quick add VM from connection string",
            "example": "vm quick-add root@1.2.3.4"
        },
        {
            "cmd": "vm list",
            "desc": "List all VMs",
            "example": "vm list"
        },
        {
            "cmd": "vm connect",
            "desc": "Connect to VM",
            "example": "vm connect server-1"
        },
        {
            "cmd": "vm key generate",
            "desc": "Generate SSH key",
            "example": "vm key generate --type ed25519"
        },
        {
            "cmd": "vm batch exec",
            "desc": "Execute on multiple VMs",
            "example": "vm batch exec \"uptime\" --parallel"
        },
        {
            "cmd": "vm batch deploy",
            "desc": "Deploy to multiple VMs",
            "example": "vm batch deploy script.sh --execute"
        },
    ]
    
    from rich.table import Table
    
    table = Table(box=box.ROUNDED, show_header=True, header_style="bold cyan")
    table.add_column("Command", style="bold green", width=20)
    table.add_column("Description", style="cyan", width=30)
    table.add_column("Example", style="yellow", width=40)
    
    for cmd in commands:
        table.add_row(cmd["cmd"], cmd["desc"], cmd["example"])
    
    console.print(table)


if __name__ == "__main__":
    # Test
    print_setup_guide()
    print()
    print_examples()
    print()
    print_quick_reference()

