import hashlib
import logging

from telegram import InlineKeyboardButton, InlineKeyboardMarkup, Update
from telegram.error import BadRequest
from telegram.ext import (
    Application,
    CallbackContext,
    CallbackQueryHandler,
    CommandHandler,
)

logging.basicConfig(
    format="%(asctime)s [%(levelname)s] %(message)s",
    level=logging.INFO,
)
log = logging.getLogger(__name__)

from config import ALLOWED_USER_ID, BOT_TOKEN, TASKS_FILE
from director import suggest_batch
from task_queue import (
    count_done,
    is_batch_done,
    read_batch,
    read_status,
    set_status,
    write_batch,
    clear_batch,
)

# ── State ──
_last_content_hash = ""
BATCH_SIZE = 5


# ── Auth ──
async def _auth(update: Update) -> bool:
    if update.effective_user.id != ALLOWED_USER_ID:
        await update.message.reply_text("⛔ Unauthorized")
        return False
    return True


def _auth_cb(query) -> bool:
    return query.from_user.id == ALLOWED_USER_ID


# ── Formatting ──
def _fmt_batch(tasks):
    """Accept list of (task,epic) tuples or list of dicts from read_batch()."""
    emoji = ["1️⃣", "2️⃣", "3️⃣", "4️⃣", "5️⃣", "6️⃣", "7️⃣", "8️⃣", "9️⃣", "🔟"]
    is_dict = tasks and isinstance(tasks[0], dict)
    lines = [f"📌 *Batch ({len(tasks)} tasks)*", ""]
    for i, item in enumerate(tasks):
        task = item["task"] if is_dict else item[0]
        epic = item["epic"] if is_dict else item[1]
        e = emoji[i] if i < len(emoji) else f"{i+1}."
        lines.append(f"{e} `[{epic}]` {task}")
    return "\n".join(lines)


def _approve_kb():
    return InlineKeyboardMarkup([
        [InlineKeyboardButton("✅ Approve Batch", callback_data="approve"),
         InlineKeyboardButton("⏭️ Skip", callback_data="skip")]
    ])


# ── Suggest & Send ──
async def _suggest_and_send(bot):
    tasks = suggest_batch(BATCH_SIZE)
    if not tasks:
        await bot.send_message(ALLOWED_USER_ID, "🎉 Semua task dah siap! Tunggu roadmap update.")
        return

    write_batch(tasks, status="pending")

    msg = _fmt_batch(tasks) + "\n\n_Guna butang bawah untuk luluskan batch ni._"
    await bot.send_message(
        ALLOWED_USER_ID, msg, reply_markup=_approve_kb(), parse_mode="Markdown",
    )


# ── Handlers ──
async def start(update: Update, context):
    if not await _auth(update):
        return
    await update.message.reply_text(
        "🤖 *KIZ Director Bot*\n\n"
        "`/next` — Suggest batch baru\n"
        "`/status` — Status batch semasa\n"
        "`/tasks` — Senarai task dalam batch\n"
        "`/done` — Tandakan batch selesai manual",
        parse_mode="Markdown",
    )


async def cmd_next(update: Update, context):
    if not await _auth(update):
        return
    await _suggest_and_send(context.bot)


async def cmd_status(update: Update, context):
    if not await _auth(update):
        return
    st = read_status()
    batch = read_batch()

    if st == "pending":
        tasks = [t for t in batch] if batch else []
        msg = "⏳ *Batch menunggu approval*\n\n"
        for i, t in enumerate(tasks, 1):
            msg += f"{i}. `[{t['epic']}]` {t['task']}\n"
    elif st == "approved":
        done, total = count_done()
        lines = [f"📋 *Batch dalam kerja:* `{done}/{total}`", ""]
        for t in batch or []:
            c = "✅" if t["done"] else "⏳"
            lines.append(f"{c} `[{t['epic']}]` {t['task']}")
        msg = "\n".join(lines)
    else:
        msg = "💤 Tiada batch aktif. Guna /next untuk suggest."

    await update.message.reply_text(msg, parse_mode="Markdown")


async def cmd_tasks(update: Update, context):
    if not await _auth(update):
        return
    batch = read_batch()
    if not batch:
        await update.message.reply_text("Tiada batch aktif.")
        return
    st = read_status()
    lines = [f"📋 *Batch ({st}) ({len(batch)} tasks)*"]
    for t in batch:
        c = "✅" if t["done"] else "⬜"
        lines.append(f"{c} `[{t['epic']}]` {t['task']}")
    await update.message.reply_text("\n".join(lines), parse_mode="Markdown")


async def cmd_done(update: Update, context):
    if not await _auth(update):
        return
    if not read_batch():
        await update.message.reply_text("Tiada batch aktif.")
        return
    clear_batch()
    await update.message.reply_text("✅ Batch ditandakan selesai. /next untuk batch baru.")


