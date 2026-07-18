import { google } from "googleapis";

function required(name: string) {
  const value = process.env[name];

  if (!value) {
    throw new Error(`Variável de ambiente ausente: ${name}`);
  }

  return value;
}

export async function getGoogleSheetsClient() {
  const email = required("GOOGLE_SERVICE_ACCOUNT_EMAIL");
  const privateKey = required("GOOGLE_PRIVATE_KEY").replace(/\\n/g, "\n");

  const auth = new google.auth.JWT({
    email,
    key: privateKey,
    scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"],
  });

  return google.sheets({ version: "v4", auth });
}

export async function lerAba(range: string) {
  const spreadsheetId = required("GOOGLE_SHEETS_SPREADSHEET_ID");
  const sheets = await getGoogleSheetsClient();

  const resposta = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range,
  });

  return resposta.data.values || [];
}
