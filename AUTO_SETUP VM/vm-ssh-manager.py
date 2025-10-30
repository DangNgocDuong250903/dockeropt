#!/usr/bin/env python3
"""
VM SSH Manager - Quản lý kết nối SSH đến các VM
Với giao diện CLI đẹp, không cần cấu hình lại khi chuyển máy
"""

import os
import sys
import json
import subprocess
import platform
from pathlib import Path
from datetime import datetime
import click
from rich.console import Console
from rich.table import Table
from rich.panel import Panel
from rich.prompt import Prompt, Confirm
from rich.progress import Progress, SpinnerColumn, TextColumn
from rich.syntax import Syntax
from rich import box
import paramiko

console = Console()

# Config directory
CONFIG_DIR = Path.home() / ".xray-vm-manager"
CONFIG_FILE = CONFIG_DIR / "config.json"
SSH_KEYS_DIR = CONFIG_DIR / "ssh_keys"


class VMSSHManager:
    """Quản lý VM và SSH connections"""
    
    def __init__(self):
        self.config_dir = CONFIG_DIR
        self.config_file = CONFIG_FILE
        self.ssh_keys_dir = SSH_KEYS_DIR
        self.config = self.load_config()
    
    def init_config(self):
        """Khởi tạo config directory"""
        self.config_dir.mkdir(parents=True, exist_ok=True)
        self.ssh_keys_dir.mkdir(parents=True, exist_ok=True)
        
        if not self.config_file.exists():
            default_config = {
                "version": "1.0",
                "created_at": datetime.now().isoformat(),
                "current_profile": "default",
                "profiles": {
                    "default": {
                        "name": "Default Profile",
                        "vms": []
                    }
                }
            }
            self.save_config(default_config)
            return default_config
        return self.load_config()
    
    def load_config(self):
        """Load config từ file"""
        if not self.config_file.exists():
            return self.init_config()
        
        try:
            with open(self.config_file, 'r', encoding='utf-8') as f:
                return json.load(f)
        except Exception as e:
            console.print(f"[red]❌ Lỗi load config: {e}[/red]")
            return self.init_config()
    
    def save_config(self, config=None):
        """Save config to file"""
        if config is None:
            config = self.config
        
        try:
            with open(self.config_file, 'w', encoding='utf-8') as f:
                json.dump(config, f, indent=2, ensure_ascii=False)
            return True
        except Exception as e:
            console.print(f"[red]❌ Lỗi save config: {e}[/red]")
            return False
    
    def get_current_profile(self):
        """Lấy profile hiện tại"""
        profile_name = self.config.get("current_profile", "default")
        return self.config["profiles"].get(profile_name, {})
    
    def add_vm(self, name, host, user, ssh_key_path=None, port=22, description=""):
        """Thêm VM mới vào profile hiện tại"""
        profile = self.get_current_profile()
        
        # Check if VM already exists
        for vm in profile.get("vms", []):
            if vm["name"] == name:
                console.print(f"[yellow]⚠️  VM '{name}' đã tồn tại![/yellow]")
                return False
        
        # Add VM
        vm_config = {
            "name": name,
            "host": host,
            "user": user,
            "port": port,
            "ssh_key_path": ssh_key_path,
            "description": description,
            "added_at": datetime.now().isoformat(),
            "last_connected": None
        }
        
        if "vms" not in profile:
            profile["vms"] = []
        
        profile["vms"].append(vm_config)
        
        # Save config
        profile_name = self.config["current_profile"]
        self.config["profiles"][profile_name] = profile
        self.save_config()
        
        console.print(f"[green]✅ Đã thêm VM '{name}' thành công![/green]")
        return True
    
    def list_vms(self):
        """Liệt kê tất cả VMs trong profile hiện tại"""
        profile = self.get_current_profile()
        vms = profile.get("vms", [])
        
        if not vms:
            console.print("[yellow]⚠️  Chưa có VM nào. Dùng lệnh 'add' để thêm VM.[/yellow]")
            return []
        
        table = Table(
            title=f"🖥️  VMs trong Profile: {profile.get('name', 'Default')}",
            box=box.ROUNDED,
            show_header=True,
            header_style="bold cyan"
        )
        
        table.add_column("#", style="dim", width=3)
        table.add_column("Tên", style="bold green")
        table.add_column("Host", style="cyan")
        table.add_column("User", style="yellow")
        table.add_column("Port", justify="center")
        table.add_column("SSH Key", style="dim")
        table.add_column("Mô tả", style="white")
        
        for idx, vm in enumerate(vms, 1):
            ssh_key = vm.get("ssh_key_path", "N/A")
            if ssh_key and len(ssh_key) > 20:
                ssh_key = "..." + ssh_key[-20:]
            
            table.add_row(
                str(idx),
                vm["name"],
                vm["host"],
                vm["user"],
                str(vm.get("port", 22)),
                ssh_key,
                vm.get("description", "")
            )
        
        console.print(table)
        return vms
    
    def get_vm_by_name(self, name):
        """Lấy thông tin VM theo tên"""
        profile = self.get_current_profile()
        for vm in profile.get("vms", []):
            if vm["name"] == name:
                return vm
        return None
    
    def get_vm_by_index(self, index):
        """Lấy VM theo index (1-based)"""
        profile = self.get_current_profile()
        vms = profile.get("vms", [])
        if 1 <= index <= len(vms):
            return vms[index - 1]
        return None
    
    def remove_vm(self, name):
        """Xóa VM khỏi profile"""
        profile = self.get_current_profile()
        vms = profile.get("vms", [])
        
        for i, vm in enumerate(vms):
            if vm["name"] == name:
                removed = vms.pop(i)
                profile["vms"] = vms
                
                profile_name = self.config["current_profile"]
                self.config["profiles"][profile_name] = profile
                self.save_config()
                
                console.print(f"[green]✅ Đã xóa VM '{name}'[/green]")
                return True
        
        console.print(f"[red]❌ Không tìm thấy VM '{name}'[/red]")
        return False
    
    def update_last_connected(self, vm_name):
        """Update thời gian kết nối cuối"""
        profile = self.get_current_profile()
        for vm in profile.get("vms", []):
            if vm["name"] == vm_name:
                vm["last_connected"] = datetime.now().isoformat()
                break
        
        profile_name = self.config["current_profile"]
        self.config["profiles"][profile_name] = profile
        self.save_config()
    
    def test_connection(self, vm):
        """Test SSH connection đến VM"""
        try:
            ssh = paramiko.SSHClient()
            ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
            
            ssh_key_path = vm.get("ssh_key_path")
            if ssh_key_path:
                ssh_key_path = os.path.expanduser(ssh_key_path)
            
            with console.status(f"[cyan]Đang kết nối đến {vm['host']}...[/cyan]"):
                ssh.connect(
                    hostname=vm["host"],
                    port=vm.get("port", 22),
                    username=vm["user"],
                    key_filename=ssh_key_path if ssh_key_path else None,
                    timeout=10
                )
                
                # Test command
                stdin, stdout, stderr = ssh.exec_command("echo 'Connection OK'")
                output = stdout.read().decode().strip()
                
                ssh.close()
                
                if "Connection OK" in output:
                    console.print(f"[green]✅ Kết nối thành công đến {vm['name']}![/green]")
                    return True
        except Exception as e:
            console.print(f"[red]❌ Kết nối thất bại: {str(e)}[/red]")
            return False
    
    def ssh_connect(self, vm):
        """Mở SSH connection đến VM"""
        ssh_key_path = vm.get("ssh_key_path", "")
        
        # Build SSH command
        if platform.system() == "Windows":
            # Windows PowerShell
            if ssh_key_path:
                ssh_key_path = os.path.expanduser(ssh_key_path)
                cmd = f'ssh -i "{ssh_key_path}" -p {vm.get("port", 22)} {vm["user"]}@{vm["host"]}'
            else:
                cmd = f'ssh -p {vm.get("port", 22)} {vm["user"]}@{vm["host"]}'
            
            console.print(f"\n[cyan]🔌 Đang kết nối đến {vm['name']} ({vm['host']})...[/cyan]\n")
            console.print(f"[dim]Command: {cmd}[/dim]\n")
            
            # Update last connected
            self.update_last_connected(vm["name"])
            
            # Open SSH in PowerShell
            subprocess.run(["powershell", "-Command", cmd])
        else:
            # Linux/Mac
            if ssh_key_path:
                ssh_key_path = os.path.expanduser(ssh_key_path)
                cmd = ["ssh", "-i", ssh_key_path, "-p", str(vm.get("port", 22)), f"{vm['user']}@{vm['host']}"]
            else:
                cmd = ["ssh", "-p", str(vm.get("port", 22)), f"{vm['user']}@{vm['host']}"]
            
            console.print(f"\n[cyan]🔌 Đang kết nối đến {vm['name']} ({vm['host']})...[/cyan]\n")
            
            # Update last connected
            self.update_last_connected(vm["name"])
            
            # Open SSH
            subprocess.run(cmd)
    
    def export_config(self, output_file):
        """Export config ra file"""
        try:
            with open(output_file, 'w', encoding='utf-8') as f:
                json.dump(self.config, f, indent=2, ensure_ascii=False)
            console.print(f"[green]✅ Đã export config sang: {output_file}[/green]")
            return True
        except Exception as e:
            console.print(f"[red]❌ Export thất bại: {e}[/red]")
            return False
    
    def import_config(self, input_file):
        """Import config từ file"""
        try:
            with open(input_file, 'r', encoding='utf-8') as f:
                imported_config = json.load(f)
            
            # Backup current config
            backup_file = self.config_dir / f"config.backup.{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
            self.export_config(str(backup_file))
            
            # Import new config
            self.config = imported_config
            self.save_config()
            
            console.print(f"[green]✅ Đã import config từ: {input_file}[/green]")
            console.print(f"[dim]Backup cũ: {backup_file}[/dim]")
            return True
        except Exception as e:
            console.print(f"[red]❌ Import thất bại: {e}[/red]")
            return False


