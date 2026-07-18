import { auth } from './firebase';
import type {
  Article,
  ArticleFaq,
  CircleProfile,
  ImprovementProposal,
  SeoMeta,
  SnsTexts,
} from '../types';

async function authedFetch(url: string, options: RequestInit = {}) {
  const user = auth.currentUser;
  if (!user) throw new Error('ログインが必要です。');
  const token = await user.getIdToken();
  const res = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...(options.headers || {}),
    },
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `リクエストに失敗しました (${res.status})`);
  }
  if (res.status === 204) return null;
  return res.json();
}

// --- Step 1: 基本情報登録 ----------------------------------------------------

export async function fetchOrgProfile(): Promise<{ profile: CircleProfile } | null> {
  return authedFetch('/api/org');
}

export async function saveOrgProfile(profile: CircleProfile): Promise<void> {
  await authedFetch('/api/org', { method: 'POST', body: JSON.stringify({ profile }) });
}

// --- Step 2: AIによる取材 ----------------------------------------------------

export interface InterviewTurnResponse {
  reply: string;
  updatedFields: Partial<CircleProfile>;
  isComplete: boolean;
}

export async function sendInterviewTurn(
  profile: Partial<CircleProfile>,
  history: { sender: 'user' | 'assistant'; text: string }[],
  questionsAskedSoFar: number,
): Promise<InterviewTurnResponse> {
  return authedFetch('/api/interview', {
    method: 'POST',
    body: JSON.stringify({ profile, history, questionsAskedSoFar }),
  });
}

// --- Step 3: 記事作成 --------------------------------------------------------

export interface GeneratedArticleDraft {
  title: string;
  intro: string;
  body: string;
  cta: string;
  faqs: ArticleFaq[];
  metaDescription: string;
  keywords: string[];
}

export async function generateArticleDraft(
  profile: CircleProfile,
  interviewNotes: string,
): Promise<GeneratedArticleDraft> {
  return authedFetch('/api/generate-article', {
    method: 'POST',
    body: JSON.stringify({ profile, interviewNotes }),
  });
}

// --- Step 4: 公開・SNS投稿文 --------------------------------------------------

export async function generateSnsTexts(
  profile: CircleProfile,
  article: { title: string; intro: string; body: string; cta: string },
  articleUrl?: string,
): Promise<SnsTexts> {
  return authedFetch('/api/generate-sns', {
    method: 'POST',
    body: JSON.stringify({ profile, article, articleUrl }),
  });
}

export async function publishArticle(
  profile: CircleProfile,
  draft: { title: string; intro: string; body: string; cta: string; faqs: ArticleFaq[] },
  seo: SeoMeta,
): Promise<{ article: Article; url: string }> {
  return authedFetch('/api/publish', {
    method: 'POST',
    body: JSON.stringify({ profile, ...draft, seo }),
  });
}

export async function listArticles(): Promise<Article[]> {
  return authedFetch('/api/articles');
}

// --- Step 5: 効果測定 --------------------------------------------------------

export interface AnalyticsSummary {
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

export async function fetchAnalyticsSummary(articleId: string): Promise<AnalyticsSummary> {
  return authedFetch(`/api/analytics/${articleId}`);
}

// --- Step 6/7: AI改善提案・承認フロー -----------------------------------------

export async function generateProposal(articleId: string): Promise<ImprovementProposal> {
  return authedFetch('/api/proposals/generate', { method: 'POST', body: JSON.stringify({ articleId }) });
}

export async function listProposals(): Promise<ImprovementProposal[]> {
  return authedFetch('/api/proposals');
}

export async function approveProposal(id: string): Promise<void> {
  await authedFetch(`/api/proposals/${id}/approve`, { method: 'POST' });
}

export async function rejectProposal(id: string): Promise<void> {
  await authedFetch(`/api/proposals/${id}/reject`, { method: 'POST' });
}
