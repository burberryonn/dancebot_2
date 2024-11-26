import Event from "../db/models/event.js";
import { repeatRassilka } from "../utils/rassilka.js";

export const sendRepeatRassilkaHandler = async (ctx) => {
  const responseMatch = ctx.callbackQuery.data.match(
    /^sendrassilka:([a-f0-9]{24})$/
  ); // Группа захвата (в круглых скобках)

  if (!responseMatch) {
    console.error("Неверный формат callback_data:", ctx.callbackQuery.data);
    return ctx.answerCallbackQuery(
      "Произошла ошибка. Неверный формат callback_data."
    );
  }

  const eventId = responseMatch[1]; // Извлекаем ID из группы захвата

  console.log("Получен eventId для рассылки:", eventId);

  try {
    const event = await Event.findById(eventId);
    if (!event) {
      console.error("Ивент не найден для ID:", eventId);
      return ctx.answerCallbackQuery("Ивент не найден.");
    }

    console.log("Найденный ивент:", event);

    const message = `${event.invitation_message}\n\n<i>Когда?</i> ${new Date(
      event.event_time
    ).toLocaleString("ru-RU", {
      day: "numeric",
      month: "numeric",
      weekday: "long",
      hour: "numeric",
      minute: "numeric",
    })}\n\n<i>Где?</i> ${event.address}\n\n${
      event.description || "Подробности уточняются."
    }
      `;

    console.log("Готовое сообщение для рассылки:", message);

    await repeatRassilka(message, event.image, ctx, eventId);
    await ctx.answerCallbackQuery(
      "Рассылка отправлена пользователям, которые не ответили."
    );
  } catch (error) {
    console.error("Ошибка при отправке рассылки:", error);
    await ctx.answerCallbackQuery("Произошла ошибка при отправке рассылки.");
  }
};
