import express from 'express';
import path from 'path';
import dotenv from 'dotenv';
import { createServer as createViteServer } from 'vite';
import { randomUUID } from 'crypto';

dotenv.config();

import { db } from './server/firebaseAdmin';
import { requireAuth, type AuthedRequest } from './server/auth';
import {
  runInterviewTurn,
  generateArticle,
  generateSnsTexts,
  generateImprovementProposal,
} from './server/gemini';
import type {
  AnalyticsEvent,
  AnalyticsEventType,
  AnalyticsSummary,
  Article,
  ImprovableField,
  ImprovementProposal,
} from './src/types';
import { MAX_INTERVIEW_QUESTIONS, IMPROVABLE_FIELDS } from './src/types';

const app = express();
const PORT = Number(process.env.PORT) || 3000;
const APP_URL = process.env.APP_URL || `http://localhost:${PORT}`;

app.use(express.json());

// ---------------------------------------------------------------------------
// Step 2: AI interview
// ---------------------------------------------------------------------------
app.post('/api/interview', requireAuth, async (req, res) => {
  try {
    const { profile, history, questionsAskedSoFar } = req.body;
    if (!Array.isArray(history)) {
      return res.status(400).json({ error: 'history is required.' });
    }
    const result = await runInterviewTurn(
      profile || {},
      history,
      Number(questionsAskedSoFar) || 0,
      MAX_INTERVIEW_QUESTIONS,
    );
    res.json(result);
  } catch (err: any) {
    console.error('interview error:', err);
    res.status(500).json({ error: err.message || 'AI取材でエラーが発生しました。' });
  }
});

// ---------------------------------------------------------------------------
// Step 3: Article generation
// ---------------------------------------------------------------------------
app.post('/api/generate-article', requireAuth, async (req, res) => {
  try {
    const { profile, interviewNotes } = req.body;
    if (!profile) return res.status(400).json({ error: 'profile is required.' });
    const article = await generateArticle(profile, interviewNotes || '');
    res.json(article);
  } catch (err: any) {
    console.error('generate-article error:', err);
    res.status(500).json({ error: err.message || '記事生成でエラーが発生しました。' });
  }
});

// ---------------------------------------------------------------------------
// Step 4: SNS text generation + publish
// ---------------------------------------------------------------------------
app.post('/api/generate-sns', requireAuth, async (req, res) => {
  try {
    const { profile, article, articleUrl } = req.body;
    if (!profile || !article) return res.status(400).json({ error: 'profile and article are required.' });
    const snsTexts = await generateSnsTexts(profile, article, articleUrl || APP_URL);
    res.json(snsTexts);
  } catch (err: any) {
    console.error('generate-sns error:', err);
    res.status(500).json({ error: err.message || 'SNS投稿文生成でエラーが発生しました。' });
  }
});

function slugify(input: string): string {
  const base = (input || 'circle')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^\w\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .slice(0, 24);
  const suffix = randomUUID().split('-')[0];
  return `${base || 'circle'}-${suffix}`;
}

app.post('/api/publish', requireAuth, async (req: AuthedRequest, res) => {
  try {
    const { profile, title, intro, body, cta, faqs, seo } = req.body;
    if (!title || !body) return res.status(400).json({ error: 'title and body are required.' });

    const orgId = req.uid!;
    const slug = slugify(profile?.abbreviation || profile?.name);
    const now = new Date().toISOString();
    const url = `${APP_URL}/a/${slug}`;

    // Publishing also mints the URL and generates the per-SNS post copy in
    // the same step, per the spec's "④ 公開・URL発行" (URL + SNS texts together).
    const snsTexts = await generateSnsTexts(profile || {}, { title, intro: intro || '', body, cta: cta || '' }, url);

    const article: Article = {
      id: slug,
      orgId,
      slug,
      title,
      intro: intro || '',
      body,
      cta: cta || '',
      faqs: Array.isArray(faqs) ? faqs : [],
      seo: seo || { metaDescription: '', keywords: [] },
      snsTexts,
      status: 'published',
      createdAt: now,
      publishedAt: now,
      updatedAt: now,
    };

    await db.collection('articles').doc(slug).set(article);
    if (profile) {
      await db.collection('organizations').doc(orgId).set(
        { profile, updatedAt: now },
        { merge: true },
      );
    }

    res.json({ article, url });
  } catch (err: any) {
    console.error('publish error:', err);
    res.status(500).json({ error: err.message || '公開処理でエラーが発生しました。' });
  }
});

