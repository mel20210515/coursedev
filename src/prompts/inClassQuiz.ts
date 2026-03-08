export function buildInClassQuizPrompt(): string {
  return `Design a formal in-class MCQ quiz.
Requirements: exactly 10 questions; each has 1 correct + 3 plausible distractors; test understanding/application; independent questions; generally easier->harder; avoid all/none-of-the-above; different from practice quiz.
Return ONLY valid JSON array with fields:
question, correctAnswer, correctFeedback, distractors:[{text,feedback} x3]
Feedback must never mention answer letters (a/b/c/d).`;
}

export function buildInClassQuizUserPrompt(
  chapterTitle: string,
  chapterNarrative: string,
  keyConcepts: string[],
  chapterContent?: string
): string {
  return `Generate in-class quiz.
Class: ${chapterTitle}
Concepts: ${keyConcepts.join(', ')}
Description: ${chapterNarrative}
${chapterContent ? `Excerpt:\n${chapterContent.slice(0, 3000)}` : ''}
Return exactly 10 questions in required JSON schema.`;
}
