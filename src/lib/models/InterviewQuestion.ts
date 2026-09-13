import mongoose from "mongoose";

const questionSchema = new mongoose.Schema({
  category: { type: String, default: "General" },
  question: { type: String, required: true },
  suggestedAnswer: { type: String, default: "" },
}, { _id: false });

const InterviewQuestionSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
  resumeId: { type: mongoose.Schema.Types.ObjectId, ref: "Resume", required: true, index: true },
  targetRole: { type: String, default: "" },
  jobDescription: { type: String, default: "" },
  questions: { type: [questionSchema], default: [] },
}, { timestamps: true });

InterviewQuestionSchema.index({ resumeId: 1, createdAt: -1 });
InterviewQuestionSchema.index({ createdAt: 1 }, { expireAfterSeconds: 7776000 });

const InterviewQuestion = mongoose.models.InterviewQuestion || mongoose.model("InterviewQuestion", InterviewQuestionSchema);

export default InterviewQuestion;
