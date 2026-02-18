import Airtable from 'airtable';
import { writeFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

async function fetchCoffeeData() {
  const apiKey = process.env.AIRTABLE_API_KEY;
  const baseId = process.env.AIRTABLE_BASE_ID;

  if (!apiKey || !baseId) {
    console.error('Missing AIRTABLE_API_KEY or AIRTABLE_BASE_ID');
    process.exit(1);
  }

  const base = new Airtable({ apiKey }).base(baseId);

  try {
    const records = await base('Shots').select().all();

    const data = records.map((record) => ({
      id: record.id,
      ...record.fields,
    }));

    const outputPath = join(__dirname, '..', 'src', 'data', 'coffee.json');
    writeFileSync(outputPath, JSON.stringify(data, null, 2));

    console.log(`Fetched ${data.length} coffee records`);
  } catch (error) {
    console.error('Error fetching coffee data:', error.message);
    process.exit(1);
  }
}

fetchCoffeeData();