# CLI Commands
manager = VMSSHManager()


@click.group()
def cli():
    """🚀 VM SSH Manager - Quản lý kết nối SSH đến các VM dễ dàng"""
    pass


@cli.command()
def init():
    """Khởi tạo config lần đầu"""
    console.print(Panel.fit(
        "[bold cyan]🚀 VM SSH Manager[/bold cyan]\n"
        "Khởi tạo cấu hình lần đầu...",
        border_style="cyan"
    ))
    
    manager.init_config()
    
    console.print(f"\n[green]✅ Đã khởi tạo thành công![/green]")
    console.print(f"[dim]Config directory: {CONFIG_DIR}[/dim]")
    console.print(f"[dim]Config file: {CONFIG_FILE}[/dim]")


@cli.command()
@click.option('--name', '-n', prompt='Tên VM', help='Tên VM (vd: hk-server-1)')
@click.option('--host', '-h', prompt='IP/Hostname', help='IP hoặc hostname của VM')
@click.option('--user', '-u', prompt='SSH User', default='root', help='Username SSH')
@click.option('--port', '-p', default=22, help='SSH Port')
@click.option('--key', '-k', help='Đường dẫn SSH private key')
@click.option('--desc', '-d', default='', help='Mô tả VM')
def add(name, host, user, port, key, desc):
    """Thêm VM mới"""
    
    # Nếu không có SSH key, hỏi user
    if not key:
        use_key = Confirm.ask("Sử dụng SSH key?", default=True)
        if use_key:
            default_key = "~/.ssh/id_rsa"
            key = Prompt.ask("Đường dẫn SSH key", default=default_key)
    
    manager.add_vm(name, host, user, key, port, desc)


