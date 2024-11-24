import { InlineKeyboard } from "grammy";
import { getAllEvent } from "../services/api.js";

export const changeEventHandler = async (ctx) => {
  const newIndex = parseInt(ctx.match[1], 10);
  const { allEvents } = await getAllEvent(ctx.bot);
  if (newIndex < 0 || newIndex >= allEvents.length) {
    return ctx.answerCallbackQuery("Нет больше ивентов.");
  }
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
      }</b>"🧘‍♀️\n\n<i>Когда?</i> <b>${new Date(event.event_time).toLocaleString(
      "ru-RU",
      {
        day: "numeric",
        month: "numeric",
        weekday: "long",
        hour: "numeric",
        minute: "numeric",
      }
    )}</b>\n\n<i>Где?</i> <b>${
      event.address
    }</b>\n\n<i>Что берем с собой?</i> <b>Прекрасное настроение, удобную одежду, водичку)</b>\n\n<i>Что нас ждет?</i><b>${
      event.description || "Подробности уточняются."
    }</b>\n\nЗаписаться можно через личные сообщения <b>@vslomalinafik</b> 💌
    `;
    await ctx.editMessageMedia(
      {
        type: "photo",
        media: event.image,
        caption: message,
        parse_mode: "HTML",
      },
      {
        reply_markup: keyboard,
      }
    );
    await ctx.answerCallbackQuery();
  } catch (error) {
    console.error(error);
    await ctx.answerCallbackQuery("Не удалось обновить ивент.");
  }
};
