export function buildDiscussionPrompt(): string {
  return `Create student-facing class-start discussion starters.
Rules: 5-6 prompts; casual language; no single correct answer; topic-linked but answerable without reading; designed for immediate peer talk; no instructor notes.
Return ONLY valid JSON array: [{"prompt":"","hook":""}] where hook is 2-5 words.`;
}

export function buildDiscussionUserPrompt(
  chapterTitle: string,
  keyConcepts: string[],
  cohortSize: number,
  environment?: string,
): string {
  const envNote = environment === 'online'
    ? '\nMode: online/hybrid; prompts should work in chat/video.'
    : '';
  return `Generate starters.
Class: ${chapterTitle}
Concepts: ${keyConcepts.join(', ')}
Size: ~${cohortSize}${envNote}
Return 5-6 JSON items.`;
}
