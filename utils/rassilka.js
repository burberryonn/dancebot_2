import { InlineKeyboard } from "grammy";
import User from "../db/models/user.js";
import EventResponse from "../db/models/eventresponse.js";

export async function repeatRassilka(message, photo, bot, eventId) {
  const answerKeyboard = new InlineKeyboard()
    .text("Пойду", `yes_${eventId}`)
    .text("Не пойду", `no_${eventId}`);

  const eventResponses = await EventResponse.find({ EventId: eventId });
  const users = await User.find();

  console.log("Найденные ответы на ивент:", eventResponses);

  const usersToNotify = users.filter((user) => {
    return !eventResponses.some((response) => response.UserId === Number(user.user_id));
  });

  console.log("Пользователи для уведомления:", usersToNotify);

  try {
    if (!photo) {
      for (const user of usersToNotify) {
        await bot.api.sendMessage(user.user_id, message, {
          parse_mode: "HTML",
          reply_markup: answerKeyboard,
        });
      }
    } else {
      for (const user of usersToNotify) {
        await bot.api.sendPhoto(user.user_id, photo, {
          caption: message,
          parse_mode: "HTML",
          reply_markup: answerKeyboard,
        });
      }
    }
  } catch (error) {
    console.error("Ошибка при отправке сообщений:", error);
    throw error;
  }
}

export async function sendRassilka(message, photo, bot, eventId) {
  const answerKeyboard = new InlineKeyboard()
    .text("Пойду", `yes_${eventId.toString()}`)
    .text("Не пойду", `no_${eventId.toString()}`);

  console.log("Создана клавиатура с callback_data:", answerKeyboard);

  const eventResponses = await EventResponse.find({ EventId: eventId });
  const users = await User.find();

  console.log("События:", eventResponses);
  console.log("Пользователи:", users);

  const usersToNotify = users.filter((user) => {
    return !eventResponses.some((response) => response.UserId === user.user_id);
  });

  console.log("Пользователи для рассылки:", usersToNotify);

  try {
    if (!photo) {
      for (const user of usersToNotify) {
        await bot.api.sendMessage(user.user_id, message, {
          parse_mode: "HTML",
          reply_markup: answerKeyboard,
        });
      }
    } else {
      for (const user of usersToNotify) {
        await bot.api.sendPhoto(user.user_id, photo, {
          caption: message,
          reply_markup: answerKeyboard,
          parse_mode: "HTML",
        });
      }
    }
  } catch (error) {
    console.error("Ошибка при отправке рассылки:", error);
    throw error;
  }
}
