#!/usr/bin/env node

/**
 * Cognisphere Google Sheets Sync CLI Script
 * 
 * Usage:
 *   node scripts/sync-sheets.mjs [options]
 *   npm run sync:sheets -- [options]
 * 
 * Options:
 *   --test                 Test Google Apps Script Web App connection
 *   --email=<email>        Firebase admin user email (if rules require auth)
 *   --password=<pass>      Firebase admin user password
 *   --activity=<id>        Sync only a specific activityId (e.g. tech-quiz)
 *   --file=<path>          Sync participants from a local JSON file
 *   --dry-run              Fetch and list approved participants without pushing to Sheets
 *   --help, -h             Show this help message
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { initializeApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';
import { getFirestore, doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

// Default activity tab mapping
const DEFAULT_SHEET_TABS = {
  'reverse-prompt': 'Reverse Prompt Engineering',
  'ui-ux-makeover': 'UI/UX Makeover',
  'tech-quiz': 'Tech Quiz',
  'sell-me-product': 'Sell Me This Product',
  'jam': 'JAM'
};

// 1. Parse CLI arguments
const args = process.argv.slice(2);
const options = {
  test: false,
  email: null,
  password: null,
  activity: null,
  file: null,
  dryRun: false,
  help: false
};

for (const arg of args) {
  if (arg === '--help' || arg === '-h') options.help = true;
  else if (arg === '--test') options.test = true;
  else if (arg === '--dry-run') options.dryRun = true;
  else if (arg.startsWith('--email=')) options.email = arg.split('=')[1].trim();
  else if (arg.startsWith('--password=')) options.password = arg.split('=')[1].trim();
  else if (arg.startsWith('--activity=')) options.activity = arg.split('=')[1].trim();
  else if (arg.startsWith('--file=')) options.file = arg.split('=')[1].trim();
}

if (options.help) {
  console.log(`
======================================================
  Cognisphere Google Sheets Manual Sync CLI
======================================================

Commands & Usage:
  npm run sync:sheets
      Fetch all approved participants from Firestore and push to Google Sheets.

  npm run sync:sheets -- --test
      Test the connection to your deployed Google Apps Script Web App.

  npm run sync:sheets -- --email=admin@example.com --password=secret
      Authenticate with Firebase email/password if Firestore requires auth.

  npm run sync:sheets -- --activity=tech-quiz
      Sync only a specific activity ID.

  npm run sync:sheets -- --file=./participants.json
      Push participants from a local JSON file to Google Sheets.

  npm run sync:sheets -- --dry-run
      Preview approved passes from Firestore without modifying Google Sheets.
`);
  process.exit(0);
}

// 2. Load .env config
function loadEnv() {
  const envPath = path.join(rootDir, '.env');
  if (!fs.existsSync(envPath)) {
    console.error('❌ Error: .env file not found at:', envPath);
    process.exit(1);
  }

  const content = fs.readFileSync(envPath, 'utf-8');
  const env = {};
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const match = trimmed.match(/^([\w.-]+)\s*=\s*(.*)?$/);
    if (match) {
      let val = match[2] || '';
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }
      env[match[1]] = val;
    }
  }
  return env;
}

const env = loadEnv();

// 3. Initialize Firebase
const firebaseConfig = {
  apiKey: env.VITE_FIREBASE_API_KEY,
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: env.VITE_FIREBASE_APP_ID
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// Helper: Push payload to Google Apps Script Web App
async function pushBatchToAppsScript(webAppUrl, tabName, activityId, participants) {
  const payload = {
    action: 'BATCH_ADD_PARTICIPANTS',
    sheetName: tabName,
    activityId,
    participants: participants.map(p => ({
      participantName: p.participantName || p.name || '',
      participantUsn: (p.participantUsn || p.usn || '').toUpperCase()
    }))
  };

  const response = await fetch(webAppUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify(payload),
    redirect: 'follow'
  });

  const rawText = await response.text();
  try {
    const json = JSON.parse(rawText);
    return { ok: response.ok, status: response.status, body: json };
  } catch {
    return { ok: response.ok, status: response.status, body: rawText };
  }
}

async function run() {
  console.log('\n🚀 Cognisphere Google Sheets Sync CLI');
  console.log('──────────────────────────────────────────────────────');

  // Authenticate if credentials provided
  if (options.email && options.password) {
    try {
      console.log(`🔐 Signing in as ${options.email}...`);
      await signInWithEmailAndPassword(auth, options.email, options.password);
      console.log('✅ Authenticated successfully.');
    } catch (err) {
      console.error(`❌ Authentication failed: ${err.message}`);
      process.exit(1);
    }
  }

  // Fetch Google Sheets settings from Firestore
  console.log('📡 Fetching Google Sheets config from Firestore (settings/googleSheets)...');
  let masterConfig = null;
  try {
    const snap = await getDoc(doc(db, 'settings', 'googleSheets'));
    if (snap.exists()) {
      masterConfig = snap.data();
    }
  } catch (err) {
    console.warn(`⚠️ Warning: Could not read settings/googleSheets: ${err.message}`);
  }

  const webAppUrl = masterConfig?.webAppUrl;
  const sheetTabs = masterConfig?.sheetTabs || DEFAULT_SHEET_TABS;

  if (!webAppUrl) {
    console.error('❌ Error: No Google Apps Script Web App URL found in Firestore.');
    console.error('👉 Please configure it in the Admin Google Sheets Sync modal in the web app.');
    process.exit(1);
  }

  console.log(`🔗 Web App URL: ${webAppUrl.substring(0, 45)}...`);
  console.log(`📊 Spreadsheet: ${masterConfig?.cleanUrl || masterConfig?.sheetUrl || 'Configured'}`);

  // Test mode
  if (options.test) {
    console.log('\n🧪 Testing Google Apps Script Web App connection...');
    const testTab = sheetTabs['tech-quiz'] || 'Tech Quiz';
    try {
      const res = await pushBatchToAppsScript(webAppUrl, testTab, 'tech-quiz', []);
      console.log('📡 Response status:', res.status);
      console.log('📄 Response body:', res.body);
      if (res.body?.success) {
        console.log('✅ Connection to Google Apps Script is LIVE and working perfectly!');
      } else {
        console.log('⚠️ Endpoint reachable, but returned error:', res.body?.error);
      }
    } catch (err) {
      console.error('❌ Failed to connect to Google Apps Script:', err.message);
    }
    process.exit(0);
  }

  // Load participants: from file or from Firestore
  let participantsToSync = [];

  if (options.file) {
    const filePath = path.resolve(process.cwd(), options.file);
    console.log(`\n📂 Loading participants from local file: ${filePath}`);
    if (!fs.existsSync(filePath)) {
      console.error('❌ File not found:', filePath);
      process.exit(1);
    }
    const raw = fs.readFileSync(filePath, 'utf-8');
    participantsToSync = JSON.parse(raw);
  } else {
    console.log('\n📥 Querying approved passRequests from Firestore...');
    try {
      const q = query(collection(db, 'passRequests'), where('status', '==', 'approved'));
      const passesSnap = await getDocs(q);
      passesSnap.forEach(d => {
        participantsToSync.push({ id: d.id, ...d.data() });
      });
      console.log(`✅ Found ${participantsToSync.length} approved pass requests in Firestore.`);
    } catch (err) {
      if (err.code === 'permission-denied') {
        console.error('\n🔒 Permission Denied: Firestore security rules require an authenticated user to read passRequests.');
        console.error('\nYou have 2 easy options:');
        console.error('1. Run in terminal with your admin credentials:');
        console.log('   npm run sync:sheets -- --email=YOUR_ADMIN_EMAIL --password=YOUR_PASSWORD\n');
        console.error('2. OR simply click the "Sync Approved to Sheets" button directly in the Web App');
        console.error('   (Registrations Hub > Pass Requests Desk), where you are already signed in as Admin!');
        process.exit(1);
      }
      throw err;
    }
  }

  if (participantsToSync.length === 0) {
    console.log('ℹ️ No approved participants to sync.');
    process.exit(0);
  }

  // Filter by activity if requested
  if (options.activity) {
    participantsToSync = participantsToSync.filter(p => p.activityId === options.activity);
    console.log(`🔍 Filtered to activity "${options.activity}": ${participantsToSync.length} participants.`);
  }

  // Group by activityId
  const byActivity = {};
  for (const item of participantsToSync) {
    const act = item.activityId || 'unknown';
    if (!byActivity[act]) byActivity[act] = [];
    byActivity[act].push({
      participantName: item.participantName || item.name || '',
      participantUsn: (item.participantUsn || item.usn || '').toUpperCase()
    });
  }

  // Display summary
  console.log('\n📋 Sync Summary:');
  const activities = Object.keys(byActivity);
  for (const act of activities) {
    const tab = sheetTabs[act] || DEFAULT_SHEET_TABS[act] || act;
    console.log(`  • [${act}] → Tab "${tab}": ${byActivity[act].length} participants`);
  }

  if (options.dryRun) {
    console.log('\n🔎 --dry-run specified. Skipping push to Google Sheets.');
    process.exit(0);
  }

  // Push to Google Sheets
  console.log('\n📤 Pushing to Google Sheets...');
  let grandTotal = 0;

  for (const act of activities) {
    const tab = sheetTabs[act] || DEFAULT_SHEET_TABS[act] || act;
    const list = byActivity[act];
    process.stdout.write(`  Syncing ${list.length} attendees to "${tab}"... `);

    try {
      const res = await pushBatchToAppsScript(webAppUrl, tab, act, list);
      if (res.ok && res.body?.success) {
        const added = res.body.addedCount !== undefined ? res.body.addedCount : list.length;
        grandTotal += added;
        console.log(`✅ Done (added/checked: ${added})`);
      } else {
        console.log(`❌ Error: ${res.body?.error || 'Unknown failure'}`);
      }
    } catch (err) {
      console.log(`❌ Network Error: ${err.message}`);
    }
  }

  console.log('──────────────────────────────────────────────────────');
  console.log(`🎉 Sheet sync complete! Total processed: ${grandTotal} participant entries.`);
  process.exit(0);
}

run().catch(err => {
  console.error('\n❌ Unexpected error:', err);
  process.exit(1);
});