@cli.command()
def list():
    """Liệt kê tất cả VMs"""
    manager.list_vms()


@cli.command()
@click.argument('vm_name')
def remove(vm_name):
    """Xóa VM"""
    if Confirm.ask(f"Bạn chắc chắn muốn xóa VM '{vm_name}'?"):
        manager.remove_vm(vm_name)


@cli.command()
@click.argument('vm_identifier')
def connect(vm_identifier):
    """Kết nối SSH đến VM (theo tên hoặc số thứ tự)"""
    
    # Try by name first
    vm = manager.get_vm_by_name(vm_identifier)
    
    # Try by index
    if not vm:
        try:
            index = int(vm_identifier)
            vm = manager.get_vm_by_index(index)
        except ValueError:
            pass
    
    if not vm:
        console.print(f"[red]❌ Không tìm thấy VM: {vm_identifier}[/red]")
        console.print("[yellow]💡 Dùng lệnh 'list' để xem danh sách VMs[/yellow]")
        return
    
    manager.ssh_connect(vm)


@cli.command()
@click.argument('vm_identifier')
def test(vm_identifier):
    """Test kết nối đến VM"""
    
    # Try by name first
    vm = manager.get_vm_by_name(vm_identifier)
    
    # Try by index
    if not vm:
        try:
            index = int(vm_identifier)
            vm = manager.get_vm_by_index(index)
        except ValueError:
            pass
    
    if not vm:
        console.print(f"[red]❌ Không tìm thấy VM: {vm_identifier}[/red]")
        return
    
    manager.test_connection(vm)


@cli.command()
@click.argument('output_file', type=click.Path())
def export(output_file):
    """Export config ra file"""
    manager.export_config(output_file)


@cli.command()
@click.argument('input_file', type=click.Path(exists=True))
def import_config(input_file):
    """Import config từ file"""
    manager.import_config(input_file)


@cli.command()
def menu():
    """Mở menu interactive"""
    
    while True:
        console.clear()
        console.print(Panel.fit(
            "[bold cyan]🚀 VM SSH Manager[/bold cyan]\n"
            "[dim]Quản lý kết nối SSH đến các VM dễ dàng[/dim]",
            border_style="cyan"
        ))
        
        console.print("\n[bold]Chọn thao tác:[/bold]")
        console.print("  [cyan]1.[/cyan] Xem danh sách VMs")
        console.print("  [cyan]2.[/cyan] Kết nối đến VM")
        console.print("  [cyan]3.[/cyan] Thêm VM mới")
        console.print("  [cyan]4.[/cyan] Xóa VM")
        console.print("  [cyan]5.[/cyan] Test kết nối")
        console.print("  [cyan]6.[/cyan] Export config")
        console.print("  [cyan]7.[/cyan] Import config")
        console.print("  [red]0.[/red] Thoát\n")
        
        choice = Prompt.ask("Chọn", choices=['0', '1', '2', '3', '4', '5', '6', '7'])
        
        if choice == '0':
            console.print("[green]👋 Tạm biệt![/green]")
            break
        
        elif choice == '1':
            console.print()
            manager.list_vms()
            console.print("\n[dim]Nhấn Enter để tiếp tục...[/dim]")
            input()
        
        elif choice == '2':
            console.print()
            vms = manager.list_vms()
            if vms:
                console.print()
                vm_choice = Prompt.ask("Chọn VM (số thứ tự hoặc tên)")
                
                # Try by index
                try:
                    index = int(vm_choice)
                    vm = manager.get_vm_by_index(index)
                except ValueError:
                    vm = manager.get_vm_by_name(vm_choice)
                
                if vm:
                    manager.ssh_connect(vm)
                else:
                    console.print("[red]❌ Không tìm thấy VM[/red]")
            
            console.print("\n[dim]Nhấn Enter để tiếp tục...[/dim]")
            input()
        
        elif choice == '3':
            console.print()
            name = Prompt.ask("Tên VM")
            host = Prompt.ask("IP/Hostname")
            user = Prompt.ask("SSH User", default="root")
            port = Prompt.ask("SSH Port", default="22")
            
            use_key = Confirm.ask("Sử dụng SSH key?", default=True)
            key = None
            if use_key:
                key = Prompt.ask("Đường dẫn SSH key", default="~/.ssh/id_rsa")
            
            desc = Prompt.ask("Mô tả (optional)", default="")
            
            manager.add_vm(name, host, user, key, int(port), desc)
            
            console.print("\n[dim]Nhấn Enter để tiếp tục...[/dim]")
            input()
        
        elif choice == '4':
            console.print()
            manager.list_vms()
            console.print()
            vm_name = Prompt.ask("Tên VM cần xóa")
            if Confirm.ask(f"Xác nhận xóa '{vm_name}'?"):
                manager.remove_vm(vm_name)
            
            console.print("\n[dim]Nhấn Enter để tiếp tục...[/dim]")
            input()
        
        elif choice == '5':
            console.print()
            manager.list_vms()
            console.print()
            vm_choice = Prompt.ask("Chọn VM để test")
            
            # Try by index
            try:
                index = int(vm_choice)
                vm = manager.get_vm_by_index(index)
            except ValueError:
                vm = manager.get_vm_by_name(vm_choice)
            
            if vm:
                manager.test_connection(vm)
            else:
                console.print("[red]❌ Không tìm thấy VM[/red]")
            
            console.print("\n[dim]Nhấn Enter để tiếp tục...[/dim]")
            input()
        
        elif choice == '6':
            console.print()
            output_file = Prompt.ask("Tên file export", default="vm-config.json")
            manager.export_config(output_file)
            
            console.print("\n[dim]Nhấn Enter để tiếp tục...[/dim]")
            input()
        
        elif choice == '7':
            console.print()
            input_file = Prompt.ask("Đường dẫn file import")
            if os.path.exists(input_file):
                manager.import_config(input_file)
            else:
                console.print(f"[red]❌ File không tồn tại: {input_file}[/red]")
            
            console.print("\n[dim]Nhấn Enter để tiếp tục...[/dim]")
            input()


