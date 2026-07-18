import React, { useState } from 'react';
import { ArticleFaq, CircleProfile, ARTICLE_BODY_MAX_LENGTH, SNS_PLATFORM_LABELS, SnsPlatform } from '../types';
import { GeneratedArticleDraft, generateArticleDraft, publishArticle } from '../lib/api';

interface Props {
  profile: CircleProfile;
  interviewNotes: string;
  onPublished: (articleId: string, url: string) => void;
}

type Draft = GeneratedArticleDraft;

export default function ArticleGenerator({ profile, interviewNotes, onPublished }: Props) {
  const [draft, setDraft] = useState<Draft | null>(null);
  const [generating, setGenerating] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [published, setPublished] = useState<{ url: string; snsTexts: Record<SnsPlatform, string> } | null>(null);

  const totalLength = draft ? (draft.title + draft.intro + draft.body + draft.cta).length : 0;

  const generate = async () => {
    setGenerating(true);
    setError(null);
    try {
      const result = await generateArticleDraft(profile, interviewNotes);
      setDraft(result);
      setPublished(null);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setGenerating(false);
    }
  };

  const updateField = <K extends keyof Draft>(key: K, value: Draft[K]) => {
    if (!draft) return;
    setDraft({ ...draft, [key]: value });
  };

  const updateFaq = (index: number, patch: Partial<ArticleFaq>) => {
    if (!draft) return;
    const faqs = [...draft.faqs];
    faqs[index] = { ...faqs[index], ...patch };
    setDraft({ ...draft, faqs });
  };

  const publish = async () => {
    if (!draft) return;
    setPublishing(true);
    setError(null);
    try {
      const { article, url } = await publishArticle(
        profile,
        { title: draft.title, intro: draft.intro, body: draft.body, cta: draft.cta, faqs: draft.faqs },
        { metaDescription: draft.metaDescription, keywords: draft.keywords },
      );
      setPublished({ url, snsTexts: article.snsTexts });
      onPublished(article.id, url);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setPublishing(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm h-full flex flex-col overflow-hidden">
      <div className="p-5 border-b border-slate-200 shrink-0 flex items-center justify-between">
        <div>
          <h2 className="text-sm font-bold text-slate-900">Step 3-4. 記事作成・公開</h2>
          <p className="text-xs text-slate-500 mt-1">{ARTICLE_BODY_MAX_LENGTH}文字以内の記事を作成し、公開URL・SNS投稿文を発行します。</p>
        </div>
        <button
          onClick={generate}
          disabled={generating}
          className="bg-indigo-700 hover:bg-indigo-800 disabled:opacity-60 text-white text-xs font-bold py-2 px-4 rounded-lg cursor-pointer shrink-0"
        >
          {generating ? '生成中...' : draft ? '記事を再生成' : '記事を生成する'}
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-5 space-y-4">
        {error && <div className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</div>}

        {!draft && !generating && (
          <p className="text-xs text-slate-400 text-center py-10">Step 1・2の内容をもとに記事を生成してください。</p>
        )}

        {draft && (
          <>
            <div className={`text-[11px] font-bold text-right ${totalLength > ARTICLE_BODY_MAX_LENGTH ? 'text-red-500' : 'text-slate-400'}`}>
              {totalLength} / {ARTICLE_BODY_MAX_LENGTH} 文字
            </div>

            <Field label="タイトル">
              <input
                value={draft.title}
                onChange={(e) => updateField('title', e.target.value)}
                className="w-full text-sm font-bold border border-slate-300 rounded-lg px-3 py-2"
              />
            </Field>
            <Field label="導入文">
              <textarea
                value={draft.intro}
                onChange={(e) => updateField('intro', e.target.value)}
                rows={3}
                className="w-full text-xs border border-slate-300 rounded-lg px-3 py-2"
              />
            </Field>
            <Field label="本文">
              <textarea
                value={draft.body}
                onChange={(e) => updateField('body', e.target.value)}
                rows={8}
                className="w-full text-xs border border-slate-300 rounded-lg px-3 py-2"
              />
            </Field>
            <Field label="CTA（応募・お問い合わせへの誘導）">
              <textarea
                value={draft.cta}
                onChange={(e) => updateField('cta', e.target.value)}
                rows={2}
                className="w-full text-xs border border-slate-300 rounded-lg px-3 py-2"
              />
            </Field>
            <Field label="FAQ">
              <div className="space-y-2">
                {draft.faqs.map((faq, i) => (
                  <div key={i} className="border border-slate-200 rounded-lg p-2 space-y-1">
                    <input
                      value={faq.q}
                      onChange={(e) => updateFaq(i, { q: e.target.value })}
                      className="w-full text-xs font-bold border-b border-slate-200 pb-1"
                      placeholder="質問"
                    />
                    <textarea
                      value={faq.a}
                      onChange={(e) => updateFaq(i, { a: e.target.value })}
                      rows={2}
                      className="w-full text-xs"
                      placeholder="回答"
                    />
                  </div>
                ))}
              </div>
            </Field>
            <Field label="SEO meta description">
              <textarea
                value={draft.metaDescription}
                onChange={(e) => updateField('metaDescription', e.target.value)}
                rows={2}
                className="w-full text-xs border border-slate-300 rounded-lg px-3 py-2"
              />
            </Field>

            <button
              onClick={publish}
              disabled={publishing || totalLength > ARTICLE_BODY_MAX_LENGTH}
              className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white text-xs font-bold py-3 rounded-lg cursor-pointer"
            >
              {publishing ? '公開処理中...（SNS投稿文も生成します）' : 'この内容で公開する'}
            </button>

            {published && (
              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 space-y-3">
                <p className="text-xs font-bold text-emerald-800">公開URLを発行しました！</p>
                <a href={published.url} target="_blank" rel="noreferrer" className="text-xs text-indigo-600 underline break-all">
                  {published.url}
                </a>
                <div className="space-y-2 pt-2">
                  {(Object.keys(SNS_PLATFORM_LABELS) as SnsPlatform[]).map((platform) => (
                    <div key={platform} className="bg-white border border-slate-200 rounded-lg p-2.5">
                      <p className="text-[11px] font-bold text-slate-500 mb-1">{SNS_PLATFORM_LABELS[platform]}</p>
                      <p className="text-xs whitespace-pre-wrap">{published.snsTexts[platform]}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-[11px] font-bold text-slate-600 mb-1">{label}</label>
      {children}
    </div>
  );
}
