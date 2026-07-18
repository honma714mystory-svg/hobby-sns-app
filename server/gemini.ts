import { GoogleGenAI, Type } from '@google/genai';
import type { CircleProfile, ImprovableField, SnsPlatform } from '../src/types';
import { ARTICLE_BODY_MAX_LENGTH, IMPROVABLE_FIELDS } from '../src/types';

const MODEL = 'gemini-flash-latest';

let aiInstance: GoogleGenAI | null = null;

export function getAI(): GoogleGenAI {
  if (!aiInstance) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY environment variable is missing. Set it in .env (see .env.example).');
    }
    aiInstance = new GoogleGenAI({ apiKey });
  }
  return aiInstance;
}

const FIELD_LABELS: Record<keyof CircleProfile, string> = {
  name: '団体名', abbreviation: '略称', university: '所属大学', genre: '活動ジャンル',
  content: '活動内容', purpose: '活動目的', location: '活動場所', days: '活動曜日',
  time: '活動時間', frequency: '活動頻度', establishedYear: '設立年', target: '募集対象',
  recruitsCount: '募集人数', beginnersWelcome: '初心者歓迎', allowDoubleCircle: '兼サー可否',
  genderRatio: '男女比', gradeRatio: '学年比率', applicationMaterialUrl: '応募資料リンク',
  applicationFormUrl: '応募フォームリンク', memberCount: 'メンバー人数', atmosphere: '団体の雰囲気',
  appealPoints: 'アピールポイント', representativeComment: '代表コメント', annualEvents: '年間イベント',
  achievements: '活動実績', awards: '受賞歴', admissionFee: '入会費', membershipFee: '会費',
  otherFees: 'その他費用', instagram: 'Instagram', x: 'X', threads: 'Threads', line: 'LINE',
  tiktok: 'TikTok', website: 'ホームページ', email: 'メールアドレス', faqs: 'FAQ',
};

export function formatProfileForPrompt(profile: Partial<CircleProfile>): string {
  return (Object.keys(FIELD_LABELS) as (keyof CircleProfile)[])
    .filter((key) => key !== 'faqs')
    .map((key) => {
      const value = profile[key];
      const text = typeof value === 'string' && value.trim() !== '' ? value : '未登録';
      return `【${FIELD_LABELS[key]}】: ${text}`;
    })
    .join('\n');
}

// --- Step 2: AIによる取材 ----------------------------------------------------

export interface InterviewTurnResult {
  reply: string;
  updatedFields: Partial<CircleProfile>;
  isComplete: boolean;
}

export async function runInterviewTurn(
  profile: Partial<CircleProfile>,
  history: { sender: 'user' | 'assistant'; text: string }[],
  questionsAskedSoFar: number,
  maxQuestions: number,
): Promise<InterviewTurnResult> {
  const ai = getAI();
  const remaining = Math.max(0, maxQuestions - questionsAskedSoFar);

  const systemInstruction = `
あなたは学生団体・サークルの魅力を引き出す「AI編集部」の取材記者です。
現在登録されている基本情報は以下の通りです。基本情報だけでは伝わらない団体の魅力（活動の雰囲気、参加するメリット、リアルなエピソード）を深掘りしてください。

${formatProfileForPrompt(profile)}

【取材ルール】
1. 1回のやり取りにつき質問は1つだけ。
2. 取材は最大${maxQuestions}問までです。残り目安は${remaining}問です。質問数の上限に達したら、それ以上質問せず取材を終了してください。
3. 若年層（大学生・新入生）に伝わる、親しみやすく明るいトーンで会話してください。
4. ユーザーの回答から新たに得られた事実情報があれば、既存のCircleProfileのキーに対応させて updatedFields に含めてください。存在しない情報を創作しないでください。
5. 取材が十分（${maxQuestions}問に到達、または重要な魅力を十分に聞き出せた）と判断したら、isComplete を true にし、次のステップ（記事作成）に進める旨を reply に書いてください。

【出力フォーマット】
必ず以下のJSON構造のみを返却してください。
{
  "reply": "ユーザーへの返答・次の質問（1つだけ。isCompleteがtrueなら締めの言葉）",
  "updatedFields": { "フィールド名": "取材から得られた新情報" },
  "isComplete": boolean
}
`;

  const contents = history.map((m) => ({
    role: m.sender === 'user' ? 'user' as const : 'model' as const,
    parts: [{ text: m.text }],
  }));

  const response = await ai.models.generateContent({
    model: MODEL,
    contents,
    config: {
      systemInstruction,
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          reply: { type: Type.STRING },
          updatedFields: { type: Type.OBJECT, properties: {} },
          isComplete: { type: Type.BOOLEAN },
        },
        required: ['reply', 'updatedFields', 'isComplete'],
      },
      temperature: 0.4,
    },
  });

  const raw = response.text?.trim() || '{}';
  try {
    const parsed = JSON.parse(raw);
    return {
      reply: parsed.reply ?? '',
      updatedFields: parsed.updatedFields ?? {},
      isComplete: Boolean(parsed.isComplete) || remaining <= 1,
    };
  } catch {
    return { reply: raw, updatedFields: {}, isComplete: remaining <= 1 };
  }
}

