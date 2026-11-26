"""Заготовка Telegram-бота Bilim Ordo.

По команде /start бот присылает кнопку, которая открывает мини-приложение.
Токен бота и адрес мини-приложения берутся из файла .env (пример: .env.example).
"""

import asyncio
import os

from aiogram import Bot, Dispatcher
from aiogram.filters import CommandStart
from aiogram.types import (InlineKeyboardButton, InlineKeyboardMarkup,
                           Message, WebAppInfo)
from dotenv import load_dotenv

load_dotenv()
BOT_TOKEN = os.getenv("BOT_TOKEN")
WEBAPP_URL = os.getenv("WEBAPP_URL")

dp = Dispatcher()


@dp.message(CommandStart())
async def start(message: Message) -> None:
    keyboard = InlineKeyboardMarkup(inline_keyboard=[[
        InlineKeyboardButton(text="Открыть уроки", web_app=WebAppInfo(url=WEBAPP_URL))
    ]])
    await message.answer(
        "Добро пожаловать в Bilim Ordo: уроки по высшей математике от реальных преподавателей.",
        reply_markup=keyboard,
    )


async def main() -> None:
    if not BOT_TOKEN or not WEBAPP_URL:
        raise SystemExit("Заполните BOT_TOKEN и WEBAPP_URL в файле bot/.env")
    await dp.start_polling(Bot(BOT_TOKEN))


if __name__ == "__main__":
    asyncio.run(main())
