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
 * Parses raw CSV text into grouped TemplateEnvironments and TemplateItems
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

  // Remove BOM if present
  let cleanText = csvContent.replace(/^\uFEFF/, '');
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

  let headerOffset = 0;
  let envColIdx = 0;
  let itemColIdx = 1;
  let descColIdx = -1;

  // Check if first line is a header
  const firstRowCols = splitCsvLine(lines[0], delimiter).map((c) =>
    c.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  );

  const isHeaderCandidate = firstRowCols.some(
    (col) =>
      col.includes('ambiente') ||
      col.includes('local') ||
      col.includes('setor') ||
      col.includes('area') ||
      col.includes('comodo') ||
      col.includes('item') ||
      col.includes('elemento') ||
      col.includes('equipamento') ||
      col.includes('nome')
  );

  if (isHeaderCandidate) {
    headerOffset = 1;
    // Map column indices
    firstRowCols.forEach((col, idx) => {
      if (
        col.includes('ambiente') ||
        col.includes('local') ||
        col.includes('setor') ||
        col.includes('area') ||
        col.includes('comodo')
      ) {
        envColIdx = idx;
      } else if (
        col.includes('item') ||
        col.includes('elemento') ||
        col.includes('equipamento') ||
        col.includes('nome')
      ) {
        itemColIdx = idx;
      } else if (col.includes('desc') || col.includes('obs')) {
        descColIdx = idx;
      }
    });

    // Fallback if both pointed to same or wasn't detected
    if (envColIdx === itemColIdx) {
      envColIdx = 0;
      itemColIdx = 1;
    }
  }

  const rawRows: { envName: string; itemName: string; itemDesc?: string }[] = [];

  for (let i = headerOffset; i < lines.length; i++) {
    const rawCols = splitCsvLine(lines[i], delimiter);
    if (rawCols.length < 2 && !rawCols[0]) continue;

    const envName = (rawCols[envColIdx] || '').trim();
    const itemName = (rawCols[itemColIdx] || '').trim();
    const itemDesc = descColIdx >= 0 ? (rawCols[descColIdx] || '').trim() : '';

    if (envName && itemName) {
      rawRows.push({ envName, itemName, itemDesc });
    } else if (envName && !itemName && rawRows.length > 0) {
      // If only environment name specified, keep environment ready
      rawRows.push({ envName, itemName: '', itemDesc: '' });
    }
  }

  if (rawRows.length === 0) {
    return {
      success: false,
      error:
        'Não foi possível extrair ambientes e itens. Certifique-se de que o CSV possui duas colunas (Ambiente e Item) separadas por vírgula ou ponto e vírgula.',
      environments: [],
      totalEnvironments: 0,
      totalItems: 0,
    };
  }

  // Group by environment preserving order
  const envMap = new Map<string, TemplateItem[]>();
  const envOrder: string[] = [];
  const baseTime = Date.now();

  let itemCounter = 0;

  for (const row of rawRows) {
    if (!envMap.has(row.envName)) {
      envMap.set(row.envName, []);
      envOrder.push(row.envName);
    }

    if (row.itemName) {
      itemCounter++;
      const currentItems = envMap.get(row.envName)!;
      currentItems.push({
        id: `tit_${baseTime}_${itemCounter}`,
        name: row.itemName,
        description: row.itemDesc || '', // Remains blank for inspector to fill during inspection
        order: currentItems.length + 1,
      });
    }
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
 * Generates sample CSV content ready for download
 */
export function generateSampleTemplateCsv(): string {
  const rows = [
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

  return rows.map((r) => r.map((c) => `"${c}"`).join(';')).join('\r\n');
}
