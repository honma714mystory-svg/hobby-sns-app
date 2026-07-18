// --- Step 1: 基本情報登録 ---------------------------------------------------

export interface CircleProfile {
  name: string;                // 団体名
  abbreviation: string;        // 略称
  university: string;          // 所属大学
  genre: string;                // 活動ジャンル
  content: string;              // 活動内容
  purpose: string;              // 活動目的
  location: string;             // 活動場所
  days: string;                 // 活動曜日
  time: string;                 // 活動時間
  frequency: string;            // 活動頻度
  establishedYear: string;      // 設立年

  target: string;               // 募集対象
  recruitsCount: string;        // 募集人数
  beginnersWelcome: string;     // 初心者歓迎
  allowDoubleCircle: string;    // 兼サー可否
  genderRatio: string;          // 男女比
  gradeRatio: string;           // 学年比率
  applicationMaterialUrl: string; // 応募資料リンク
  applicationFormUrl: string;     // 応募フォームリンク

  memberCount: string;          // メンバー人数
  atmosphere: string;           // 団体の雰囲気
  appealPoints: string;         // アピールポイント
  representativeComment: string;// 代表コメント
  annualEvents: string;         // 年間イベント
  achievements: string;         // 活動実績
  awards: string;               // 受賞歴

  admissionFee: string;         // 入会費
  membershipFee: string;        // 会費
  otherFees: string;            // その他費用

  instagram: string;
  x: string;
  threads: string;
  line: string;
  tiktok: string;
  website: string;
  email: string;                // 改善案の通知が届く登録メールアドレス

  faqs: { q: string; a: string }[];
}

export const INITIAL_PROFILE: CircleProfile = {
  name: '', abbreviation: '', university: '', genre: '', content: '',
  purpose: '', location: '', days: '', time: '', frequency: '',
  establishedYear: '', target: '', recruitsCount: '', beginnersWelcome: '',
  allowDoubleCircle: '', genderRatio: '', gradeRatio: '',
  applicationMaterialUrl: '', applicationFormUrl: '',
  memberCount: '', atmosphere: '', appealPoints: '', representativeComment: '',
  annualEvents: '', achievements: '', awards: '',
  admissionFee: '', membershipFee: '', otherFees: '',
  instagram: '', x: '', threads: '', line: '', tiktok: '', website: '', email: '',
  faqs: [],
};

export type ProfileCategory = 'basic' | 'recruitment' | 'details' | 'fees' | 'contact';

export interface FieldConfig {
  key: keyof CircleProfile;
  label: string;
  category: ProfileCategory;
  placeholder: string;
  type: 'text' | 'textarea' | 'email';
  required: boolean;
}

export const CATEGORY_LABELS: Record<ProfileCategory, string> = {
  basic: '■ 基本情報',
  recruitment: '■ 募集情報',
  details: '■ 団体情報',
  fees: '■ 費用',
  contact: '■ 連絡先',
};

