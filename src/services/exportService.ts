import { jsPDF } from 'jspdf';
import { exportDatabaseBinary, importDatabaseBinary } from '../db/sqlite';

/**
 * Trigger browser file download 100% locally/offline
 */
function downloadFile(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Export data to CSV / Excel readable file
 */
export function exportToCSV(filename: string, headers: string[], rows: (string | number)[][]) {
  const csvContent = [
    headers.map((h) => `"${h.replace(/"/g, '""')}"`).join(','),
    ...rows.map((row) =>
      row
        .map((val) => {
          if (val === null || val === undefined) return '""';
          const str = String(val).replace(/"/g, '""');
          return `"${str}"`;
        })
        .join(',')
    ),
  ].join('\r\n');

  const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
  downloadFile(blob, `${filename}.csv`);
}

/**
 * Export clean offline PDF report using jsPDF
 */
export function exportToPDF(params: {
  title: string;
  subtitle?: string;
  headers: string[];
  rows: (string | number)[][];
  summaryNotes?: string[];
  filename: string;
}) {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  // Dark header banner
  doc.setFillColor(17, 24, 39);
  doc.rect(0, 0, 210, 32, 'F');

  // Brand Name
  doc.setTextColor(245, 158, 11); // Golden
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.text('VEER FAST FOOD', 14, 15);

  // Subtitle / Report title
  doc.setTextColor(243, 244, 246);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(params.title.toUpperCase(), 14, 23);

  const timestamp = new Date().toLocaleString('en-IN');
  doc.setTextColor(156, 163, 175);
  doc.setFontSize(8);
  doc.text(`Generated: ${timestamp} (OFFLINE POS)`, 130, 23);

  // Content start
  let startY = 40;

  if (params.subtitle) {
    doc.setTextColor(31, 41, 55);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text(params.subtitle, 14, startY);
    startY += 8;
  }

  // Draw Table manually for lightweight offline rendering
  const colCount = params.headers.length;
  const tableWidth = 182; // 210 - 28 margin
  const colWidth = tableWidth / colCount;

  // Header row
  doc.setFillColor(243, 244, 246);
  doc.rect(14, startY, tableWidth, 9, 'F');
  doc.setTextColor(17, 24, 39);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');

  params.headers.forEach((h, i) => {
    doc.text(h, 16 + i * colWidth, startY + 6);
  });

  startY += 10;

  // Data rows
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);

  params.rows.forEach((row, rowIndex) => {
    if (startY > 270) {
      doc.addPage();
      startY = 20;
    }

    if (rowIndex % 2 === 1) {
      doc.setFillColor(249, 250, 251);
      doc.rect(14, startY - 1, tableWidth, 7.5, 'F');
    }

    doc.setTextColor(31, 41, 55);
    row.forEach((cell, i) => {
      const textVal = cell !== null && cell !== undefined ? String(cell) : '';
      doc.text(textVal.substring(0, 26), 16 + i * colWidth, startY + 4.5);
    });

    startY += 7.5;
  });

  // Summary notes at bottom if any
  if (params.summaryNotes && params.summaryNotes.length > 0) {
    startY += 6;
    if (startY > 265) {
      doc.addPage();
      startY = 20;
    }
    doc.setFillColor(254, 243, 199);
    doc.rect(14, startY, tableWidth, 6 + params.summaryNotes.length * 5, 'F');
    doc.setTextColor(146, 64, 14);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.text('REPORT HIGHLIGHTS:', 18, startY + 4.5);
    doc.setFont('helvetica', 'normal');
    params.summaryNotes.forEach((note, idx) => {
      doc.text(`• ${note}`, 18, startY + 9 + idx * 5);
    });
  }

  // Footer
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(156, 163, 175);
    doc.text(`VEER FAST FOOD POS | Page ${i} of ${totalPages} | Local SQLite Verified`, 14, 290);
  }

  doc.save(`${params.filename}.pdf`);
}

/**
 * Export SQLite database file (.sqlite / .db)
 */
export async function exportSqliteDatabaseFile(): Promise<void> {
  const binary = await exportDatabaseBinary();
  const blob = new Blob([binary.buffer as ArrayBuffer], { type: 'application/x-sqlite3' });
  const dateStr = new Date().toISOString().slice(0, 10);
  downloadFile(blob, `veer_fast_food_backup_${dateStr}.sqlite`);
}

/**
 * Import and restore SQLite database file
 */
export async function importSqliteDatabaseFile(file: File): Promise<void> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const arrayBuffer = reader.result as ArrayBuffer;
        const uint8 = new Uint8Array(arrayBuffer);
        await importDatabaseBinary(uint8);
        resolve();
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsArrayBuffer(file);
  });
}
