// db/models/event.js
import mongoose from "mongoose";

const EventSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: false,
    },
    description: {
      type: String,
      required: true,
    },
    address: {
      type: String,
      required: true,
    },
    event_time: {
      type: Date,
      required: true,
    },
    image: {
      type: String,
      required: false,
    },
    invitation_message: {
      type: String,
      required: true,
    },
    expiresAt: { type: Date, required: true }, // Время истечения
    EventResponses: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "EventResponse",
      },
    ],
  },
  { timestamps: true }
);
EventSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

const Event = mongoose.model("Event", EventSchema);

export default Event;
