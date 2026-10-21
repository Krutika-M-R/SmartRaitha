const fs = require('node:fs/promises');
const path = require('node:path');
const { once } = require('node:events');

const PROJECT_ROOT = path.resolve(__dirname, '..');
const APP_PRICES_CSV = path.join(
  PROJECT_ROOT,
  'backend',
  'data',
  'agmarknet_karnataka_updated_prices.csv',
);
const OUTPUT_CSV = path.join(
  PROJECT_ROOT,
  'backend',
  'data',
  'agmarknet_karnataka_10yr_state_average_training_prices.csv',
);
const START_DATE = '2015-10-30';
const END_DATE = '2025-10-30';
const STATE_ID = 29;
const BASE_URL = 'https://agmarknet.ceda.ashoka.edu.in';
const CSV_HEADER = [
  'state',
  'district',
  'mandi_name',
  'crop_name',
  'variety',
  'grade',
  'arrival_date',
  'price_date',
  'min_price_rupees_per_quintal',
  'max_price_rupees_per_quintal',
  'modal_price_rupees_per_quintal',
  'min_price_per_kg',
  'max_price_per_kg',
  'modal_price_per_kg',
  'price_unit',
  'source',
  'retrieved_at_utc',
  'quote_status',
  'snapshot_generated_at_utc',
  'geography_level',
];

const CEDA_ALIASES = {
  'Paddy(Common)': 'Paddy(Dhan)(Common)',
  'Cucumbar(Kheera)': 'Cucumber (Kheera)',
  'Ridgeguard(Tori)': 'Ridge gourd (Tori)',
  Snakeguard: 'Snake gourd',
  'Black Gram(Urd Beans)(Whole)': 'Black Gram (Urad Beans)(Whole)',
  'Red gram/Arhar/Tur(whole)': 'Arhar (Tur/Red Gram)(Whole)',
  'Sunflower/Sunflower Seed': 'Sunflower',
  'Corriander seed': 'Coriander seed',
  Raddish: 'Radish',
  'Elephant Yam(Suran)/Amorphophallus': 'Elephant Yam (Suran)',
  'Chikoos(Sapota)': 'Chikoo (Sapota)',
  'Chilly Capsicum': 'Chilli Capsicum',
  'Red gram split/Arhar dal/Tur dal': 'Arhar Dal (Tur Dal)',
};

function normalizeName(value) {
  return String(value).toLowerCase().replace(/[^a-z0-9]/g, '');
}

function parseCsvLine(line) {
  const fields = [];
  let field = '';
  let quoted = false;

  for (let index = 0; index < line.length; index += 1) {
    const character = line[index];
    if (character === '"' && quoted && line[index + 1] === '"') {
      field += '"';
      index += 1;
    } else if (character === '"') {
      quoted = !quoted;
    } else if (character === ',' && !quoted) {
      fields.push(field);
      field = '';
    } else {
      field += character;
    }
  }

  fields.push(field);
  return fields;
}

function csvValue(value) {
  const text = value == null ? '' : String(value);
  return `"${text.replace(/"/g, '""')}"`;
}

function getField(record, ...names) {
  const fields = new Map(
    Object.entries(record).map(([key, value]) => [normalizeName(key), value]),
  );
  for (const name of names) {
    const value = fields.get(normalizeName(name));
    if (value != null && String(value).trim() !== '') return String(value).trim();
  }
  return '';
}

function parseDate(value) {
  const input = String(value || '').trim();
  let match = /^(\d{4})-(\d{1,2})-(\d{1,2})/.exec(input);
  if (match) {
    return `${match[1]}-${match[2].padStart(2, '0')}-${match[3].padStart(2, '0')}`;
  }

  match = /^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/.exec(input);
  if (!match) return '';
  return `${match[3]}-${match[2].padStart(2, '0')}-${match[1].padStart(2, '0')}`;
}

function parsePrice(value) {
  const normalized = String(value || '').replace(/,/g, '').trim();
  if (!normalized) return null;
  const price = Number(normalized);
  return Number.isFinite(price) && price >= 0 ? price : null;
}

async function readAppCrops() {
  const content = await fs.readFile(APP_PRICES_CSV, 'utf8');
  const lines = content.split(/\r?\n/).filter(Boolean);
  if (lines.length < 2) throw new Error(`No crop rows found in ${APP_PRICES_CSV}`);

  const headers = parseCsvLine(lines[0]);
  const cropIndex = headers.indexOf('crop_name');
  if (cropIndex < 0) throw new Error('The app prices CSV has no crop_name column.');

  return [...new Set(lines.slice(1).map((line) => parseCsvLine(line)[cropIndex]).filter(Boolean))]
    .sort((a, b) => a.localeCompare(b));
}

