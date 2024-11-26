import EventResponse from "../db/models/eventresponse.js";
import Event from "../db/models/event.js";
import { InlineKeyboard } from "grammy";

// Функция для получения времени последнего обновления EventResponse
export const getLastUpdateTimestamp = async () => {
  const lastUpdate = await EventResponse.findOne()
    .sort({ updatedAt: -1 })
    .select("updatedAt");
  return lastUpdate?.updatedAt || null;
};

// Функция для генерации текста событий
export const generateEventTexts = async () => {
  const events = await Event.find().populate("EventResponses");

  if (!events.length) {
    return ["Нет созданных ивентов."];
  }

  return events.map((event) => {
    let responseText = `<b>Ивент: ${event.title}</b>\n\n`;
    responseText += `<b>Когда: ${new Date(event.event_time).toLocaleString(
      "ru-RU",
      { day: "numeric", month: "numeric", hour: "numeric", minute: "numeric" }
    )}</b>\n\n`;

    const attending = event.EventResponses.filter(
      (r) => r.response === "Пойду"
    );
    const notAttending = event.EventResponses.filter(
      (r) => r.response === "Не пойду"
    );

    responseText += `<b>Пойдут (${attending.length}):</b>\n`;
    responseText += attending
      .map((r) => `@${r.Username || "<i>Без имени</i>"}`)
      .join("\n");
    responseText += `\n\n<b>Не пойдут (${notAttending.length}):</b>\n`;
    responseText += notAttending
      .map((r) => `@${r.Username || "<i>Без имени</i>"}`)
      .join("\n");

    return responseText;
  });
};

// Реализация реального времени с обновлением
export const startRealTimeUpdates = (ctx, bot, messageId, totalPages) => {
  let lastUpdate = null;
  let currentPage = 0;

  const updateMessage = async () => {
    try {
      const currentLastUpdate = await getLastUpdateTimestamp();
      if (lastUpdate && currentLastUpdate && currentLastUpdate <= lastUpdate) {
        return; // Данные не изменились, обновление не требуется
      }

      const eventTexts = await generateEventTexts();
      const totalPagesUpdated = eventTexts.length;

      if (currentPage >= totalPagesUpdated) {
        currentPage = totalPagesUpdated - 1; // Сбросить на последнюю страницу
      }

      const text = eventTexts[currentPage];
      const keyboard = new InlineKeyboard();

      if (currentPage > 0) {
        keyboard.text("⬅️ Назад", `event_page:${currentPage - 1}`);
      }
      if (currentPage < totalPagesUpdated - 1) {
        keyboard.text("Вперед ➡️", `event_page:${currentPage + 1}`);
      }

      await ctx.api.editMessageText(ctx.chat.id, messageId, text, {
        parse_mode: "HTML",
        reply_markup: keyboard,
      });

      lastUpdate = currentLastUpdate;
    } catch (error) {
      console.error("Ошибка обновления сообщений:", error);
    }
  };

  // Запускаем обновления каждые 5 секунд
  setInterval(updateMessage, 30000);
};
