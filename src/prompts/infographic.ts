import { getTheme } from '../themes';

export function buildInfographicMetaPrompt(themeId?: string): string {
  const t = getTheme(themeId);
  return `Write one Gemini prompt for an educational infographic.
Must: infographic/diagram (not photo), one core concept, clear short labels, explicit layout hierarchy, 16:9 landscape, concrete steps/data/comparisons from content, minimal on-image text.
Use theme colors: primary ${t.accent}, secondary ${t.accentLight}, warm ${t.warmAccent}, background ${t.isDark ? 'dark (#1a1a2e)' : 'light (#faf8f5)'}.
Output only the final image prompt text.`;
}

export function buildInfographicMetaUserPrompt(
  chapterTitle: string,
  keyConcepts: string[],
  contentSnippet: string,
): string {
  return `Create infographic prompt.
Class: ${chapterTitle}
Concepts: ${keyConcepts.join(', ')}
Excerpt:
${contentSnippet.slice(0, 3000)}
Return one prompt only.`;
}
