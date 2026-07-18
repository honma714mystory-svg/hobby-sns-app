import React, { useState } from 'react';
import { CATEGORY_LABELS, CircleProfile, FIELD_CONFIGS, ProfileCategory } from '../types';

interface Props {
  profile: CircleProfile;
  onChange: (key: keyof CircleProfile, value: string) => void;
  onSave: () => void;
  saving: boolean;
  saved: boolean;
}

const CATEGORIES: ProfileCategory[] = ['basic', 'recruitment', 'details', 'fees', 'contact'];

export default function InfoForm({ profile, onChange, onSave, saving, saved }: Props) {
  const [openCategory, setOpenCategory] = useState<ProfileCategory>('basic');

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm h-full flex flex-col overflow-hidden">
      <div className="p-5 border-b border-slate-200 shrink-0">
        <h2 className="text-sm font-bold text-slate-900">Step 1. 基本情報登録</h2>
        <p className="text-xs text-slate-500 mt-1">
          団体の基本情報を登録してください。ここでの情報はAI取材・記事作成・SNS投稿文作成すべての土台になります。
        </p>
      </div>

      <div className="flex-1 overflow-y-auto p-5 space-y-4">
        {CATEGORIES.map((category) => (
          <div key={category} className="border border-slate-200 rounded-xl overflow-hidden">
            <button
              type="button"
              onClick={() => setOpenCategory(category)}
              className="w-full flex items-center justify-between px-4 py-2.5 bg-slate-50 text-xs font-bold text-slate-700 cursor-pointer"
            >
              <span>{CATEGORY_LABELS[category]}</span>
              <span className="text-slate-400">{openCategory === category ? '−' : '+'}</span>
            </button>
            {openCategory === category && (
              <div className="p-4 space-y-3">
                {FIELD_CONFIGS.filter((f) => f.category === category).map((field) => (
                  <div key={field.key}>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">
                      {field.label}
                      {field.required && <span className="text-red-500 ml-0.5">*</span>}
                    </label>
                    {field.type === 'textarea' ? (
                      <textarea
                        value={profile[field.key] as string}
                        onChange={(e) => onChange(field.key, e.target.value)}
                        placeholder={field.placeholder}
                        rows={3}
                        className="w-full text-xs border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    ) : (
                      <input
                        type={field.type === 'email' ? 'email' : 'text'}
                        value={profile[field.key] as string}
                        onChange={(e) => onChange(field.key, e.target.value)}
                        placeholder={field.placeholder}
                        className="w-full text-xs border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="p-4 border-t border-slate-200 shrink-0 flex items-center justify-between">
        <span className="text-[11px] text-slate-400">{saved ? '保存済み' : '未保存の変更があります'}</span>
        <button
          onClick={onSave}
          disabled={saving}
          className="bg-indigo-700 hover:bg-indigo-800 disabled:opacity-60 text-white text-xs font-bold py-2 px-5 rounded-lg cursor-pointer"
        >
          {saving ? '保存中...' : '保存する'}
        </button>
      </div>
    </div>
  );
}