@cli.command()
def info():
    """Xem thông tin config"""
    console.print(Panel.fit(
        f"[bold cyan]📋 Config Info[/bold cyan]\n\n"
        f"Config Dir: [yellow]{CONFIG_DIR}[/yellow]\n"
        f"Config File: [yellow]{CONFIG_FILE}[/yellow]\n"
        f"SSH Keys Dir: [yellow]{SSH_KEYS_DIR}[/yellow]\n\n"
        f"Current Profile: [green]{manager.config.get('current_profile', 'default')}[/green]\n"
        f"Total VMs: [green]{len(manager.get_current_profile().get('vms', []))}[/green]",
        border_style="cyan"
    ))


@cli.group()
def profile():
    """Quản lý profiles (nhóm VMs)"""
    pass


@profile.command('list')
def profile_list():
    """Liệt kê tất cả profiles"""
    profiles = manager.config.get("profiles", {})
    current = manager.config.get("current_profile", "default")
    
    table = Table(
        title="📁 Profiles",
        box=box.ROUNDED,
        show_header=True,
        header_style="bold cyan"
    )
    
    table.add_column("Profile", style="bold")
    table.add_column("Tên", style="cyan")
    table.add_column("Số VMs", justify="center", style="yellow")
    table.add_column("Active", justify="center")
    
    for profile_key, profile_data in profiles.items():
        is_active = "✓" if profile_key == current else ""
        vm_count = len(profile_data.get("vms", []))
        
        table.add_row(
            profile_key,
            profile_data.get("name", profile_key),
            str(vm_count),
            f"[green]{is_active}[/green]" if is_active else ""
        )
    
    console.print(table)


@profile.command('switch')
@click.argument('profile_name')
def profile_switch(profile_name):
    """Chuyển sang profile khác"""
    if profile_name not in manager.config.get("profiles", {}):
        console.print(f"[red]❌ Profile '{profile_name}' không tồn tại![/red]")
        console.print("[yellow]💡 Dùng 'vm profile list' để xem danh sách profiles[/yellow]")
        return
    
    manager.config["current_profile"] = profile_name
    manager.save_config()
    
    console.print(f"[green]✅ Đã chuyển sang profile: {profile_name}[/green]")


@profile.command('create')
@click.argument('profile_name')
@click.option('--desc', '-d', help='Mô tả profile')
def profile_create(profile_name, desc):
    """Tạo profile mới"""
    if profile_name in manager.config.get("profiles", {}):
        console.print(f"[yellow]⚠️  Profile '{profile_name}' đã tồn tại![/yellow]")
        return
    
    manager.config["profiles"][profile_name] = {
        "name": desc or profile_name,
        "description": desc or "",
        "vms": []
    }
    manager.save_config()
    
    console.print(f"[green]✅ Đã tạo profile: {profile_name}[/green]")
    
    # Ask to switch
    if Confirm.ask("Chuyển sang profile mới?", default=False):
        manager.config["current_profile"] = profile_name
        manager.save_config()
        console.print(f"[green]✅ Đã chuyển sang profile: {profile_name}[/green]")


@profile.command('delete')
@click.argument('profile_name')
def profile_delete(profile_name):
    """Xóa profile"""
    if profile_name == "default":
        console.print("[red]❌ Không thể xóa profile 'default'![/red]")
        return
    
    if profile_name not in manager.config.get("profiles", {}):
        console.print(f"[red]❌ Profile '{profile_name}' không tồn tại![/red]")
        return
    
    profile_data = manager.config["profiles"][profile_name]
    vm_count = len(profile_data.get("vms", []))
    
    console.print(f"[yellow]⚠️  Profile '{profile_name}' có {vm_count} VMs[/yellow]")
    
    if not Confirm.ask("Bạn chắc chắn muốn xóa?"):
        console.print("[yellow]Đã hủy.[/yellow]")
        return
    
    del manager.config["profiles"][profile_name]
    
    # Switch to default if deleting current profile
    if manager.config.get("current_profile") == profile_name:
        manager.config["current_profile"] = "default"
        console.print("[cyan]Đã chuyển về profile 'default'[/cyan]")
    
    manager.save_config()
    console.print(f"[green]✅ Đã xóa profile: {profile_name}[/green]")


@cli.command('quick-add')
@click.argument('connection_string', required=False)
def quick_add(connection_string):
    """
    Quick add VM từ connection string (user@host hoặc user@host:port)
    
    Examples:
      vm quick-add root@1.2.3.4
      vm quick-add ubuntu@server.com:2222
      vm quick-add admin@192.168.1.100
    """
    if not connection_string:
        console.print("[yellow]Usage: vm quick-add user@host[:port][/yellow]")
        console.print("[dim]Examples:[/dim]")
        console.print("  vm quick-add root@1.2.3.4")
        console.print("  vm quick-add ubuntu@server.com:2222")
        return
    
    # Parse connection string
    try:
        # Check for port
        if ':' in connection_string:
            user_host, port = connection_string.rsplit(':', 1)
            port = int(port)
        else:
            user_host = connection_string
            port = 22
        
        # Parse user@host
        if '@' not in user_host:
            console.print("[red]❌ Invalid format. Use: user@host[:port][/red]")
            return
        
        user, host = user_host.split('@', 1)
        
        # Generate name from host
        name = Prompt.ask("VM name", default=host.replace('.', '-'))
        
        # Ask for SSH key
        use_key = Confirm.ask("Use SSH key?", default=True)
        ssh_key = None
        if use_key:
            ssh_key = Prompt.ask("SSH key path", default="~/.ssh/id_rsa")
        
        # Description
        desc = Prompt.ask("Description (optional)", default="")
        
        # Add VM
        manager.add_vm(name, host, user, ssh_key, port, desc)
        
        # Ask to test
        if Confirm.ask("Test connection now?", default=True):
            vm = manager.get_vm_by_name(name)
            if vm:
                manager.test_connection(vm)
        
    except Exception as e:
        console.print(f"[red]❌ Error: {e}[/red]")