app.get('/api/articles', requireAuth, async (req: AuthedRequest, res) => {
  try {
    const snap = await db.collection('articles').where('orgId', '==', req.uid).orderBy('createdAt', 'desc').get();
    res.json(snap.docs.map((d) => d.data()));
  } catch (err: any) {
    console.error('list articles error:', err);
    res.status(500).json({ error: err.message || '記事一覧の取得でエラーが発生しました。' });
  }
});

// ---------------------------------------------------------------------------
// Step 1: organization profile persistence
// ---------------------------------------------------------------------------
app.get('/api/org', requireAuth, async (req: AuthedRequest, res) => {
  try {
    const snap = await db.collection('organizations').doc(req.uid!).get();
    res.json(snap.exists ? snap.data() : null);
  } catch (err: any) {
    console.error('get org error:', err);
    res.status(500).json({ error: err.message || '団体情報の取得でエラーが発生しました。' });
  }
});

app.post('/api/org', requireAuth, async (req: AuthedRequest, res) => {
  try {
    const { profile } = req.body;
    if (!profile) return res.status(400).json({ error: 'profile is required.' });
    await db.collection('organizations').doc(req.uid!).set(
      { profile, orgId: req.uid, updatedAt: new Date().toISOString() },
      { merge: true },
    );
    res.json({ ok: true });
  } catch (err: any) {
    console.error('save org error:', err);
    res.status(500).json({ error: err.message || '団体情報の保存でエラーが発生しました。' });
  }
});

// ---------------------------------------------------------------------------
// Step 5: analytics tracking (public write) + summary (authenticated read)
// ---------------------------------------------------------------------------
const VALID_EVENT_TYPES: AnalyticsEventType[] = [
  'pv', 'dwell', 'bounce', 'cta_click', 'application', 'line_add', 'session_join',
];

app.post('/api/track', async (req, res) => {
  try {
    const { orgId, articleId, type, source, dwellSeconds } = req.body;
    if (!orgId || !articleId || !VALID_EVENT_TYPES.includes(type)) {
      return res.status(400).json({ error: 'invalid tracking payload.' });
    }
    const event: AnalyticsEvent = {
      id: randomUUID(),
      orgId,
      articleId,
      type,
      source: typeof source === 'string' ? source.slice(0, 40) : null,
      dwellSeconds: typeof dwellSeconds === 'number' ? Math.max(0, Math.min(dwellSeconds, 3600)) : undefined,
      createdAt: new Date().toISOString(),
    };
    await db.collection('analyticsEvents').doc(event.id).set(event);
    res.status(204).end();
  } catch (err: any) {
    console.error('track error:', err);
    res.status(500).json({ error: err.message || 'イベント記録でエラーが発生しました。' });
  }
});

// 1x1 transparent GIF pixel, for tracking events from places that can only
// issue a GET request (e.g. a Google Forms "confirmation" redirect URL used
// to track 説明会参加数 / applications submitted on an external form).
const TRACKING_PIXEL = Buffer.from(
  'R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBTAA7',
  'base64',
);

app.get('/api/track/pixel', async (req, res) => {
  try {
    const { orgId, articleId, type, source } = req.query as Record<string, string>;
    if (orgId && articleId && VALID_EVENT_TYPES.includes(type as AnalyticsEventType)) {
      const event: AnalyticsEvent = {
        id: randomUUID(),
        orgId,
        articleId,
        type: type as AnalyticsEventType,
        source: source || null,
        createdAt: new Date().toISOString(),
      };
      await db.collection('analyticsEvents').doc(event.id).set(event);
    }
  } catch (err) {
    console.error('track pixel error:', err);
  } finally {
    res.set('Content-Type', 'image/gif');
    res.set('Cache-Control', 'no-store');
    res.send(TRACKING_PIXEL);
  }
});

