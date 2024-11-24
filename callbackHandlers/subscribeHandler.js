import User from "../db/models/user.js";
import { addUser } from "../services/api.js";

export const subscribeHandler = async (ctx) => {
  const { id: user_id, username } = ctx.from;
  const existingUser = await User.findOne({ user_id });
  if (existingUser) {
    await ctx.answerCallbackQuery({
      text: `${username}, вы уже подписаны на рассылку.`,
    });
  } else {
    await addUser(user_id, username);
    await ctx.answerCallbackQuery({
      text: `${username}, вы успешно подписались на рассылку.`,
    });
  }
};

export const unsubscribeHandler = async (ctx) => {
  const { id: user_id, username } = ctx.from;
  const deletedUserCount = await User.deleteOne({ user_id });
  if (deletedUserCount.deletedCount > 0) {
    await ctx.answerCallbackQuery({
      text: `${username}, вы отписались от рассылки.`,
    });
  } else {
    await ctx.answerCallbackQuery({
      text: `${username}, вы не были подписаны на рассылку.`,
    });
  }
};
