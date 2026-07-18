import React, { useEffect, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { Article } from '../types';
import { AnalyticsSummary, fetchAnalyticsSummary, listArticles } from '../lib/api';

export default function AnalyticsDashboard() {
  const [articles, setArticles] = useState<Article[]>([]);
  const [selectedId, setSelectedId] = useState<string>('');
  const [summary, setSummary] = useState<AnalyticsSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    listArticles()
      .then((list) => {
        setArticles(list);
        if (list.length > 0) setSelectedId(list[0].id);
      })
      .catch((err) => setError(err.message));
  }, []);

  useEffect(() => {
    if (!selectedId) return;
    setLoading(true);
    setError(null);
    fetchAnalyticsSummary(selectedId)
      .then(setSummary)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [selectedId]);

  const snsChartData = summary
    ? Object.entries(summary.snsInflow).map(([source, count]) => ({ source, count }))
    : [];

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm h-full flex flex-col overflow-hidden">
      <div className="p-5 border-b border-slate-200 shrink-0 flex items-center justify-between">
        <div>
          <h2 className="text-sm font-bold text-slate-900">Step 5. 効果測定</h2>
          <p className="text-xs text-slate-500 mt-1">公開後のPV・CTR・応募数などを継続的に分析します。</p>
        </div>
        {articles.length > 0 && (
          <select
            value={selectedId}
            onChange={(e) => setSelectedId(e.target.value)}
            className="text-xs border border-slate-300 rounded-lg px-2 py-1.5"
          >
            {articles.map((a) => (
              <option key={a.id} value={a.id}>{a.title}</option>
            ))}
          </select>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-5 space-y-5">
        {articles.length === 0 && !loading && (
          <p className="text-xs text-slate-400 text-center py-10">まだ公開された記事がありません。Step 3-4で記事を公開してください。</p>
        )}
        {error && <div className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</div>}
        {loading && <p className="text-xs text-slate-400">読み込み中...</p>}

        {summary && !loading && (
          <>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <Stat label="PV" value={summary.pv} />
              <Stat label="CTR" value={`${(summary.ctr * 100).toFixed(1)}%`} />
              <Stat label="平均滞在時間" value={`${summary.avgDwellSeconds.toFixed(0)}秒`} />
              <Stat label="離脱率" value={`${(summary.bounceRate * 100).toFixed(1)}%`} />
              <Stat label="応募数" value={summary.applications} accent />
              <Stat label="LINE追加数" value={summary.lineAdds} accent />
              <Stat label="説明会参加数" value={summary.sessionJoins} accent />
              <Stat label="CTAクリック数" value={summary.ctaClicks} />
            </div>

            <div>
              <h3 className="text-xs font-bold text-slate-700 mb-2">SNS流入内訳</h3>
              {snsChartData.length === 0 ? (
                <p className="text-xs text-slate-400">まだ流入データがありません。</p>
              ) : (
                <div className="h-56">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={snsChartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                      <XAxis dataKey="source" tick={{ fontSize: 11 }} />
                      <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                      <Tooltip />
                      <Bar dataKey="count" fill="#4338ca" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function Stat({ label, value, accent }: { label: string; value: string | number; accent?: boolean }) {
  return (
    <div className={`rounded-xl border p-3 ${accent ? 'bg-indigo-50 border-indigo-100' : 'bg-slate-50 border-slate-200'}`}>
      <p className="text-[10px] font-bold text-slate-500">{label}</p>
      <p className={`text-lg font-extrabold ${accent ? 'text-indigo-700' : 'text-slate-900'}`}>{value}</p>
    </div>
  );
}
