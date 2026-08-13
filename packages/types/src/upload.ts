export const supportedMomentFileExtensions = [
  ".jpg", ".jpeg", ".png", ".webp", ".gif",
  ".mp4", ".mov", ".webm",
  ".mp3", ".m4a", ".wav", ".ogg",
  ".pdf", ".txt", ".csv", ".doc", ".docx", ".xls", ".xlsx", ".ppt", ".pptx",
] as const;

export const supportedMomentFileAccept = supportedMomentFileExtensions.join(",");
export const maxMomentFilesPerBatch = 25;

export function isSupportedMomentFileName(name: string): boolean {
  const lowerName = name.toLowerCase();
  return supportedMomentFileExtensions.some((extension) => lowerName.endsWith(extension));
}
