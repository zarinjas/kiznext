import re

from config import TASKS_FILE


def read_batch():
    """Return list of tasks or None."""
    if not TASKS_FILE.exists():
        return None
    text = TASKS_FILE.read_text().strip()
    if not text:
        return None

    tasks = []
    for line in text.split("\n"):
        m = re.match(r"- \[([ x])\] (?:\[(Epic \d+)\])?\s*(.+)", line)
        if m:
            done = m.group(1) == "x"
            epic = m.group(2) or ""
            task = m.group(3).strip()
            tasks.append({"task": task, "epic": epic, "done": done})
    return tasks if tasks else None


def read_status():
    """Return status string: pending | approved | done | None."""
    if not TASKS_FILE.exists():
        return None
    text = TASKS_FILE.read_text().strip()
    if not text:
        return None
    m = re.search(r"# Status:\s*(\w+)", text)
    return m.group(1) if m else None


def set_status(status):
    """Update status line in TASKS.md."""
    if not TASKS_FILE.exists():
        TASKS_FILE.write_text(f"# Status: {status}\n")
        return
    lines = TASKS_FILE.read_text().split("\n")
    new_lines = []
    found = False
    for line in lines:
        if line.startswith("# Status:"):
            new_lines.append(f"# Status: {status}")
            found = True
        else:
            new_lines.append(line)
    if not found:
        new_lines.insert(0, f"# Status: {status}")
    TASKS_FILE.write_text("\n".join(new_lines).strip() + "\n")


def write_batch(tasks, status="pending"):
    """Write tasks as a batch with initial status."""
    lines = [f"# Status: {status}", f"# Batch ({len(tasks)} tasks)", ""]
    for task, epic in tasks:
        lines.append(f"- [ ] [{epic}] {task}")
    TASKS_FILE.write_text("\n".join(lines) + "\n")


def count_done():
    """Return (done_count, total_count)."""
    batch = read_batch()
    if not batch:
        return (0, 0)
    done = sum(1 for t in batch if t["done"])
    return (done, len(batch))


def is_batch_done():
    """Return True if all tasks in batch are done."""
    batch = read_batch()
    if not batch:
        return True
    return all(t["done"] for t in batch)


def clear_batch():
    TASKS_FILE.write_text("")
