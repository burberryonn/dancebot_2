import { Bot, InlineKeyboard, Keyboard } from "grammy";
import "dotenv/config";
import { handleEventCreationCallback } from "./callbackHandlers/eventHandlersCallback.js";
import { subscribeHandler } from "./callbackHandlers/subscribeHandler.js";
import { unsubscribeHandler } from "./callbackHandlers/subscribeHandler.js";
import { changeEventHandler } from "./callbackHandlers/changeEventHandler.js";
import { eventResponseHandler } from "./callbackHandlers/eventResponseHandler.js";
import { eventPageHandler } from "./callbackHandlers/eventPageHandler.js";
import { sendRepeatRassilkaHandler } from "./callbackHandlers/sendRassilkaHandler.js";
import { updateResults } from "./callbackHandlers/eventGetlastupdate.js";
import startServer from "./server.js";
import { createEvent, getAllEvent, saveEventResponse } from "./services/api.js";
import { generateDateTimeSelector } from "./utils/calendar.js";
import { sendRassilka } from "./utils/rassilka.js";
import { response } from "express";

const bot = new Bot(process.env.BOT_API_KEY);
const ADMIN_ID = Number(process.env.ADMIN_ID);
const eventCreationData = {};

bot.command("start", async (ctx) => {
  const { id: user_id, username: username } = ctx.from;
  if (user_id === ADMIN_ID) {
    const keyboard = new Keyboard();
    const adminPanel = keyboard
      .text("Создать ивент")
      .row()
      .text("Результаты")
      .row()
      .text("Ивенты")
      .resized();
    return ctx.reply("Привет админ", { reply_markup: adminPanel });
  }
  // await saveEventResponse(eventId, user_id, username,'Пойду');
  const keyboard = new InlineKeyboard()
    .text("Подписаться на рассылку", "subscribe")
    .text("Отписаться от рассылки", "unsubscribe");
  await ctx.reply(`${username} выбери действие`, {
    reply_markup: keyboard,
  });
});

bot.callbackQuery("subscribe", subscribeHandler);

bot.callbackQuery("unsubscribe", unsubscribeHandler);

// bot.callbackQuery(/^(yes|no)_(\d+)$/, async (ctx) => {
//   const [fullMatch, response, eventId] = ctx.match;
//   console.log(`Full match: ${fullMatch}`);

//   const responseText = response === "yes" ? "Пойду" : "Не пойду";
//   console.log(`Ответ: ${responseText}, Event ID: ${eventId}`);
//   await ctx.answerCallbackQuery(`Ваш ответ: ${responseText}`);
// });
bot.callbackQuery(/^(yes|no)_[a-f0-9]{24}$/, eventResponseHandler);

bot.callbackQuery(/^sendrassilka:[a-f0-9]{24}$/, sendRepeatRassilkaHandler);

bot.callbackQuery(/^change_event:(\d+)/, changeEventHandler);

bot.callbackQuery(/^event_page:(\d+)/, eventPageHandler);


bot.callbackQuery("cancel", async (ctx) => {
  await ctx.answerCallbackQuery("Выбор отменён.");
  await ctx.editMessageText("Выбор даты и времени отменён.");
});

bot.hears("Создать ивент", async (ctx) => {
  if (ctx.from.id !== ADMIN_ID) {
    return ctx.reply("Эта команда доступна только администратору.");
  }
  eventCreationData[ctx.from.id] = {};
  ctx.reply("Введите приветствие:");
});

bot.hears("Результаты", async (ctx) => {
  if (ctx.from.id !== ADMIN_ID) {
    return ctx.reply("Эта команда доступна только администратору.");
  }
  let lastUpdate = null;
  let lastText = "";
  const results = await updateResults(
    ctx.message.message_id,
    lastText,
    ctx,
    bot,
    lastUpdate
  );
  const pages = results.responseText.split("\n\n---\n\n");
  const totalPages = pages.length;
  if (!totalPages) {
    return ctx.reply("Нет созданных ивентов.");
  }
  const getKeyboard = (page) => {
    const keyboard = new InlineKeyboard();
    if (page > 0) keyboard.text("⬅️ Назад", `event_page:${page - 1}`);
    if (page < totalPages - 1)
      keyboard.text("Вперед ➡️", `event_page:${page + 1}`);
    return keyboard;
  };
  await ctx.reply(pages[0], {
    parse_mode: "HTML",
    reply_markup: getKeyboard(0),
  });
});

