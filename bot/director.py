import re

from config import ROADMAP_FILE

EPIC_ORDER = [1, 4, 2, 3, 5]


def _parse_roadmap():
    """Return dict: epic_num -> {name, tasks:[str]}."""
    text = ROADMAP_FILE.read_text()
    epics = {}
    current_num = None

    for line in text.split("\n"):
        m = re.match(r"^## Epic (\d+): (.+)", line)
        if m:
            current_num = int(m.group(1))
            if current_num not in epics:
                epics[current_num] = {"name": m.group(2).strip(), "tasks": []}
            continue

        m = re.match(r"^- \[ \] (.+)", line)
        if m and current_num:
            task = m.group(1).strip()
            if task.startswith("**[DECISION NEEDED]**") or task.startswith("*("):
                continue
            epics[current_num]["tasks"].append(task)

    return epics


def suggest_batch(count=5):
    """Return up to `count` unchecked tasks as list of (task_text, epic_label)."""
    epics = _parse_roadmap()
    result = []

    for num in EPIC_ORDER:
        if num not in epics:
            continue
        for task in epics[num]["tasks"]:
            if len(result) >= count:
                return result
            result.append((task, f"Epic {num}"))

    return result


def find_next_task():
    """Legacy: return single next task dict or None."""
    tasks = suggest_batch(1)
    if tasks:
        return {"task": tasks[0][0], "epic": f"Epic {tasks[0][1]}"}
    return None
