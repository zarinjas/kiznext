#!/bin/bash
DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$DIR"

if [ ! -d "venv" ]; then
    echo "🔧 Creating Python venv..."
    python3 -m venv venv
fi

source venv/bin/activate

if ! pip freeze 2>/dev/null | grep -q python-telegram-bot; then
    echo "📦 Installing dependencies..."
    pip install -r requirements.txt
fi

echo "🤖 Starting KIZ Director Bot..."
python bot.py
