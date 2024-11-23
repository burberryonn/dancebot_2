

// Функция для получения времени последнего обновления EventResponse
export const getLastUpdateTimestamp = async () => {
  const lastUpdate = await EventResponse.findOne({
    order: [["updatedAt", "DESC"]],
    attributes: ["updatedAt"],
  });
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
  const events = await Event.findAll({
    include: { model: EventResponse, include: [User] },
  });
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
