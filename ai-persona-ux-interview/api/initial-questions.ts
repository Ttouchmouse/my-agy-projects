// Using nodejs20.x runtime via vercel.json
import OpenAI from 'openai';

const SYSTEM_PROMPT = `당신은 시니어 UX 리서처입니다.
업로드된 UI 화면을 보고, 인터뷰를 시작할 때 바로 던질 수 있는 날카롭고 화면 특정적인 질문 3개를 생성하세요.

[핵심 규칙]
- 질문은 반드시 화면에 실제로 보이는 요소를 직접 언급하세요.
- "이 화면", "요소", "버튼이나 문구"처럼 추상적으로 말하지 마세요.
- 실제 텍스트, 버튼명, 입력칸, 배지, 안내문, 탭바 등 구체적인 화면 요소를 질문 안에 그대로 넣으세요.
- 질문을 다른 화면에 그대로 복붙할 수 있으면 실패입니다.
- 유저가 멈출 가능성이 높은 실제 요소를 우선적으로 지목하세요.
- 질문은 짧고 자연스러운 구어체 한 문장으로 만들 것
- 반드시 JSON만 반환할 것

[말투 규칙]
- "~적절하다고 보시나요?", "~인지 확인하셨나요?" 같은 평가형 말투 금지
- "~거슬리진 않으세요?", "~헷갈리진 않으세요?", "~바로 눌러지던가요?" 같은 자연스러운 구어체 사용
- 유저가 실제 인터뷰에서 받는 질문처럼 편안하게 느껴져야 합니다
- 3개 질문의 말투와 초점이 서로 겹치지 않게 하세요
- 아래 표현을 3개 질문에서 반복 사용하지 마세요:
  - "바로 이해되시나요?"
  - "잠깐 멈추게 되나요?"
  - "거슬리거나 의심스러운 부분은 없었어요?"
- 대신 아래처럼 다양하게 섞어 쓰세요:
  - "이거 보자마자 무슨 뜻인지 감이 오셨어요?"
  - "여기서 어디를 누를지 바로 떠오르셨어요?"
  - "이 부분은 좀 찝찝하거나 애매하게 느껴지진 않으셨어요?"
  - "이 문구는 믿음이 가셨어요, 아니면 광고처럼 느껴지셨어요?"

[3개 질문 역할 분배 — 반드시 아래 3가지를 하나씩 포함하세요]
1. 이해: 특정 문구나 UI 요소의 의미가 바로 파악되는지
2. 행동: 지금 어디서 멈추는지 / 뭘 눌러야 할지 / 다음 행동이 명확한지
3. 기대/신뢰 또는 거슬림: 해당 요소가 신뢰를 주는지, 아니면 불편하거나 거슬리는지

[절대 금지 — 아래 유형의 질문은 생성하지 마세요]
- "이 화면에서 가장 먼저 눈에 띄는 게 뭔가요?"
- "여기서 다음에 뭘 하실 것 같아요?"
- "이 화면 보면서 어떤 느낌이 드세요?"
- "이 화면에서 가장 망설여지는 버튼이나 문구가 있나요?"
- "이 화면에서 의미가 바로 이해되지 않는 요소가 있나요?"
- "지금 바로 다음 단계로 넘어가기 전에 확인하고 싶은 게 있으신가요?"
- "요소", "버튼이나 문구", "이 화면" 같은 추상 표현이 포함된 질문 전부 금지

[좋은 질문 기준 — 반드시 실제 화면 요소가 질문 안에 포함되어야 합니다]
- '"SNS로 가입한 경우..." 문구, 처음 봤을 때 바로 이해되셨어요?' (이해)
- '"다음으로" 버튼 보이면 바로 누르고 싶어지던가요, 아니면 잠깐 멈추게 되던가요?' (행동)
- '"VIP" 배지 달려 있는 거 보면서 뭔가 거슬리거나 의심스러운 부분은 없으셨어요?' (거슬림/신뢰)

형식:
{"suggestedQuestions":["Q1","Q2","Q3"]}`;

const FALLBACK_QUESTIONS = [
  "[FALLBACK] 이 화면에서 가장 먼저 보이는 요소가 뭔가요?",
  "[FALLBACK] 여기서 바로 누르기 망설여지는 부분이 있나요?",
  "[FALLBACK] 지금 이 상태에서 다음 행동이 바로 떠오르나요?"
];

function safeParseQuestions(text: string): string[] | null {
  try {
    const cleaned = text.replace(/```json/g, '').replace(/```/g, '').trim();

    try {
      const parsed = JSON.parse(cleaned);
      if (Array.isArray(parsed.suggestedQuestions) && parsed.suggestedQuestions.length === 3) {
        return parsed.suggestedQuestions.filter((q: unknown) => typeof q === 'string');
      }
    } catch {}

    const match = cleaned.match(/\{[\s\S]*\}/);
    if (match) {
      const parsed = JSON.parse(match[0]);
      if (Array.isArray(parsed.suggestedQuestions) && parsed.suggestedQuestions.length > 0) {
        return parsed.suggestedQuestions.filter((q: unknown) => typeof q === 'string').slice(0, 3);
      }
    }

    return null;
  } catch (e) {
    console.error('safeParseQuestions failed:', e);
    return null;
  }
}

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).send('Method Not Allowed');
  }

  const { image } = req.body ?? {};

  // image.base64 must be a full data URL from FileReader.readAsDataURL (e.g. "data:image/png;base64,...")
  const imageUrl = image?.base64;

  console.log('[initial-questions] image check:', {
    hasImage: !!image,
    hasBase64: !!imageUrl,
    startsWithDataImage: typeof imageUrl === 'string' && imageUrl.startsWith('data:image/'),
    first50: typeof imageUrl === 'string' ? imageUrl.slice(0, 50) : null,
  });

  if (!imageUrl || typeof imageUrl !== 'string' || !imageUrl.startsWith('data:image/')) {
    return res.status(400).json({ error: 'Invalid image.base64 format — expected full data URL (data:image/...)' });
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'OPENAI_API_KEY is missing' });
  }

  try {
    const openai = new OpenAI({ apiKey });

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      temperature: 0.7,
      max_tokens: 300,
      messages: [
        {
          role: 'system',
          content: SYSTEM_PROMPT,
        },
        {
          role: 'user',
          content: [
            {
              type: 'image_url',
              image_url: {
                url: imageUrl,  // already a full data URL — do NOT re-wrap with prefix
                detail: 'high',
              },
            },
            {
              type: 'text',
              text: '이 UI 화면을 분석해서 인터뷰 시작 질문 3개를 생성해주세요.',
            },
          ],
        },
      ],
    });

    const raw = completion.choices[0]?.message?.content ?? '';
    console.log('[initial-questions] raw model output:', raw);

    const questions = safeParseQuestions(raw);
    console.log('[initial-questions] parsed questions:', questions);
    console.log('[initial-questions] fallback used:', !questions || questions.length === 0);

    if (questions && questions.length > 0) {
      return res.status(200).json({ suggestedQuestions: questions });
    }

    console.log('[initial-questions] returning FALLBACK_QUESTIONS');
    return res.status(200).json({ suggestedQuestions: FALLBACK_QUESTIONS });

  } catch (e) {
    console.error('[initial-questions] error — returning FALLBACK_QUESTIONS:', e);
    return res.status(200).json({ suggestedQuestions: FALLBACK_QUESTIONS });
  }
}