async def cmd_refresh(update: Update, context):
    if not await _auth(update):
        return
    await update.message.reply_text("🔄 Refresh batch...")
    await _suggest_and_send(context.bot)


# ── Button Callbacks ──
async def button_handler(update: Update, context):
    query = update.callback_query

    try:
        await query.answer()
        log.info(f"Callback from user {query.from_user.id}: {query.data}")
    except BadRequest as e:
        log.warning(f"Callback expired: {e}")
        await context.bot.send_message(
            ALLOWED_USER_ID,
            "⏳ Sesi button sebelumnya dah tamat. Hantar batch baru...",
            parse_mode="Markdown",
        )
        await _suggest_and_send(context.bot)
        return
    except Exception as e:
        log.error(f"Callback answer failed: {e}")
        await query.answer(text="⚠️ Error", show_alert=True)
        return

    if not _auth_cb(query):
        log.warning(f"Unauthorized callback from {query.from_user.id}")
        await query.answer(text="⛔ Unauthorized", show_alert=True)
        return

    data = query.data
    log.info(f"Processing callback: {data}")

    try:
        if data == "approve":
            st = read_status()
            if st != "pending":
                await query.edit_message_text("⏳ Batch dah tamat tempoh. Guna /next.")
                return
            set_status("approved")
            batch = read_batch()
            n = len(batch) if batch else 0
            await query.edit_message_text(
                f"✅ *Batch approved!* ({n} tasks)\n\nAI akan mula kerja bila sesi coding seterusnya.",
                parse_mode="Markdown",
            )
            log.info(f"Batch approved: {n} tasks")

        elif data == "skip":
            await _suggest_and_send(context.bot)
            await query.delete_message()
            log.info("Batch skipped, new batch suggested")
    except Exception as e:
        log.error(f"Button handler error: {e}", exc_info=True)
        await query.answer(text=f"⚠️ Error: {str(e)[:50]}", show_alert=True)


# ── File Watcher ──
async def _file_hash() -> str:
    content = TASKS_FILE.read_text() if TASKS_FILE.exists() else ""
    return hashlib.md5(content.encode()).hexdigest()


async def watch_tasks(context: CallbackContext):
    global _last_content_hash

    current_hash = await _file_hash()
    if current_hash == _last_content_hash:
        return

    prev_hash = _last_content_hash
    _last_content_hash = current_hash

    if not prev_hash:
        return

    st = read_status()
    batch = read_batch()

    if st == "done" or (not batch and st is None):
        await _suggest_and_send(context.bot)


async def post_init(app):
    global _last_content_hash

    st = read_status()
    batch = read_batch()

    if st == "approved" and batch:
        done, total = count_done()
        if is_batch_done():
            clear_batch()
            await app.bot.send_message(
                ALLOWED_USER_ID, "🤖 *KIZ Director* aktif!\n\n✅ Batch sebelumnya dah siap. Cari batch baru...",
                parse_mode="Markdown",
            )
            await _suggest_and_send(app.bot)
        else:
            await app.bot.send_message(
                ALLOWED_USER_ID,
                f"🤖 *KIZ Director* aktif!\n\n📋 Batch sedang jalan: `{done}/{total}` siap.",
                parse_mode="Markdown",
            )
    elif st == "pending" and batch:
        msg = _fmt_batch(batch) + "\n\n_Guna butang bawah untuk luluskan batch ni._"
        await app.bot.send_message(
            ALLOWED_USER_ID, msg, reply_markup=_approve_kb(), parse_mode="Markdown",
        )
    else:
        clear_batch()
        await app.bot.send_message(
            ALLOWED_USER_ID, "🤖 *KIZ Director* aktif!\n\nMencari task seterusnya...",
            parse_mode="Markdown",
        )
        await _suggest_and_send(app.bot)

    _last_content_hash = await _file_hash()


# ── Main ──
def main():
    app = (
        Application.builder()
        .token(BOT_TOKEN)
        .post_init(post_init)
        .build()
    )

    app.add_handler(CommandHandler("start", start))
    app.add_handler(CommandHandler("next", cmd_next))
    app.add_handler(CommandHandler("status", cmd_status))
    app.add_handler(CommandHandler("tasks", cmd_tasks))
    app.add_handler(CommandHandler("done", cmd_done))
    app.add_handler(CommandHandler("refresh", cmd_refresh))
    app.add_handler(CallbackQueryHandler(button_handler))

    app.job_queue.run_repeating(watch_tasks, interval=30, first=15)

    print("🤖 KIZ Director Bot started...")
    app.run_polling(allowed_updates=Update.ALL_TYPES)


if __name__ == "__main__":
    main()
