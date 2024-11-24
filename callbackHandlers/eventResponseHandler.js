import EventResponse from "../db/models/eventresponse.js";
import { saveEventResponse } from "../services/api.js";

export const eventResponseHandler = async (ctx) => {
  console.log("Получен callbackQuery:", ctx.callbackQuery);

  if (!ctx.callbackQuery || !ctx.callbackQuery.data) {
    console.error("callbackQuery или data отсутствуют!");
    return;
  }

  // Используем новое регулярное выражение
  const responseMatch = ctx.callbackQuery.data.match(
    /^(yes|no)_([a-f0-9]{24})$/
  );
  if (!responseMatch) {
    console.error("Формат callback_data неверный:", ctx.callbackQuery.data);
    return;
  }

  console.log("responseMatch:", responseMatch);
  const response = responseMatch[1] === "yes" ? "Пойду" : "Не пойду";
  const eventId = responseMatch[2]; // MongoDB ObjectId остаётся строкой
  const userId = ctx.from.id;
  const username = ctx.from.username || "Аноним";
  await saveEventResponse(userId, eventId, username, response);
  await ctx.answerCallbackQuery(`Ваш ответ: ${response} принят!`);
  console.log(
    `Ответ: ${response}, EventId: ${eventId}, UserId: ${userId}, Username: ${username}`
  );
};
