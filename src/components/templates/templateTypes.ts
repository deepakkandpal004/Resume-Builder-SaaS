"use client";
/**
 * Shared TypeScript types for all resume template components.
 * Keeps the seven templates consistent instead of duplicating interfaces.
 */
import type { StyleOptions } from "@/lib/utils/templateHelpers";

export type { StyleOptions };

export interface PersonalInfo {
  full_name?: string;
  profession?: string;
  email?: string;
  phone?: string;
  location?: string;
  linkedin?: string;
  website?: string;
  image?: string | File | null;
}

export interface ExperienceItem {
  position?: string;
  company?: string;
  location?: string;
  start_date?: string;
  end_date?: string;
  is_current?: boolean;
  description?: string;
}

export interface ProjectItem {
  name?: string;
  type?: string;
  description?: string;
  techStack: string[];
  githubUrl?: string;
  liveUrl?: string;
}

export interface EducationItem {
  degree?: string;
  field?: string;
  institution?: string;
  gpa?: string;
  graduation_date?: string;
}

export interface CertificationItem {
  name?: string;
  issuer?: string;
  credential_url?: string;
  issue_date?: string;
  expiry_date?: string;
}

export interface LanguageItem {
  name?: string;
  proficiency?: string;
}

export interface CustomSection {
  id: string;
  heading?: string;
  content?: string;
}

export interface ResumeData {
  personal_info?: PersonalInfo;
  professional_summary?: string;
  experience: ExperienceItem[];
  project: ProjectItem[];
  education: EducationItem[];
  skills: string[];
  certifications: CertificationItem[];
  languages: LanguageItem[];
  custom_sections?: CustomSection[];
  section_headings?: Record<string, string>;
}

export interface TemplateProps {
  data: ResumeData;
  accentColor?: string;
  styleOptions?: StyleOptions;
}
