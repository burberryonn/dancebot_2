import User from "../db/models/user.js";
import Event from "../db/models/event.js";
import EventResponse from "../db/models/eventresponse.js";

export const getAllEvent = async () => {
  const allEvents = await Event.find();
  return { allEvents };
};

export const addUser = async (user_id, username) => {
  const newUser = new User({ user_id, username });
  await newUser.save();
};

export async function findUserOnEvent(eventId) {
  try {
    return await User.findOne({ user_id: eventId });
  } catch (error) {
    console.log("Ошибка при поиске пользователя:", error);
    return null;
  }
}

export const createEvent = async (eventData) => {
  const newEvent = new Event(eventData);
  await newEvent.save();
  return newEvent;
};

export const saveEventResponse = async (
  userId,
  eventId,
  username,
  response
) => {
  try {
    // Проверка на существование записи (если не хотите дублирующих ответов)
    const existingResponse = await EventResponse.findOne({
      UserId: userId,
      EventId: eventId,
    });

    if (existingResponse) {
      // Обновляем ответ, если запись уже существует
      existingResponse.response = response;
      await existingResponse.save();
      console.log("Ответ обновлен:", existingResponse);

      const event = await Event.findById(eventId);

      event.EventResponses.push(existingResponse._id); // Добавляем ссылку на новый ответ
      await event.save();
    } else {
      // Создаем новую запись
      const newResponse = new EventResponse({
        UserId: String(userId),
        EventId: eventId,
        Username: username,
        response,
      });
      await newResponse.save();
      const event = await Event.findById(eventId);
      event.EventResponses.push(newResponse._id); // Добавляем ссылку на новый ответ
      await event.save();
      console.log("Ответ сохранен:", newResponse);
    }
  } catch (err) {
    console.error("Ошибка сохранения ответа:", err);
  }
};
