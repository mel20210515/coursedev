export const MODELS = {
  opus: 'gpt-4.1',
  sonnet: 'gpt-4.1-mini',
  haiku: 'gpt-4.1-nano',
} as const;

export type ThinkingBudget = 'max' | 'high' | 'medium' | 'low';

const BUDGET_REASONING: Record<ThinkingBudget, 'high' | 'medium' | 'low'> = {
  max: 'high',
  high: 'high',
  medium: 'medium',
  low: 'low',
};

export function getReasoningEffort(budget: ThinkingBudget): 'high' | 'medium' | 'low' {
  return BUDGET_REASONING[budget];
}
