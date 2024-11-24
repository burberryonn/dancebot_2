import EventResponse from "../db/models/eventresponse.js";
import Event from "../db/models/event.js";

// Функция для получения времени последнего обновления EventResponse
export const getLastUpdateTimestamp = async () => {
  const lastUpdate = await EventResponse.findOne()
    .sort({ updatedAt: -1 })
    .select("updatedAt");
  return lastUpdate?.updatedAt || null;
};

export const updateResults = async (
  messageId,
  lastText,
  ctx,
  bot,
  lastUpdate
) => {
  const currentLastUpdate = await getLastUpdateTimestamp();
  if (lastUpdate && currentLastUpdate && currentLastUpdate <= lastUpdate) {
    return { responseText: lastText, newLastUpdate: lastUpdate };
  }

  const events = await Event.find().populate({
    path: "EventResponses",
    populate: {
      path: "UserId",
      model: "User",
      select: "username",
    },
  });
  console.log(events);

  if (!events.length) {
    const noEventsText = "Нет созданных ивентов.";
    if (lastText !== noEventsText) {
      await ctx.api.editMessageText(ctx.chat.id, messageId, noEventsText);
    }
    return { responseText: noEventsText, newLastUpdate: currentLastUpdate };
  }

  const responseTexts = events.map((event) => {
    let responseText = `<b>Ивент: ${event.title}</b>\n\n`;
    responseText += `<b>Когда: ${new Date(event.event_time).toLocaleString(
      "ru-RU",
      { day: "numeric", month: "numeric", hour: "numeric", minute: "numeric" }
    )}</b>\n\n`;
    console.log(event.EventResponses);

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

  return {
    responseText: responseTexts.join("\n\n---\n\n"),
    newLastUpdate: currentLastUpdate,
  };
};
