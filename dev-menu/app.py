#!/usr/bin/env python3
"""
Jardin Biot — Mac menu bar dev launcher.
One-click Django / Expo, combined output window, Copy last / Copy all.
"""

import queue
import sys
import threading
from pathlib import Path

# Project root: script mode = parent of dev-menu; frozen = config or Cocoa dialog
def _get_project_root_frozen():
    app_support = Path.home() / "Library" / "Application Support" / "JardinBiotDevMenu"
    project_root_file = app_support / "project_root.txt"
    if project_root_file.exists():
        path = project_root_file.read_text().strip()
        if path and Path(path).is_dir():
            return Path(path)
    # First run: ask user to select project folder (Cocoa NSOpenPanel, no Tk)
    try:
        from AppKit import NSOpenPanel, NSOKButton
        panel = NSOpenPanel.openPanel()
        panel.setCanChooseFiles_(False)
        panel.setCanChooseDirectories_(True)
        panel.setAllowsMultipleSelection_(False)
        panel.setTitle_("Select Jardin Biot project folder (biot)")
        if panel.runModal() == NSOKButton:
            url = panel.URL()
            if url is not None:
                path = str(url.path())
                p = Path(path)
                if (p / "manage.py").exists() and (p / "mobile" / "package.json").exists():
                    app_support.mkdir(parents=True, exist_ok=True)
                    project_root_file.write_text(str(p))
                    return p
    except Exception:
        pass
    return None


def get_project_root():
    if getattr(sys, "frozen", False):
        return _get_project_root_frozen()
    # Script mode: parent of dev-menu
    dev_menu_dir = Path(__file__).resolve().parent
    return dev_menu_dir.parent


# Command definitions: (menu_label, tag, cwd_subpath, argv_builder)
# argv_builder(project_root) -> list of str
def _commands(project_root):
    root = project_root
    mobile = root / "mobile"
    return [
        ("Django — LAN", "Django", None, lambda: [sys.executable, "manage.py", "runserver", "0.0.0.0:8000"]),
        ("Django — HTTPS", "Django", None, lambda: [sys.executable, "run_https.py"]),
        ("Expo — Start", "Expo", "mobile", lambda: ["npx", "expo", "start"]),
        ("Expo — run:ios", "Expo", "mobile", lambda: ["npx", "expo", "run:ios"]),
        ("Expo — run:android", "Expo", "mobile", lambda: ["npx", "expo", "run:android"]),
        ("Expo — web", "Expo", "mobile", lambda: ["npx", "expo", "start", "--web"]),
    ]


# Shared output buffer and last-start index (thread-safe)
class OutputBuffer:
    def __init__(self):
        self._lock = threading.Lock()
        self._lines = []
        self._last_start = 0

    def mark_start(self):
        with self._lock:
            self._last_start = len(self._lines)

    def append(self, line: str):
        with self._lock:
            self._lines.append(line)

    def get_all(self) -> str:
        with self._lock:
            return "".join(self._lines)

    def get_last(self, max_chars: int = 3000) -> str:
        with self._lock:
            segment = self._lines[self._last_start:]
            text = "".join(segment)
            if len(text) > max_chars:
                return text[-max_chars:]
            return text