async function resolveCrops() {
  const [appCrops, response] = await Promise.all([
    readAppCrops(),
    fetch(`${BASE_URL}/api/commodities`),
  ]);
  if (!response.ok) throw new Error(`CEDA commodity catalog returned HTTP ${response.status}.`);
  const payload = await response.json();
  if (!Array.isArray(payload.data)) throw new Error('CEDA returned an invalid commodity catalog.');

  const catalog = new Map(
    payload.data.map((item) => [normalizeName(item.commodity_disp_name), item]),
  );
  const crops = [];
  const missing = [];
  for (const appName of appCrops) {
    const cedaName = CEDA_ALIASES[appName] || appName;
    const commodity = catalog.get(normalizeName(cedaName));
    if (!commodity) {
      missing.push(appName);
    } else {
      crops.push({ appName, id: commodity.commodity_id });
    }
  }

  if (missing.length) {
    throw new Error(`No CEDA commodity mapping for app crops: ${missing.join(', ')}`);
  }
  const mappedNames = new Map();
  for (const crop of crops) {
    const otherName = mappedNames.get(crop.id);
    if (otherName) {
      throw new Error(`App crops "${otherName}" and "${crop.appName}" map to the same CEDA commodity ID ${crop.id}.`);
    }
    mappedNames.set(crop.id, crop.appName);
  }
  return crops;
}

function normalizeRecord(record, appCrop, retrievedAt, snapshotAt) {
  const date = parseDate(getField(record, 'arrival_date', 'price_date', 'date', 't'));
  const minimum = parsePrice(getField(record, 'min_price', 'minimum_price', 'p_min'));
  const maximum = parsePrice(getField(record, 'max_price', 'maximum_price', 'p_max'));
  const modal = parsePrice(getField(record, 'modal_price', 'modal', 'p_modal'));

  if (!date || minimum == null || maximum == null || modal == null || modal <= 0) return null;
  if (date < START_DATE || date > END_DATE) return null;

  return [
    getField(record, 'state', 'state_name') || 'Karnataka',
    'All Karnataka',
    'Karnataka State Average',
    appCrop,
    '',
    '',
    date,
    date,
    minimum,
    maximum,
    modal,
    minimum / 100,
    maximum / 100,
    modal / 100,
    'KG',
    'CEDA Agmarknet (DMI, Government of India; statewide average)',
    retrievedAt,
    'reported',
    snapshotAt,
    'state',
  ].map(csvValue).join(',');
}

async function requestCrop(crop) {
  const response = await fetch(`${BASE_URL}/api/prices`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      state_id: STATE_ID,
      commodity_id: crop.id,
      district_id: 0,
      start_date: START_DATE,
      end_date: END_DATE,
      calculation_type: 'd',
    }),
  });

  let payload;
  try {
    payload = await response.json();
  } catch {
    throw new Error(`CEDA returned a non-JSON response for ${crop.appName} (HTTP ${response.status}).`);
  }

  if (!response.ok) {
    if (response.status === 429) {
      const error = new Error(payload.error || 'CEDA rate limit reached.');
      error.retryMs = Number(payload.retryAfter) || 60_000;
      throw error;
    }
    throw new Error(`CEDA rejected ${crop.appName} with HTTP ${response.status}: ${payload.error || 'unknown error'}`);
  }

  if (!Array.isArray(payload.data)) {
    throw new Error(`CEDA response for ${crop.appName} did not contain a data array.`);
  }
  return payload.data;
}

async function requestCropWithRetry(crop) {
  let networkAttempts = 0;
  while (true) {
    try {
      return await requestCrop(crop);
    } catch (error) {
      if (error.retryMs) {
        console.log(`Rate limited on ${crop.appName}; retrying in ${Math.ceil(error.retryMs / 1000)} seconds.`);
        await new Promise((resolve) => setTimeout(resolve, error.retryMs));
        continue;
      }
      if (error instanceof TypeError && networkAttempts < 4) {
        networkAttempts += 1;
        const waitMs = 30_000 * networkAttempts;
        console.warn(`Network error on ${crop.appName}; retrying in ${waitMs / 1000} seconds.`);
        await new Promise((resolve) => setTimeout(resolve, waitMs));
        continue;
      }
      throw error;
    }
  }
}

async function loadProgress(progressPath) {
  try {
    const progress = JSON.parse(await fs.readFile(progressPath, 'utf8'));
    if (progress.version === 1) return progress;
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
  }
  return { version: 1, completed: {}, snapshotAt: new Date().toISOString() };
}

async function saveProgress(progressPath, progress) {
  const temporaryPath = `${progressPath}.tmp`;
  await fs.writeFile(temporaryPath, `${JSON.stringify(progress, null, 2)}\n`);
  await fs.rename(temporaryPath, progressPath);
}

async function writeCsvPart(partPath, rows) {
  await fs.writeFile(partPath, `${CSV_HEADER.join(',')}\n${rows.join('\n')}${rows.length ? '\n' : ''}`);
}