async function computeSummary(articleId: string): Promise<AnalyticsSummary> {
  const snap = await db.collection('analyticsEvents').where('articleId', '==', articleId).get();
  const events = snap.docs.map((d) => d.data() as AnalyticsEvent);

  const pv = events.filter((e) => e.type === 'pv').length;
  const ctaClicks = events.filter((e) => e.type === 'cta_click').length;
  const bounces = events.filter((e) => e.type === 'bounce').length;
  const dwellEvents = events.filter((e) => e.type === 'dwell' && typeof e.dwellSeconds === 'number');
  const avgDwellSeconds = dwellEvents.length
    ? dwellEvents.reduce((sum, e) => sum + (e.dwellSeconds || 0), 0) / dwellEvents.length
    : 0;

  const snsInflow: Record<string, number> = {};
  for (const e of events) {
    if (e.type === 'pv' && e.source) {
      snsInflow[e.source] = (snsInflow[e.source] || 0) + 1;
    }
  }

  return {
    pv,
    ctaClicks,
    ctr: pv > 0 ? ctaClicks / pv : 0,
    avgDwellSeconds,
    bounceRate: pv > 0 ? bounces / pv : 0,
    snsInflow,
    applications: events.filter((e) => e.type === 'application').length,
    lineAdds: events.filter((e) => e.type === 'line_add').length,
    sessionJoins: events.filter((e) => e.type === 'session_join').length,
  };
}

app.get('/api/analytics/:articleId', requireAuth, async (req: AuthedRequest, res) => {
  try {
    const articleSnap = await db.collection('articles').doc(req.params.articleId).get();
    if (!articleSnap.exists || articleSnap.data()?.orgId !== req.uid) {
      return res.status(404).json({ error: '記事が見つかりません。' });
    }
    const summary = await computeSummary(req.params.articleId);
    res.json(summary);
  } catch (err: any) {
    console.error('analytics summary error:', err);
    res.status(500).json({ error: err.message || '分析データの取得でエラーが発生しました。' });
  }
});

// ---------------------------------------------------------------------------
// Step 6/7: AI improvement proposals + approval flow
// ---------------------------------------------------------------------------
app.post('/api/proposals/generate', requireAuth, async (req: AuthedRequest, res) => {
  try {
    const { articleId } = req.body;
    const articleSnap = await db.collection('articles').doc(articleId).get();
    if (!articleSnap.exists || articleSnap.data()?.orgId !== req.uid) {
      return res.status(404).json({ error: '記事が見つかりません。' });
    }
    const article = articleSnap.data() as Article;
    const summary = await computeSummary(articleId);

    const changes = await generateImprovementProposal(
      {
        title: article.title,
        intro: article.intro,
        cta: article.cta,
        faqs: article.faqs,
        metaDescription: article.seo.metaDescription,
        keywords: article.seo.keywords,
        snsTexts: article.snsTexts,
      },
      summary,
    );

    const validated = changes.filter((c) => (IMPROVABLE_FIELDS as readonly string[]).includes(c.field));
    const now = new Date().toISOString();
    const proposal: ImprovementProposal = {
      id: randomUUID(),
      orgId: req.uid!,
      articleId,
      changes: validated,
      basedOnData: summary,
      status: 'pending',
      createdAt: now,
      reviewedAt: null,
    };
    await db.collection('improvementProposals').doc(proposal.id).set(proposal);

    // Notify the registered email via the Firebase "Trigger Email" extension:
    // https://extensions.dev/extensions/firebase/firestore-send-email
    // Writing to the `mail` collection is picked up automatically once installed.
    if (validated.length > 0) {
      const orgSnap = await db.collection('organizations').doc(req.uid!).get();
      const email = orgSnap.data()?.profile?.email;
      if (email) {
        const changesHtml = validated
          .map((c) => `<li><b>${c.field}</b><br>修正理由: ${c.reason}<br>変更前: ${escapeHtml(c.before)}<br>変更後: ${escapeHtml(c.after)}</li>`)
          .join('');
        await db.collection('mail').add({
          to: [email],
          message: {
            subject: `【Campus Growth AI】記事の改善案が届きました（${article.title}）`,
            html: `
              <p>AIが記事「${escapeHtml(article.title)}」の改善案を作成しました。内容を確認のうえ、承認または却下してください。</p>
              <h3>修正箇所・理由</h3>
              <ul>${changesHtml}</ul>
              <h3>根拠となるデータ</h3>
              <pre>${escapeHtml(JSON.stringify(summary, null, 2))}</pre>
              <p><a href="${APP_URL}/dashboard/proposals">管理画面で確認する</a></p>
            `,
          },
        });
      }
    }

    res.json(proposal);
  } catch (err: any) {
    console.error('generate proposal error:', err);
    res.status(500).json({ error: err.message || '改善案の生成でエラーが発生しました。' });
  }
});