// --- Step 3: 記事作成 --------------------------------------------------------

export interface GeneratedArticle {
  title: string;
  intro: string;
  body: string;
  cta: string;
  faqs: { q: string; a: string }[];
  metaDescription: string;
  keywords: string[];
}

export async function generateArticle(
  profile: Partial<CircleProfile>,
  interviewNotes: string,
): Promise<GeneratedArticle> {
  const ai = getAI();

  const systemInstruction = `
あなたは学生団体の魅力を伝える「AI編集部」のライターです。登録情報と取材メモをもとに、若年層に伝わりやすくSNSとの親和性も高い紹介記事を作成してください。

【厳守事項】
・title + intro + body + cta の合計文字数は${ARTICLE_BODY_MAX_LENGTH}文字以内。
・検索エンジンだけでなくAI検索にも理解されやすいよう、見出しと要点を明確に構成する。
・登録情報にない事実を創作しない。未登録の項目は自然な言い回しで補うか省略する。
・「未登録」「未設定」という機械的な言葉をそのまま出力しない。
・intro（導入文）は記事の掴みとなる2〜3文。body は活動内容・雰囲気・魅力を伝える本編。cta は応募・お問い合わせへの誘導文。faqs は新入生が気になる質問と回答を2〜4個。
`;

  const promptText = `
【登録団体情報】
${formatProfileForPrompt(profile)}

【AI取材メモ】
${interviewNotes || 'なし'}
`;

  const response = await ai.models.generateContent({
    model: MODEL,
    contents: promptText,
    config: {
      systemInstruction,
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          title: { type: Type.STRING, description: '記事タイトル（30文字前後、SEOとクリック意欲を両立）' },
          intro: { type: Type.STRING, description: '導入文（2〜3文）' },
          body: { type: Type.STRING, description: 'Markdown本編' },
          cta: { type: Type.STRING, description: '応募・お問い合わせへの誘導文' },
          faqs: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: { q: { type: Type.STRING }, a: { type: Type.STRING } },
              required: ['q', 'a'],
            },
          },
          metaDescription: { type: Type.STRING, description: 'SEO用meta description（80〜120文字）' },
          keywords: { type: Type.ARRAY, items: { type: Type.STRING }, description: 'SEOキーワード5〜8個' },
        },
        required: ['title', 'intro', 'body', 'cta', 'faqs', 'metaDescription', 'keywords'],
      },
      temperature: 0.7,
    },
  });

  const raw = response.text?.trim() || '{}';
  const parsed = JSON.parse(raw);

  // Enforce the total character budget by trimming the body first (the
  // least structurally sensitive part) if the model overshoots.
  const title: string = parsed.title || '';
  const intro: string = parsed.intro || '';
  const cta: string = parsed.cta || '';
  const fixedLength = (title + intro + cta).length;
  const bodyBudget = Math.max(0, ARTICLE_BODY_MAX_LENGTH - fixedLength);
  const body: string = (parsed.body || '').slice(0, bodyBudget);

  return {
    title,
    intro,
    body,
    cta,
    faqs: Array.isArray(parsed.faqs) ? parsed.faqs : [],
    metaDescription: parsed.metaDescription || '',
    keywords: Array.isArray(parsed.keywords) ? parsed.keywords : [],
  };
}

// --- Step 4: SNS投稿文生成 ----------------------------------------------------

export interface GeneratedSnsTexts {
  x: string;
  instagram: string;
  threads: string;
  line: string;
  tiktok: string;
}

export async function generateSnsTexts(
  profile: Partial<CircleProfile>,
  article: { title: string; intro: string; body: string; cta: string },
  articleUrl: string,
): Promise<GeneratedSnsTexts> {
  const ai = getAI();

  const systemInstruction = `
あなたは学生団体の募集広報を担当するSNS運用AIです。公開された記事をもとに、各SNS向けの投稿文を作成してください。
記事URL: ${articleUrl}

① X：120〜140文字程度。要点を絞り、ハッシュタグを5〜10個末尾に付ける。記事URLを含める。
② Instagram：300〜500文字程度。絵文字と改行を適度に使い読みやすく。末尾に「プロフィールのリンクはこちら👇」とハッシュタグ5〜10個。
③ Threads：200〜300文字程度。カジュアルで会話的なトーン。記事URLを含める。
④ LINE：150〜250文字程度。新入生に語りかける親しみやすいトーン。「質問だけでも大歓迎！」で締める。記事URLを含める。
⑤ TikTok紹介文：100〜150文字程度。動画のキャプションとして使える短くキャッチーな文章。ハッシュタグ3〜5個。

登録情報にない事実は創作しないでください。
`;

  const promptText = `
【団体情報】
${formatProfileForPrompt(profile)}

【公開記事】
タイトル: ${article.title}
導入文: ${article.intro}
本文: ${article.body}
CTA: ${article.cta}
`;

  const response = await ai.models.generateContent({
    model: MODEL,
    contents: promptText,
    config: {
      systemInstruction,
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          x: { type: Type.STRING },
          instagram: { type: Type.STRING },
          threads: { type: Type.STRING },
          line: { type: Type.STRING },
          tiktok: { type: Type.STRING },
        },
        required: ['x', 'instagram', 'threads', 'line', 'tiktok'],
      },
      temperature: 0.7,
    },
  });

  const raw = response.text?.trim() || '{}';
  const parsed = JSON.parse(raw);
  return {
    x: parsed.x || '',
    instagram: parsed.instagram || '',
    threads: parsed.threads || '',
    line: parsed.line || '',
    tiktok: parsed.tiktok || '',
  };
}