async function mergeParts(partPaths, outputPath) {
  const output = require('node:fs').createWriteStream(`${outputPath}.tmp`);
  output.write(`${CSV_HEADER.join(',')}\n`);

  for (const partPath of partPaths) {
    const input = require('node:fs').createReadStream(partPath);
    let isHeader = true;
    let carry = '';
    for await (const chunk of input) {
      const text = carry + chunk.toString('utf8');
      const newline = text.indexOf('\n');
      if (isHeader && newline >= 0) {
        isHeader = false;
        carry = text.slice(newline + 1);
      } else {
        carry = text;
      }
      if (!isHeader && carry) {
        if (!output.write(carry)) await once(output, 'drain');
        carry = '';
      }
    }
    if (!isHeader && carry) {
      if (!output.write(carry)) await once(output, 'drain');
    }
  }

  output.end();
  await once(output, 'finish');
  await fs.rename(`${outputPath}.tmp`, outputPath);
}

async function main() {
  const dryRun = process.argv.includes('--dry-run');
  const crops = await resolveCrops();
  console.log(`Mapped ${crops.length} app crops to CEDA commodity IDs.`);
  console.log(`Historical window: ${START_DATE} through ${END_DATE}; daily statewide averages.`);
  if (dryRun) return;

  const dataDirectory = path.dirname(OUTPUT_CSV);
  const partsDirectory = path.join(dataDirectory, '.agmarknet_karnataka_state_training_parts');
  const progressPath = path.join(dataDirectory, '.agmarknet_karnataka_state_training_progress.json');
  await fs.mkdir(partsDirectory, { recursive: true });
  const progress = await loadProgress(progressPath);
  if (progress.finished && (await fs.stat(OUTPUT_CSV).catch(() => null))) {
    console.log(`Export is already complete: ${OUTPUT_CSV}`);
    return;
  }
  if (!progress.finished && (await fs.stat(OUTPUT_CSV).catch(() => null))) {
    throw new Error(`Refusing to overwrite ${OUTPUT_CSV} without a completed checkpoint.`);
  }

  for (let index = 0; index < crops.length; index += 1) {
    const crop = crops[index];
    if (progress.completed[crop.id]) continue;

    console.log(`[${index + 1}/${crops.length}] Fetching ${crop.appName} (CEDA ${crop.id})`);
    const records = await requestCropWithRetry(crop);
    const retrievedAt = new Date().toISOString();
    const rows = records
      .map((record) => normalizeRecord(record, crop.appName, retrievedAt, progress.snapshotAt))
      .filter(Boolean);
    if (records.length && !rows.length) {
      throw new Error(`Could not normalize CEDA records for ${crop.appName}; fields: ${Object.keys(records[0]).join(', ')}`);
    }

    const partPath = path.join(partsDirectory, `${crop.id}.csv`);
    await writeCsvPart(partPath, rows);
    progress.completed[crop.id] = {
      crop: crop.appName,
      rowCount: rows.length,
      firstDate: rows.length ? rows.reduce((min, row) => {
        const date = parseCsvLine(row)[7].replace(/^"|"$/g, '');
        return date < min ? date : min;
      }, '9999-12-31') : null,
      lastDate: rows.length ? rows.reduce((max, row) => {
        const date = parseCsvLine(row)[7].replace(/^"|"$/g, '');
        return date > max ? date : max;
      }, '0000-01-01') : null,
    };
    progress.parts = progress.parts || {};
    progress.parts[crop.id] = partPath;
    await saveProgress(progressPath, progress);
    console.log(`Saved ${rows.length} rows for ${crop.appName}.`);
  }

  const partPaths = crops.map((crop) => progress.parts[crop.id]).filter(Boolean);
  await mergeParts(partPaths, OUTPUT_CSV);
  progress.finished = true;
  progress.output = OUTPUT_CSV;
  await saveProgress(progressPath, progress);
  console.log(`Export complete: ${OUTPUT_CSV}`);
  console.log(`Total rows: ${Object.values(progress.completed).reduce((sum, item) => sum + item.rowCount, 0)}`);
  const observedDates = Object.values(progress.completed)
    .flatMap((item) => [item.firstDate, item.lastDate])
    .filter(Boolean)
    .sort();
  if (observedDates.length) {
    console.log(`Observed data range: ${observedDates[0]} through ${observedDates[observedDates.length - 1]}.`);
  }
  const shortHistory = Object.values(progress.completed)
    .filter((item) => item.firstDate && item.lastDate
      && Date.parse(`${item.lastDate}T00:00:00.000Z`) - Date.parse(`${item.firstDate}T00:00:00.000Z`)
        < 365 * 24 * 60 * 60 * 1000 * 10)
    .map((item) => item.crop);
  if (shortHistory.length) {
    console.warn(`Less than ten years of CEDA records were available for: ${shortHistory.join(', ')}`);
  }
  const emptyCrops = Object.values(progress.completed)
    .filter((item) => item.rowCount === 0)
    .map((item) => item.crop);
  if (emptyCrops.length) console.warn(`No CEDA state-level rows found for: ${emptyCrops.join(', ')}`);
  await fs.rm(partsDirectory, { recursive: true, force: true });
}

main().catch((error) => {
  console.error(`Historical state-average export failed: ${error.message}`);
  process.exitCode = 1;
});
