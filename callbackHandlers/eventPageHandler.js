import { InlineKeyboard } from "grammy";
import { updateResults } from "../callbackHandlers/eventGetlastupdate.js";

export const eventPageHandler = async (ctx) => {
  console.log('asdasdasdasd');

  const page = parseInt(ctx.match[1], 10);
  if (isNaN(page)) return;
  let lastUpdate = null;
  let lastText = "";
  const results = await updateResults(
    ctx.callbackQuery.message?.message_id,
    lastText,
    ctx,
    ctx.bot,
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
};