@cli.group()
def key():
    """SSH key management"""
    pass


@key.command('generate')
@click.option('--name', '-n', help='Key name', default='id_rsa')
@click.option('--type', '-t', help='Key type', default='rsa', type=click.Choice(['rsa', 'ed25519']))
@click.option('--bits', '-b', help='Key bits (for RSA)', default=4096, type=int)
def key_generate(name, type, bits):
    """Generate new SSH key pair"""
    try:
        import subprocess
        
        # Key path
        key_dir = manager.ssh_keys_dir
        key_path = key_dir / name
        
        if key_path.exists():
            if not Confirm.ask(f"Key '{name}' already exists. Overwrite?"):
                console.print("[yellow]Cancelled.[/yellow]")
                return
        
        console.print(f"[cyan]Generating {type.upper()} key...[/cyan]")
        
        # Generate key
        if type == 'rsa':
            cmd = ['ssh-keygen', '-t', 'rsa', '-b', str(bits), '-f', str(key_path), '-N', '']
        else:  # ed25519
            cmd = ['ssh-keygen', '-t', 'ed25519', '-f', str(key_path), '-N', '']
        
        result = subprocess.run(cmd, capture_output=True, text=True)
        
        if result.returncode == 0:
            console.print(f"[green]✅ SSH key generated successfully![/green]")
            console.print(f"[dim]Private key: {key_path}[/dim]")
            console.print(f"[dim]Public key: {key_path}.pub[/dim]")
            
            # Show public key
            with open(f"{key_path}.pub", 'r') as f:
                pubkey = f.read().strip()
            
            console.print("\n[bold]Public Key:[/bold]")
            console.print(Panel(pubkey, border_style="green"))
            
            console.print("\n[yellow]📋 Copy public key to server:[/yellow]")
            console.print(f"[dim]ssh-copy-id -i {key_path}.pub user@host[/dim]")
            console.print(f"[dim]or manually add to ~/.ssh/authorized_keys[/dim]")
        else:
            console.print(f"[red]❌ Error: {result.stderr}[/red]")
            
    except FileNotFoundError:
        console.print("[red]❌ ssh-keygen not found. Please install OpenSSH.[/red]")
    except Exception as e:
        console.print(f"[red]❌ Error: {e}[/red]")


@key.command('list')
def key_list():
    """List all SSH keys"""
    key_dir = manager.ssh_keys_dir
    
    if not key_dir.exists():
        console.print("[yellow]No SSH keys directory found.[/yellow]")
        return
    
    keys = list(key_dir.glob("*"))
    keys = [k for k in keys if k.is_file() and not k.name.endswith('.pub')]
    
    if not keys:
        console.print("[yellow]No SSH keys found.[/yellow]")
        console.print(f"[dim]Generate new key: vm key generate[/dim]")
        return
    
    table = Table(
        title="🔑 SSH Keys",
        box=box.ROUNDED,
        show_header=True,
        header_style="bold cyan"
    )
    
    table.add_column("Name", style="bold green")
    table.add_column("Path", style="cyan")
    table.add_column("Type", justify="center")
    table.add_column("Size", justify="right")
    
    for key in sorted(keys):
        # Detect key type
        try:
            with open(key, 'r') as f:
                first_line = f.readline()
                if 'RSA' in first_line:
                    key_type = 'RSA'
                elif 'ED25519' in first_line:
                    key_type = 'ED25519'
                else:
                    key_type = 'Other'
        except:
            key_type = 'Unknown'
        
        size = key.stat().st_size
        size_str = f"{size} bytes"
        
        table.add_row(
            key.name,
            str(key),
            key_type,
            size_str
        )
    
    console.print(table)
    console.print(f"\n[dim]Generate new key: vm key generate[/dim]")


@key.command('copy')
@click.argument('key_name')
@click.argument('connection_string')
def key_copy(key_name, connection_string):
    """
    Copy SSH public key to server
    
    Example: vm key copy id_rsa root@1.2.3.4
    """
    key_dir = manager.ssh_keys_dir
    key_path = key_dir / key_name
    pub_key_path = key_dir / f"{key_name}.pub"
    
    if not pub_key_path.exists():
        console.print(f"[red]❌ Public key not found: {pub_key_path}[/red]")
        return
    
    try:
        # Parse connection string
        if '@' not in connection_string:
            console.print("[red]❌ Invalid format. Use: user@host[/red]")
            return
        
        console.print(f"[cyan]Copying public key to {connection_string}...[/cyan]")
        
        # Use ssh-copy-id
        cmd = ['ssh-copy-id', '-i', str(pub_key_path), connection_string]
        result = subprocess.run(cmd)
        
        if result.returncode == 0:
            console.print(f"[green]✅ Public key copied successfully![/green]")
            console.print(f"[dim]You can now connect without password[/dim]")
        else:
            console.print(f"[red]❌ Copy failed[/red]")
            
    except FileNotFoundError:
        console.print("[red]❌ ssh-copy-id not found.[/red]")
        console.print("\n[yellow]Manual method:[/yellow]")
        
        with open(pub_key_path, 'r') as f:
            pubkey = f.read().strip()
        
        console.print(Panel(pubkey, title="Public Key", border_style="green"))
        console.print("\n[dim]Copy above key to server's ~/.ssh/authorized_keys[/dim]")