function escapeHtml(input: string): string {
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

app.get('/api/proposals', requireAuth, async (req: AuthedRequest, res) => {
  try {
    const snap = await db.collection('improvementProposals').where('orgId', '==', req.uid).orderBy('createdAt', 'desc').get();
    res.json(snap.docs.map((d) => d.data()));
  } catch (err: any) {
    console.error('list proposals error:', err);
    res.status(500).json({ error: err.message || '改善案一覧の取得でエラーが発生しました。' });
  }
});

function applyChangesToArticle(article: Article, changes: ImprovementProposal['changes']): Partial<Article> {
  const patch: Partial<Article> = {};
  const faqs = [...article.faqs];
  const snsTexts = { ...article.snsTexts };
  let faqsTouched = false;
  let snsTouched = false;

  for (const change of changes) {
    const field = change.field as ImprovableField;
    if (field === 'title') patch.title = change.after;
    if (field === 'intro') patch.intro = change.after;
    if (field === 'cta') patch.cta = change.after;
    if (field === 'seo') patch.seo = { ...article.seo, metaDescription: change.after };
    if (field === 'faq') {
      faqsTouched = true;
      if (typeof change.faqIndex === 'number' && change.faqIndex >= 0 && change.faqIndex < faqs.length) {
        faqs[change.faqIndex] = { ...faqs[change.faqIndex], a: change.after };
      } else {
        faqs.push({ q: change.before || '新しい質問', a: change.after });
      }
    }
    if (field === 'sns' && change.platform) {
      snsTouched = true;
      snsTexts[change.platform] = change.after;
    }
  }

  if (faqsTouched) patch.faqs = faqs;
  if (snsTouched) patch.snsTexts = snsTexts;
  return patch;
}

app.post('/api/proposals/:id/approve', requireAuth, async (req: AuthedRequest, res) => {
  try {
    const proposalRef = db.collection('improvementProposals').doc(req.params.id);
    const proposalSnap = await proposalRef.get();
    if (!proposalSnap.exists || proposalSnap.data()?.orgId !== req.uid) {
      return res.status(404).json({ error: '改善案が見つかりません。' });
    }
    const proposal = proposalSnap.data() as ImprovementProposal;
    const articleRef = db.collection('articles').doc(proposal.articleId);
    const articleSnap = await articleRef.get();
    if (!articleSnap.exists) return res.status(404).json({ error: '対象の記事が見つかりません。' });

    const article = articleSnap.data() as Article;
    const patch = applyChangesToArticle(article, proposal.changes);
    await articleRef.set({ ...patch, updatedAt: new Date().toISOString() }, { merge: true });
    await proposalRef.set({ status: 'approved', reviewedAt: new Date().toISOString() }, { merge: true });

    res.json({ ok: true });
  } catch (err: any) {
    console.error('approve proposal error:', err);
    res.status(500).json({ error: err.message || '承認処理でエラーが発生しました。' });
  }
});

app.post('/api/proposals/:id/reject', requireAuth, async (req: AuthedRequest, res) => {
  try {
    const proposalRef = db.collection('improvementProposals').doc(req.params.id);
    const proposalSnap = await proposalRef.get();
    if (!proposalSnap.exists || proposalSnap.data()?.orgId !== req.uid) {
      return res.status(404).json({ error: '改善案が見つかりません。' });
    }
    await proposalRef.set({ status: 'rejected', reviewedAt: new Date().toISOString() }, { merge: true });
    res.json({ ok: true });
  } catch (err: any) {
    console.error('reject proposal error:', err);
    res.status(500).json({ error: err.message || '却下処理でエラーが発生しました。' });
  }
});

// ---------------------------------------------------------------------------
// Vite & static serving
// ---------------------------------------------------------------------------
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({ server: { middlewareMode: true }, appType: 'spa' });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Campus Growth AI server running on port ${PORT}`);
  });
}

startServer();
