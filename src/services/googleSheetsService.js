import { 
  collection, 
  doc, 
  setDoc, 
  deleteDoc, 
  getDocs, 
  getDoc,
  query, 
  where, 
  writeBatch, 
  serverTimestamp,
  onSnapshot 
} from 'firebase/firestore';
import { db } from '../firebase';
import { ACTIVITIES } from '../data/activities';

/**
 * Default sheet tab names mapped to each activity ID
 */
export const DEFAULT_SHEET_TABS = {
  'reverse-prompt': 'Reverse Prompt Engineering',
  'ui-ux-makeover': 'UI/UX Makeover',
  'tech-quiz': 'Tech Quiz',
  'sell-me-product': 'Sell Me This Product',
  'jam': 'JAM'
};

/**
 * Parses any Google Sheets URL or ID to extract sheetId, gid, and sheet tab name
 */
export function extractSheetInfo(inputUrlOrId) {
  if (!inputUrlOrId || typeof inputUrlOrId !== 'string') {
    return { sheetId: null, gid: null, sheetName: null, isValid: false };
  }

  const raw = inputUrlOrId.trim();

  // 1. Direct Sheet ID (44 alphanumeric characters + hyphen/underscore)
  if (/^[a-zA-Z0-9-_]{30,60}$/.test(raw)) {
    return {
      sheetId: raw,
      gid: null,
      sheetName: null,
      isValid: true,
      cleanUrl: `https://docs.google.com/spreadsheets/d/${raw}/edit`
    };
  }

  // 2. Standard Google Sheets URL: https://docs.google.com/spreadsheets/d/{SHEET_ID}/...
  const matchId = raw.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  if (matchId && matchId[1]) {
    const sheetId = matchId[1];

    let gid = null;
    const gidMatch = raw.match(/[#&?]gid=([0-9]+)/);
    if (gidMatch && gidMatch[1]) {
      gid = gidMatch[1];
    }

    return {
      sheetId,
      gid,
      sheetName: null,
      isValid: true,
      cleanUrl: `https://docs.google.com/spreadsheets/d/${sheetId}/edit${gid ? `#gid=${gid}` : ''}`
    };
  }

  // 3. Published to Web URL (e.g. /d/e/2PACX-.../pubhtml or pub?output=csv)
  if (raw.includes('/pubhtml') || raw.includes('/pub?')) {
    return {
      sheetId: null,
      publishedUrl: raw,
      gid: null,
      sheetName: null,
      isValid: true,
      cleanUrl: raw
    };
  }

  return { sheetId: null, gid: null, sheetName: null, isValid: false };
}

/**
 * Fetch rows from Google Sheet using Google Visualization API (no API key required)
 */
export async function fetchGoogleSheetData({ sheetId, sheetName = null, gid = null, publishedUrl = null }) {
  if (!sheetId && !publishedUrl) {
    throw new Error('Please provide a valid Google Sheet URL or ID.');
  }

  let requestUrl = '';
  if (sheetId) {
    const params = new URLSearchParams({ tqx: 'out:json' });
    if (sheetName && sheetName.trim()) {
      params.set('sheet', sheetName.trim());
    } else if (gid) {
      params.set('gid', gid);
    }
    requestUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?${params.toString()}`;
  } else if (publishedUrl) {
    requestUrl = publishedUrl.replace('/pubhtml', '/pub?output=csv');
  }

  const response = await fetch(requestUrl);
  if (!response.ok) {
    if (response.status === 404) {
      throw new Error('Google Sheet not found. Please check the URL.');
    }
    if (response.status === 401 || response.status === 403) {
      throw new Error('Permission denied. Please ensure the Google Sheet is shared with "Anyone with the link can view".');
    }
    throw new Error(`Google Sheets responded with HTTP status ${response.status}`);
  }

  const text = await response.text();

  // If response is gviz/tq JSON
  if (text.includes('google.visualization.Query.setResponse')) {
    const jsonStart = text.indexOf('{');
    const jsonEnd = text.lastIndexOf('}');
    if (jsonStart === -1 || jsonEnd === -1) {
      throw new Error('Unexpected Google Sheets API response format.');
    }
    const jsonStr = text.substring(jsonStart, jsonEnd + 1);
    const parsed = JSON.parse(jsonStr);

    if (parsed.status === 'error') {
      const msg = parsed.errors?.[0]?.message || parsed.errors?.[0]?.detailed_message || 'Failed to read Google Sheet.';
      throw new Error(`Google Sheets Error: ${msg}`);
    }

    return parseGvizTable(parsed.table);
  }

  // Fallback: CSV parser if published CSV returned
  return parseCsvContent(text);
}

/**
 * Parse Google Visualization table object into normalized entries with smart header detection and positional fallbacks
 */
function parseGvizTable(table) {
  if (!table || !table.rows || table.rows.length === 0) {
    return [];
  }

  const getCellStr = (cell) => {
    if (!cell) return '';
    if (cell.f !== undefined && cell.f !== null) return String(cell.f).trim();
    if (cell.v !== undefined && cell.v !== null) return String(cell.v).trim();
    return '';
  };

  // 1. Build initial headers from table.cols
  let headers = (table.cols || []).map((col, idx) => ({
    index: idx,
    label: (col?.label || '').trim().toLowerCase()
  }));

  let dataStartRow = 0;

  // 2. Check if table.rows[0] is actually the header row (very common when row 1 in Google Sheets is not formatted as an official table)
  const hasNamedCols = headers.some(h => h.label.length > 0);
  if (!hasNamedCols && table.rows.length > 0) {
    const row0Cells = table.rows[0]?.c || [];
    const row0Labels = row0Cells.map((c, idx) => ({
      index: idx,
      label: getCellStr(c).toLowerCase()
    }));

    const isHeaderRow = row0Labels.some(h => 
      h.label.includes('rank') || 
      h.label.includes('name') || 
      h.label.includes('usn') || 
      h.label.includes('score') || 
      h.label.includes('point') ||
      h.label.includes('mark')
    );

    if (isHeaderRow) {
      headers = row0Labels;
      dataStartRow = 1;
    }
  }

  // 3. Match column indices by keywords
  const findCol = (keywords) => {
    for (const h of headers) {
      if (keywords.some(k => h.label && h.label.includes(k))) {
        return h.index;
      }
    }
    return -1;
  };

  let rankCol = findCol(['rank', 'pos', 'standing', 'place', '#']);
  let nameCol = findCol(['name', 'participant', 'student', 'team', 'candidate', 'full name']);
  let usnCol = findCol(['usn', 'roll', 'registration', 'reg', 'id']);
  let scoreCol = findCol(['score', 'points', 'marks', 'total', 'result', 'pts', 'grade']);
  let notesCol = findCol(['notes', 'remark', 'comment', 'round', 'branch']);

  // 4. Positional fallback if columns couldn't be resolved by name
  const numCols = Math.max(headers.length, table.rows[dataStartRow]?.c?.length || 0);
  if (nameCol === -1) {
    if (numCols >= 4) {
      if (rankCol === -1) rankCol = 0;
      nameCol = 1;
      if (usnCol === -1) usnCol = 2;
      if (scoreCol === -1) scoreCol = 3;
    } else if (numCols === 3) {
      nameCol = 0;
      if (usnCol === -1) usnCol = 1;
      if (scoreCol === -1) scoreCol = 2;
    } else if (numCols === 2) {
      nameCol = 0;
      if (scoreCol === -1) scoreCol = 1;
    }
  }

  const rows = [];
  for (let rowIndex = dataStartRow; rowIndex < table.rows.length; rowIndex++) {
    const row = table.rows[rowIndex];
    if (!row || !row.c) continue;

    const getVal = (colIdx) => {
      if (colIdx < 0 || colIdx >= row.c.length) return '';
      return getCellStr(row.c[colIdx]);
    };

    let rawName = nameCol >= 0 ? getVal(nameCol) : '';
    let rawUsn = usnCol >= 0 ? getVal(usnCol) : '';
    let rawScore = scoreCol >= 0 ? getVal(scoreCol) : '';
    let rawRank = rankCol >= 0 ? getVal(rankCol) : '';
    let rawNotes = notesCol >= 0 ? getVal(notesCol) : '';

    // If completely blank row, skip
    if (!rawName && !rawUsn && !rawScore && !rawRank) continue;

    // If this row is a repeated header row, skip
    const lowerName = rawName.toLowerCase();
    const lowerUsn = rawUsn.toLowerCase();
    if (
      lowerName === 'name' || 
      lowerName === 'participant name' || 
      lowerName === 'student name' ||
      lowerUsn === 'usn' ||
      lowerUsn === 'roll'
    ) {
      continue;
    }

    // Resolve numeric rank
    let parsedRank = parseInt(rawRank, 10);
    if (isNaN(parsedRank) || parsedRank <= 0) {
      parsedRank = rows.length + 1;
    }

    let rankLabel = '';
    if (parsedRank === 1) rankLabel = '1st Place (Winner)';
    else if (parsedRank === 2) rankLabel = '2nd Place (Runner-up)';
    else if (parsedRank === 3) rankLabel = '3rd Place';
    else rankLabel = `Rank #${parsedRank}`;

    rows.push({
      rank: parsedRank,
      rankLabel,
      participantName: rawName || `Participant ${parsedRank}`,
      participantUsn: rawUsn.toUpperCase(),
      score: rawScore,
      notes: rawNotes,
      rowNumber: rowIndex + 1
    });
  }

  rows.sort((a, b) => a.rank - b.rank);
  return rows;
}

/**
 * Fallback parser for standard CSV content
 */
function parseCsvContent(csvText) {
  const lines = csvText.split(/\r?\n/).filter(line => line.trim().length > 0);
  if (lines.length < 2) return [];

  const parseLine = (text) => {
    const result = [];
    let cur = '';
    let inQuotes = false;
    for (let i = 0; i < text.length; i++) {
      const c = text[i];
      if (c === '"') {
        inQuotes = !inQuotes;
      } else if (c === ',' && !inQuotes) {
        result.push(cur.trim());
        cur = '';
      } else {
        cur += c;
      }
    }
    result.push(cur.trim());
    return result;
  };

  const headerRow = parseLine(lines[0]).map(h => h.toLowerCase());
  const rankCol = headerRow.findIndex(h => h.includes('rank') || h.includes('pos') || h.includes('#'));
  const nameCol = headerRow.findIndex(h => h.includes('name') || h.includes('participant') || h.includes('student'));
  const usnCol = headerRow.findIndex(h => h.includes('usn') || h.includes('roll') || h.includes('id'));
  const scoreCol = headerRow.findIndex(h => h.includes('score') || h.includes('points') || h.includes('marks'));

  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    const cols = parseLine(lines[i]);
    const rawName = nameCol >= 0 ? cols[nameCol] : (cols[1] || '');
    const rawUsn = usnCol >= 0 ? cols[usnCol] : (cols[2] || '');
    const rawScore = scoreCol >= 0 ? cols[scoreCol] : (cols[3] || '');
    const rawRank = rankCol >= 0 ? cols[rankCol] : (cols[0] || '');

    if (!rawName && !rawUsn && !rawScore) continue;

    let parsedRank = parseInt(rawRank, 10);
    if (isNaN(parsedRank) || parsedRank <= 0) {
      parsedRank = rows.length + 1;
    }

    let rankLabel = '';
    if (parsedRank === 1) rankLabel = '1st Place (Winner)';
    else if (parsedRank === 2) rankLabel = '2nd Place (Runner-up)';
    else if (parsedRank === 3) rankLabel = '3rd Place';
    else rankLabel = `Rank #${parsedRank}`;

    rows.push({
      rank: parsedRank,
      rankLabel,
      participantName: rawName || `Participant ${parsedRank}`,
      participantUsn: rawUsn.toUpperCase(),
      score: rawScore,
      rowNumber: i + 1
    });
  }

  rows.sort((a, b) => a.rank - b.rank);
  return rows;
}

/**
 * Verify if a specific sheet tab exists and return preview count
 */
export async function verifySheetTabExists({ sheetId, sheetName, gid = null, publishedUrl = null }) {
  try {
    const rows = await fetchGoogleSheetData({ sheetId, sheetName, gid, publishedUrl });
    return {
      exists: true,
      rowCount: rows.length,
      rows: rows.slice(0, 5),
      error: null
    };
  } catch (err) {
    return {
      exists: false,
      rowCount: 0,
      rows: [],
      error: err.message
    };
  }
}

/**
 * Detect available sheet tabs by testing candidate tab names
 */
export async function detectAvailableSheetTabs({ sheetId, candidateNames = [] }) {
  if (!sheetId) return [];

  const defaultCandidates = [
    'Reverse Prompt Engineering',
    'UI/UX Makeover',
    'Tech Quiz',
    'Sell Me This Product',
    'JAM',
    'AI Prompting',
    'Prompting',
    'UIUX',
    'Quiz',
    'Pitching',
    'Sheet1',
    'Sheet2',
    'Sheet3',
    'Sheet4',
    'Sheet5'
  ];

  const uniqueCandidates = Array.from(new Set([...candidateNames, ...defaultCandidates]));

  const results = await Promise.allSettled(
    uniqueCandidates.map(async (name) => {
      const res = await verifySheetTabExists({ sheetId, sheetName: name });
      if (res.exists) {
        return { name, rowCount: res.rowCount };
      }
      return null;
    })
  );

  return results
    .filter(r => r.status === 'fulfilled' && r.value !== null)
    .map(r => r.value);
}

/**
 * Save Master Google Spreadsheet URL and all sheet tab mappings in Firestore
 */
export async function saveMasterSheetConfig({
  masterSheetUrl,
  webAppUrl = '',
  sheetTabs = {},
  adminEmail = 'admin',
  autoSyncEnabled = false
}) {
  const info = extractSheetInfo(masterSheetUrl);
  if (!info.isValid) {
    throw new Error('Please provide a valid Google Sheet URL or ID.');
  }

  const batch = writeBatch(db);

  // 1. Save global Master Sheet setting in settings/googleSheets
  const masterRef = doc(db, 'settings', 'googleSheets');
  const masterPayload = {
    masterSheetUrl: masterSheetUrl.trim(),
    webAppUrl: (webAppUrl || '').trim(),
    cleanUrl: info.cleanUrl || masterSheetUrl.trim(),
    masterSheetId: info.sheetId || null,
    sheetTabs,
    configuredBy: adminEmail,
    autoSyncEnabled: Boolean(autoSyncEnabled),
    updatedAt: serverTimestamp()
  };
  batch.set(masterRef, masterPayload, { merge: true });

  // 2. Propagate to each activity's sheetConfigs/{activityId} with its tracked sheet name
  ACTIVITIES.forEach((act) => {
    const assignedSheetName = sheetTabs[act.id] || DEFAULT_SHEET_TABS[act.id] || act.name;
    const activityConfigRef = doc(db, 'sheetConfigs', act.id);
    batch.set(activityConfigRef, {
      activityId: act.id,
      sheetUrl: masterSheetUrl.trim(),
      webAppUrl: (webAppUrl || '').trim(),
      cleanUrl: info.cleanUrl || masterSheetUrl.trim(),
      sheetId: info.sheetId || null,
      sheetName: assignedSheetName,
      configuredBy: adminEmail,
      autoSyncEnabled: Boolean(autoSyncEnabled),
      updatedAt: serverTimestamp()
    }, { merge: true });
  });

  await batch.commit();
  return masterPayload;
}

/**
 * Fetch global Master Sheet configuration
 */
export async function getMasterSheetConfig() {
  try {
    const snap = await getDoc(doc(db, 'settings', 'googleSheets'));
    if (snap.exists()) {
      return snap.data();
    }
    return null;
  } catch (err) {
    console.warn('Failed to read master sheet config:', err);
    return null;
  }
}

/**
 * Real-time subscription to Master Sheet configuration
 */
export function subscribeMasterSheetConfig(callback) {
  try {
    const unsubscribe = onSnapshot(doc(db, 'settings', 'googleSheets'), (snap) => {
      if (snap.exists()) {
        callback(snap.data());
      } else {
        callback(null);
      }
    }, (err) => {
      console.warn('Master sheet listener error:', err);
      callback(null);
    });
    return unsubscribe;
  } catch (err) {
    callback(null);
    return () => {};
  }
}

/**
 * Save Google Sheet connection configuration for an activity in Firestore
 */
export async function saveActivitySheetConfig({
  activityId,
  sheetUrl,
  sheetName = '',
  adminEmail = 'admin',
  autoSyncEnabled = false
}) {
  if (!activityId) throw new Error('Missing activityId');

  const docRef = doc(db, 'sheetConfigs', activityId);
  const info = extractSheetInfo(sheetUrl);

  const payload = {
    activityId,
    sheetUrl: sheetUrl.trim(),
    cleanUrl: info.cleanUrl || sheetUrl.trim(),
    sheetId: info.sheetId || null,
    gid: info.gid || null,
    sheetName: sheetName.trim(),
    configuredBy: adminEmail,
    autoSyncEnabled: Boolean(autoSyncEnabled),
    updatedAt: serverTimestamp()
  };

  await setDoc(docRef, payload, { merge: true });

  // Update master sheet settings sheetTabs map if master sheet exists
  try {
    const masterSnap = await getDoc(doc(db, 'settings', 'googleSheets'));
    if (masterSnap.exists()) {
      await setDoc(doc(db, 'settings', 'googleSheets'), {
        [`sheetTabs.${activityId}`]: sheetName.trim(),
        updatedAt: serverTimestamp()
      }, { merge: true });
    }
  } catch (_) {}

  return payload;
}

/**
 * Fetch Google Sheet connection config for an activity
 */
export async function getActivitySheetConfig(activityId) {
  if (!activityId) return null;
  try {
    const snap = await getDoc(doc(db, 'sheetConfigs', activityId));
    if (snap.exists()) {
      return { id: snap.id, ...snap.data() };
    }
    return null;
  } catch (err) {
    console.warn(`Failed to read sheet config for ${activityId}:`, err);
    return null;
  }
}

/**
 * Real-time subscription to sheet configuration for an activity
 */
export function subscribeActivitySheetConfig(activityId, callback) {
  if (!activityId) return () => {};
  try {
    const unsubscribe = onSnapshot(doc(db, 'sheetConfigs', activityId), (snap) => {
      if (snap.exists()) {
        callback({ id: snap.id, ...snap.data() });
      } else {
        callback(null);
      }
    }, (err) => {
      console.warn(`Sheet config listener error for ${activityId}:`, err);
      callback(null);
    });
    return unsubscribe;
  } catch (err) {
    callback(null);
    return () => {};
  }
}

/**
 * Sync parsed Google Sheet rows to Firestore `scores` collection atomically
 */
export async function syncGoogleSheetToScores({
  activityId,
  sheetRows,
  adminEmail = 'admin',
  purgeUnlisted = false
}) {
  if (!activityId) throw new Error('Missing activityId');
  if (!Array.isArray(sheetRows) || sheetRows.length === 0) {
    throw new Error('No valid participant rows found to sync.');
  }

  const currentScoresQuery = query(
    collection(db, 'scores'),
    where('activityId', '==', activityId)
  );
  const currentSnap = await getDocs(currentScoresQuery);
  const existingDocs = currentSnap.docs.map(d => ({ id: d.id, ...d.data() }));

  const batch = writeBatch(db);
  const syncedDocIds = new Set();

  sheetRows.forEach((row) => {
    const cleanId = row.participantUsn 
      ? row.participantUsn.replace(/[^A-Z0-9]/gi, '_').toLowerCase() 
      : row.participantName.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();

    const docId = `${activityId}_${cleanId}`;
    syncedDocIds.add(docId);

    const docRef = doc(db, 'scores', docId);
    batch.set(docRef, {
      activityId,
      participantId: cleanId,
      participantName: row.participantName.trim(),
      participantUsn: row.participantUsn.trim(),
      score: row.score !== undefined && row.score !== null ? String(row.score).trim() : '',
      rank: Number(row.rank) || 1,
      rankLabel: row.rankLabel || `Rank #${row.rank}`,
      notes: row.notes || '',
      source: 'google_sheets',
      publishedBy: `Google Sheets (${adminEmail})`,
      publishedAt: serverTimestamp()
    }, { merge: true });
  });

  if (purgeUnlisted) {
    existingDocs.forEach((d) => {
      if (!syncedDocIds.has(d.id)) {
        batch.delete(doc(db, 'scores', d.id));
      }
    });
  }

  const configRef = doc(db, 'sheetConfigs', activityId);
  batch.set(configRef, {
    lastSyncedAt: serverTimestamp(),
    lastSyncedCount: sheetRows.length,
    lastSyncedBy: adminEmail
  }, { merge: true });

  await batch.commit();

  return {
    syncedCount: sheetRows.length,
    purgedCount: purgeUnlisted ? existingDocs.filter(d => !syncedDocIds.has(d.id)).length : 0
  };
}

/**
 * Batch-sync all 5 activities from their respective sheet tabs in the same Google Sheet file!
 */
export async function syncAllActivitiesFromMasterSheet({
  masterSheetUrl,
  sheetTabs = {},
  activities = ACTIVITIES,
  adminEmail = 'admin'
}) {
  const info = extractSheetInfo(masterSheetUrl);
  if (!info.isValid || !info.sheetId) {
    throw new Error('Please configure a valid Master Google Sheet URL first.');
  }

  const results = [];
  let totalCount = 0;

  for (const act of activities) {
    const assignedSheetName = sheetTabs[act.id] || DEFAULT_SHEET_TABS[act.id] || act.name;

    try {
      const rows = await fetchGoogleSheetData({
        sheetId: info.sheetId,
        sheetName: assignedSheetName
      });

      if (rows && rows.length > 0) {
        const syncRes = await syncGoogleSheetToScores({
          activityId: act.id,
          sheetRows: rows,
          adminEmail,
          purgeUnlisted: false
        });

        totalCount += syncRes.syncedCount;
        results.push({
          activityId: act.id,
          activityName: act.name,
          sheetName: assignedSheetName,
          status: 'success',
          syncedCount: syncRes.syncedCount
        });
      } else {
        results.push({
          activityId: act.id,
          activityName: act.name,
          sheetName: assignedSheetName,
          status: 'empty',
          syncedCount: 0,
          error: 'No score rows found'
        });
      }
    } catch (err) {
      results.push({
        activityId: act.id,
        activityName: act.name,
        sheetName: assignedSheetName,
        status: 'error',
        syncedCount: 0,
        error: err.message
      });
    }
  }

  return {
    totalCount,
    results
  };
}

/**
 * Complete Google Apps Script template for 2-Way Sync & Auto-Sort
 */
export const COMPLETE_APPS_SCRIPT_CODE = `/**
 * COGNISPHERE 2026 - GOOGLE SHEETS 2-WAY SYNC & AUTO-SORT WEB APP
 * 
 * Features:
 * 1. Automatically sorts scores descending on Column 4 (Score).
 * 2. Recalculates competition ranks in Column 1 (Rank).
 * 3. 2-Way API Endpoint for Cognisphere PWA:
 *    - ADD_PARTICIPANT: Automatically adds approved name & USN (scores left blank until scored).
 *    - UPDATE_SCORE: Updates score for a USN, immediately triggers sortSheet.
 *    - BATCH_ADD_PARTICIPANTS: Syncs all approved attendees.
 */

const TABS = [0, 1, 2, 3, 4]; // tab positions to auto-sort (0 = first tab)

function sortSheet(sheet) {
  if (!sheet) return;
  const last = sheet.getLastRow();
  if (last < 2) return;
  
  // Sort columns B to D by Column 4 (Score) descending
  sheet.getRange(2, 2, last - 1, 3).sort({column: 4, ascending: false});

  // Calculate competition ranks (1 + number of strictly higher scores)
  const scores = sheet.getRange(2, 4, last - 1, 1).getValues().map(r => r[0]);
  const ranks = scores.map(s => [
    (s === '' || s === null || isNaN(Number(s))) 
      ? '' 
      : 1 + scores.filter(t => t !== '' && t !== null && !isNaN(Number(t)) && Number(t) > Number(s)).length
  ]);
  sheet.getRange(2, 1, last - 1, 1).setValues(ranks);
}

function fingerprint(sheet) {
  if (!sheet) return '';
  const last = sheet.getLastRow();
  if (last < 2) return '';
  const data = JSON.stringify(sheet.getRange(2, 2, last - 1, 3).getValues());
  return Utilities.base64Encode(
    Utilities.computeDigest(Utilities.DigestAlgorithm.MD5, data)
  );
}

function autoSort() {
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(5000)) return;
  try {
    const sheets = SpreadsheetApp.getActiveSpreadsheet().getSheets();
    const props = PropertiesService.getScriptProperties();

    // which tabs have new data?
    const changed = TABS.filter(i =>
      sheets[i] && fingerprint(sheets[i]) !== props.getProperty('lastSorted' + i)
    );
    if (!changed.length) return;

    const before = changed.map(i => fingerprint(sheets[i]));
    Utilities.sleep(30000); // one shared 30s wait

    changed.forEach((i, n) => {
      if (!sheets[i]) return;
      if (fingerprint(sheets[i]) !== before[n]) return; // still being edited
      sortSheet(sheets[i]);
      props.setProperty('lastSorted' + i, fingerprint(sheets[i]));
    });
  } finally {
    lock.releaseLock();
  }
}

function setupAutoSort() {
  ScriptApp.getProjectTriggers().forEach(t => ScriptApp.deleteTrigger(t));
  ScriptApp.newTrigger('autoSort').timeBased().everyMinutes(1).create();
}

/**
 * 2-Way Communication Endpoints (Web App)
 */
function doPost(e) {
  return handleRequest(e);
}

function doGet(e) {
  return handleRequest(e);
}

function handleRequest(e) {
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(10000)) {
    return jsonResponse({ success: false, error: 'Spreadsheet lock timeout' });
  }

  try {
    let payload = {};
    if (e && e.postData && e.postData.contents) {
      try {
        payload = JSON.parse(e.postData.contents);
      } catch (err) {
        payload = e.parameter || {};
      }
    } else if (e && e.parameter) {
      payload = e.parameter;
    }

    const action = payload.action;
    const ss = SpreadsheetApp.getActiveSpreadsheet();

    // Resolve target sheet tab
    let sheet = null;
    if (payload.sheetName) {
      sheet = ss.getSheetByName(payload.sheetName);
    }
    if (!sheet && typeof payload.tabIndex === 'number') {
      sheet = ss.getSheets()[payload.tabIndex];
    }
    if (!sheet && payload.activityId) {
      const tabMap = {
        'reverse-prompt': 'Reverse Prompt Engineering',
        'ui-ux-makeover': 'UI/UX Makeover',
        'tech-quiz': 'Tech Quiz',
        'sell-me-product': 'Sell Me This Product',
        'jam': 'JAM'
      };
      if (tabMap[payload.activityId]) {
        sheet = ss.getSheetByName(tabMap[payload.activityId]);
      }
    }
    if (!sheet) {
      sheet = ss.getSheets()[0];
    }

    // Ensure header row exists
    if (sheet.getLastRow() < 1) {
      sheet.getRange(1, 1, 1, 4).setValues([['Rank', 'Participant Name', 'USN', 'Score']]);
      sheet.getRange(1, 1, 1, 4).setFontWeight('bold');
    }

    // 1. ADD_PARTICIPANT: Automatically add approved name and USN
    if (action === 'ADD_PARTICIPANT') {
      const name = (payload.participantName || payload.name || '').trim();
      const usn = (payload.participantUsn || payload.usn || '').trim().toUpperCase();

      if (!name && !usn) {
        return jsonResponse({ success: false, error: 'Name or USN required' });
      }

      const lastRow = sheet.getLastRow();
      let foundRow = -1;

      if (lastRow >= 2) {
        const existingData = sheet.getRange(2, 2, lastRow - 1, 2).getValues();
        for (let i = 0; i < existingData.length; i++) {
          const rowName = String(existingData[i][0]).trim().toLowerCase();
          const rowUsn = String(existingData[i][1]).trim().toUpperCase();
          if (usn && rowUsn === usn) {
            foundRow = i + 2;
            break;
          } else if (!usn && name && rowName === name.toLowerCase()) {
            foundRow = i + 2;
            break;
          }
        }
      }

      if (foundRow > 0) {
        if (name) sheet.getRange(foundRow, 2).setValue(name);
        return jsonResponse({ success: true, message: 'Participant already exists in sheet', row: foundRow });
      } else {
        // Append row with blank score: [Rank, Name, USN, Score]
        sheet.appendRow(['', name, usn, '']);
        return jsonResponse({ success: true, message: 'Participant added to sheet', row: sheet.getLastRow() });
      }
    }

    // 2. BATCH_ADD_PARTICIPANTS: Add multiple approved attendees
    if (action === 'BATCH_ADD_PARTICIPANTS') {
      let list = payload.participants;
      if (typeof list === 'string') {
        try { list = JSON.parse(list); } catch (e) { list = []; }
      }
      if (!Array.isArray(list)) list = [];

      const lastRow = sheet.getLastRow();
      const existingUsns = new Set();
      if (lastRow >= 2) {
        const vals = sheet.getRange(2, 3, lastRow - 1, 1).getValues();
        vals.forEach(r => {
          if (r[0]) existingUsns.add(String(r[0]).trim().toUpperCase());
        });
      }

      let added = 0;
      list.forEach(p => {
        const pName = (p.participantName || p.name || '').trim();
        const pUsn = (p.participantUsn || p.usn || '').trim().toUpperCase();
        if (pUsn && !existingUsns.has(pUsn)) {
          sheet.appendRow(['', pName, pUsn, '']);
          existingUsns.add(pUsn);
          added++;
        }
      });

      return jsonResponse({ success: true, addedCount: added });
    }

    // 3. UPDATE_SCORE: Search by USN & update ONLY the score
    if (action === 'UPDATE_SCORE') {
      const usn = (payload.participantUsn || payload.usn || '').trim().toUpperCase();
      const name = (payload.participantName || payload.name || '').trim();
      const score = payload.score !== undefined && payload.score !== null ? String(payload.score).trim() : '';

      const lastRow = sheet.getLastRow();
      let targetRow = -1;

      if (lastRow >= 2) {
        const data = sheet.getRange(2, 2, lastRow - 1, 2).getValues();
        for (let i = 0; i < data.length; i++) {
          const rowName = String(data[i][0]).trim().toLowerCase();
          const rowUsn = String(data[i][1]).trim().toUpperCase();
          if (usn && rowUsn === usn) {
            targetRow = i + 2;
            break;
          } else if (!usn && name && rowName === name.toLowerCase()) {
            targetRow = i + 2;
            break;
          }
        }
      }

      if (targetRow > 0) {
        sheet.getRange(targetRow, 4).setValue(score);
        if (name) sheet.getRange(targetRow, 2).setValue(name);
      } else {
        sheet.appendRow(['', name, usn, score]);
      }

      // Immediately sort and recalculate ranks
      sortSheet(sheet);

      return jsonResponse({ success: true, message: 'Score updated and sheet auto-sorted', score });
    }

    // 4. SEND_CERTIFICATE_EMAIL: Send certificate email via authenticated GmailApp
    if (action === 'SEND_CERTIFICATE_EMAIL') {
      if (!payload.to || !payload.subject) {
        return jsonResponse({ success: false, error: 'Recipient email and subject required' });
      }
      GmailApp.sendEmail(
        String(payload.to).trim(),
        String(payload.subject),
        String(payload.plainText || ''),
        {
          htmlBody: String(payload.html || ''),
          name: payload.senderName || 'Team Cognisphere'
        }
      );
      return jsonResponse({
        success: true,
        to: payload.to,
        remainingDailyQuota: MailApp.getRemainingDailyQuota()
      });
    }

    return jsonResponse({ success: false, error: 'Unknown action: ' + action });
  } catch (err) {
    return jsonResponse({ success: false, error: err.toString() });
  } finally {
    lock.releaseLock();
  }
}

function jsonResponse(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
`;

/**
 * Save Apps Script Web App URL in Firestore
 */
export async function saveMasterWebAppUrl({ webAppUrl, adminEmail = 'admin' }) {
  const cleanUrl = (webAppUrl || '').trim();
  const masterRef = doc(db, 'settings', 'googleSheets');
  await setDoc(masterRef, {
    webAppUrl: cleanUrl,
    configuredBy: adminEmail,
    updatedAt: serverTimestamp()
  }, { merge: true });

  const batch = writeBatch(db);
  ACTIVITIES.forEach((act) => {
    const activityConfigRef = doc(db, 'sheetConfigs', act.id);
    batch.set(activityConfigRef, {
      webAppUrl: cleanUrl,
      updatedAt: serverTimestamp()
    }, { merge: true });
  });
  await batch.commit();
  return cleanUrl;
}

/**
 * Push an approved participant (Name and USN) to the Google Sheet tab
 */
export async function pushParticipantToGoogleSheet({
  activityId,
  sheetName = null,
  participantName,
  participantUsn,
  webAppUrl = null
}) {
  let targetUrl = webAppUrl;
  if (!targetUrl) {
    const masterCfg = await getMasterSheetConfig();
    targetUrl = masterCfg?.webAppUrl;
  }
  if (!targetUrl) {
    console.warn('No Apps Script Web App URL configured. Skipping sheet push.');
    return { success: false, skipped: true, error: 'Web App URL not configured' };
  }

  const tab = sheetName || DEFAULT_SHEET_TABS[activityId] || activityId;
  const payload = {
    action: 'ADD_PARTICIPANT',
    sheetName: tab,
    activityId,
    participantName: (participantName || '').trim(),
    participantUsn: (participantUsn || '').trim().toUpperCase()
  };

  try {
    await fetch(targetUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(payload),
      mode: 'no-cors'
    });
    return { success: true };
  } catch (err) {
    console.error('Failed to push participant to Google Sheet:', err);
    return { success: false, error: err.message };
  }
}

