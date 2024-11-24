// db/models/eventResponse.js
import mongoose from "mongoose";

const EventResponseSchema = new mongoose.Schema({
  UserId: { type: String, required: true }, // Используем String, а не Number

  EventId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Event",
    required: true,
  },

  Username: {
    type: String,
    required: true,
  },
  response: {
    type: String,
    enum: ["Пойду", "Не пойду"],
    required: true,
  },
});

const EventResponse = mongoose.model("EventResponse", EventResponseSchema);

export default EventResponse;
