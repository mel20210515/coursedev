import type { CourseSetup, Syllabus, ChapterSyllabus, ScienceAnnotation, SciencePrinciple } from '../types/course';

/** Normalize LLM-generated principle names to canonical keys */
function normalizePrinciple(raw: string): SciencePrinciple {
  const s = String(raw).toLowerCase().trim().replace(/[_\s]+/g, '-');
  if (s.includes('spacing') || s.includes('distributed')) return 'spacing';
  if (s.includes('interleav')) return 'interleaving';
  if (s.includes('retrieval') || s.includes('testing-effect') || s.includes('test-effect')) return 'retrieval';
  if (s.includes('example') || s.includes('concrete') || s.includes('analogy') || s.includes('case-stud')) return 'examples';
  if (s.includes('dual') || s.includes('visual')) return 'dual-coding';
  return 'spacing'; // safe fallback
}

export function buildSyllabusPrompt(
  setup: CourseSetup,
  refinementFeedback?: string,
  _conversationHistory?: Array<{ role: string; content: string }>
): { systemPrompt: string; userMessage: string } {
  const wordCount = setup.chapterLength === 'concise' ? '2,000' : setup.chapterLength === 'standard' ? '4,000' : '6,000';
  const readTime = setup.chapterLength === 'concise' ? '10' : setup.chapterLength === 'standard' ? '20' : '30';

  const systemPrompt = `Design a university course syllabus JSON for downstream generation.
Must include and meaningfully apply: spacing, interleaving, retrieval, examples, dual-coding.
Return ONLY valid JSON (no prose) with keys:
courseTitle, courseOverview, chapters[].
Each chapter must include:
number, title, narrative, keyConcepts[], widgets[{title,description,concept,rationale}], scienceAnnotations[{principle,description,relatedChapters}], spacingConnections[].
Constraints: titles specific/evocative; narratives architectural only (no formulas/worked solutions/pseudocode); widgets per chapter=${setup.widgetsPerChapter} and genuinely interactive; >=3 scienceAnnotations per chapter across multiple principles; spacingConnections map revisit links (chapter 1 usually empty).`;

  let userMessage: string;

  if (refinementFeedback) {
    userMessage = `Revise the full syllabus with this feedback:\n"${refinementFeedback}"\nKeep same JSON schema. If feedback affects learning principles, update scienceAnnotations accordingly. Output only full revised JSON.`;
  } else {
    userMessage = `Topic: ${setup.topic}
${setup.specificTopics ? `Required topics: ${setup.specificTopics}` : ''}
${setup.avoidTopics ? `Exclude: ${setup.avoidTopics}` : ''}
${setup.textbookReference ? `Reference text: ${setup.textbookReference}` : ''}
Audience: ${setup.educationLevel.replace(/-/g, ' ')}
Prior knowledge: ${setup.priorKnowledge === 'none' ? 'complete beginners' : setup.priorKnowledge === 'some' ? 'some foundation' : 'advanced background'}
Cohort: ~${setup.cohortSize}
${setup.learnerNotes ? `Learner context: ${setup.learnerNotes}` : ''}
Classes: ${setup.numChapters}
Reading per class: ~${wordCount} words (~${readTime} min)
Widgets per chapter: ${setup.widgetsPerChapter}
Output only valid JSON.`;
  }

  return { systemPrompt, userMessage };
}

/**
 * Progressive parser: extracts partially-streamed chapters from incomplete JSON.
 * This allows chapter cards to appear in the UI as they stream in.
 */
