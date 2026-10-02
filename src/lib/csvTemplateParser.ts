import * as XLSX from 'xlsx';
import { TemplateEnvironment, TemplateItem } from '../types';

export interface CsvParseResult {
  success: boolean;
  error?: string;
  environments: TemplateEnvironment[];
  totalEnvironments: number;
  totalItems: number;
  warnings?: string[];
}

/**
 * Splits a CSV line taking quotes into account
 */
function splitCsvLine(line: string, delimiter: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"' || char === "'") {
      inQuotes = !inQuotes;
    } else if (char === delimiter && !inQuotes) {
      result.push(current.trim().replace(/^["']|["']$/g, '').trim());
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current.trim().replace(/^["']|["']$/g, '').trim());
  return result;
}

/**
 * Detects the most probable delimiter (; , \t |)
 */
function detectDelimiter(text: string): string {
  const firstLines = text.split(/\r\n|\n|\r/).slice(0, 5).join('\n');
  const counts = {
    ';': (firstLines.match(/;/g) || []).length,
    ',': (firstLines.match(/,/g) || []).length,
    '\t': (firstLines.match(/\t/g) || []).length,
    '|': (firstLines.match(/\|/g) || []).length,
  };

  let best = ';';
  let maxCount = counts[';'];
  for (const [delim, count] of Object.entries(counts)) {
    if (count > maxCount) {
      maxCount = count;
      best = delim;
    }
  }
  return best;
}

/**
 * Core Parser: Maps Column 1 -> Ambientes and Column 2 -> Itens from any 2D grid
 * Supports:
 * - Direct row-by-row mapping
 * - Header row detection and skipping
 * - Carry-over of previous environment when Column 1 is empty in subsequent rows
 * - Trimming and normalization
 */
export function parseSpreadsheetGrid(rows: any[][]): CsvParseResult {
  if (!rows || rows.length === 0) {
    return {
      success: false,
      error: 'A planilha selecionada está vazia.',
      environments: [],
      totalEnvironments: 0,
      totalItems: 0,
    };
  }

  // Filter out empty rows
  const cleanRows = rows
    .map((r) =>
      Array.isArray(r)
        ? r.map((cell) => (cell !== null && cell !== undefined ? String(cell).trim() : ''))
        : []
    )
    .filter((r) => r.some((cell) => cell.length > 0));

  if (cleanRows.length === 0) {
    return {
      success: false,
      error: 'Nenhum dado legível encontrado na planilha.',
      environments: [],
      totalEnvironments: 0,
      totalItems: 0,
    };
  }

  let startIdx = 0;
  // Check if first row is header
  const firstCol0 =
    cleanRows[0][0]?.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '') || '';
  const firstCol1 =
    cleanRows[0][1]?.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '') || '';

  const isHeader =
    firstCol0.includes('ambiente') ||
    firstCol0.includes('local') ||
    firstCol0.includes('setor') ||
    firstCol0.includes('area') ||
    firstCol0.includes('comodo') ||
    firstCol0.includes('coluna 1') ||
    firstCol1.includes('item') ||
    firstCol1.includes('elemento') ||
    firstCol1.includes('equipamento') ||
    firstCol1.includes('nome') ||
    firstCol1.includes('coluna 2') ||
    firstCol1.includes('descricao');

  if (isHeader) {
    startIdx = 1;
  }

  const envMap = new Map<string, TemplateItem[]>();
  const envOrder: string[] = [];
  const baseTime = Date.now();
  let itemCounter = 0;
  let currentEnvName = '';

  for (let i = startIdx; i < cleanRows.length; i++) {
    const row = cleanRows[i];
    // Coluna 1 = Ambiente, Coluna 2 = Item
    const col0 = (row[0] || '').trim();
    const col1 = (row[1] || '').trim();

    // If Coluna 1 is present, update current environment
    if (col0) {
      currentEnvName = col0;
    }

    // If we have an environment (either from current row or carried over from previous row)
    if (currentEnvName) {
      if (!envMap.has(currentEnvName)) {
        envMap.set(currentEnvName, []);
        envOrder.push(currentEnvName);
      }

      // If Coluna 2 has an item name, add it to this environment
      if (col1) {
        itemCounter++;
        const currentItems = envMap.get(currentEnvName)!;
        currentItems.push({
          id: `tit_${baseTime}_${itemCounter}`,
          name: col1,
          description: '', // Blank for inspector to fill during inspection
          order: currentItems.length + 1,
        });
      }
    }
  }

  if (envOrder.length === 0) {
    return {
      success: false,
      error:
        'Não foi possível extrair ambientes e itens. Certifique-se de preencher os Ambientes na Coluna 1 e os Itens na Coluna 2 da planilha.',
      environments: [],
      totalEnvironments: 0,
      totalItems: 0,
    };
  }

  const environments: TemplateEnvironment[] = envOrder.map((envName, eIdx) => ({
    id: `tenv_${baseTime}_${eIdx + 1}`,
    name: envName,
    order: eIdx + 1,
    items: envMap.get(envName) || [],
  }));

  const totalItems = environments.reduce((acc, env) => acc + env.items.length, 0);

  return {
    success: true,
    environments,
    totalEnvironments: environments.length,
    totalItems,
  };
}

/**
 * Parses raw CSV or text into grouped TemplateEnvironments and TemplateItems
 * (Coluna 1 = Ambiente, Coluna 2 = Item)
 */
export function parseTemplateCsv(csvContent: string): CsvParseResult {
  if (!csvContent || !csvContent.trim()) {
    return {
      success: false,
      error: 'O arquivo CSV está vazio.',
      environments: [],
      totalEnvironments: 0,
      totalItems: 0,
    };
  }

  const cleanText = csvContent.replace(/^\uFEFF/, '');
  const lines = cleanText
    .split(/\r\n|\n|\r/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  if (lines.length === 0) {
    return {
      success: false,
      error: 'Nenhuma linha válida encontrada no CSV.',
      environments: [],
      totalEnvironments: 0,
      totalItems: 0,
    };
  }

  const delimiter = detectDelimiter(lines.join('\n'));
  const rows = lines.map((l) => splitCsvLine(l, delimiter));
  return parseSpreadsheetGrid(rows);
}

/**
 * Parses binary spreadsheet (.xlsx or .xls) using SheetJS
 * (Coluna 1 = Ambiente, Coluna 2 = Item)
 */
export function parseTemplateSpreadsheet(arrayBuffer: ArrayBuffer): CsvParseResult {
  try {
    const workbook = XLSX.read(arrayBuffer, { type: 'array' });
    const firstSheetName = workbook.SheetNames[0];
    if (!firstSheetName) {
      return {
        success: false,
        error: 'A planilha selecionada não possui abas com dados.',
        environments: [],
        totalEnvironments: 0,
        totalItems: 0,
      };
    }

    const worksheet = workbook.Sheets[firstSheetName];
    // Extract full 2D grid with Column 1 = index 0, Column 2 = index 1
    const rows = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' }) as any[][];
    return parseSpreadsheetGrid(rows);
  } catch (err: any) {
    return {
      success: false,
      error: `Erro ao processar planilha Excel: ${err?.message || 'Arquivo inválido ou corrompido.'}`,
      environments: [],
      totalEnvironments: 0,
      totalItems: 0,
    };
  }
}

const SAMPLE_TEMPLATE_ROWS = [
  ['Ambiente', 'Item'],
  ['Hall de Entrada', 'Porta de Acesso Principal'],
  ['Hall de Entrada', 'Interfone e Painel de Senha'],
  ['Hall de Entrada', 'Iluminação e Sensores de Presença'],
  ['Hall de Entrada', 'Piso e Rodapés'],
  ['Garagem e Estacionamento', 'Portão Eletrônico e Motores'],
  ['Garagem e Estacionamento', 'Demarcação de Vagas e Sinalização'],
  ['Garagem e Estacionamento', 'Iluminação de Emergência'],
  ['Garagem e Estacionamento', 'Ralos e Grelhas Pluviais'],
  ['Sistema de Combate a Incêndio', 'Extintores de Incêndio (Carga e Lacre)'],
  ['Sistema de Combate a Incêndio', 'Portas Corta-Fogo e Fechaduras'],
  ['Sistema de Combate a Incêndio', 'Abrigos de Hidrantes e Mangueiras'],
  ['Sistema de Combate a Incêndio', 'Sinalização Fotoluminescente e Rotas'],
  ['Barrilete e Casa de Bombas', 'Bombas de Recalque de Água Potável'],
  ['Barrilete e Casa de Bombas', 'Bombas de Esgoto e Drenagem'],
  ['Barrilete e Casa de Bombas', 'Quadro Elétrico de Força e Comando'],
  ['Barrilete e Casa de Bombas', 'Tubulações, Válvulas e Registros'],
  ['Cobertura e Fachadas', 'Telhado, Calhas e Rufos Metálicos'],
  ['Cobertura e Fachadas', 'Para-raios (SPDA) e Aterramento'],
  ['Cobertura e Fachadas', 'Pintura e Revestimento de Fachada'],
  ['Área de Lazer e Salão de Festas', 'Churrasqueira e Coifa'],
  ['Área de Lazer e Salão de Festas', 'Piscina e Equipamentos de Filtragem'],
  ['Área de Lazer e Salão de Festas', 'Mobiliário e Esquadrias'],
];

/**
 * Generates sample CSV content ready for download
 */
export function generateSampleTemplateCsv(): string {
  return SAMPLE_TEMPLATE_ROWS.map((r) => r.map((c) => `"${c}"`).join(';')).join('\r\n');
}

/**
 * Generates sample Excel (.xlsx) file as Uint8Array ready for download
 */
export function generateSampleTemplateXlsx(): Uint8Array {
  const ws = XLSX.utils.aoa_to_sheet(SAMPLE_TEMPLATE_ROWS);
  ws['!cols'] = [{ wch: 32 }, { wch: 42 }];
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Ambientes e Itens');
  const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  return new Uint8Array(wbout);
}

/**
 * Exports an InspectionTemplate to an Excel (.xlsx) file as Uint8Array
 */
export function exportTemplateAsXlsx(tmpl: { title: string; environments: TemplateEnvironment[] }): Uint8Array {
  const rows = [['Ambiente', 'Item']];
  tmpl.environments.forEach((env) => {
    if (env.items && env.items.length > 0) {
      env.items.forEach((it) => {
        rows.push([env.name, it.name]);
      });
    } else {
      rows.push([env.name, '']);
    }
  });

  const ws = XLSX.utils.aoa_to_sheet(rows);
  ws['!cols'] = [{ wch: 32 }, { wch: 42 }];
  const wb = XLSX.utils.book_new();
  const sheetTitle = (tmpl.title || 'Checklist').replace(/[\\/?*[\]]/g, ' ').substring(0, 31).trim();
  XLSX.utils.book_append_sheet(wb, ws, sheetTitle || 'Checklist');
  const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  return new Uint8Array(wbout);
}