@cli.command('wizard')
def setup_wizard():
    """Interactive setup wizard for adding new VM"""
    console.print(Panel.fit(
        "[bold cyan]🧙 VM Setup Wizard[/bold cyan]\n"
        "[dim]Quick setup for new VM[/dim]",
        border_style="cyan"
    ))
    
    console.print("\n[bold]Step 1: Connection Details[/bold]")
    
    # Option 1: Quick add
    use_quick = Confirm.ask("Do you have connection string (user@host)?", default=True)
    
    if use_quick:
        conn_str = Prompt.ask("Connection string (user@host[:port])")
        
        # Parse
        try:
            if ':' in conn_str:
                user_host, port = conn_str.rsplit(':', 1)
                port = int(port)
            else:
                user_host = conn_str
                port = 22
            
            user, host = user_host.split('@', 1)
            name = Prompt.ask("VM name", default=host.replace('.', '-'))
        except:
            console.print("[red]❌ Invalid format[/red]")
            return
    else:
        name = Prompt.ask("VM name")
        host = Prompt.ask("Host (IP or domain)")
        user = Prompt.ask("SSH user", default="root")
        port = Prompt.ask("SSH port", default="22")
        port = int(port)
    
    console.print("\n[bold]Step 2: SSH Key[/bold]")
    
    # Check for existing keys
    key_dir = manager.ssh_keys_dir
    existing_keys = []
    if key_dir.exists():
        existing_keys = [k.name for k in key_dir.glob("*") if k.is_file() and not k.name.endswith('.pub')]
    
    if existing_keys:
        console.print(f"[green]Found {len(existing_keys)} existing keys[/green]")
        use_existing = Confirm.ask("Use existing SSH key?", default=True)
        
        if use_existing:
            console.print("\n[dim]Available keys:[/dim]")
            for idx, key in enumerate(existing_keys, 1):
                console.print(f"  {idx}. {key}")
            
            key_choice = Prompt.ask("Select key number or enter path", default="1")
            
            try:
                key_idx = int(key_choice) - 1
                if 0 <= key_idx < len(existing_keys):
                    ssh_key = str(key_dir / existing_keys[key_idx])
                else:
                    ssh_key = key_choice
            except:
                ssh_key = key_choice
        else:
            # Generate new key
            if Confirm.ask("Generate new SSH key?", default=True):
                key_name = Prompt.ask("Key name", default="id_rsa")
                key_type = Prompt.ask("Key type", default="rsa", type=click.Choice(['rsa', 'ed25519']))
                
                # Generate
                key_path = key_dir / key_name
                console.print(f"[cyan]Generating {key_type.upper()} key...[/cyan]")
                
                if key_type == 'rsa':
                    cmd = ['ssh-keygen', '-t', 'rsa', '-b', '4096', '-f', str(key_path), '-N', '']
                else:
                    cmd = ['ssh-keygen', '-t', 'ed25519', '-f', str(key_path), '-N', '']
                
                result = subprocess.run(cmd, capture_output=True)
                
                if result.returncode == 0:
                    console.print(f"[green]✅ Key generated![/green]")
                    ssh_key = str(key_path)
                    
                    # Copy to server
                    if Confirm.ask("Copy public key to server now?", default=True):
                        copy_cmd = ['ssh-copy-id', '-i', f"{key_path}.pub", f"{user}@{host}"]
                        subprocess.run(copy_cmd)
                else:
                    console.print("[red]❌ Key generation failed[/red]")
                    ssh_key = None
            else:
                ssh_key = Prompt.ask("SSH key path", default="~/.ssh/id_rsa")
    else:
        # No keys found
        if Confirm.ask("Generate new SSH key?", default=True):
            key_name = Prompt.ask("Key name", default="id_rsa")
            key_type = Prompt.ask("Key type", default="rsa")
            
            key_dir.mkdir(parents=True, exist_ok=True)
            key_path = key_dir / key_name
            
            console.print(f"[cyan]Generating {key_type.upper()} key...[/cyan]")
            
            if key_type == 'rsa':
                cmd = ['ssh-keygen', '-t', 'rsa', '-b', '4096', '-f', str(key_path), '-N', '']
            else:
                cmd = ['ssh-keygen', '-t', 'ed25519', '-f', str(key_path), '-N', '']
            
            result = subprocess.run(cmd, capture_output=True)
            
            if result.returncode == 0:
                console.print(f"[green]✅ Key generated![/green]")
                ssh_key = str(key_path)
                
                # Show public key
                with open(f"{key_path}.pub", 'r') as f:
                    pubkey = f.read().strip()
                
                console.print("\n[yellow]📋 Public Key:[/yellow]")
                console.print(Panel(pubkey, border_style="green"))
                
                # Copy to server
                if Confirm.ask("Copy public key to server now?", default=True):
                    copy_cmd = ['ssh-copy-id', '-i', f"{key_path}.pub", f"{user}@{host}"]
                    subprocess.run(copy_cmd)
            else:
                console.print("[red]❌ Key generation failed[/red]")
                ssh_key = None
        else:
            ssh_key = Prompt.ask("SSH key path", default="~/.ssh/id_rsa")
    
    console.print("\n[bold]Step 3: Additional Info[/bold]")
    desc = Prompt.ask("Description (optional)", default="")
    
    # Summary
    console.print("\n[bold cyan]Summary:[/bold cyan]")
    console.print(f"  Name: [green]{name}[/green]")
    console.print(f"  Host: [cyan]{host}[/cyan]")
    console.print(f"  User: [yellow]{user}[/yellow]")
    console.print(f"  Port: [yellow]{port}[/yellow]")
    console.print(f"  SSH Key: [dim]{ssh_key if ssh_key else 'None'}[/dim]")
    console.print(f"  Description: [dim]{desc if desc else 'N/A'}[/dim]")
    
    # Confirm
    if Confirm.ask("\nAdd this VM?", default=True):
        manager.add_vm(name, host, user, ssh_key, port, desc)
        
        # Test connection
        if Confirm.ask("Test connection now?", default=True):
            vm = manager.get_vm_by_name(name)
            if vm:
                manager.test_connection(vm)
    else:
        console.print("[yellow]Cancelled.[/yellow]")


