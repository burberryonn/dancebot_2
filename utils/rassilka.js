import { InlineKeyboard } from "grammy";

export async function sendRassilkaMessage(message, bot, eventId) {
  const answerKeyboard = new InlineKeyboard()
    .text("Пойду", `yes_${eventId}`)
    .text("Не пойду", `no_${eventId}`);
  const users = await User.findAll();
  try {
    for (let user of users) {
      await bot.api.sendMessage(user.user_id, message, {
        parse_mode: "HTML",
        reply_markup: answerKeyboard,
      });
    }
  } catch (error) {
    console.error("Ошибка при отправке рассылки:", error);
    throw error; // Если нужно обрабатывать ошибки выше
  }
}
export async function repeatRassilka(message, image, bot, eventId) {
  const eventResponses = await EventResponse.findAll({
    where: { EventId: eventId },
  });
  const users = await User.findAll();
  const usersToNotify = users.filter((user) => {
    return !eventResponses.some((response) => response.UserId === user.user_id);
  });
  const answerKeyboard = new InlineKeyboard()
    .text("Пойду", `yes_${eventId}`)
    .text("Не пойду", `no_${eventId}`);
  // Отправляем сообщение с кнопками
  for (const user of usersToNotify) {
    if (image) {
      await bot.api.sendPhoto(user.user_id, image, {
        caption: message,
        parse_mode: "HTML",
        reply_markup: answerKeyboard,
      });
    } else {
      await bot.api.sendMessage(user.user_id, message, {
        parse_mode: "HTML",
        reply_markup: answerKeyboard,
      });
    }
  }
}
export async function sendRassilkaMessageWithPhoto(
  message,
  photo,
  bot,
  eventId
) {
  const eventResponses = await EventResponse.findAll({
    where: { EventId: eventId },
  });
  const users = await User.findAll();
  const usersToNotify = users.filter((user) => {
    return !eventResponses.some((response) => response.UserId === user.user_id);
  });
  const answerKeyboard = new InlineKeyboard()
    .text("Пойду", `yes_${eventId}`)
    .text("Не пойду", `no_${eventId}`);
  for (const user of usersToNotify) {
    await bot.api.sendPhoto(user.user_id, photo, {
      caption: message,
      reply_markup: answerKeyboard,
      parse_mode: "Markdown",
    });
  }
}