/**
 * Push a score update to the Google Sheet tab (finds by USN, updates score only, auto-sorts)
 */
export async function pushScoreToGoogleSheet({
  activityId,
  sheetName = null,
  participantName = '',
  participantUsn = '',
  score,
  webAppUrl = null
}) {
  let targetUrl = webAppUrl;
  if (!targetUrl) {
    const masterCfg = await getMasterSheetConfig();
    targetUrl = masterCfg?.webAppUrl;
  }
  if (!targetUrl) {
    console.warn('No Apps Script Web App URL configured. Skipping sheet score push.');
    return { success: false, skipped: true, error: 'Web App URL not configured' };
  }

  const tab = sheetName || DEFAULT_SHEET_TABS[activityId] || activityId;
  const payload = {
    action: 'UPDATE_SCORE',
    sheetName: tab,
    activityId,
    participantName: (participantName || '').trim(),
    participantUsn: (participantUsn || '').trim().toUpperCase(),
    score: score !== undefined && score !== null ? String(score).trim() : ''
  };

  try {
    await fetch(targetUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(payload),
      mode: 'no-cors'
    });
    return { success: true };
  } catch (err) {
    console.error('Failed to push score to Google Sheet:', err);
    return { success: false, error: err.message };
  }
}

/**
 * Bulk push multiple participants to their respective sheet tab
 */
export async function pushBulkParticipantsToGoogleSheet({
  activityId,
  sheetName = null,
  participants = [],
  webAppUrl = null
}) {
  let targetUrl = webAppUrl;
  let tabName = sheetName;
  if (!targetUrl || !tabName) {
    const masterCfg = await getMasterSheetConfig();
    if (!targetUrl) targetUrl = masterCfg?.webAppUrl;
    if (!tabName && masterCfg?.sheetTabs?.[activityId]) {
      tabName = masterCfg.sheetTabs[activityId];
    }
  }
  if (!targetUrl) {
    return { success: false, skipped: true, error: 'Web App URL not configured' };
  }

  const tab = tabName || DEFAULT_SHEET_TABS[activityId] || activityId;
  const payload = {
    action: 'BATCH_ADD_PARTICIPANTS',
    sheetName: tab,
    activityId,
    participants: participants.map(p => ({
      participantName: p.participantName || p.name || '',
      participantUsn: p.participantUsn || p.usn || ''
    }))
  };

  try {
    await fetch(targetUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(payload),
      mode: 'no-cors'
    });
    return { success: true, count: participants.length };
  } catch (err) {
    console.error('Failed to batch push participants to Google Sheet:', err);
    return { success: false, error: err.message };
  }
}
