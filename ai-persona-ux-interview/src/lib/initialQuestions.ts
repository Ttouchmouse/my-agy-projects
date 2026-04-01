import type { UploadedImage } from '../store/useStore.ts';

const FALLBACK_QUESTIONS = [
  "[FALLBACK] 이 화면에서 가장 먼저 보이는 요소가 뭔가요?",
  "[FALLBACK] 여기서 바로 누르기 망설여지는 부분이 있나요?",
  "[FALLBACK] 지금 이 상태에서 다음 행동이 바로 떠오르나요?"
];

export async function generateInitialQuestions(
  image: UploadedImage
): Promise<string[]> {
  console.log('[initialQuestions] image payload check:', {
    hasImage: !!image,
    hasBase64: !!image?.base64,
    startsWithDataImage: typeof image?.base64 === 'string' && image.base64.startsWith('data:image/'),
    previewUrl: image?.previewUrl,
  });

  if (!image.base64) {
    console.log('[initialQuestions] no base64 — returning client FALLBACK');
    return FALLBACK_QUESTIONS;
  }

  try {
    const response = await fetch('/api/initial-questions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ image: { base64: image.base64 } }),
    });

    console.log('[initialQuestions] response status:', response.status);

    if (response.ok) {
      const data = await response.json();
      console.log('[initialQuestions] response data:', data);

      if (Array.isArray(data.suggestedQuestions) && data.suggestedQuestions.length > 0) {
        return data.suggestedQuestions;
      }

      console.log('[initialQuestions] suggestedQuestions missing or empty — returning client FALLBACK');
    } else {
      console.log('[initialQuestions] response not ok — returning client FALLBACK');
    }
  } catch (e) {
    console.error('[initialQuestions] fetch error — returning client FALLBACK:', e);
  }

  return FALLBACK_QUESTIONS;
}
