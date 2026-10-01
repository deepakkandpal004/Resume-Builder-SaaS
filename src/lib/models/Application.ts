import mongoose from "mongoose";

export const APPLICATION_STATUSES = [
  "applied",
  "screening",
  "interview",
  "offer",
  "rejected",
  "withdrawn",
] as const;

export type ApplicationStatus = (typeof APPLICATION_STATUSES)[number];

export const APPLICATION_SOURCES = [
  "naukri",
  "linkedin",
  "referral",
  "company-site",
  "other",
] as const;

const StatusHistorySchema = new mongoose.Schema(
  {
    status: { type: String, required: true },
    at: { type: Date, default: Date.now },
  },
  { _id: false }
);

const ApplicationSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    company: {
      type: String,
      required: true,
      trim: true,
    },
    role: {
      type: String,
      required: true,
      trim: true,
    },
    source: {
      type: String,
      default: "other",
    },
    jobUrl: {
      type: String,
      default: "",
    },
    resumeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Resume",
      default: null,
    },
    versionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ResumeVersion",
      default: null,
    },
    atsScoreAtApply: {
      type: Number,
      default: null,
    },
    status: {
      type: String,
      default: "applied",
    },
    statusHistory: {
      type: [StatusHistorySchema],
      default: [],
    },
    appliedAt: {
      type: Date,
      default: Date.now,
    },
    notes: {
      type: String,
      default: "",
    },
  },
  { timestamps: true }
);

ApplicationSchema.index({ userId: 1, appliedAt: -1 });
ApplicationSchema.index({ userId: 1, status: 1 });

const Application =
  mongoose.models.Application ||
  mongoose.model("Application", ApplicationSchema);

export default Application;
