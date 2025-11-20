import mongoose from "mongoose";

const expenseItemSchema = new mongoose.Schema({
  category: { type: String, required: true },
  budget: { type: Number, default: 0 },
  notes: { type: String, default: "" }
});

const expensesSchema = new mongoose.Schema(
  {
    itineraryId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: "genitineraries"
    },
    items: [expenseItemSchema],
  },
  { timestamps: true }
);

const Expenses = mongoose.model("Expenses", expensesSchema);

export default Expenses;
