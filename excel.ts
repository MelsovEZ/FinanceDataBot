import { google } from 'googleapis';
import 'dotenv/config'

// Данные для настройки
const clientEmail = process.env.GOOGLE_CLIENT_EMAIL;
const privateKey = process.env.GOOGLE_PRIVATE_KEY;
const googleSheetId = process.env.SHEET_ID;

// Инициализация таблицы
const googleAuth = new google.auth.JWT(
    clientEmail,
    null,
    privateKey.replace(/\\n/g, '\n'),
    'https://www.googleapis.com/auth/spreadsheets'
);

// Функция для чтения всех таблиц
export async function getSheetNames(): Promise<string[]> {
    const sheetInstance = google.sheets({ version: 'v4', auth: googleAuth });
    const infoObjectFromSheet = await sheetInstance.spreadsheets.get({
        auth: googleAuth,
        spreadsheetId: googleSheetId
    });
    const names = infoObjectFromSheet.data.sheets.map(sheet => sheet.properties.title);
    return names;
}

// Функция для чтения данных с таблицы
export async function readSheet(googleSheetPage: string) {
    try {
        const sheetInstance = google.sheets({ version: 'v4', auth: googleAuth });
        const infoObjectFromSheet = await sheetInstance.spreadsheets.values.get({
            auth: googleAuth,
            spreadsheetId: googleSheetId,
            range: `${googleSheetPage}!A1:E5`
        });

        return infoObjectFromSheet.data.values;
    }
    catch (err) {
        console.error("readSheet func() error", err);
    }
}
