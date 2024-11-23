import { Bot, InlineKeyboard, Keyboard } from "grammy";
import "dotenv/config";
import { addUser, createEvent, getAllEvent } from "./services/api.js";
import { updateResults } from "./botActions/getlastupdate.js";
import { generateDateTimeSelector } from "./utils/calendar.js";
import {
  repeatRassilka,
  sendRassilkaMessageWithPhoto,
} from "./utils/rassilka.js";
import { handleEventCreationCallback } from "./botActions/eventHandlersCallback.js";
import mongoose from "mongoose";
import startServer from "./server.js";

import User from "./db/models/user.js";
await startServer();

const bot = new Bot(`${process.env.BOT_API_KEY}`);
const ADMIN_ID = Number(process.env.ADMIN_ID);
// Промежуточное хранилище для незавершенного ивента

const eventCreationData = {};
bot.command("start", async (ctx) => {
  const { id: user_id, username: username } = ctx.from;
  // Проверяем, если это администратор, показываем сообщение "Панель управления"
  console.log(user_id, ADMIN_ID);
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
  // Inline-клавиатура для подписки и отписки
  const keyboard = new InlineKeyboard()
    .text("Подписаться на рассылку", "subscribe")
    .text("Отписаться от рассылки", "unsubscribe");
  // Отправляем пользователю меню
  await ctx.reply(`${username} выбери действие`, {
    reply_markup: keyboard,
  });
});

bot.on("message", async (ctx) => {
  try {
    const username = ctx.from.username || "гость";
    const telegramId = ctx.from.id;
    console.log(telegramId);
    // Ответ пользователю
    await ctx.reply(`Привет, ${username}!`);

    // Сохранение пользователя в MongoDB
    let user = await User.findOne({ user_id: telegramId });
    if (!user) {
      console.log(telegramId);
      user = new User({
        user_id: telegramId,
        username: username,
      });
      await user.save();
      console.log(`Новый пользователь сохранён: ${username}`);
    } else {
      console.log(`Пользователь уже существует: ${username}`);
    }
  } catch (error) {
    console.error("Ошибка при обработке сообщения:", error.message);
    await ctx.reply("Произошла ошибка, попробуйте позже.");
  }
});

