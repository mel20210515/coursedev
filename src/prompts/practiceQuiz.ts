export function buildPracticeQuizPrompt(): string {
  return `Create formative practice MCQs.
Rules: test understanding; 1 correct + 3 plausible distractors; correct answer is ALWAYS option a; 18-20 questions; generally increasing difficulty.
Output STRICT regex-parseable format only:
1. **Question text?**
   a. Correct answer
   b. Distractor 1
   c. Distractor 2
   d. Distractor 3

   **Answer**: Correct answer

   **Feedback**: 2-4 sentences; explain reasoning and misconceptions; never reference option letters.

---

No extra text before/after blocks. **Answer** must exactly match option a.`;
}

export function buildPracticeQuizUserPrompt(
  chapterTitle: string,
  chapterNarrative: string,
  keyConcepts: string[],
  chapterContent?: string
): string {
  return `Generate practice quiz.
Class: ${chapterTitle}
Concepts: ${keyConcepts.join(', ')}
Description: ${chapterNarrative}
${chapterContent ? `Excerpt:\n${chapterContent.slice(0, 3000)}` : ''}
Create 20 questions in exact required format. Output question blocks only.`;
}
