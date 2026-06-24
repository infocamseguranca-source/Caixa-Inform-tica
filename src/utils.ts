export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
}

export function formatDate(dateString: string): string {
  if (!dateString) return '';
  const date = new Date(dateString);
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

export function formatShortDate(dateString: string): string {
  if (!dateString) return '';
  const date = new Date(dateString);
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
  }).format(date);
}

export function formatPhone(phone: string): string {
  const cleaned = phone.replace(/\D/g, '');
  if (cleaned.length === 11) {
    return `(${cleaned.substring(0, 2)}) ${cleaned.substring(2, 7)}-${cleaned.substring(7)}`;
  } else if (cleaned.length === 10) {
    return `(${cleaned.substring(0, 2)}) ${cleaned.substring(2, 6)}-${cleaned.substring(6)}`;
  }
  return phone;
}

export function generateOSNumber(): string {
  const chars = '0123456789';
  let result = 'OS-';
  for (let i = 0; i < 5; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

export function exportToExcel(data: any[], fileName: string) {
  if (data.length === 0) return;
  
  // Clean circular references or deep objects before exporting
  const cleanData = data.map(item => {
    const cleanItem: any = {};
    Object.keys(item).forEach(key => {
      let val = item[key];
      if (typeof val === 'object' && val !== null) {
        cleanItem[key] = JSON.stringify(val);
      } else {
        cleanItem[key] = val;
      }
    });
    return cleanItem;
  });

  let html = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">`;
  html += `<head><meta charset="utf-8" /><style>table { border-collapse: collapse; } td, th { border: 1px solid #e4e4e7; padding: 8px; font-family: sans-serif; }</style></head>`;
  html += `<body><table>`;
  
  // Headers
  const headers = Object.keys(cleanData[0]);
  html += `<tr style="background-color: #18181b; color: #ffffff; font-weight: bold;">`;
  headers.forEach(h => {
    html += `<th>${h.toUpperCase()}</th>`;
  });
  html += `</tr>`;

  // Rows
  cleanData.forEach(row => {
    html += `<tr>`;
    headers.forEach(h => {
      const val = row[h];
      html += `<td>${val === undefined || val === null ? '' : val}</td>`;
    });
    html += `</tr>`;
  });

  html += `</table></body></html>`;

  const blob = new Blob([html], { type: 'application/vnd.ms-excel' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${fileName}_${new Date().toISOString().split('T')[0]}.xls`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