export function parsePartialChapters(text: string): {
  title: string;
  overview: string;
  chapters: ChapterSyllabus[];
} {
  const result: { title: string; overview: string; chapters: ChapterSyllabus[] } = {
    title: '',
    overview: '',
    chapters: [],
  };

  // Try to extract courseTitle
  const titleMatch = text.match(/"courseTitle"\s*:\s*"((?:[^"\\]|\\.)*)"/);
  if (titleMatch) result.title = titleMatch[1].replace(/\\"/g, '"');

  // Try to extract courseOverview
  const overviewMatch = text.match(/"courseOverview"\s*:\s*"((?:[^"\\]|\\.)*)"/);
  if (overviewMatch) result.overview = overviewMatch[1].replace(/\\n/g, '\n').replace(/\\"/g, '"');

  // Try to extract complete chapter objects
  // Find all complete chapter blocks by looking for balanced braces within the chapters array
  const chaptersStart = text.indexOf('"chapters"');
  if (chaptersStart === -1) return result;

  const afterChapters = text.slice(chaptersStart);
  const arrayStart = afterChapters.indexOf('[');
  if (arrayStart === -1) return result;

  const chapterArrayText = afterChapters.slice(arrayStart + 1);

  // Extract individual chapter objects by tracking brace depth
  let depth = 0;
  let chapterStart = -1;
  for (let i = 0; i < chapterArrayText.length; i++) {
    const char = chapterArrayText[i];
    if (char === '{') {
      if (depth === 0) chapterStart = i;
      depth++;
    } else if (char === '}') {
      depth--;
      if (depth === 0 && chapterStart !== -1) {
        const chapterJson = chapterArrayText.slice(chapterStart, i + 1);
        try {
          const ch = JSON.parse(chapterJson);
          result.chapters.push({
            number: ch.number || result.chapters.length + 1,
            title: ch.title || `Chapter ${result.chapters.length + 1}`,
            narrative: ch.narrative || '',
            keyConcepts: ch.keyConcepts || [],
            widgets: (ch.widgets || []).map((w: Record<string, string>) => ({
              title: w.title || '',
              description: w.description || '',
              concept: w.concept || '',
              rationale: w.rationale || '',
            })),
            scienceAnnotations: (ch.scienceAnnotations || []).map((a: Record<string, unknown>): ScienceAnnotation => ({
              principle: normalizePrinciple(a.principle as string),
              description: (a.description as string) || '',
              relatedChapters: (a.relatedChapters as number[]) || [],
            })),
            spacingConnections: ch.spacingConnections || [],
          });
        } catch {
          // Incomplete chapter JSON, skip
        }
        chapterStart = -1;
      }
    }
  }

  return result;
}

export function parseSyllabusResponse(text: string): Syllabus | null {
  try {
    // Strip markdown code fences if present
    let jsonStr = text.trim();
    const codeBlockMatch = jsonStr.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/);
    if (codeBlockMatch) {
      jsonStr = codeBlockMatch[1];
    }

    // Also strip any leading/trailing non-JSON text
    const firstBrace = jsonStr.indexOf('{');
    const lastBrace = jsonStr.lastIndexOf('}');
    if (firstBrace !== -1 && lastBrace !== -1) {
      jsonStr = jsonStr.slice(firstBrace, lastBrace + 1);
    }

    const raw = JSON.parse(jsonStr);

    const syllabus: Syllabus = {
      courseTitle: raw.courseTitle || 'Untitled Course',
      courseOverview: raw.courseOverview || '',
      chapters: (raw.chapters || []).map((ch: Record<string, unknown>, i: number): ChapterSyllabus => ({
        number: (ch.number as number) || i + 1,
        title: (ch.title as string) || `Chapter ${i + 1}`,
        narrative: (ch.narrative as string) || '',
        keyConcepts: (ch.keyConcepts as string[]) || [],
        widgets: ((ch.widgets as Array<Record<string, string>>) || []).map((w) => ({
          title: w.title || '',
          description: w.description || '',
          concept: w.concept || '',
          rationale: w.rationale || '',
        })),
        scienceAnnotations: ((ch.scienceAnnotations as Array<Record<string, unknown>>) || []).map((a): ScienceAnnotation => ({
          principle: normalizePrinciple(a.principle as string),
          description: (a.description as string) || '',
          relatedChapters: (a.relatedChapters as number[]) || [],
        })),
        spacingConnections: (ch.spacingConnections as number[]) || [],
      })),
    };

    return syllabus;
  } catch (e) {
    console.error('Failed to parse syllabus response:', e);
    return null;
  }
}
