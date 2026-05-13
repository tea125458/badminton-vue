import * as XLSX from 'xlsx'
import Swal from 'sweetalert2'

/**
 * 導出功能 Composable
 * 負責處理將資料轉換為 JSON, EXCEL, PDF 格式並觸發下載或列印
 */
export function useExport() {
  const exportData = (dataToExport, format) => {
    if (!dataToExport || dataToExport.length === 0) {
      Swal.fire({ icon: 'warning', title: '目前沒有資料可以導出' })
      return
    }

    const timestamp = new Date().toISOString().split('T')[0] // 取得今天日期作為檔名

    if (format === 'JSON') {
      // 【導出 JSON】
      const dataStr = JSON.stringify(dataToExport, null, 2)
      const blob = new Blob([dataStr], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `揪團名單_${timestamp}.json`
      link.click()
      URL.revokeObjectURL(url)
    } else if (format === 'EXCEL') {
      // 【導出 Excel】
      const worksheet = XLSX.utils.json_to_sheet(dataToExport)
      const workbook = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(workbook, worksheet, '揪團名單')
      XLSX.writeFile(workbook, `揪團名單_${timestamp}.xlsx`)
    } else if (format === 'PDF') {
      // 【導出 PDF (原生列印解法，完美支援中文)】
      const printWindow = window.open('', '_blank')
      const html = `
        <!DOCTYPE html>
        <html>
        <head>
          <title>揪團名單_${timestamp}</title>
          <style>
            body { 
              font-family: "Helvetica Neue", Helvetica, Arial, "PingFang SC", "Heiti TC", "Microsoft JhengHei", sans-serif; 
              padding: 20px; 
              color: #333;
            }
            h2 { text-align: center; margin-bottom: 20px; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th, td { border: 1px solid #dee2e6; padding: 12px; text-align: left; font-size: 14px; }
            th { background-color: #0d6efd; color: white; }
            tr:nth-child(even) { background-color: #f8f9fa; }
          </style>
        </head>
        <body>
          <h2>揪團名單 (${timestamp})</h2>
          <table>
            <thead>
              <tr>${Object.keys(dataToExport[0]).map((key) => `<th>${key}</th>`).join('')}</tr>
            </thead>
            <tbody>
              ${dataToExport.map((row) => `<tr>${Object.values(row).map((val) => `<td>${val}</td>`).join('')}</tr>`).join('')}
            </tbody>
          </table>
          <script>
            window.onload = function() {
              window.print();
              setTimeout(function() { window.close(); }, 500);
            }
          </script>
        </body>
        </html>
      `
      printWindow.document.write(html)
      printWindow.document.close()
    }
  }

  return {
    exportData
  }
}
