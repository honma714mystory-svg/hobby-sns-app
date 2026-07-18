import React, { useState, useRef, useEffect } from 'react';
import { CircleProfile, ChatMessage, MAX_INTERVIEW_QUESTIONS } from '../types';
import { sendInterviewTurn } from '../lib/api';

interface Props {
  profile: CircleProfile;
  onProfileUpdate: (updates: Partial<CircleProfile>) => void;
  onInterviewComplete: (transcript: string) => void;
}

export default function InterviewChat({ profile, onProfileUpdate, onInterviewComplete }: Props) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [questionsAsked, setQuestionsAsked] = useState(0);
  const [isComplete, setIsComplete] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages]);

  const startInterview = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await sendInterviewTurn(profile, [], 0);
      appendAssistant(result);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const appendAssistant = (result: { reply: string; updatedFields: Partial<CircleProfile>; isComplete: boolean }) => {
    setMessages((prev) => [
      ...prev,
      { id: crypto.randomUUID(), sender: 'assistant', text: result.reply, timestamp: new Date().toISOString() },
    ]);
    if (Object.keys(result.updatedFields).length > 0) {
      onProfileUpdate(result.updatedFields);
    }
    setQuestionsAsked((n) => n + 1);
    if (result.isComplete) {
      setIsComplete(true);
    }
  };

  const send = async () => {
    if (!input.trim() || loading || isComplete) return;
    const userMsg: ChatMessage = { id: crypto.randomUUID(), sender: 'user', text: input, timestamp: new Date().toISOString() };
    const nextMessages = [...messages, userMsg];
    setMessages(nextMessages);
    setInput('');
    setLoading(true);
    setError(null);
    try {
      const history = nextMessages.map((m) => ({ sender: m.sender, text: m.text }));
      const result = await sendInterviewTurn(profile, history, questionsAsked);
      appendAssistant(result);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const finishAndBuildTranscript = () => {
    const transcript = messages.map((m) => `${m.sender === 'user' ? '回答' : '質問'}: ${m.text}`).join('\n');
    onInterviewComplete(transcript);
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm h-full flex flex-col overflow-hidden">
      <div className="p-5 border-b border-slate-200 shrink-0 flex items-center justify-between">
        <div>
          <h2 className="text-sm font-bold text-slate-900">Step 2. AIによる取材</h2>
          <p className="text-xs text-slate-500 mt-1">基本情報だけでは伝わらない魅力を、AI記者が最大{MAX_INTERVIEW_QUESTIONS}問で深掘りします。</p>
        </div>
        <span className="text-[11px] font-bold text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-full shrink-0">
          {questionsAsked} / {MAX_INTERVIEW_QUESTIONS} 問
        </span>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto p-5 space-y-3">
        {messages.length === 0 && (
          <div className="text-center py-10">
            <p className="text-xs text-slate-500 mb-4">「取材を始める」を押すと、AI記者が質問を始めます。</p>
            <button
              onClick={startInterview}
              disabled={loading}
              className="bg-indigo-700 hover:bg-indigo-800 disabled:opacity-60 text-white text-xs font-bold py-2.5 px-6 rounded-lg cursor-pointer"
            >
              取材を始める
            </button>
          </div>
        )}
        {messages.map((m) => (
          <div key={m.id} className={`flex ${m.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div
              className={`max-w-[80%] text-xs rounded-2xl px-4 py-2.5 whitespace-pre-wrap ${
                m.sender === 'user' ? 'bg-indigo-700 text-white' : 'bg-slate-100 text-slate-800'
              }`}
            >
              {m.text}
            </div>
          </div>
        ))}
        {loading && <div className="text-xs text-slate-400">AI記者が入力中...</div>}
        {error && <div className="text-xs text-red-600">{error}</div>}
        {isComplete && (
          <div className="text-center pt-2">
            <button
              onClick={finishAndBuildTranscript}
              className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold py-2.5 px-6 rounded-lg cursor-pointer"
            >
              取材内容を記事作成に使う → Step 3へ
            </button>
          </div>
        )}
      </div>

      {messages.length > 0 && !isComplete && (
        <div className="p-4 border-t border-slate-200 shrink-0 flex gap-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && send()}
            placeholder="回答を入力..."
            className="flex-1 text-xs border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          <button
            onClick={send}
            disabled={loading}
            className="bg-indigo-700 hover:bg-indigo-800 disabled:opacity-60 text-white text-xs font-bold py-2 px-4 rounded-lg cursor-pointer"
          >
            送信
          </button>
        </div>
      )}
    </div>
  );
}