def main():
    import rumps
    from output_window import OutputWindow

    project_root = get_project_root()
    if project_root is None:
        rumps.alert("No project folder selected. Use the .app from the Jardin Biot repo or select the project folder when prompted.")
        return
    if not (project_root / "manage.py").exists():
        rumps.alert(f"Invalid project root: {project_root}\n(manage.py not found)")
        return

    line_queue = queue.Queue()
    buffer = OutputBuffer()

    def get_all_output():
        return buffer.get_all()

    def get_last_output():
        return buffer.get_last()

    output_window = OutputWindow(line_queue, get_all_output, get_last_output)

    # Track running process per "key" so we can restart (kill previous)
    running = {}
    running_lock = threading.Lock()

    def make_handler(label, tag, cwd_subpath, argv_builder):
        key = label

        def handler(_):
            with running_lock:
                if key in running:
                    try:
                        running[key].terminate()
                    except Exception:
                        pass
                    del running[key]
            t = threading.Thread(
                target=run_command,
                args=(project_root, tag, cwd_subpath, argv_builder, line_queue, buffer),
                daemon=True,
            )
            t.start()
            # We don't track the process in running for now (no handle from run_command). So we just start and forget; "restart" means start again (second instance would run in parallel). To properly kill we'd need to return the Popen from run_command and store it. Let me add that.
            # For v1 plan says "restart is acceptable" - so we could kill previous. To kill we need to keep the Popen. Refactor run_command to return the process and have the main thread store it, and the reader thread runs in parallel. So: run_command starts Popen, spawns a thread that reads stdout and pushes to queue, and returns the Popen. Then the menu handler stores it in running[key]. Next time we terminate that Popen. So run_command should be: create Popen, start reader thread, return Popen. Let me refactor.
            pass

        return handler

    # Refactor: run_command returns the Popen so we can terminate it on "restart"
    def run_command_with_process(project_root, tag, cwd_subpath, argv_builder, line_queue, buffer, running_dict, key):
        import subprocess
        cwd = project_root if cwd_subpath is None else project_root / cwd_subpath
        argv = argv_builder()
        buffer.mark_start()
        prefix = f"[{tag}] "
        line_queue.put(prefix + f"$ {' '.join(argv)}\n")
        buffer.append(prefix + f"$ {' '.join(argv)}\n")
        try:
            proc = subprocess.Popen(
                argv,
                cwd=str(cwd),
                stdout=subprocess.PIPE,
                stderr=subprocess.STDOUT,
                text=True,
                bufsize=1,
            )
            with running_lock:
                running_dict[key] = proc
            for line in proc.stdout:
                line = line if line.endswith("\n") else line + "\n"
                out = prefix + line
                line_queue.put(out)
                buffer.append(out)
            proc.wait()
        except Exception as e:
            err = prefix + str(e) + "\n"
            line_queue.put(err)
            buffer.append(err)
        finally:
            with running_lock:
                if running_dict.get(key) == proc:
                    del running_dict[key]

    def make_handler(label, tag, cwd_subpath, argv_builder):
        key = label

        def handler(_):
            with running_lock:
                if key in running:
                    try:
                        running[key].terminate()
                    except Exception:
                        pass
                    del running[key]
            # Remind for HTTPS: open https:// and accept the self-signed cert
            if "HTTPS" in label:
                msg = "[Django] → Open https://localhost:8000 in the browser and accept the self-signed certificate.\n"
                line_queue.put(msg)
                buffer.append(msg)
            t = threading.Thread(
                target=run_command_with_process,
                args=(project_root, tag, cwd_subpath, argv_builder, line_queue, buffer, running, key),
                daemon=True,
            )
            t.start()

        return handler

    def stop_django(_):
        with running_lock:
            to_stop = [k for k in list(running.keys()) if "Django" in k]
            for k in to_stop:
                try:
                    running[k].terminate()
                except Exception:
                    pass
                del running[k]
        if to_stop:
            line_queue.put("[Django] Stopped.\n")
            buffer.append("[Django] Stopped.\n")

    def stop_expo(_):
        with running_lock:
            to_stop = [k for k in list(running.keys()) if "Expo" in k]
            for k in to_stop:
                try:
                    running[k].terminate()
                except Exception:
                    pass
                del running[k]
        if to_stop:
            line_queue.put("[Expo] Stopped.\n")
            buffer.append("[Expo] Stopped.\n")

    commands = _commands(project_root)
    django_items = []
    expo_items = []
    # First item in each submenu: Stop
    django_items.append(rumps.MenuItem("Stop Django", callback=stop_django))
    expo_items.append(rumps.MenuItem("Stop Expo", callback=stop_expo))
    for (label, tag, cwd_subpath, argv_builder) in commands:
        h = make_handler(label, tag, cwd_subpath, argv_builder)
        item = rumps.MenuItem(label, callback=h)
        if "Django" in label:
            django_items.append(item)
        else:
            expo_items.append(item)

    # Rumps submenus use bracket syntax: [parent, [child1, child2, ...]]
    app = rumps.App("Biot", title="Biot")
    app.menu = [
        [rumps.MenuItem("Django"), django_items],
        [rumps.MenuItem("Expo"), expo_items],
        None,
        rumps.MenuItem("Show output", callback=lambda _: output_window.show()),
        None,
    ]
    # Drain output queue into Cocoa window on the main thread (avoids Tk + GIL crash)
    @rumps.timer(0.15)
    def drain_output(_):
        output_window.drain_queue()
    app.run()


if __name__ == "__main__":
    main()