// --- Step 6: AI改善提案 -------------------------------------------------------

export interface AnalyticsSummaryForPrompt {
  pv: number;
  ctaClicks: number;
  ctr: number;
  avgDwellSeconds: number;
  bounceRate: number;
  snsInflow: Record<string, number>;
  applications: number;
  lineAdds: number;
  sessionJoins: number;
}

export interface ProposedChangeRaw {
  field: ImprovableField;
  before: string;
  after: string;
  reason: string;
  platform?: SnsPlatform;
  faqIndex?: number;
}

export async function generateImprovementProposal(
  article: {
    title: string;
    intro: string;
    cta: string;
    faqs: { q: string; a: string }[];
    metaDescription: string;
    keywords: string[];
    snsTexts: GeneratedSnsTexts;
  },
  summary: AnalyticsSummaryForPrompt,
): Promise<ProposedChangeRaw[]> {
  const ai = getAI();

  const systemInstruction = `
あなたは学生団体の広報記事を継続的に改善するAI編集部の分析担当です。
公開後の効果測定データをもとに、成果（応募数・LINE追加数・説明会参加数）を伸ばすための改善案を作成してください。

【厳守事項・変更してよい対象】
以下のフィールドのみ変更を提案できます。これ以外（登録済みの基本情報や取材で得た事実情報、本編body）は絶対に変更しないでください。
- title: タイトル
- intro: 導入文
- cta: CTA（応募・お問い合わせへの誘導文）
- faq: FAQ（faqIndexで既存のどのQ&Aを差し替えるか指定。新規追加なら faqIndex は -1）
- seo: SEO情報（meta description）
- sns: SNS投稿文（platformで x/instagram/threads/line/tiktok のどれかを必ず指定）

各提案には、変更前(before)、変更後(after)、データに基づく変更理由(reason)を明記してください。
データの根拠がない提案はしないでください。改善の余地がなければ空配列を返してください。
`;

  const faqsText = article.faqs.map((f, i) => `[${i}] Q: ${f.q} / A: ${f.a}`).join('\n') || 'なし';

  const promptText = `
【現在の記事】
タイトル: ${article.title}
導入文: ${article.intro}
CTA: ${article.cta}
FAQ:
${faqsText}
metaDescription: ${article.metaDescription}
keywords: ${article.keywords.join(', ')}
SNS投稿文(X): ${article.snsTexts.x}
SNS投稿文(Instagram): ${article.snsTexts.instagram}
SNS投稿文(Threads): ${article.snsTexts.threads}
SNS投稿文(LINE): ${article.snsTexts.line}
SNS投稿文(TikTok): ${article.snsTexts.tiktok}

【効果測定データ】
PV: ${summary.pv}
CTAクリック数: ${summary.ctaClicks}
CTR: ${(summary.ctr * 100).toFixed(1)}%
平均滞在時間: ${summary.avgDwellSeconds.toFixed(0)}秒
離脱率: ${(summary.bounceRate * 100).toFixed(1)}%
SNS流入内訳: ${JSON.stringify(summary.snsInflow)}
応募数: ${summary.applications}
LINE追加数: ${summary.lineAdds}
説明会参加数: ${summary.sessionJoins}
`;

  const response = await ai.models.generateContent({
    model: MODEL,
    contents: promptText,
    config: {
      systemInstruction,
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            field: { type: Type.STRING, enum: [...IMPROVABLE_FIELDS] },
            before: { type: Type.STRING },
            after: { type: Type.STRING },
            reason: { type: Type.STRING },
            platform: { type: Type.STRING, enum: ['x', 'instagram', 'threads', 'line', 'tiktok'] },
            faqIndex: { type: Type.INTEGER },
          },
          required: ['field', 'before', 'after', 'reason'],
        },
      },
      temperature: 0.5,
    },
  });

  const raw = response.text?.trim() || '[]';
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}
