"use client";
export const getImageKitUrl = (url, opts = {}) => {
    if (!url || typeof url !== "string")
        return url;
    const { width, height, crop, focus, radius, effect } = opts;
    const parts = [];
    if (width)
        parts.push(`w-${width}`);
    if (height)
        parts.push(`h-${height}`);
    if (crop)
        parts.push(`c-${crop}`);
    if (focus)
        parts.push(`fo-${focus}`);
    if (radius)
        parts.push(`r-${radius}`);
    if (effect)
        parts.push(`e-${effect}`);
    if (parts.length === 0)
        return url;
    const tr = `tr=${parts.join(",")}`;
    // Strip any existing tr= param so we don't stack duplicate transforms
    const cleaned = url.replace(/[?&]tr=[^&]*/g, "").replace(/[?&]$/, "");
    return cleaned.includes("?") ? `${cleaned}&${tr}` : `${cleaned}?${tr}`;
};
// ─── Preset helpers used directly by templates ───────────────────────────────
/** Circle-cropped face thumbnail — used in MinimalImageTemplate sidebar */
export const getCircleAvatarUrl = (url, size = 280) => getImageKitUrl(url, {
    width: size,
    height: size,
    crop: "crop",
    focus: "face",
    radius: "max",
});
/** Portrait crop — suitable for formal/modern templates */
export const getPortraitUrl = (url) => getImageKitUrl(url, {
    width: 200,
    height: 260,
    crop: "crop",
    focus: "face",
});
/** Small thumbnail for preview panel — saves bandwidth */
export const getPreviewThumbUrl = (url) => getImageKitUrl(url, {
    width: 150,
    height: 150,
    crop: "crop",
    focus: "face",
});
/** Full quality for print / PDF export */
export const getPrintQualityUrl = (url) => getImageKitUrl(url, {
    width: 400,
    height: 400,
    crop: "crop",
    focus: "face",
});
/**
 * Apply a photo effect to a URL, stripping any legacy baked-in transforms.
 * Always applies face-centered crop for consistent display.
 * effect can be one of: "grayscale" | "contrast" | "sharpen" | "blur-2"
 */
export const applyPhotoEffect = (url, effect) => {
    if (!url || typeof url !== "string")
        return url;
    // Strip any baked-in transforms (legacy uploads)
    const clean = url.replace(/[?&]tr=[^&]*/g, "").replace(/[?&]$/, "");
    const parts = ["w-300", "h-300", "c-at_max"];
    if (effect && effect !== "none") {
        parts.push(`e-${effect}`);
    }
    return `${clean}?tr=${parts.join(",")}`;
};
