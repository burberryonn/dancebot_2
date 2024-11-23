

export const getAllEvent = async (bot) => {
  const allEvents = await Event.findAll({});
  return { allEvents };
};

export async function addUser(user_id, username) {
  await User.create({ user_id: user_id, username: username });
}

export async function findUserOnEvent(event) {
  try {
    return await User.findOne({
      userId: event.EventResponses[0].UserId,
    });
  } catch (error) {
    console.log("Ошибка");
  }
}

// bot.js (или где вы создаете событие)

export const createEvent = async (currentEvent) => {
  try {
    const event = new Event(currentEvent);

    await event.save();
    console.log("Событие создано:", event);
  } catch (error) {
    console.error("Ошибка при создании события:", error);
  }
};