@cli.command()
def import_from_monitoring():
    """Import VMs từ monitoring system"""
    console.print("[cyan]🔄 Đang import từ monitoring system...[/cyan]")
    
    import subprocess
    result = subprocess.run([sys.executable, "import-vms-from-monitoring.py"])
    
    if result.returncode == 0:
        console.print("[green]✅ Import thành công![/green]")
    else:
        console.print("[red]❌ Import thất bại![/red]")


@cli.group()
def batch():
    """Batch operations cho nhiều VMs cùng lúc"""
    pass


@batch.command('connect')
@click.option('--pattern', '-p', help='Pattern để filter VMs (regex)')
@click.option('--tags', '-t', help='Tags để filter VMs (comma-separated)')
def batch_connect(pattern, tags):
    """Kết nối đến nhiều VMs theo pattern hoặc tags"""
    console.print("[cyan]🔄 Batch connect (coming soon)...[/cyan]")
    console.print("[yellow]Tính năng này đang được phát triển[/yellow]")


@batch.command('exec')
@click.argument('command')
@click.option('--pattern', '-p', help='Pattern để filter VMs (regex)')
@click.option('--parallel', '-P', is_flag=True, help='Chạy parallel thay vì sequential')
def batch_exec(command, pattern, parallel):
    """Chạy command trên nhiều VMs"""
    import re
    from concurrent.futures import ThreadPoolExecutor, as_completed
    
    profile = manager.get_current_profile()
    vms = profile.get("vms", [])
    
    # Filter VMs by pattern
    if pattern:
        try:
            regex = re.compile(pattern, re.IGNORECASE)
            vms = [vm for vm in vms if regex.search(vm['name']) or regex.search(vm['host'])]
        except re.error as e:
            console.print(f"[red]❌ Invalid regex pattern: {e}[/red]")
            return
    
    if not vms:
        console.print("[yellow]⚠️  Không tìm thấy VM nào![/yellow]")
        return
    
    console.print(f"\n[cyan]📋 Sẽ chạy command trên {len(vms)} VMs:[/cyan]")
    for vm in vms:
        console.print(f"  • {vm['name']} ({vm['host']})")
    
    if not Confirm.ask(f"\nChạy command: [yellow]{command}[/yellow] ?"):
        console.print("[yellow]Đã hủy.[/yellow]")
        return
    
    def run_on_vm(vm):
        """Execute command on a single VM"""
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
                timeout=10
            )
            
            stdin, stdout, stderr = ssh.exec_command(command)
            output = stdout.read().decode()
            error = stderr.read().decode()
            exit_code = stdout.channel.recv_exit_status()
            
            ssh.close()
            
            return {
                "vm": vm["name"],
                "success": exit_code == 0,
                "output": output,
                "error": error,
                "exit_code": exit_code
            }
        except Exception as e:
            return {
                "vm": vm["name"],
                "success": False,
                "error": str(e),
                "output": "",
                "exit_code": -1
            }
    
    console.print(f"\n[cyan]⚡ Đang chạy {'parallel' if parallel else 'sequential'}...[/cyan]\n")
    
    results = []
    
    if parallel:
        # Parallel execution
        with ThreadPoolExecutor(max_workers=min(len(vms), 10)) as executor:
            futures = {executor.submit(run_on_vm, vm): vm for vm in vms}
            
            with Progress(
                SpinnerColumn(),
                TextColumn("[progress.description]{task.description}"),
                console=console
            ) as progress:
                task = progress.add_task("Executing...", total=len(vms))
                
                for future in as_completed(futures):
                    result = future.result()
                    results.append(result)
                    progress.advance(task)
    else:
        # Sequential execution
        for vm in vms:
            console.print(f"[cyan]→ {vm['name']}...[/cyan]")
            result = run_on_vm(vm)
            results.append(result)
    
    # Display results
    console.print("\n[bold cyan]📊 Results:[/bold cyan]\n")
    
    success_count = sum(1 for r in results if r["success"])
    fail_count = len(results) - success_count
    
    for result in results:
        if result["success"]:
            console.print(f"[green]✅ {result['vm']}[/green]")
        else:
            console.print(f"[red]❌ {result['vm']}[/red]")
        
        if result["output"]:
            console.print(f"[dim]   Output:[/dim]")
            for line in result["output"].strip().split('\n')[:5]:
                console.print(f"[dim]   {line}[/dim]")
        
        if result["error"]:
            console.print(f"[red]   Error: {result['error'][:100]}[/red]")
    
    console.print(f"\n[bold]Summary:[/bold] [green]{success_count} succeeded[/green], [red]{fail_count} failed[/red]")


