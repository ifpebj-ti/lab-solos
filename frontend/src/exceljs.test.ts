import { describe, expect, it } from 'vitest';
import ExcelJS from 'exceljs';

describe('ExcelJS dependency compatibility', () => {
  it('generates a workbook with the patched UUID dependency', async () => {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Compatibilidade');

    worksheet.addRow(['status', 'ok']);

    const output = await workbook.xlsx.writeBuffer();
    expect(output.byteLength).toBeGreaterThan(0);
  });
});
