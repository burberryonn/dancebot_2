import { InlineKeyboard } from "grammy";
import { generateEventTexts } from "./eventGetlastupdate.js";


export const eventPageHandler = async (ctx) => {
  const page = parseInt(ctx.match[1], 10);
  const eventTexts = await generateEventTexts();
  const totalPages = eventTexts.length;

  if (page < 0 || page >= totalPages) {
    return ctx.answerCallbackQuery({
      text: "Недопустимая страница.",
      show_alert: true,
    });
  }

  const keyboard = new InlineKeyboard();
  if (page > 0) keyboard.text("⬅️ Назад", `event_page:${page - 1}`);
  if (page < totalPages - 1)
    keyboard.text("Вперед ➡️", `event_page:${page + 1}`);

  await ctx.editMessageText(eventTexts[page], {
    parse_mode: "HTML",
    reply_markup: keyboard,
  });

  ctx.answerCallbackQuery();
};
