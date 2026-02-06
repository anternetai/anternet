interface CsvColumn<T> {
  header: string
  accessor: (row: T) => string | number | null | undefined
}

export function exportToCsv<T>(
  data: T[],
  columns: CsvColumn<T>[],
  filename: string
) {
  const header = columns.map((c) => c.header).join(",")
  const rows = data.map((row) =>
    columns
      .map((col) => {
        const val = col.accessor(row)
        if (val == null) return ""
        const str = String(val)
        if (str.includes(",") || str.includes('"') || str.includes("\n")) {
          return `"${str.replace(/"/g, '""')}"`
        }
        return str
      })
      .join(",")
  )

  const csv = [header, ...rows].join("\n")
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" })
  const url = URL.createObjectURL(blob)
  const link = document.createElement("a")
  link.href = url
  link.download = `${filename}.csv`
  link.click()
  URL.revokeObjectURL(url)
}
