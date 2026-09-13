import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/config/db";
import { protect } from "@/lib/middlewares/auth";
import Resume from "@/lib/models/Resume";
import ResumeVersion from "@/lib/models/ResumeVersion";
import { getImageKitConfig } from "@/lib/config/imageKit";
import { getMongoUserId } from "@/lib/utils/userHelper";
import mongoose from "mongoose";
import logger from "@/lib/observability/logger";

const EDITABLE_FIELDS = [
  "title", "template", "accent_color", "professional_summary", "skills",
  "personal_info", "experience", "project", "education", "certifications",
  "languages", "custom_sections", "style_options", "section_headings", "public",
];

const parsePayload = (payload: any) => {
  let data = payload;
  for (let i = 0; i < 2; i++) {
    if (typeof data === "string") {
      try { data = JSON.parse(data); } catch { break; }
    }
  }
  if (!data || typeof data !== "object") throw new Error("INVALID_RESUME_DATA");
  return data;
};

const buildSafeUpdate = (payload: any) => {
  const data = parsePayload(payload);
  const safeUpdate: any = {};
  for (const key of EDITABLE_FIELDS) {
    if (data[key] !== undefined) safeUpdate[key] = data[key];
  }
  if (!safeUpdate.personal_info) safeUpdate.personal_info = {};
  return safeUpdate;
};

export async function PUT(request: NextRequest) {
  try {
    await connectDB();
    const authResult = await protect(request);
    if (authResult instanceof NextResponse) return authResult;

    const userId = await getMongoUserId(authResult.userId);
    if (!userId) return NextResponse.json({ message: "User not found" }, { status: 404 });

    const formData = await request.formData();
    const resumeId = formData.get("resumeId") as string;
    const resumeData = formData.get("resumeData") as string;
    const removeBackground = formData.get("removeBackground") as string;
    const imageFile = formData.get("image") as File | null;

    if (!mongoose.isValidObjectId(resumeId)) {
      return NextResponse.json({ message: "Invalid resume id" }, { status: 400 });
    }

    const existingResume = await Resume.findOne({ userId, _id: resumeId });

    const safeUpdate = buildSafeUpdate(resumeData);

    if (safeUpdate.personal_info && safeUpdate.personal_info.image === undefined) {
      safeUpdate.personal_info.image = existingResume?.personal_info?.image || "";
    }

    // For image uploads, we'll need to use the ImageKit REST API or SDK
    // For now, if there's an image file, we'll store it as a placeholder
    // In production, you would use the ImageKit SDK to upload
    if (imageFile) {
      // TODO: Implement ImageKit upload using REST API or compatible SDK
      // For now, keep the existing image
      logger.info("Image upload requested but ImageKit SDK needs configuration");
    }

    if (existingResume) {
      await ResumeVersion.create({
        userId,
        resumeId,
        label: "",
        snapshot: existingResume.toObject(),
      });
      const versions = await ResumeVersion.find({ resumeId }).sort({ createdAt: -1 }).lean();
      if (versions.length > 20) {
        const toDelete = versions.slice(20).map((v: any) => v._id);
        await ResumeVersion.deleteMany({ _id: { $in: toDelete } });
      }
    }

    console.log("[API /api/resumes/update] Updating resume:", { resumeId, userId });
    const resume = await Resume.findOneAndUpdate(
      { userId, _id: resumeId },
      safeUpdate,
      { new: true }
    );
    if (!resume) {
      console.warn("[API /api/resumes/update] Resume not found for update:", resumeId);
      return NextResponse.json({ message: "Resume not found" }, { status: 404 });
    }

    console.log("[API /api/resumes/update] Resume updated successfully:", resume._id);
    return NextResponse.json({ message: "Saved successfully", resume });
  } catch (error: any) {
    console.error("[API /api/resumes/update Error]:", error);
    if (error.message === "INVALID_RESUME_DATA") {
      return NextResponse.json({ message: "Invalid resumeData payload" }, { status: 400 });
    }
    logger.error("updateResume failed:", error.message);
    return NextResponse.json({ message: "Something went wrong" }, { status: 500 });
  }
}
