"use client"

import { useState, useCallback, useRef } from "react"
import { Upload, FileSpreadsheet, Loader2, CheckCircle2, AlertCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

// Client-side CSV parser that handles quoted fields
function parseCSV(text: string): string[][] {
  const rows: string[][] = []
  let current = ""
  let inQuotes = false
  let row: string[] = []

  for (let i = 0; i < text.length; i++) {
    const char = text[i]
    if (char === '"') {
      if (inQuotes && text[i + 1] === '"') {
        current += '"'
        i++
      } else {
        inQuotes = !inQuotes
      }
    } else if (char === "," && !inQuotes) {
      row.push(current.trim())
      current = ""
    } else if ((char === "\n" || char === "\r") && !inQuotes) {
      if (char === "\r" && text[i + 1] === "\n") i++
      row.push(current.trim())
      current = ""
      if (row.some((cell) => cell)) rows.push(row)
      row = []
    } else {
      current += char
    }
  }
  row.push(current.trim())
  if (row.some((cell) => cell)) rows.push(row)
  return rows
}

type MappableField = "name" | "phone" | "email" | "notes" | "skip"

const FIELD_OPTIONS: { value: MappableField; label: string }[] = [
  { value: "skip", label: "Skip" },
  { value: "name", label: "Name (required)" },
  { value: "phone", label: "Phone" },
  { value: "email", label: "Email" },
  { value: "notes", label: "Notes" },
]

// Common header names that auto-map to fields
const AUTO_MAP: Record<string, MappableField> = {
  name: "name",
  "full name": "name",
  "full_name": "name",
  "contact name": "name",
  "contact": "name",
  "company": "name",
  "business name": "name",
  "business_name": "name",
  phone: "phone",
  telephone: "phone",
  "phone number": "phone",
  "phone_number": "phone",
  mobile: "phone",
  cell: "phone",
  email: "email",
  "email address": "email",
  "email_address": "email",
  "e-mail": "email",
  notes: "notes",
  note: "notes",
  comments: "notes",
  comment: "notes",
  description: "notes",
}

interface CsvUploadProps {
  onImportComplete: () => void
}

type Step = "upload" | "mapping" | "importing" | "done"

export function CsvUpload({ onImportComplete }: CsvUploadProps) {
  const [open, setOpen] = useState(false)
  const [step, setStep] = useState<Step>("upload")
  const [csvRows, setCsvRows] = useState<string[][]>([])
  const [headers, setHeaders] = useState<string[]>([])
  const [columnMap, setColumnMap] = useState<MappableField[]>([])
  const [isDragOver, setIsDragOver] = useState(false)
  const [importResult, setImportResult] = useState<{
    imported: number
    errors: string[]
  } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  function resetState() {
    setStep("upload")
    setCsvRows([])
    setHeaders([])
    setColumnMap([])
    setImportResult(null)
    setError(null)
    setIsDragOver(false)
  }

  function handleOpenChange(isOpen: boolean) {
    setOpen(isOpen)
    if (!isOpen) resetState()
  }

  function processFile(file: File) {
    if (!file.name.toLowerCase().endsWith(".csv")) {
      setError("Please upload a .csv file")
      return
    }

    setError(null)
    const reader = new FileReader()
    reader.onload = (e) => {
      const text = e.target?.result as string
      const rows = parseCSV(text)

      if (rows.length < 2) {
        setError("CSV must have a header row and at least one data row")
        return
      }

      const hdrs = rows[0]
      setHeaders(hdrs)
      setCsvRows(rows.slice(1))

      // Auto-detect column mapping
      const mapping = hdrs.map((h) => {
        const normalized = h.toLowerCase().trim()
        return AUTO_MAP[normalized] ?? "skip"
      })
      setColumnMap(mapping)
      setStep("mapping")
    }
    reader.onerror = () => setError("Failed to read file")
    reader.readAsText(file)
  }

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) processFile(file)
  }

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
    const file = e.dataTransfer.files[0]
    if (file) processFile(file)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault()
    setIsDragOver(true)
  }

  function handleDragLeave(e: React.DragEvent) {
    e.preventDefault()
    setIsDragOver(false)
  }

  function updateMapping(index: number, value: MappableField) {
    setColumnMap((prev) => {
      const next = [...prev]
      next[index] = value
      return next
    })
  }

  const hasNameColumn = columnMap.includes("name")
  const previewRows = csvRows.slice(0, 3)

  async function handleImport() {
    if (!hasNameColumn) return

    setStep("importing")
    setError(null)

    try {
      // Build prospect objects from mapped columns
      const nameIdx = columnMap.indexOf("name")
      const phoneIdx = columnMap.indexOf("phone")
      const emailIdx = columnMap.indexOf("email")
      const notesIdx = columnMap.indexOf("notes")

      const prospects = csvRows
        .map((row) => {
          const name = row[nameIdx]?.trim()
          if (!name) return null
          return {
            name,
            phone: phoneIdx >= 0 ? row[phoneIdx]?.trim() || null : null,
            email: emailIdx >= 0 ? row[emailIdx]?.trim() || null : null,
            notes: notesIdx >= 0 ? row[notesIdx]?.trim() || null : null,
          }
        })
        .filter(Boolean)

      if (prospects.length === 0) {
        setError("No valid rows found (all rows missing name)")
        setStep("mapping")
        return
      }

      // Build FormData with the original file remapped as a proper CSV
      // Or send as JSON to a dedicated JSON endpoint
      // We'll construct a CSV string from the mapped data and upload via FormData
      const csvHeader = "name,phone,email,notes"
      const csvBody = prospects
        .map((p) => {
          if (!p) return ""
          const escape = (v: string | null) => {
            if (!v) return ""
            if (v.includes(",") || v.includes('"') || v.includes("\n")) {
              return `"${v.replace(/"/g, '""')}"`
            }
            return v
          }
          return [escape(p.name), escape(p.phone), escape(p.email), escape(p.notes)].join(",")
        })
        .filter(Boolean)
        .join("\n")

      const csvString = `${csvHeader}\n${csvBody}`
      const blob = new Blob([csvString], { type: "text/csv" })
      const formData = new FormData()
      formData.append("file", blob, "import.csv")

      const res = await fetch("/api/portal/admin/prospects", {
        method: "POST",
        body: formData,
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || "Import failed")
        setStep("mapping")
        return
      }

      setImportResult({
        imported: data.imported ?? 0,
        errors: data.errors ?? [],
      })
      setStep("done")
      onImportComplete()
    } catch {
      setError("Something went wrong during import")
      setStep("mapping")
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button size="sm">
          <Upload className="mr-1.5 size-3.5" />
          Upload CSV
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Import Prospects</DialogTitle>
          <DialogDescription>
            Upload a CSV file with prospect data. Map columns and confirm before importing.
          </DialogDescription>
        </DialogHeader>

        {/* Step 1: File Upload */}
        {step === "upload" && (
          <div className="space-y-4">
            <div
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onClick={() => fileInputRef.current?.click()}
              className={`flex cursor-pointer flex-col items-center gap-3 rounded-lg border-2 border-dashed p-8 transition-colors ${
                isDragOver
                  ? "border-primary bg-primary/5"
                  : "border-muted-foreground/25 hover:border-muted-foreground/50"
              }`}
            >
              <FileSpreadsheet className="size-10 text-muted-foreground" />
              <div className="text-center">
                <p className="text-sm font-medium">
                  Drop your CSV file here, or click to browse
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Accepts .csv files. Must include at least a Name column.
                </p>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                onChange={handleFileSelect}
                className="hidden"
              />
            </div>
            {error && (
              <p className="text-sm text-destructive">{error}</p>
            )}
          </div>
        )}

        {/* Step 2: Column Mapping */}
        {step === "mapping" && (
          <div className="space-y-4">
            <div className="space-y-3">
              <p className="text-sm font-medium">
                Map your CSV columns to prospect fields
              </p>
              <div className="grid gap-2">
                {headers.map((header, idx) => (
                  <div
                    key={idx}
                    className="flex items-center gap-3"
                  >
                    <span className="w-32 truncate text-sm text-muted-foreground" title={header}>
                      {header}
                    </span>
                    <span className="text-muted-foreground">→</span>
                    <Select
                      value={columnMap[idx]}
                      onValueChange={(v) => updateMapping(idx, v as MappableField)}
                    >
                      <SelectTrigger className="w-48">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {FIELD_OPTIONS.map((opt) => (
                          <SelectItem key={opt.value} value={opt.value}>
                            {opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                ))}
              </div>
            </div>

            {!hasNameColumn && (
              <p className="text-sm text-destructive">
                You must map at least one column to &quot;Name&quot;
              </p>
            )}

            {/* Data preview */}
            {previewRows.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground">
                  Preview ({csvRows.length} rows total)
                </p>
                <div className="overflow-auto rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        {headers.map((h, i) => (
                          <TableHead key={i} className="whitespace-nowrap text-xs">
                            {h}
                            {columnMap[i] !== "skip" && (
                              <span className="ml-1 text-primary">
                                ({columnMap[i]})
                              </span>
                            )}
                          </TableHead>
                        ))}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {previewRows.map((row, ri) => (
                        <TableRow key={ri}>
                          {headers.map((_, ci) => (
                            <TableCell key={ci} className="whitespace-nowrap text-xs">
                              {row[ci] || "—"}
                            </TableCell>
                          ))}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            )}

            {error && (
              <p className="text-sm text-destructive">{error}</p>
            )}

            <DialogFooter>
              <Button variant="outline" onClick={() => { resetState(); setStep("upload") }}>
                Back
              </Button>
              <Button onClick={handleImport} disabled={!hasNameColumn}>
                Import {csvRows.length} Prospects
              </Button>
            </DialogFooter>
          </div>
        )}

        {/* Step 3: Importing */}
        {step === "importing" && (
          <div className="flex flex-col items-center gap-4 py-8">
            <Loader2 className="size-8 animate-spin text-primary" />
            <p className="text-sm font-medium">Importing prospects...</p>
            <p className="text-xs text-muted-foreground">
              Processing {csvRows.length} rows
            </p>
          </div>
        )}

        {/* Step 4: Done */}
        {step === "done" && importResult && (
          <div className="space-y-4">
            <div className="flex flex-col items-center gap-3 py-6 text-center">
              <div className="flex size-12 items-center justify-center rounded-full bg-green-100 dark:bg-green-900">
                <CheckCircle2 className="size-6 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="font-medium">Import complete</p>
                <p className="text-sm text-muted-foreground">
                  Imported {importResult.imported} prospect{importResult.imported !== 1 ? "s" : ""}.
                  {importResult.errors.length > 0 && (
                    <span className="text-destructive">
                      {" "}{importResult.errors.length} error{importResult.errors.length !== 1 ? "s" : ""}.
                    </span>
                  )}
                </p>
              </div>
            </div>

            {importResult.errors.length > 0 && (
              <div className="max-h-32 space-y-1 overflow-auto rounded-md border p-3">
                {importResult.errors.map((err, i) => (
                  <div key={i} className="flex items-start gap-2 text-xs">
                    <AlertCircle className="mt-0.5 size-3 shrink-0 text-destructive" />
                    <span className="text-muted-foreground">{err}</span>
                  </div>
                ))}
              </div>
            )}

            <DialogFooter>
              <Button variant="outline" onClick={() => handleOpenChange(false)}>
                Done
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
