import Airtable from 'airtable';

interface AirtableRecord {
  id: string;
  [key: string]: unknown;
}

function checkEnvVars(): { apiKey: string; baseId: string } {
  const apiKey = import.meta.env.AIRTABLE_API_KEY as string | undefined;
  const baseId = import.meta.env.AIRTABLE_BASE_ID as string | undefined;

  if (!apiKey || apiKey === 'undefined') {
    throw new Error('AIRTABLE_API_KEY is missing in environment variables');
  }

  if (!baseId || baseId === 'undefined') {
    throw new Error('AIRTABLE_BASE_ID is missing in environment variables');
  }

  return { apiKey, baseId };
}

export async function fetchRecords(tableName: string): Promise<AirtableRecord[]> {
  try {
    const { apiKey, baseId } = checkEnvVars();

    const base = new Airtable({ apiKey }).base(baseId);
    const records = await base(tableName).select().all();

    return records.map((record) => ({
      id: record.id,
      ...(record.fields as Record<string, unknown>),
    }));
  } catch (error) {
    const airtableError = error as { statusCode?: number };

    if (airtableError.statusCode === 404) {
      // Base ID is incorrect or table does not exist
    } else if (airtableError.statusCode === 401 || airtableError.statusCode === 403) {
      // API key might be invalid or expired
    }

    return [];
  }
}
