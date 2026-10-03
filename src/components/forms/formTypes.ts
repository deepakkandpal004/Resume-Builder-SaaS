"use client";
/**
 * Shared TypeScript prop types for the resume-builder form components.
 * Reuses the resume data model from the templates package.
 */
import type {
  PersonalInfo,
  ExperienceItem,
  EducationItem,
  ProjectItem,
  CertificationItem,
  LanguageItem,
  CustomSection,
  ResumeData,
  StyleOptions,
} from "../templates/templateTypes";

export type {
  PersonalInfo,
  ExperienceItem,
  EducationItem,
  ProjectItem,
  CertificationItem,
  LanguageItem,
  CustomSection,
  ResumeData,
  StyleOptions,
};

export interface ExperienceFormProps {
  data: ExperienceItem[];
  onChange: (data: ExperienceItem[]) => void;
}

export interface EducationFormProps {
  data: EducationItem[];
  onChange: (data: EducationItem[]) => void;
}

export interface ProjectFormProps {
  data: ProjectItem[];
  onChange: (data: ProjectItem[]) => void;
}

export interface SkillsFormProps {
  data: string[];
  profession: string;
  onChange: (data: string[]) => void;
}

export interface CertificationFormProps {
  data: CertificationItem[];
  onChange: (data: CertificationItem[]) => void;
}

export interface LanguageFormProps {
  data: LanguageItem[];
  onChange: (data: LanguageItem[]) => void;
}

export interface PersonalInfoFormProps {
  data: PersonalInfo;
  onChange: (data: PersonalInfo) => void;
  removeBackground: boolean;
  setRemoveBackground: (value: boolean) => void;
  resumeId: string;
}

export interface ProfessionalSummaryProps {
  data?: string;
  onChange: (data: string) => void;
  setResumeData?: React.Dispatch<React.SetStateAction<any>>;
}

export interface SectionManagerProps {
  sectionHeadings: Record<string, string>;
  onSectionHeadingsChange: (headings: Record<string, string>) => void;
  customSections: CustomSection[];
  onCustomSectionsChange: (sections: CustomSection[]) => void;
}

export interface StylesPanelProps {
  styleOptions: StyleOptions;
  onChange: (styleOptions: StyleOptions) => void;
  resumeData: ResumeData;
}
