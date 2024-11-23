import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
  user_id: { type: BigInt, required: true },
  username: { type: String, required: true },
});

const User = mongoose.model("User", userSchema);
export default User;
