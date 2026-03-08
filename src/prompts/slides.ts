/**
 * Prompt builders for generating slide outlines via Claude.
 *
 * The LLM produces a JSON array of SlideData objects which are then
 * passed to pptxExporter.generatePptx() to create downloadable .pptx files.
 */

export function buildSlidesPrompt(): string {
  return `Create a 12-16 slide lecture deck as JSON array.
Layouts available: title, section, content, big-idea, quote, two-column.
Constraints: first slide=title; include 2-3 section slides; include >=1 big-idea and >=1 quote; never 3+ content slides in a row; include final content slide titled Key Takeaways; cover all key concepts.
Object schema:
{"title":"","bullets":[""],"speakerNotes":"","layout":"title|section|content|big-idea|quote|two-column","bodyText":""}
Layout rules: title/section/big-idea/quote -> bullets [] and bodyText required; two-column -> bullets=left column and bodyText is JSON string array for right column; content -> bodyText optional.
Output ONLY valid JSON array.`;
}

export function buildSlidesUserPrompt(
  chapterTitle: string,
  keyConcepts: string[],
  chapterContent?: string,
): string {
  const parts: string[] = [];
  parts.push('Generate slide JSON.');
  parts.push(`Class: ${chapterTitle}`);
  if (keyConcepts.length > 0) parts.push(`Concepts: ${keyConcepts.join(', ')}`);

  if (chapterContent) {
    const maxLen = 8000;
    const trimmed =
      chapterContent.length > maxLen
        ? chapterContent.slice(0, maxLen) + '\n\n[...chapter content truncated...]'
        : chapterContent;
    parts.push('Excerpt:');
    parts.push(trimmed);
  }

  parts.push('Return 12-16 slides in required JSON format only.');
  return parts.join('\n');
}
