"""Telegram-бот Bilim Ordo.

По команде /start бот присылает кнопку, которая открывает мини-приложение.
Работает без дополнительных библиотек: нужен только Python 3.
Токен бота и адрес мини-приложения берутся из файла .env рядом с этим файлом.

Запуск:  python3 bot.py     Остановка: Ctrl+C
"""

import json
import os
import time
import urllib.error
import urllib.request

HERE = os.path.dirname(os.path.abspath(__file__))


def load_env(path):
    """Читает строки вида КЛЮЧ=значение из файла .env."""
    values = {}
    if os.path.exists(path):
        with open(path, encoding="utf-8") as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith("#") and "=" in line:
                    key, value = line.split("=", 1)
                    values[key.strip()] = value.strip()
    return values


env = load_env(os.path.join(HERE, ".env"))
BOT_TOKEN = env.get("BOT_TOKEN") or os.getenv("BOT_TOKEN")
WEBAPP_URL = env.get("WEBAPP_URL") or os.getenv("WEBAPP_URL")
API = f"https://api.telegram.org/bot{BOT_TOKEN}/"


def call(method, params):
    """Отправляет запрос в Telegram и возвращает ответ."""
    data = json.dumps(params).encode("utf-8")
    req = urllib.request.Request(API + method, data=data,
                                 headers={"Content-Type": "application/json"})
    with urllib.request.urlopen(req, timeout=40) as resp:
        return json.loads(resp.read().decode("utf-8"))


def send_welcome(chat_id):
    call("sendMessage", {
        "chat_id": chat_id,
        "text": "Добро пожаловать в Bilim Ordo: уроки по высшей математике "
                "от реальных преподавателей.",
        "reply_markup": {"inline_keyboard": [[
            {"text": "Открыть уроки", "web_app": {"url": WEBAPP_URL}}
        ]]},
    })


def main():
    if not BOT_TOKEN or not WEBAPP_URL:
        raise SystemExit("Заполните BOT_TOKEN и WEBAPP_URL в файле bot/.env")

    try:
        me = call("getMe", {})["result"]
    except urllib.error.HTTPError:
        raise SystemExit("Telegram не принял токен. Проверьте строку BOT_TOKEN в bot/.env: "
                         "токен должен быть вставлен один раз, без пробелов и кавычек.")
    print(f"Бот @{me['username']} запущен. Остановить: Ctrl+C")

    offset = 0
    while True:
        try:
            updates = call("getUpdates", {"offset": offset, "timeout": 30})["result"]
        except (urllib.error.URLError, TimeoutError) as e:
            print("Нет связи с Telegram, пробую снова...", e)
            time.sleep(3)
            continue

        for update in updates:
            offset = update["update_id"] + 1
            message = update.get("message") or {}
            text = message.get("text", "")
            if text.startswith("/start"):
                send_welcome(message["chat"]["id"])


if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print("\nБот остановлен.")
