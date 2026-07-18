# Campus Growth AI

学生団体のメンバー募集を最大化するAI広報プラットフォーム。基本情報登録 → AI取材 → 記事作成 → 公開・SNS投稿文発行 → 効果測定 → AI改善提案 → 承認、までを一気通貫で支援します。

## 構成

- **フロントエンド**: React 19 + TypeScript + Vite + Tailwind CSS
- **サーバー**: Express（開発時はViteをミドルウェアとして統合、本番は `dist/server.cjs` として起動）
- **AI**: Gemini API（`@google/genai`、無料枠で利用可能な `gemini-flash-latest` を使用）
- **データベース/認証**: Firebase（Firestore + Google認証）、サーバー側は Firebase Admin SDK を使用
- **メール通知**: [Trigger Email 拡張機能](https://extensions.dev/extensions/firebase/firestore-send-email)（`mail` コレクションへの書き込みを検知して送信）

## サービスフローと実装の対応

| ステップ | 画面/エンドポイント |
| --- | --- |
| ① 基本情報登録 | `InfoForm` / `GET,POST /api/org` |
| ② AIによる取材（最大10問） | `InterviewChat` / `POST /api/interview` |
| ③ 記事作成（1,000文字以内） | `ArticleGenerator` / `POST /api/generate-article` |
| ④ 公開・URL発行・SNS投稿文生成 | `ArticleGenerator` / `POST /api/publish`（公開時にX・Instagram・Threads・LINE・TikTok向けの投稿文をまとめて生成） |
| ⑤ 効果測定 | `AnalyticsDashboard` / `POST /api/track`, `GET /api/track/pixel`, `GET /api/analytics/:articleId` |
| ⑥ AI改善提案 | `ImprovementProposals` / `POST /api/proposals/generate`（タイトル・導入文・CTA・FAQ・SEO・SNS投稿文のみ変更対象） |
| ⑦ 承認フロー | `ImprovementProposals` / `POST /api/proposals/:id/approve`,`/reject`（承認するまで公開記事は変更されない。提案作成時に登録メールへ通知） |

## セットアップ

### 1. 依存関係のインストール

```bash
npm install
```

### 2. Firebase プロジェクトの準備

1. Firebase コンソールでプロジェクトを作成し、Firestore と Google 認証（Authentication）を有効化します。
2. ウェブアプリを追加し、Firebase SDK の設定値を `.env`（`.env.example` をコピー）の `VITE_FIREBASE_*` に設定します。
3. サーバー側（Firestore への書き込み・Gemini呼び出し）は Firebase Admin SDK を使うため、サービスアカウントキーを発行し、`.env` の `GOOGLE_APPLICATION_CREDENTIALS` にパスを設定するか、`gcloud auth application-default login` などで Application Default Credentials を用意してください。
4. `firebase deploy --only firestore:rules` で `firestore.rules` をデプロイします。
5. Firebase Extensions から **Trigger Email** をインストールし、SMTP設定を行うと、AI改善提案が作成されたタイミングで登録メールアドレス（Step 1で入力した「メールアドレス」欄）に通知が届きます。未インストールの場合は `mail` コレクションに書き込まれるだけでメールは送信されません。

### 3. Gemini API キーの取得

[Google AI Studio](https://aistudio.google.com/) で無料枠の Gemini API キーを発行し、`.env` の `GEMINI_API_KEY` に設定します。

### 4. 起動

```bash
npm run dev
```

`http://localhost:3000` で起動します。ローカル開発中は `.env` の `APP_URL` を実際のURLに合わせてください（公開記事URLやメール内リンクの生成に使われます）。

### 5. ビルド・本番起動

```bash
npm run build
npm start
```

## 効果測定の仕組みについて

- PV・滞在時間・離脱・CTAクリック・応募・LINE追加は、公開記事ページ（`/a/{slug}`）から `POST /api/track`（`navigator.sendBeacon`）で記録されます。
- SNS流入は、公開時に生成される各SNS投稿文のリンクに `?utm_source=x` のようなクエリが自動付与される想定で、記事ページ側でPVのsourceとして記録します。
- 外部フォーム（Googleフォームの完了ページなど、POSTできない場所）からの説明会参加・応募トラッキングには `GET /api/track/pixel?orgId=...&articleId=...&type=session_join` の1x1透過画像ピクセルを利用できます。

## AI改善提案の変更範囲について

改善提案が変更してよいのは **タイトル・導入文・CTA・FAQ・SEO情報・SNS投稿文** のみです。Step 1で登録した基本情報やAI取材で得た事実情報は、AIが自動で書き換えることはありません。提案は管理者が承認するまで公開記事に反映されません。