@batch.command('deploy')
@click.argument('script_path', type=click.Path(exists=True))
@click.option('--dest', '-d', default='/tmp/deployed_script', help='Destination path on VMs')
@click.option('--pattern', '-p', help='Pattern để filter VMs')
@click.option('--execute', '-x', is_flag=True, help='Execute script sau khi deploy')
def batch_deploy(script_path, dest, pattern, execute):
    """Deploy script lên nhiều VMs"""
    import re
    
    profile = manager.get_current_profile()
    vms = profile.get("vms", [])
    
    # Filter VMs by pattern
    if pattern:
        try:
            regex = re.compile(pattern, re.IGNORECASE)
            vms = [vm for vm in vms if regex.search(vm['name']) or regex.search(vm['host'])]
        except re.error as e:
            console.print(f"[red]❌ Invalid regex pattern: {e}[/red]")
            return
    
    if not vms:
        console.print("[yellow]⚠️  Không tìm thấy VM nào![/yellow]")
        return
    
    console.print(f"\n[cyan]📦 Sẽ deploy script lên {len(vms)} VMs:[/cyan]")
    console.print(f"[dim]   Source: {script_path}[/dim]")
    console.print(f"[dim]   Dest: {dest}[/dim]")
    for vm in vms:
        console.print(f"  • {vm['name']} ({vm['host']})")
    
    if not Confirm.ask("\nTiếp tục?"):
        console.print("[yellow]Đã hủy.[/yellow]")
        return
    
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
                timeout=10
            )
            
            # Upload file
            sftp = ssh.open_sftp()
            sftp.put(script_path, dest)
            sftp.chmod(dest, 0o755)  # Make executable
            sftp.close()
            
            output = f"Deployed to {dest}"
            
            # Execute if requested
            if execute:
                stdin, stdout, stderr = ssh.exec_command(f"bash {dest}")
                exec_output = stdout.read().decode()
                exec_error = stderr.read().decode()
                exit_code = stdout.channel.recv_exit_status()
                
                output += f"\n\nExecution output:\n{exec_output}"
                if exec_error:
                    output += f"\nErrors:\n{exec_error}"
            
            ssh.close()
            
            return {
                "vm": vm["name"],
                "success": True,
                "output": output
            }
        except Exception as e:
            return {
                "vm": vm["name"],
                "success": False,
                "error": str(e)
            }
    
    console.print(f"\n[cyan]⚡ Đang deploy...[/cyan]\n")
    
    results = []
    
    with ThreadPoolExecutor(max_workers=min(len(vms), 10)) as executor:
        futures = {executor.submit(deploy_to_vm, vm): vm for vm in vms}
        
        with Progress(
            SpinnerColumn(),
            TextColumn("[progress.description]{task.description}"),
            console=console
        ) as progress:
            task = progress.add_task("Deploying...", total=len(vms))
            
            for future in as_completed(futures):
                result = future.result()
                results.append(result)
                progress.advance(task)
    
    # Display results
    console.print("\n[bold cyan]📊 Deployment Results:[/bold cyan]\n")
    
    success_count = sum(1 for r in results if r["success"])
    fail_count = len(results) - success_count
    
    for result in results:
        if result["success"]:
            console.print(f"[green]✅ {result['vm']}[/green]")
            if result.get("output"):
                for line in result["output"].split('\n')[:3]:
                    console.print(f"[dim]   {line}[/dim]")
        else:
            console.print(f"[red]❌ {result['vm']}: {result.get('error', 'Unknown error')}[/red]")
    
    console.print(f"\n[bold]Summary:[/bold] [green]{success_count} succeeded[/green], [red]{fail_count} failed[/red]")


@cli.command('edit')
@click.argument('vm_identifier')
@click.option('--name', help='New name')
@click.option('--host', help='New host')
@click.option('--user', help='New user')
@click.option('--port', type=int, help='New port')
@click.option('--key', help='New SSH key path')
def edit_vm(vm_identifier, name, host, user, port, key):
    """Edit VM configuration"""
    # Try by name first
    vm = manager.get_vm_by_name(vm_identifier)
    
    # Try by index
    if not vm:
        try:
            index = int(vm_identifier)
            vm = manager.get_vm_by_index(index)
        except ValueError:
            pass
    
    if not vm:
        console.print(f"[red]❌ Không tìm thấy VM: {vm_identifier}[/red]")
        return
    
    console.print(f"\n[cyan]📝 Editing VM: {vm['name']}[/cyan]\n")
    
    # Update fields
    updated = False
    if name and name != vm['name']:
        vm['name'] = name
        updated = True
        console.print(f"[green]✓[/green] Name: {name}")
    
    if host and host != vm['host']:
        vm['host'] = host
        updated = True
        console.print(f"[green]✓[/green] Host: {host}")
    
    if user and user != vm['user']:
        vm['user'] = user
        updated = True
        console.print(f"[green]✓[/green] User: {user}")
    
    if port and port != vm.get('port', 22):
        vm['port'] = port
        updated = True
        console.print(f"[green]✓[/green] Port: {port}")
    
    if key and key != vm.get('ssh_key_path'):
        vm['ssh_key_path'] = key
        updated = True
        console.print(f"[green]✓[/green] SSH Key: {key}")
    
    if updated:
        # Save config
        profile = manager.get_current_profile()
        profile_name = manager.config["current_profile"]
        manager.config["profiles"][profile_name] = profile
        manager.save_config()
        
        console.print(f"\n[green]✅ VM đã được cập nhật![/green]")
    else:
        console.print(f"\n[yellow]⚠️  Không có thay đổi nào![/yellow]")


@cli.command('clone')
@click.argument('vm_identifier')
@click.argument('new_name')
def clone_vm(vm_identifier, new_name):
    """Clone VM configuration với tên mới"""
    # Try by name first
    vm = manager.get_vm_by_name(vm_identifier)
    
    # Try by index
    if not vm:
        try:
            index = int(vm_identifier)
            vm = manager.get_vm_by_index(index)
        except ValueError:
            pass
    
    if not vm:
        console.print(f"[red]❌ Không tìm thấy VM: {vm_identifier}[/red]")
        return
    
    # Check if new name already exists
    if manager.get_vm_by_name(new_name):
        console.print(f"[red]❌ VM '{new_name}' đã tồn tại![/red]")
        return
    
    # Clone VM
    new_vm = vm.copy()
    new_vm['name'] = new_name
    new_vm['added_at'] = datetime.now().isoformat()
    new_vm['last_connected'] = None
    
    profile = manager.get_current_profile()
    profile['vms'].append(new_vm)
    
    profile_name = manager.config["current_profile"]
    manager.config["profiles"][profile_name] = profile
    manager.save_config()
    
    console.print(f"[green]✅ Đã clone VM '{vm['name']}' thành '{new_name}'![/green]")


if __name__ == '__main__':
    # Check if no arguments, show menu
    if len(sys.argv) == 1:
        menu.callback()
    else:
        cli()

