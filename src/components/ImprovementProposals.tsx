import React, { useEffect, useState } from 'react';
import { Article, IMPROVABLE_FIELD_LABELS, ImprovementProposal } from '../types';
import { approveProposal, generateProposal, listArticles, listProposals, rejectProposal } from '../lib/api';

export default function ImprovementProposals() {
  const [articles, setArticles] = useState<Article[]>([]);
  const [selectedId, setSelectedId] = useState<string>('');
  const [proposals, setProposals] = useState<ImprovementProposal[]>([]);
  const [generating, setGenerating] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = () => listProposals().then(setProposals).catch((err) => setError(err.message));

  useEffect(() => {
    listArticles()
      .then((list) => {
        setArticles(list);
        if (list.length > 0) setSelectedId(list[0].id);
      })
      .catch((err) => setError(err.message));
    load();
  }, []);

  const handleGenerate = async () => {
    if (!selectedId) return;
    setGenerating(true);
    setError(null);
    try {
      await generateProposal(selectedId);
      await load();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setGenerating(false);
    }
  };

  const handleReview = async (id: string, action: 'approve' | 'reject') => {
    setBusyId(id);
    setError(null);
    try {
      if (action === 'approve') await approveProposal(id);
      else await rejectProposal(id);
      await load();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm h-full flex flex-col overflow-hidden">
      <div className="p-5 border-b border-slate-200 shrink-0 flex items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-bold text-slate-900">Step 6-7. AI改善提案・承認</h2>
          <p className="text-xs text-slate-500 mt-1">
            データに基づく改善案はタイトル・導入文・CTA・FAQ・SEO・SNS投稿文のみが対象です。承認するまで公開されません。
          </p>
        </div>
        {articles.length > 0 && (
          <div className="flex items-center gap-2 shrink-0">
            <select
              value={selectedId}
              onChange={(e) => setSelectedId(e.target.value)}
              className="text-xs border border-slate-300 rounded-lg px-2 py-1.5"
            >
              {articles.map((a) => (
                <option key={a.id} value={a.id}>{a.title}</option>
              ))}
            </select>
            <button
              onClick={handleGenerate}
              disabled={generating}
              className="bg-indigo-700 hover:bg-indigo-800 disabled:opacity-60 text-white text-xs font-bold py-2 px-3 rounded-lg cursor-pointer whitespace-nowrap"
            >
              {generating ? '分析中...' : '改善案を作成'}
            </button>
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-5 space-y-4">
        {error && <div className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</div>}
        {articles.length === 0 && <p className="text-xs text-slate-400 text-center py-10">まだ公開された記事がありません。</p>}
        {articles.length > 0 && proposals.length === 0 && (
          <p className="text-xs text-slate-400 text-center py-10">改善案はまだありません。「改善案を作成」を押してください。</p>
        )}

        {proposals.map((proposal) => (
          <div key={proposal.id} className="border border-slate-200 rounded-xl overflow-hidden">
            <div className="flex items-center justify-between px-4 py-2.5 bg-slate-50">
              <span className="text-[11px] font-bold text-slate-600">
                {new Date(proposal.createdAt).toLocaleString('ja-JP')}
              </span>
              <StatusBadge status={proposal.status} />
            </div>

            <div className="p-4 space-y-3">
              {proposal.changes.length === 0 && (
                <p className="text-xs text-slate-400">この時点では改善の余地は見つかりませんでした。</p>
              )}
              {proposal.changes.map((change, i) => (
                <div key={i} className="bg-slate-50 rounded-lg p-3">
                  <p className="text-[11px] font-bold text-indigo-700 mb-1">
                    {IMPROVABLE_FIELD_LABELS[change.field]}
                    {change.platform ? `（${change.platform}）` : ''}
                  </p>
                  <p className="text-[11px] text-slate-400 line-through mb-1 whitespace-pre-wrap">{change.before}</p>
                  <p className="text-xs text-slate-800 whitespace-pre-wrap mb-1">{change.after}</p>
                  <p className="text-[11px] text-slate-500">理由: {change.reason}</p>
                </div>
              ))}

              <details className="text-[11px] text-slate-500">
                <summary className="cursor-pointer font-bold">根拠データを見る</summary>
                <pre className="mt-2 bg-slate-900 text-slate-100 rounded-lg p-3 overflow-x-auto">
                  {JSON.stringify(proposal.basedOnData, null, 2)}
                </pre>
              </details>

              {proposal.status === 'pending' && proposal.changes.length > 0 && (
                <div className="flex gap-2 pt-2">
                  <button
                    onClick={() => handleReview(proposal.id, 'approve')}
                    disabled={busyId === proposal.id}
                    className="flex-1 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white text-xs font-bold py-2 rounded-lg cursor-pointer"
                  >
                    承認して公開に反映
                  </button>
                  <button
                    onClick={() => handleReview(proposal.id, 'reject')}
                    disabled={busyId === proposal.id}
                    className="flex-1 bg-slate-200 hover:bg-slate-300 disabled:opacity-60 text-slate-700 text-xs font-bold py-2 rounded-lg cursor-pointer"
                  >
                    却下
                  </button>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: ImprovementProposal['status'] }) {
  const styles: Record<ImprovementProposal['status'], string> = {
    pending: 'bg-amber-100 text-amber-700',
    approved: 'bg-emerald-100 text-emerald-700',
    rejected: 'bg-slate-200 text-slate-500',
  };
  const labels: Record<ImprovementProposal['status'], string> = {
    pending: '承認待ち',
    approved: '承認済み',
    rejected: '却下',
  };
  return <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${styles[status]}`}>{labels[status]}</span>;
}
