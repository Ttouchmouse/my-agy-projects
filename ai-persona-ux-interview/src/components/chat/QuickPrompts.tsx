import { useStore } from '../../store/useStore.ts';

const DEFAULT_PROMPTS = [
  "이 버튼이 무슨 역할을 한다고 생각하시나요?",
  "여기서 다음으로 무엇을 하시겠습니까?",
  "이 화면에서 헷갈리는 부분이 있나요?",
  "여기서 계속 진행하시겠습니까?",
  "망설여지는 부분이 있나요?"
];

export function QuickPrompts() {
  const {
    image, isStreaming, messages,
    initialQuestions, isGeneratingInitialQuestions,
    followUpQuestions, isGeneratingFollowUp,
  } = useStore();

  const handlePromptClick = (e: React.MouseEvent, prompt: string, autoSend = false) => {
    if (!image || isStreaming) return;
    const event = new CustomEvent('quick-prompt-action', {
      detail: { prompt, autoSend: autoSend || e.shiftKey }
    });
    window.dispatchEvent(event);
  };

  if (!image) return null;

  const isBeforeFirstMessage = messages.length === 0;
  const isLoading = isBeforeFirstMessage ? isGeneratingInitialQuestions : isGeneratingFollowUp;

  // Debug log
  console.log('[QuickPrompts] initialQuestions:', initialQuestions);
  console.log('[QuickPrompts] source:', followUpQuestions.length > 0 ? 'followUp' : isBeforeFirstMessage && initialQuestions.length > 0 ? 'initial' : 'default');

  // Priority: followUpQuestions > initialQuestions (before first message) > DEFAULT_PROMPTS (after first message)
  let promptsToShow: string[] = [];
  let isInitial = false;

  if (followUpQuestions.length > 0) {
    promptsToShow = followUpQuestions;
  } else if (isBeforeFirstMessage && initialQuestions.length > 0) {
    promptsToShow = initialQuestions;
    isInitial = true;
  } else if (!isBeforeFirstMessage) {
    promptsToShow = DEFAULT_PROMPTS;
  }

  if (isLoading) {
    return (
      <div className="w-full mb-1">
        <div className="flex flex-wrap gap-2 mb-1">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-[32px] w-28 bg-[#E6E9F0] animate-pulse rounded-[6px]" />
          ))}
        </div>
        <p className="text-[11px] text-[#8996A4]">
          화면을 분석해 질문을 생성하고 있어요...
        </p>
      </div>
    );
  }

  if (promptsToShow.length === 0) return null;

  return (
    <div className="w-full mb-1">
      <div className="flex flex-wrap gap-2 mb-1">
        {promptsToShow.map((prompt, idx) => (
          <button
            key={idx}
            onClick={(e) => handlePromptClick(e, prompt, isInitial)}
            disabled={isStreaming}
            className="text-[13px] font-[600] bg-[#E6E9F0] text-[#2E394A] hover:bg-[#D0DAE4] px-3 py-[6px] rounded-[6px] transition-colors whitespace-nowrap disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {prompt}
          </button>
        ))}
      </div>
      <p className="text-[11px] text-[#8996A4]">
        {isInitial ? '클릭하면 바로 전송됩니다' : 'Shift+클릭으로 바로 전송'}
      </p>
    </div>
  );
}
