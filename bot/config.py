import os
from pathlib import Path


def _load_env():
    env_file = Path(__file__).parent / ".env"
    if env_file.exists():
        for line in env_file.read_text().split("\n"):
            line = line.strip()
            if line and not line.startswith("#") and "=" in line:
                key, val = line.split("=", 1)
                os.environ[key.strip()] = val.strip()


_load_env()

BOT_TOKEN = os.environ["BOT_TOKEN"]
ALLOWED_USER_ID = int(os.environ["ALLOWED_USER_ID"])
PROJECT_ROOT = Path(__file__).parent.parent
TASKS_FILE = PROJECT_ROOT / "TASKS.md"
ROADMAP_FILE = PROJECT_ROOT / "ROADMAP.md"
