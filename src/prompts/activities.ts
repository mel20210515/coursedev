function buildEnvironmentBlock(environment?: string, notes?: string): string {
  if (!environment) return '';
  const labels: Record<string, string> = {
    'lecture-theatre': 'Lecture theatre (fixed seating)',
    'collaborative': 'Collaborative room (group tables)',
    'flat-classroom': 'Flat classroom (moveable desks)',
    'online': 'Online/hybrid (breakouts/chat/docs)',
  };
  let block = `\nEnvironment: ${labels[environment] || environment}`;
  if (notes) block += `\nRoom details: ${notes}`;
  return block;
}

export function buildActivitiesPrompt(): string {
  return `Design in-class activities.
Rules: 4-6 items; 5-20 min each; social/application-focused; feasible for cohort + environment.
Return ONLY valid JSON array:
[{"title":"","duration":"","description":"","materials":"","learningGoal":"","scalingNotes":""}]
Description must be runnable by an instructor.`;
}

export function buildActivitiesUserPrompt(
  chapterTitle: string,
  keyConcepts: string[],
  cohortSize: number,
  environment?: string,
  environmentNotes?: string,
): string {
  return `Generate activities.
Class: ${chapterTitle}
Concepts: ${keyConcepts.join(', ')}
Cohort: ~${cohortSize}${buildEnvironmentBlock(environment, environmentNotes)}
Return 4-6 JSON items.`;
}

export function buildActivityDetailPrompt(): string {
  return `Expand one activity into a facilitation plan.
Return ONLY valid JSON object:
{"steps":[{"step":1,"timing":"","instruction":"","studentAction":""}],"facilitationTips":[""],"commonPitfalls":[""],"debriefGuide":"","variations":[""],"assessmentIdeas":""}
No markdown/comments/trailing commas. Use single quotes if quote chars are needed inside values.`;
}

export function buildActivityDetailUserPrompt(
  activity: { title: string; duration: string; description: string; materials: string; learningGoal: string; scalingNotes: string },
  chapterTitle: string,
  cohortSize: number,
  environment?: string,
  environmentNotes?: string,
): string {
  return `Expand this activity.
Class: ${chapterTitle}
Cohort: ~${cohortSize}${buildEnvironmentBlock(environment, environmentNotes)}
Activity: ${activity.title}
Duration: ${activity.duration}
Summary: ${activity.description}
Materials: ${activity.materials}
Goal: ${activity.learningGoal}
Scaling: ${activity.scalingNotes}
Return only the required JSON object.`;
}
