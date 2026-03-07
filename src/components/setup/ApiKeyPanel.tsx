import { useCallback, useEffect, useRef } from 'react';
import { useApiStore } from '../../store/apiStore';
import { MODELS } from '../../services/claude/client';
import { ProviderCard } from './ProviderCard';
import { CLAUDE_CONFIG, ELEVENLABS_CONFIG, GEMINI_CONFIG } from './providerConfigs';

export function ApiKeyPanel() {
  const env = (import.meta as { env?: Record<string, string> }).env;
  const useServerOpenAi = env?.VITE_USE_OPENAI_PROXY === 'true';
  const {
    claudeApiKey, elevenLabsApiKey, geminiApiKey,
    claudeKeyValid, elevenLabsKeyValid, geminiKeyValid,
    isValidatingClaude, isValidatingElevenLabs, isValidatingGemini,
    setClaudeApiKey, setElevenLabsApiKey, setGeminiApiKey,
    setClaudeKeyValid, setElevenLabsKeyValid, setGeminiKeyValid,
    setIsValidatingClaude, setIsValidatingElevenLabs, setIsValidatingGemini,
  } = useApiStore();

  const validateClaude = useCallback(async () => {
    if (!claudeApiKey.trim()) return;
    setIsValidatingClaude(true);
    try {
      const res = await fetch('https://api.openai.com/v1/responses', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${claudeApiKey.trim()}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: MODELS.haiku,
          input: 'ping',
          max_output_tokens: 5,
        }),
      });
      setClaudeKeyValid(res.ok);
    } catch {
      setClaudeKeyValid(false);
    } finally {
      setIsValidatingClaude(false);
    }
  }, [claudeApiKey, setClaudeKeyValid, setIsValidatingClaude]);

  const validateElevenLabs = useCallback(async () => {
    if (!elevenLabsApiKey.trim()) return;
    setIsValidatingElevenLabs(true);
    try {
      const res = await fetch('https://api.elevenlabs.io/v1/user', {
        headers: { 'xi-api-key': elevenLabsApiKey.trim() },
      });
      setElevenLabsKeyValid(res.ok);
    } catch {
      setElevenLabsKeyValid(false);
    } finally {
      setIsValidatingElevenLabs(false);
    }
  }, [elevenLabsApiKey, setElevenLabsKeyValid, setIsValidatingElevenLabs]);

  const validateGemini = useCallback(async () => {
    if (!geminiApiKey.trim()) return;
    setIsValidatingGemini(true);
    try {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models?key=${geminiApiKey.trim()}`,
      );
      setGeminiKeyValid(res.ok);
    } catch {
      setGeminiKeyValid(false);
    } finally {
      setIsValidatingGemini(false);
    }
  }, [geminiApiKey, setGeminiKeyValid, setIsValidatingGemini]);

  // Auto-validate stored keys on mount
  const mountedRef = useRef(false);
  useEffect(() => {
    if (mountedRef.current) return;
    mountedRef.current = true;
    if (!useServerOpenAi && claudeApiKey.trim() && claudeKeyValid === null) validateClaude();
    if (elevenLabsApiKey.trim() && elevenLabsKeyValid === null) validateElevenLabs();
    if (geminiApiKey.trim() && geminiKeyValid === null) validateGemini();
  }, [useServerOpenAi]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="space-y-5">
      <h3 className="text-sm font-medium text-text-primary">
        Connect Your Services
      </h3>
      <div className="flex items-start gap-2.5 rounded-lg bg-emerald-500/5 border border-emerald-500/15 px-3.5 py-3">
        <svg className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" />
        </svg>
        <div>
          <p className="text-xs font-medium text-emerald-400 mb-0.5">Your keys never leave your computer</p>
          <p className="text-xs text-text-muted leading-relaxed">
            ClassBuild has no server and no accounts. Everything happens right here in your browser — we never see, store, or have access to your keys.
          </p>
        </div>
      </div>
      {useServerOpenAi ? (
        <div className="border border-emerald-500/30 bg-emerald-500/5 rounded-xl p-5">
          <div className="flex items-center gap-2.5 mb-1">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" className="text-emerald-400 shrink-0">
              <polyline points="20 6 9 17 4 12" />
            </svg>
            <span className="text-sm font-medium text-text-primary">Connected to OpenAI (Server Proxy)</span>
            <span className="text-[10px] uppercase tracking-wider font-semibold px-2 py-0.5 rounded-full bg-violet-500/15 text-violet-400">Required</span>
          </div>
          <p className="text-xs text-text-muted">
            OpenAI requests are routed through your server at <code>/api/openai/responses</code>. No browser API key needed.
          </p>
        </div>
      ) : (
        <ProviderCard
          config={CLAUDE_CONFIG}
          apiKey={claudeApiKey}
          keyValid={claudeKeyValid}
          isValidating={isValidatingClaude}
          setKey={setClaudeApiKey}
          validate={validateClaude}
          defaultExpanded={!claudeApiKey}
        />
      )}
      <ProviderCard
        config={ELEVENLABS_CONFIG}
        apiKey={elevenLabsApiKey}
        keyValid={elevenLabsKeyValid}
        isValidating={isValidatingElevenLabs}
        setKey={setElevenLabsApiKey}
        validate={validateElevenLabs}
      />
      <ProviderCard
        config={GEMINI_CONFIG}
        apiKey={geminiApiKey}
        keyValid={geminiKeyValid}
        isValidating={isValidatingGemini}
        setKey={setGeminiApiKey}
        validate={validateGemini}
      />
    </div>
  );
}
