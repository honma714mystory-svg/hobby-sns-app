import React, { useEffect, useState } from 'react';
import { CircleProfile, INITIAL_PROFILE } from './types';
import { auth, loginWithGoogle, logout, onAuthStateChanged, type User } from './lib/firebase';
import { fetchOrgProfile, saveOrgProfile } from './lib/api';
import InfoForm from './components/InfoForm';
import InterviewChat from './components/InterviewChat';
import ArticleGenerator from './components/ArticleGenerator';
import AnalyticsDashboard from './components/AnalyticsDashboard';
import ImprovementProposals from './components/ImprovementProposals';
import PublishedArticleView from './components/PublishedArticleView';

type StepTab = 'info' | 'interview' | 'article' | 'analytics' | 'proposals';

const STEPS: { id: StepTab; label: string }[] = [
  { id: 'info', label: '1. 基本情報' },
  { id: 'interview', label: '2. AI取材' },
  { id: 'article', label: '3-4. 記事作成・公開' },
  { id: 'analytics', label: '5. 効果測定' },
  { id: 'proposals', label: '6-7. AI改善提案' },
];

const articleSlugMatch = window.location.pathname.match(/^\/a\/([^/]+)/);

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [profile, setProfile] = useState<CircleProfile>(INITIAL_PROFILE);
  const [interviewNotes, setInterviewNotes] = useState('');
  const [activeTab, setActiveTab] = useState<StepTab>('info');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(true);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => onAuthStateChanged(auth, (u) => {
    setUser(u);
    setAuthLoading(false);
  }), []);

  useEffect(() => {
    if (!user) return;
    fetchOrgProfile()
      .then((data) => {
        if (data?.profile) setProfile(data.profile);
      })
      .catch(() => {});
  }, [user]);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3500);
  };

  const handleFieldChange = (key: keyof CircleProfile, value: string) => {
    setProfile((prev) => ({ ...prev, [key]: value }));
    setSaved(false);
  };

  const handleProfileUpdate = (updates: Partial<CircleProfile>) => {
    setProfile((prev) => ({ ...prev, ...updates }));
    setSaved(false);
    showToast('AIが基本情報を更新しました。Step 1で確認・保存してください。');
  };

  const handleSaveProfile = async () => {
    setSaving(true);
    try {
      await saveOrgProfile(profile);
      setSaved(true);
      showToast('基本情報を保存しました。');
    } catch (err: any) {
      showToast(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleLogin = async () => {
    try {
      await loginWithGoogle();
    } catch (err: any) {
      showToast(err.message || 'ログインに失敗しました。');
    }
  };

  if (articleSlugMatch) {
    return <PublishedArticleView slug={articleSlugMatch[1]} />;
  }

  if (authLoading) {
    return <div className="min-h-screen flex items-center justify-center text-slate-400 text-sm">読み込み中...</div>;
  }

  if (!user) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-6 bg-[#f8fafc]">
        <div className="text-center">
          <h1 className="text-xl font-extrabold text-slate-900">Campus Growth AI</h1>
          <p className="text-xs text-slate-500 mt-2">学生団体のメンバー募集を支援するAI広報プラットフォーム</p>
        </div>
        <button
          onClick={handleLogin}
          className="bg-indigo-700 hover:bg-indigo-800 text-white text-sm font-bold py-2.5 px-6 rounded-xl cursor-pointer"
        >
          Googleでログイン
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f8fafc] flex flex-col antialiased text-slate-800">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-40 px-6 py-3 shrink-0">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-sm font-extrabold text-slate-900">Campus Growth AI</h1>
            <p className="text-[10px] text-slate-500">AI編集部が募集広報を支援します</p>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-[11px] text-slate-500">{user.email}</span>
            <button onClick={() => logout()} className="text-[11px] font-bold text-slate-500 hover:text-red-500 cursor-pointer">
              ログアウト
            </button>
          </div>
        </div>
      </header>

      <nav className="bg-white border-b border-slate-200 px-6 shrink-0">
        <div className="max-w-6xl mx-auto flex gap-1 overflow-x-auto">
          {STEPS.map((step) => (
            <button
              key={step.id}
              onClick={() => setActiveTab(step.id)}
              className={`text-xs font-bold py-3 px-4 border-b-2 whitespace-nowrap cursor-pointer ${
                activeTab === step.id ? 'border-indigo-700 text-indigo-700' : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              {step.label}
            </button>
          ))}
        </div>
      </nav>

      <main className="flex-1 max-w-6xl w-full mx-auto p-6 min-h-0">
        <div className="h-[calc(100vh-9.5rem)] min-h-[500px]">
          {activeTab === 'info' && (
            <InfoForm profile={profile} onChange={handleFieldChange} onSave={handleSaveProfile} saving={saving} saved={saved} />
          )}
          {activeTab === 'interview' && (
            <InterviewChat profile={profile} onProfileUpdate={handleProfileUpdate} onInterviewComplete={(t) => { setInterviewNotes(t); setActiveTab('article'); }} />
          )}
          {activeTab === 'article' && (
            <ArticleGenerator profile={profile} interviewNotes={interviewNotes} onPublished={() => showToast('記事を公開しました！')} />
          )}
          {activeTab === 'analytics' && <AnalyticsDashboard />}
          {activeTab === 'proposals' && <ImprovementProposals />}
        </div>
      </main>

      {toast && (
        <div className="fixed bottom-6 right-6 bg-slate-900 text-white text-xs px-4 py-3 rounded-xl shadow-lg z-50">
          {toast}
        </div>
      )}
    </div>
  );
}
