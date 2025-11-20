import mongoose from "mongoose";

const TaskSchema = new mongoose.Schema({
  itineraryId: { type: String, required: true },
  text: { type: String, required: true },
  done: { type: Boolean, default: false }
}, { timestamps: true });

export default mongoose.model("Task", TaskSchema);
