interface DataRow {
  [key: string]: string | number | null;
}

interface DataTableProps {
  data: DataRow[];
  maxRows?: number;
}

export default function DataTable({ data, maxRows = 50 }: DataTableProps) {
  const previewData = data.slice(0, maxRows);
  const columns = Object.keys(data[0] || {});

  return (
      <div className="data-table-wrapper">
        <h3 className="data-table-title">Dataset Preview (First {previewData.length} Rows)</h3>
        <div className="data-table-scroll">
          <table className="data-table">
            <thead>
            <tr>
              {columns.map(col => (
                  <th key={col}>{col}</th>
              ))}
            </tr>
            </thead>
            <tbody>
            {previewData.map((row, idx) => (
                <tr key={idx}>
                  {columns.map(col => (
                      <td key={col}>{row[col] ?? ''}</td>
                  ))}
                </tr>
            ))}
            </tbody>
          </table>
        </div>
      </div>
  );
}