export const FIELD_CONFIGS: FieldConfig[] = [
  { key: 'name', label: '団体名', category: 'basic', placeholder: '例：AI技術研究会', type: 'text', required: true },
  { key: 'abbreviation', label: '略称', category: 'basic', placeholder: '例：AIT', type: 'text', required: false },
  { key: 'university', label: '所属大学', category: 'basic', placeholder: '例：帝都大学', type: 'text', required: true },
  { key: 'genre', label: '活動ジャンル', category: 'basic', placeholder: '例：IT・プログラミング、テニス、音楽', type: 'text', required: true },
  { key: 'content', label: '活動内容', category: 'basic', placeholder: '例：週に1回プログラミングの勉強会を開き、ハッカソンへの出場やアプリ開発を行っています。', type: 'textarea', required: true },
  { key: 'purpose', label: '活動目的', category: 'basic', placeholder: '例：最新技術を学び、仲間と共にモノづくりの楽しさを体験し、成長すること。', type: 'textarea', required: false },
  { key: 'location', label: '活動場所', category: 'basic', placeholder: '例：本郷キャンパス 学生サークル棟 202会議室', type: 'text', required: true },
  { key: 'days', label: '活動曜日', category: 'basic', placeholder: '例：毎週水曜・土曜', type: 'text', required: false },
  { key: 'time', label: '活動時間', category: 'basic', placeholder: '例：18:00〜20:00', type: 'text', required: false },
  { key: 'frequency', label: '活動頻度', category: 'basic', placeholder: '例：週1回、不定期', type: 'text', required: true },
  { key: 'establishedYear', label: '設立年', category: 'basic', placeholder: '例：2023年', type: 'text', required: false },

  { key: 'target', label: '募集対象', category: 'recruitment', placeholder: '例：全学部の1・2年生、新入生歓迎！', type: 'text', required: true },
  { key: 'recruitsCount', label: '募集人数', category: 'recruitment', placeholder: '例：30名程度', type: 'text', required: false },
  { key: 'beginnersWelcome', label: '初心者歓迎', category: 'recruitment', placeholder: '例：未経験者大歓迎！', type: 'text', required: true },
  { key: 'allowDoubleCircle', label: '兼サー可否', category: 'recruitment', placeholder: '例：兼サー可能', type: 'text', required: false },
  { key: 'genderRatio', label: '男女比', category: 'recruitment', placeholder: '例：男6:女4', type: 'text', required: false },
  { key: 'gradeRatio', label: '学年比率', category: 'recruitment', placeholder: '例：1年50%,2年35%,3年15%', type: 'text', required: false },
  { key: 'applicationMaterialUrl', label: '応募資料リンク', category: 'recruitment', placeholder: '例：https://example.com/brochure.pdf', type: 'text', required: false },
  { key: 'applicationFormUrl', label: '応募フォームリンク', category: 'recruitment', placeholder: '例：https://forms.gle/...', type: 'text', required: false },

  { key: 'memberCount', label: 'メンバー人数', category: 'details', placeholder: '例：42名', type: 'text', required: false },
  { key: 'atmosphere', label: '団体の雰囲気', category: 'details', placeholder: '例：先輩後輩の垣根がなくフランク', type: 'textarea', required: false },
  { key: 'appealPoints', label: 'アピールポイント', category: 'details', placeholder: '例：初心者向けブートキャンプ完備', type: 'textarea', required: false },
  { key: 'representativeComment', label: '代表コメント', category: 'details', placeholder: '例：新入生の皆さん、ご入学おめでとうございます！', type: 'textarea', required: true },
  { key: 'annualEvents', label: '年間イベント', category: 'details', placeholder: '例：4月新歓、8月合宿、11月学園祭', type: 'textarea', required: false },
  { key: 'achievements', label: '活動実績', category: 'details', placeholder: '例：全国大学ハッカソン2024最優秀賞', type: 'textarea', required: false },
  { key: 'awards', label: '受賞歴', category: 'details', placeholder: '例：学長特別表彰', type: 'textarea', required: false },

  { key: 'admissionFee', label: '入会費', category: 'fees', placeholder: '例：なし', type: 'text', required: false },
  { key: 'membershipFee', label: '会費', category: 'fees', placeholder: '例：半期1,500円', type: 'text', required: false },
  { key: 'otherFees', label: 'その他費用', category: 'fees', placeholder: '例：合宿費実費', type: 'text', required: false },

  { key: 'instagram', label: 'Instagram', category: 'contact', placeholder: '例：@sample_circle', type: 'text', required: false },
  { key: 'x', label: 'X', category: 'contact', placeholder: '例：@sample_circle', type: 'text', required: false },
  { key: 'threads', label: 'Threads', category: 'contact', placeholder: '例：@sample_circle', type: 'text', required: false },
  { key: 'line', label: 'LINE', category: 'contact', placeholder: '例：https://line.me/R/ti/p/...', type: 'text', required: false },
  { key: 'tiktok', label: 'TikTok', category: 'contact', placeholder: '例：@sample_circle', type: 'text', required: false },
  { key: 'website', label: 'ホームページ', category: 'contact', placeholder: '例：https://example.com', type: 'text', required: false },
  { key: 'email', label: 'メールアドレス（改善案の通知先）', category: 'contact', placeholder: '例：contact@example.com', type: 'email', required: true },
];

