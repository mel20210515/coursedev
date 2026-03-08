export function buildAudioTranscriptPrompt(): string {
  return `Convert chapter text to natural TTS script.
Rules: remove visual/UI/widget references; restate meaning verbally; convert citations to spoken form; expand abbreviations/symbols when needed; turn lists into prose; strip formatting; add occasional [short pause]; keep tone clear and academic; do not start with title.
Output only transcript text.`;
}

function stripHtmlToText(html: string): string {
  // Remove <style> and <script> blocks entirely
  let text = html.replace(/<style[\s\S]*?<\/style>/gi, '');
  text = text.replace(/<script[\s\S]*?<\/script>/gi, '');
  // Remove SVG blocks
  text = text.replace(/<svg[\s\S]*?<\/svg>/gi, '');
  // Convert <br> and block-level closing tags to newlines
  text = text.replace(/<br\s*\/?>/gi, '\n');
  text = text.replace(/<\/(p|div|li|h[1-6]|tr|blockquote|section|article)>/gi, '\n');
  // Strip remaining HTML tags
  text = text.replace(/<[^>]+>/g, '');
  // Decode common HTML entities
  text = text.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&nbsp;/g, ' ');
  // Collapse whitespace
  text = text.replace(/[ \t]+/g, ' ');
  text = text.replace(/\n{3,}/g, '\n\n');
  return text.trim();
}

export function buildAudioTranscriptUserPrompt(
  chapterTitle: string,
  chapterContent: string,
): string {
  const textContent = stripHtmlToText(chapterContent);
  return `Adapt for spoken audio. Title: ${chapterTitle}
Apply all rules. Do not start with the title. Output transcript only.
--- BEGIN CHAPTER CONTENT ---
${textContent}
--- END CHAPTER CONTENT ---`;
}
