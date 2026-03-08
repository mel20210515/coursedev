import type { ResearchSource, ResearchDossier } from '../types/course';

export const RESEARCH_SYSTEM_PROMPT = `You are a research assistant. Find real academic sources for one course chapter using web search.

Return ONLY valid minified JSON (no prose/markdown/code fences), exactly:
{"sources":[{"title":"","authors":"","year":"","url":"","doi":"","summary":"","isVerified":true}],"synthesisNotes":""}

Rules:
- sources: 5-8 items
- Prefer peer-reviewed papers, authoritative reviews, seminal books
- summary: <= 140 characters; one key finding only
- synthesisNotes: <= 240 characters; 2-3 key takeaways total
- Use empty string for unknown fields
- Do not include extra keys
- Stop immediately after final }`;

export function buildResearchUserPrompt(chapterTitle: string, chapterNarrative: string, keyConcepts: string[]) {
  return `Build a research dossier for this chapter.

Chapter: ${chapterTitle}
Description: ${chapterNarrative}
Key concepts: ${keyConcepts.join(', ')}

Find 5-8 high-quality academic sources and return only the required minified JSON.`;
}

export function parseResearchResponse(text: string, chapterNumber: number): ResearchDossier | null {
  try {
    let jsonStr = text;
    const codeBlockMatch = text.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/);
    if (codeBlockMatch) jsonStr = codeBlockMatch[1];

    // Try to extract JSON object from text
    const firstBrace = jsonStr.indexOf('{');
    const lastBrace = jsonStr.lastIndexOf('}');
    if (firstBrace !== -1 && lastBrace !== -1) jsonStr = jsonStr.slice(firstBrace, lastBrace + 1);

    const raw = JSON.parse(jsonStr);
    return {
      chapterNumber,
      sources: (raw.sources || []).map((s: Record<string, unknown>): ResearchSource => ({
        title: (s.title as string) || '',
        authors: (s.authors as string) || '',
        year: (s.year as string) || '',
        url: s.url as string | undefined,
        doi: s.doi as string | undefined,
        summary: (s.summary as string) || '',
        relevance: (s.relevance as string) || '',
        isVerified: (s.isVerified as boolean) ?? false,
      })),
      synthesisNotes: (raw.synthesisNotes as string) || '',
    };
  } catch {
    return null;
  }
}