// --- Step 2: AIによる取材 ----------------------------------------------------

export interface ChatMessage {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  timestamp: string;
}

export const MAX_INTERVIEW_QUESTIONS = 10;

// --- Step 3/4: 記事作成・公開・SNS投稿文 --------------------------------------

export const ARTICLE_BODY_MAX_LENGTH = 1000;

export type SnsPlatform = 'x' | 'instagram' | 'threads' | 'line' | 'tiktok';

export type SnsTexts = Record<SnsPlatform, string>;

export const SNS_PLATFORM_LABELS: Record<SnsPlatform, string> = {
  x: 'X',
  instagram: 'Instagram',
  threads: 'Threads',
  line: 'LINE',
  tiktok: 'TikTok紹介文',
};

export interface SeoMeta {
  metaDescription: string;
  keywords: string[];
}

export type ArticleStatus = 'draft' | 'published';

export interface ArticleFaq {
  q: string;
  a: string;
}

// The article is split into independently-editable sections so that AI
// improvement proposals (Step 6/7) can patch exactly one field (title,
// intro, cta, faq, seo, sns) without touching the others or any of the
// underlying registered facts.
export interface Article {
  id: string;
  orgId: string;
  slug: string;
  title: string;
  intro: string;            // 導入文
  body: string;             // 本文（導入文を除く）
  cta: string;               // CTA（応募・お問い合わせへの誘導）
  faqs: ArticleFaq[];
  seo: SeoMeta;
  snsTexts: SnsTexts;
  status: ArticleStatus;
  createdAt: string;
  publishedAt: string | null;
  updatedAt: string;
}

export function articleCharCount(a: Pick<Article, 'title' | 'intro' | 'body' | 'cta'>): number {
  return (a.title + a.intro + a.body + a.cta).length;
}

// --- Step 5: 効果測定 --------------------------------------------------------

export type AnalyticsEventType =
  | 'pv'
  | 'dwell'
  | 'bounce'
  | 'cta_click'
  | 'application'
  | 'line_add'
  | 'session_join';

export interface AnalyticsEvent {
  id: string;
  orgId: string;
  articleId: string;
  type: AnalyticsEventType;
  source: string | null;     // utm_source, e.g. 'x' | 'instagram' | 'threads' | 'line' | 'tiktok' | 'direct'
  dwellSeconds?: number;
  createdAt: string;
}

export interface AnalyticsSummary {
  pv: number;
  ctaClicks: number;
  ctr: number;               // ctaClicks / pv
  avgDwellSeconds: number;
  bounceRate: number;        // bounce sessions / pv
  snsInflow: Record<string, number>;
  applications: number;
  lineAdds: number;
  sessionJoins: number;
}

// --- Step 6/7: AI改善提案・承認フロー -----------------------------------------

export const IMPROVABLE_FIELDS = ['title', 'intro', 'cta', 'faq', 'seo', 'sns'] as const;
export type ImprovableField = typeof IMPROVABLE_FIELDS[number];

export const IMPROVABLE_FIELD_LABELS: Record<ImprovableField, string> = {
  title: 'タイトル',
  intro: '導入文',
  cta: 'CTA',
  faq: 'FAQ',
  seo: 'SEO情報',
  sns: 'SNS投稿文',
};

export interface ProposedChange {
  field: ImprovableField;
  before: string;
  after: string;
  reason: string;
  // Only set when field === 'sns': which platform's post text this touches.
  platform?: SnsPlatform;
  // Only set when field === 'faq': index into Article.faqs to replace, or -1 to append a new Q&A.
  faqIndex?: number;
}

export type ProposalStatus = 'pending' | 'approved' | 'rejected';

export interface ImprovementProposal {
  id: string;
  orgId: string;
  articleId: string;
  changes: ProposedChange[];
  basedOnData: AnalyticsSummary;
  status: ProposalStatus;
  createdAt: string;
  reviewedAt: string | null;
}
