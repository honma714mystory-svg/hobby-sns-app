import React, { useEffect, useState } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import ReactMarkdown from 'react-markdown';
import { db } from '../lib/firebase';
import { trackArticleVisit, trackEvent } from '../lib/tracking';
import type { Article } from '../types';
import { SNS_PLATFORM_LABELS, SnsPlatform } from '../types';

interface Props {
  slug: string;
}

export default function PublishedArticleView({ slug }: Props) {
  const [article, setArticle] = useState<Article | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [ctaMarker, setCtaMarker] = useState<{ markCtaClicked: () => void } | null>(null);

  useEffect(() => {
    (async () => {
      const snap = await getDoc(doc(db, 'articles', slug));
      if (!snap.exists() || snap.data().status !== 'published') {
        setNotFound(true);
        return;
      }
      const data = snap.data() as Article;
      setArticle(data);
      setCtaMarker(trackArticleVisit(data.orgId, data.id));
    })();
  }, [slug]);

  if (notFound) {
    return (
      <div className="min-h-screen flex items-center justify-center text-center p-6">
        <p className="text-slate-500 text-sm">記事が見つかりませんでした。</p>
      </div>
    );
  }

  if (!article) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-slate-400 text-sm">読み込み中...</p>
      </div>
    );
  }

  const handleCta = (kind: 'application' | 'line_add' | 'generic') => {
    ctaMarker?.markCtaClicked();
    trackEvent(article.orgId, article.id, 'cta_click');
    if (kind === 'application') trackEvent(article.orgId, article.id, 'application');
    if (kind === 'line_add') trackEvent(article.orgId, article.id, 'line_add');
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-800">
      <article className="max-w-2xl mx-auto px-6 py-12">
        <h1 className="text-2xl font-extrabold text-slate-900 mb-4 leading-snug">{article.title}</h1>
        <p className="text-sm text-slate-600 leading-relaxed mb-6 whitespace-pre-wrap">{article.intro}</p>
        <div className="prose prose-sm max-w-none mb-8">
          <ReactMarkdown>{article.body}</ReactMarkdown>
        </div>

        <div className="bg-indigo-700 text-white rounded-2xl p-6 text-center mb-8">
          <p className="text-sm font-bold whitespace-pre-wrap mb-4">{article.cta}</p>
          <div className="flex flex-wrap justify-center gap-2">
            <a
              href="#apply"
              onClick={() => handleCta('application')}
              className="bg-white text-indigo-700 text-xs font-bold py-2 px-5 rounded-full"
            >
              応募・お問い合わせ
            </a>
            <a
              href="#line"
              onClick={() => handleCta('line_add')}
              className="bg-emerald-500 text-white text-xs font-bold py-2 px-5 rounded-full"
            >
              LINEで質問する
            </a>
          </div>
        </div>

        {article.faqs.length > 0 && (
          <div className="mb-8">
            <h2 className="text-sm font-bold text-slate-900 mb-3">よくある質問</h2>
            <div className="space-y-3">
              {article.faqs.map((faq, i) => (
                <div key={i} className="border border-slate-200 rounded-xl p-4">
                  <p className="text-xs font-bold text-indigo-700 mb-1">Q. {faq.q}</p>
                  <p className="text-xs text-slate-600 whitespace-pre-wrap">A. {faq.a}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="flex flex-wrap gap-2">
          {(Object.keys(SNS_PLATFORM_LABELS) as SnsPlatform[]).map((platform) => (
            <button
              key={platform}
              onClick={() => handleCta('generic')}
              className="text-[11px] text-slate-500 border border-slate-200 rounded-full px-3 py-1"
            >
              {SNS_PLATFORM_LABELS[platform]}
            </button>
          ))}
        </div>
      </article>
    </div>
  );
}
