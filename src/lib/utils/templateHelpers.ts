"use client";
/**
 * Shared utility helpers for all resume template components.
 */

export interface StyleOptions {
  fontSize?: number;
  lineSpacing?: number;
  fontFamily?: string;
  headingBold?: boolean;
  headingItalic?: boolean;
  contentBold?: boolean;
  contentItalic?: boolean;
  sectionOrder?: string[];
  photoEffect?: string;
  pageSize?: string;
  dateFormat?: string;
  sectionSpacing?: string;
}

export interface CustomSectionRef {
  id: string;
}

// Maps stored fontFamily value → CSS font-family string
export const FONT_FAMILY_MAP = {
  inter:          "Inter, sans-serif",
  spacegrotesk:   "'Space Grotesk', sans-serif",
  georgia:        "Georgia, serif",
  merriweather:   "Merriweather, serif",
  courier:        "'Courier New', monospace",
  playfair:       "'Playfair Display', serif",
  lato:           "Lato, sans-serif",
  raleway:        "Raleway, sans-serif",
  sourceserif:    "'Source Serif 4', serif",
  nunitosans:     "'Nunito Sans', sans-serif",
  garamond:       "'EB Garamond', serif",
  ibmplexserif:   "'IBM Plex Serif', serif",
} as const;

export type FontFamilyKey = keyof typeof FONT_FAMILY_MAP;

export interface ContainerStyle {
  fontFamily: string;
  fontSize: string;
  lineHeight: number;
}

/**
 * Returns the inline style object for the outermost resume container div.
 * Sets fontFamily, fontSize (px), and lineHeight so all children inherit.
 */
export const getContainerStyle = (styleOptions: StyleOptions = {}): ContainerStyle => {
  const fs = styleOptions.fontSize;
  const fontSize =
    typeof fs === "number" && fs >= 11 && fs <= 16
      ? fs
      : 14;

  const ls = styleOptions.lineSpacing;
  const lineHeight =
    typeof ls === "number" && [1.2, 1.5, 1.8].includes(ls)
      ? ls
      : 1.5;

  const ff = styleOptions.fontFamily;
  const fontFamily =
    ff && ff in FONT_FAMILY_MAP
      ? FONT_FAMILY_MAP[ff as FontFamilyKey]
      : "Inter, sans-serif";

  return { fontFamily, fontSize: `${fontSize}px`, lineHeight };
};

export interface TextStyle {
  fontWeight: number;
  fontStyle: string;
}

/**
 * Returns extra inline styles to apply to section heading elements.
 * Merges with whatever base heading style the template already uses.
 */
export const getHeadingStyle = (styleOptions: StyleOptions = {}): TextStyle => ({
  fontWeight: styleOptions.headingBold !== false ? 700 : 400,
  fontStyle:  styleOptions.headingItalic ? "italic" : "normal",
});

/**
 * Returns extra inline styles to apply to body/content text elements.
 */
export const getContentStyle = (styleOptions: StyleOptions = {}): TextStyle => ({
  fontWeight: styleOptions.contentBold   ? 700 : 400,
  fontStyle:  styleOptions.contentItalic ? "italic" : "normal",
});

export const DEFAULT_ORDER: string[] = [
  "summary",
  "experience",
  "education",
  "projects",
  "skills",
  "certifications",
  "languages",
];

/**
 * Returns the full resolved section render order.
 * Stored sectionOrder is used as the base; any missing keys are appended.
 */
export const buildSectionOrder = (
  styleOptions: StyleOptions | null | undefined,
  customSections?: CustomSectionRef[] | null
): string[] => {
  const stored = styleOptions?.sectionOrder ?? [];
  const base = stored.length > 0 ? stored : DEFAULT_ORDER;

  const customIds = (customSections || []).map((s) => s.id);
  const allKnown = new Set(base);
  const extra = [...DEFAULT_ORDER, ...customIds].filter((k) => !allKnown.has(k));

  return [...base, ...extra];
};