bot.hears("Ивенты", async (ctx) => {
  const { allEvents } = await getAllEvent(bot);
  if (!allEvents.length) {
    return ctx.reply("Нет доступных ивентов.");
  }
  let currentIndex = 0;
  const sendEventMessage = async (index) => {
    const event = allEvents[index];
    const keyboard = new InlineKeyboard()
      .text(index > 0 ? "👈 Предыдущий" : " ", `change_event:${index - 1}`)
      .text("Повторная рассылка", `sendrassilka:${event.id}`)
      .text(
        index < allEvents.length - 1 ? "Следующий 👉" : " ",
        `change_event:${index + 1}`
      );
    try {
      await ctx.replyWithPhoto(event.image, {
        caption: `<b>Ивент:${event.title}</b>\n\nАдрес: ${
          event.address
        }\n\nОписание: ${event.description || "Описание отсутствует"}`,
        reply_markup: keyboard,
        parse_mode: "HTML",
      });
    } catch (error) {
      console.log(error);
    }
  };
  await sendEventMessage(currentIndex);
});

bot.on("message", async (ctx) => {
  const currentEvent = eventCreationData[ctx.from.id];
  if (!currentEvent) return;

  if (!currentEvent.invitation_message) {
    currentEvent.invitation_message = ctx.message.text;
    currentEvent.waitingForPhoto = true;
    return ctx.reply("Введите название ивента:");
  }
  if (!currentEvent.title) {
    currentEvent.title = ctx.message.text;
    return ctx.reply("Введите описание ивента:");
  }
  if (!currentEvent.description) {
    currentEvent.description = ctx.message.text;
    return ctx.reply("Введите адрес ивента:");
  }
  if (!currentEvent.address) {
    currentEvent.address = ctx.message.text;
    const now = new Date();
    const calendar = generateDateTimeSelector(
      now.getFullYear(),
      now.getMonth(),
      "date"
    );
    await ctx.reply("Выберите дату:", { reply_markup: calendar });
    return;
  }
  if (!currentEvent.event_time && currentEvent.waitingForDate) {
    currentEvent.event_time = new Date(ctx.message.text);
    if (isNaN(currentEvent.event_time)) {
      return ctx.reply("Неверный формат даты. Пожалуйста, попробуйте снова.");
    }
    currentEvent.waitingForDate = false;
  }
  if (!currentEvent.image && currentEvent.waitingForPhoto) {
    if (ctx.message.photo && ctx.message.photo.length > 0) {
      const photo = ctx.message.photo[ctx.message.photo.length - 1].file_id;
      currentEvent.image = photo;
      await ctx.reply("Фото сохранено. Событие создается...");
      try {
        const event = await createEvent(currentEvent);
        delete eventCreationData[ctx.from.id];
        const message = `${event.invitation_message}\n\n${
          event.title
        }\n\nКогда?${new Date(event.event_time).toLocaleString("ru-RU", {
          day: "numeric",
          month: "numeric",
          weekday: "long",
          hour: "numeric",
          minute: "numeric",
        })}\n\nГде?${event.address}\n\n${
          event.description || "Подробности уточняются."
        }Записаться можно через личные сообщения @vslomalinafik 💌
          `;
        await sendRassilka(message, currentEvent.image, bot, event.id);
      } catch (error) {
        console.error("Ошибка при создании ивента:", error);
        await ctx.reply(
          "Произошла ошибка при создании ивента. Пожалуйста, попробуйте снова."
        );
      }
    } else {
      await ctx.reply("Пожалуйста, отправьте фото.");
    }
  } else if (!currentEvent.image) {
    await ctx.reply("Сначала отправьте фото, чтобы продолжить.");
  }
});

// Обработка callbackQuery для подписки

bot.on("callback_query", (ctx) =>
  handleEventCreationCallback(ctx, eventCreationData)
);

// Обработка команд и сообщений

// Другие обработчики команд и сообщений

// Запуск бота
await startServer();
bot.start();