// Обработчик нажатий на кнопки подписки/отписки
bot.callbackQuery("subscribe", async (ctx) => {
  const { id: user_id, username } = ctx.from;
  // Проверяем, есть ли пользователь в базе
  const existingUser = await User.findOne({ where: { user_id } });
  if (existingUser) {
    await ctx.answerCallbackQuery({
      text: `${username}, вы уже подписаны на рассылку.`,
    });
  } else {
    await addUser(user_id, username); // Функция добавляет пользователя в базу данных
    await ctx.answerCallbackQuery({
      text: `${username}, вы успешно подписались на рассылку.`,
    });
  }
});
bot.callbackQuery("unsubscribe", async (ctx) => {
  const { id: user_id, username } = ctx.from;
  // Удаляем пользователя из базы
  const deletedUserCount = await User.destroy({ where: { user_id } });
  if (deletedUserCount > 0) {
    await ctx.answerCallbackQuery({
      text: `${username}, вы отписались от рассылки.`,
    });
  } else {
    await ctx.answerCallbackQuery({
      text: `${username}, вы не были подписаны на рассылку.`,
    });
  }
});
bot.callbackQuery(/^(yes|no)_(\d+)$/, async (ctx) => {
  const response = ctx.match[1] === "yes" ? "Пойду" : "Не пойду";
  const eventId = Number(ctx.match[2]);
  const userId = ctx.from.id;
  const username = ctx.from.username.toString();
  try {
    const [eventResponse, created] = await EventResponse.findOrCreate({
      where: { EventId: eventId, UserId: userId, Username: username },
      defaults: { response },
    });
    if (!created) {
      eventResponse.response = response;
      await eventResponse.save();
    }
    await ctx.answerCallbackQuery(`Ваш ответ: "${response}" принят.`);
  } catch (error) {
    console.error("Ошибка при сохранении ответа:", error);
    await ctx.answerCallbackQuery("Ошибка при сохранении ответа.");
  }
});
bot.callbackQuery(/^change_event:(\d+)/, async (ctx) => {
  const newIndex = parseInt(ctx.match[1], 10);
  const { allEvents } = await getAllEvent(bot);
  // Проверка границ
  if (newIndex < 0 || newIndex >= allEvents.length) {
    return ctx.answerCallbackQuery("Нет больше ивентов.");
  }
  // Отправка нового ивента
  const event = allEvents[newIndex];
  const keyboard = new InlineKeyboard()
    .text(newIndex > 0 ? "👈 Предыдущий" : " ", `change_event:${newIndex - 1}`)
    .text("Повторная рассылка", `sendrassilka:${event.id}`)
    .text(
      newIndex < allEvents.length - 1 ? "Следующий 👉" : " ",
      `change_event:${newIndex + 1}`
    );
  try {
    const message = `
        Всем добрый вечер🌆🙏\n\n🧘‍♀️Приглашаю всех присутствующих на "<b>${
          event.title
        }</b>"🧘‍♀️\n\n<i>Когда?</i> <b>${new Date(
      event.event_time
    ).toLocaleString("ru-RU", {
      day: "numeric",
      month: "numeric",
      weekday: "long",
      hour: "numeric",
      minute: "numeric",
    })}</b>\n\n<i>Где?</i> <b>${
      event.address
    }</b>\n\n<i>Что берем с собой?</i> <b>Прекрасное настроение, удобную одежду, водичку)</b>\n\n<i>Что нас ждет?</i><b>${
      event.description || "Подробности уточняются."
    }</b>\n\nЗаписаться можно через личные сообщения <b>@vslomalinafik</b> 💌
      `;
    await ctx.editMessageMedia(
      {
        type: "photo",
        media: event.image, // File ID фотографии
        caption: message,
        parse_mode: "HTML",
      },
      {
        reply_markup: keyboard, // Обновляем клавиатуру
      }
    );
    await ctx.answerCallbackQuery();
  } catch (error) {
    console.error(error);
    await ctx.answerCallbackQuery("Не удалось обновить ивент.");
  }
});
bot.callbackQuery(/^event_page:(\d+)/, async (ctx) => {
  const page = parseInt(ctx.match[1], 10);
  if (isNaN(page)) return;
  let lastUpdate = null;
  let lastText = "";
  const results = await updateResults(
    ctx.callbackQuery.message?.message_id,
    lastText,
    ctx,
    bot,
    lastUpdate
  );
  const pages = results.responseText.split("\n\n---\n\n");
  const totalPages = pages.length;
  if (page < 0 || page >= totalPages) {
    return ctx.answerCallbackQuery("Некорректная страница.");
  }
  await ctx.api.editMessageText(
    ctx.chat.id,
    ctx.callbackQuery.message?.message_id,
    pages[page],
    {
      parse_mode: "HTML",
      reply_markup: new InlineKeyboard()
        .text(page > 0 ? "⬅️ Назад" : "", `event_page:${page - 1}`)
        .text(
          page < totalPages - 1 ? "Вперед ➡️" : "",
          `event_page:${page + 1}`
        ),
    }
  );
  await ctx.answerCallbackQuery();
});
bot.callbackQuery(/^sendrassilka:(\d+)$/, async (ctx) => {
  const eventId = parseInt(ctx.match[1], 10);
  try {
    const event = await Event.findByPk(eventId); // Получить текущий ивент из БД
    if (!event) {
      return ctx.answerCallbackQuery("Ивент не найден.");
    }
    // Отправка уведомлений
    const message = `${
      event.invitation_message
    }\n\n🧘‍♀️Приглашаю всех присутствующих на "<b>${
      event.title
    }</b>"🧘‍♀️\n\n<i>Когда?</i> <b>${new Date(event.event_time).toLocaleString(
      "ru-RU",
      {
        day: "numeric",
        month: "numeric",
        weekday: "long",
        hour: "numeric",
        minute: "numeric",
      }
    )}</b>\n\n<i>Где?</i><b> ${
      event.address
    }</b>\n\n<i>Что берем с собой?</i> <b>Прекрасное настроение, удобную одежду, водичку)</b>\n\n<i>Что нас ждет?</i><b> ${
      event.description || "Подробности уточняются."
    }</b>\n\nЗаписаться можно через личные сообщения <b>@vslomalinafik</b> 💌
      `;
    await repeatRassilka(message, event.image, bot, event.id);
    await ctx.answerCallbackQuery(
      "Рассылка отправлена пользователям, которые не ответили."
    );
  } catch (error) {
    console.error(error);
    await ctx.answerCallbackQuery("Произошла ошибка при отправке рассылки.");
  }
});
bot.callbackQuery("cancel", async (ctx) => {
  await ctx.answerCallbackQuery("Выбор отменён.");
  await ctx.editMessageText("Выбор даты и времени отменён.");
});
bot.hears("Создать ивент", async (ctx) => {
  if (ctx.from.id !== ADMIN_ID) {
    return ctx.reply("Эта команда доступна только администратору.");
  }
  // Начинаем процесс создания ивента
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
  const pages = results.responseText.split("\n\n---\n\n"); // Разбиваем текст на страницы
  const totalPages = pages.length;
  if (!totalPages) {
    return ctx.reply("Нет созданных ивентов.");
  }
  // Функция для формирования клавиатуры
  const getKeyboard = (page) => {
    const keyboard = new InlineKeyboard();
    if (page > 0) keyboard.text("⬅️ Назад", `event_page:${page - 1}`);
    if (page < totalPages - 1)
      keyboard.text("Вперед ➡️", `event_page:${page + 1}`);
    return keyboard;
  };
  // Отправляем первый экран
  await ctx.reply(pages[0], {
    parse_mode: "HTML",
    reply_markup: getKeyboard(0),
  });
});
// Хэндлер для инлайн-кнопок переключения
bot.hears("Ивенты", async (ctx) => {
  const { allEvents } = await getAllEvent(bot);
  if (!allEvents.length) {
    return ctx.reply("Нет доступных ивентов.");
  }
  // Начальный индекс
  let currentIndex = 0;
  // Функция для отправки ивента
  const sendEventMessage = async (index) => {
    const event = allEvents[index];
    // Генерация клавиатуры
    const keyboard = new InlineKeyboard()
      .text(index > 0 ? "👈 Предыдущий" : " ", `change_event:${index - 1}`)
      .text("Повторная рассылка", `sendrassilka:${event.id}`)
      .text(
        index < allEvents.length - 1 ? "Следующий 👉" : " ",
        `change_event:${index + 1}`
      );
    // Отправляем текст с ивентом
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
  // Отправить первый ивент
  await sendEventMessage(currentIndex);
});
// Последовательно обрабатываем каждый шаг создания ивента
// bot.on("message", async (ctx) => {
//   const currentEvent = eventCreationData[ctx.from.id];
//   if (!currentEvent) return; // Если ивент не создается, игнорируем
//   // Шаги для ввода данных об ивенте
//   if (!currentEvent.title) {
//     currentEvent.title = ctx.message.text;
//     return ctx.reply("Введите описание ивента:");
//   }
//   if (!currentEvent.description) {
//     currentEvent.description = ctx.message.text;
//     return ctx.reply("Введите адрес ивента:");
//   }
//   if (!currentEvent.address) {
//     currentEvent.address = ctx.message.text;
//     const now = new Date();
//     const calendar = generateDateTimeSelector(
//       now.getFullYear(),
//       now.getMonth(),
//       "date"
//     );
//     await ctx.reply("Выберите дату:", { reply_markup: calendar });
//     return;
//   }
//   if (!currentEvent.event_time && currentEvent.waitingForDate) {
//     currentEvent.event_time = new Date(); // ctx.message.text должно быть в формате, поддерживаемом JavaScript
//     // Проверка на корректность даты
//     if (isNaN(currentEvent.event_time)) {
//       return ctx.reply("Неверный формат даты. Пожалуйста, попробуйте снова.");
//     }
//     currentEvent.waitingForDate = false;
//   }
//   // Ввод приглашения
//   if (!currentEvent.invitation_message) {
//     currentEvent.invitation_message = ctx.message.text;
//     // Создание ивента
//     try {
//       const event = await Event.create(currentEvent as any);
//       delete eventCreationData[ctx.from.id];
//       await ctx.reply(
//         `Ивент "${event.title}" создан и отправлен всем пользователям.`
//       );
//       // Формируем сообщение по типу вашего шаблона
//       const message = `
//         Всем добрый вечер🌆🙏
//         🧘‍♀️Приглашаю всех присутствующих на "<b>${event.title}</b>"🧘‍♀️
//         Когда? <b>${new Date(event.event_time).toLocaleString("ru-RU", {
//           weekday: "long",
//           hour: "numeric",
//           minute: "numeric",
//         })}</b>
//         Где? <b>${event.address}</b>
//         Что берем с собой? Прекрасное настроение, удобную одежду, водичку)
//         Что нас ждет? <b>${event.description || "Подробности уточняются."}</b>
//         Записаться можно через личные сообщения <b>@vslomalinafik</b> 💌
//       `;
//       try {
//         await sendRassilkaMessage(message, bot, event.id);
//       } catch (error) {
//         console.error("Ошибка при отправке рассылки:", error);
//         await ctx.reply(`Не удалось отправить сообщение пользователю.`);
//       }
//     } catch (error) {
//       console.error("Ошибка при создании ивента:", error);
//       ctx.reply(
//         "Произошла ошибка при создании ивента. Пожалуйста, попробуйте снова."
//       );
//     }
//   }
// });
bot.on("message", async (ctx) => {
  const currentEvent = eventCreationData[ctx.from.id];
  if (!currentEvent) return;
  else {
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
      currentEvent.event_time = new Date(); // ctx.message.text должно быть в формате, поддерживаемом JavaScript
      // Проверка на корректность даты
      if (isNaN(currentEvent.event_time)) {
        return ctx.reply("Неверный формат даты. Пожалуйста, попробуйте снова.");
      }
      currentEvent.waitingForDate = false;
    }
    // Ввод приглашения
    // if (!currentEvent.invitation_message) {
    //   currentEvent.invitation_message = ctx.message.text;
    //   currentEvent.waitingForPhoto = true;
    // }
    if (!currentEvent.image && currentEvent.waitingForPhoto) {
      if (ctx.message.photo && ctx.message.photo.length > 0) {
        const photo = ctx.message.photo[ctx.message.photo.length - 1].file_id;
        currentEvent.image = photo;
        // Уведомляем пользователя, что фото успешно сохранено
        await ctx.reply("Фото сохранено. Событие создается...");
        // После получения фото создаем событие
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
          await sendRassilkaMessageWithPhoto(
            message,
            currentEvent.image,
            bot,
            event.id
          );
        } catch (error) {
          console.error("Ошибка при создании ивента:", error);
          await ctx.reply(
            "Произошла ошибка при создании ивента. Пожалуйста, попробуйте снова."
          );
        }
      } else {
        // Если фото нет, уведомляем пользователя
        await ctx.reply("Пожалуйста, отправьте фото.");
      }
    } else if (!currentEvent.image) {
      await ctx.reply("Сначала отправьте фото, чтобы продолжить.");
    }
  }
});
bot.on("callback_query", (ctx) =>
  handleEventCreationCallback(ctx, eventCreationData)
);
// Команда для администратора для проверки ответов
bot.start();
