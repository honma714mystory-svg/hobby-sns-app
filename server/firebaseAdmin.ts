import { initializeApp, getApps, cert, applicationDefault } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

function initAdmin() {
  if (getApps().length) return;

  const projectId = process.env.FIREBASE_PROJECT_ID;
  const credsPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;

  try {
    if (credsPath) {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const serviceAccount = require(require('path').resolve(credsPath));
      initializeApp({ credential: cert(serviceAccount), projectId: projectId || serviceAccount.project_id });
    } else {
      initializeApp({ credential: applicationDefault(), projectId });
    }
  } catch (err) {
    console.warn(
      '[firebaseAdmin] Failed to load service-account credentials. ' +
      'Firestore-backed endpoints (publish/track/proposals) will fail until ' +
      'GOOGLE_APPLICATION_CREDENTIALS or FIREBASE_PROJECT_ID is configured. ' +
      `(${(err as Error).message})`
    );
    initializeApp({ projectId: projectId || 'campus-growth-ai-dev' });
  }
}

initAdmin();

export const db = getFirestore();
