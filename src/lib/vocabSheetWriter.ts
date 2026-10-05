import { auth, sheets } from '@googleapis/sheets';
import type { VocabSheet } from './vocabSheet';

// A few starter words for every category the Language page offers, laid out
// the way fetchVocabulary reads them.
const SAMPLE_VOCABULARY: Array<{ category: string; words: Array<[string, string]> }> = [
  {
    category: 'FAST PHRASES',
    words: [
      ['How much does it cost?', 'Bao nhiêu tiền?'],
      ["That's too expensive.", 'Cái đó đắt quá.'],
      ['Thank you', 'Cảm ơn'],
    ],
  },
  {
    category: 'GENERAL PHRASES',
    words: [
      ['Does anyone speak English?', 'Có ai nói tiếng Anh không?'],
      ["I'd like to practice Vietnamese", 'Tôi muốn luyện tập tiếng Việt.'],
      ['Nice to meet you', 'Rất vui được gặp bạn'],
    ],
  },
  { category: 'FOCUS', words: [['theatre', 'nhà hát'], ['stadium', 'sân vận động'], ['market', 'chợ']] },
  { category: 'CLOTHING', words: [['belt', 'dây lưng'], ['clothes', 'quần áo'], ['dress', 'áo đầm']] },
  { category: 'VERBS', words: [['buy', 'mua'], ['cook', 'nấu ăn'], ['drink', 'uống']] },
  { category: 'FOOD & DRINK', words: [['apple', 'táo'], ['bread', 'bánh mì'], ['water', 'nước']] },
  { category: 'HOUSE & HOME', words: [['apartment', 'căn hộ'], ['bathroom', 'phòng tắm'], ['bed', 'giường']] },
  { category: 'ACTIVITIES', words: [['concert', 'buổi hòa nhạc'], ['golf', 'gôn'], ['movie', 'phim']] },
  { category: 'THINGS', words: [['ball', 'quả bóng'], ['bicycle', 'xe đạp'], ['book', 'sách']] },
  { category: 'COLORS', words: [['black', 'màu đen'], ['blue', 'màu xanh da trời'], ['brown', 'màu nâu']] },
  { category: 'ADJECTIVES', words: [['big', 'to'], ['small', 'nhỏ'], ['beautiful', 'đẹp']] },
  {
    category: 'CONJUNCTIONS & PREPOSITIONS',
    words: [['and', 'và'], ['but', 'nhưng'], ['above', 'bên trên']],
  },
  { category: 'NUMBERS & MONEY', words: [['0', 'không'], ['1', 'một'], ['2', 'hai']] },
  {
    category: 'CLASSIFIERS',
    words: [['animals', 'con'], ['book-like objects', 'quyển'], ['bottles', 'chai']],
  },
  { category: 'PRONOUNS', words: [['I', 'tôi'], ['he', 'ông ấy'], ['it', 'cái đó']] },
  { category: 'PEOPLE & ANIMALS', words: [['adult', 'người lớn'], ['baby', 'em bé'], ['boy', 'con trai']] },
  { category: 'TIME RELATED', words: [['afternoon', 'buổi chiều'], ['autumn', 'mùa thu'], ['day', 'ngày']] },
  { category: 'PLACES', words: [['bank', 'ngân hàng'], ['cafe', 'quán cà phê'], ['Brazil', 'Braxin']] },
];

// Row 1 blank, row 2 category names, row 3 sub-headers, row 4 blank, then words
function sampleRows(): string[][] {
  const width = SAMPLE_VOCABULARY.length * 2;
  const blank = () => Array<string>(width).fill('');
  const categoryRow = blank();
  const subHeaderRow = blank();
  const depth = Math.max(...SAMPLE_VOCABULARY.map(({ words }) => words.length));
  const wordRows = Array.from({ length: depth }, blank);

  SAMPLE_VOCABULARY.forEach(({ category, words }, i) => {
    const col = i * 2;
    categoryRow[col] = category;
    subHeaderRow[col] = 'English';
    subHeaderRow[col + 1] = 'Vietnamese';
    words.forEach(([english, vietnamese], r) => {
      wordRows[r][col] = english;
      wordRows[r][col + 1] = vietnamese;
    });
  });

  return [blank(), categoryRow, subHeaderRow, blank(), ...wordRows];
}

export function getServiceAccountEmail(): string | null {
  return process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || null;
}

function sheetsClient() {
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  // Keys pasted into .env files usually carry literal \n sequences
  const key = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY?.replace(/\\n/g, '\n');
  if (!email || !key) {
    throw new Error('Google service account is not configured');
  }
  const jwt = new auth.JWT({
    email,
    key,
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });
  return sheets({ version: 'v4', auth: jwt });
}

function googleErrorStatus(error: unknown): number | undefined {
  const status = (error as { status?: unknown; code?: unknown })?.status ??
    (error as { code?: unknown })?.code;
  return typeof status === 'number' ? status : undefined;
}

// Erases the tab (values and formatting) and fills it with the sample words.
export async function resetSheetToSample(sheet: VocabSheet): Promise<void> {
  if (sheet.kind !== 'doc') {
    throw new Error(
      'A "Publish to web" link cannot be edited. Paste the link from the address bar while editing the sheet.'
    );
  }

  const client = sheetsClient();
  const sheetId = Number(sheet.gid);

  try {
    const { data } = await client.spreadsheets.get({
      spreadsheetId: sheet.id,
      fields: 'sheets.properties(sheetId,title)',
    });
    const tab = data.sheets?.find((s) => s.properties?.sheetId === sheetId)?.properties;
    if (!tab?.title) {
      throw new Error('That tab was not found in the Google Sheet');
    }

    await client.spreadsheets.batchUpdate({
      spreadsheetId: sheet.id,
      requestBody: {
        requests: [{ updateCells: { range: { sheetId }, fields: '*' } }],
      },
    });

    await client.spreadsheets.values.update({
      spreadsheetId: sheet.id,
      range: `'${tab.title.replace(/'/g, "''")}'!A1`,
      valueInputOption: 'RAW',
      requestBody: { values: sampleRows() },
    });
  } catch (error) {
    const status = googleErrorStatus(error);
    if (status === 403 || status === 404) {
      throw new Error(
        `The app does not have permission to edit this sheet. Share it with ${getServiceAccountEmail()} as an Editor, then try again.`
      );
    }
    throw error;
  }
}
