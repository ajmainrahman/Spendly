import { useState } from "react";
import { useListIncome, useListExpenses, useListLoans, useListSavingsGoals } from "@workspace/api-client-react";
import { formatBDT, getCurrentMonth, getMonthLabel, formatDate } from "@/lib/utils";
import MonthPicker from "@/components/MonthPicker";
import { Download, FileText, FileSpreadsheet, Loader2, CheckCircle } from "lucide-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

type DataType = "income" | "expenses" | "loans" | "savings";
type Format = "csv" | "pdf";

function downloadCSV(filename: string, headers: string[], rows: string[][]) {
  const escape = (v: string) => `"${v.replace(/"/g, '""')}"`;
  const lines = [headers.map(escape).join(","), ...rows.map(r => r.map(escape).join(","))];
  const blob = new Blob(["\uFEFF" + lines.join("\r\n")], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function downloadPDF(title: string, filename: string, headers: string[], rows: string[][]) {
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  doc.setFontSize(16);
  doc.setTextColor(30, 30, 30);
  doc.text("Spendly — " + title, 14, 16);
  doc.setFontSize(9);
  doc.setTextColor(120, 120, 120);
  doc.text(`Generated on ${new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "long", year: "numeric" })}`, 14, 22);

  autoTable(doc, {
    startY: 28,
    head: [headers],
    body: rows,
    styles: { fontSize: 8, cellPadding: 3 },
    headStyles: { fillColor: [16, 185, 129], textColor: 255, fontStyle: "bold" },
    alternateRowStyles: { fillColor: [245, 250, 247] },
    margin: { left: 14, right: 14 },
  });

  doc.save(filename);
}

export default function Export() {
  const [month, setMonth] = useState(getCurrentMonth());
  const [dataType, setDataType] = useState<DataType>("income");
  const [format, setFormat] = useState<Format>("pdf");
  const [exported, setExported] = useState(false);

  const { data: income, isLoading: incomeLoading } = useListIncome({ month });
  const { data: expenses, isLoading: expensesLoading } = useListExpenses({ month });
  const { data: loans, isLoading: loansLoading } = useListLoans();
  const { data: savings, isLoading: savingsLoading } = useListSavingsGoals();

  const isLoading = incomeLoading || expensesLoading || loansLoading || savingsLoading;

  const tabs: { key: DataType; label: string; count: number }[] = [
    { key: "income", label: "Income", count: income?.length ?? 0 },
    { key: "expenses", label: "Expenses", count: expenses?.length ?? 0 },
    { key: "loans", label: "Loans", count: loans?.length ?? 0 },
    { key: "savings", label: "Savings Goals", count: savings?.length ?? 0 },
  ];

  function getTableData(): { headers: string[]; rows: string[][]; title: string; filename: string } {
    const label = getMonthLabel(month);
    if (dataType === "income") {
      return {
        title: `Income — ${label}`,
        filename: `spendly-income-${month}.${format}`,
        headers: ["Date", "Source", "Category", "Amount (৳)", "Notes"],
        rows: (income ?? []).map(e => [
          formatDate(e.date), e.source, e.categoryName,
          e.amount.toLocaleString("en-IN"), e.notes ?? "",
        ]),
      };
    }
    if (dataType === "expenses") {
      return {
        title: `Expenses — ${label}`,
        filename: `spendly-expenses-${month}.${format}`,
        headers: ["Date", "Description", "Category", "Amount (৳)", "Notes"],
        rows: (expenses ?? []).map(e => [
          formatDate(e.date), e.description, e.categoryName,
          e.amount.toLocaleString("en-IN"), e.notes ?? "",
        ]),
      };
    }
    if (dataType === "loans") {
      return {
        title: "All Loans",
        filename: `spendly-loans.${format}`,
        headers: ["Lender", "Amount (৳)", "Borrowed On", "Deadline", "Status", "Notes"],
        rows: (loans ?? []).map(l => [
          l.lenderName, l.amount.toLocaleString("en-IN"),
          formatDate(l.borrowedDate), formatDate(l.deadline),
          l.isPaid ? "Paid" : "Outstanding",
          l.notes ?? "",
        ]),
      };
    }
    return {
      title: "Savings Goals",
      filename: `spendly-savings.${format}`,
      headers: ["Goal", "Target (৳)", "Saved (৳)", "Progress", "Deadline", "Notes"],
      rows: (savings ?? []).map(g => [
        g.name, g.targetAmount.toLocaleString("en-IN"),
        g.currentAmount.toLocaleString("en-IN"),
        `${g.percentComplete}%`,
        g.deadline ? formatDate(g.deadline) : "—",
        g.notes ?? "",
      ]),
    };
  }

  function handleExport() {
    const { headers, rows, title, filename } = getTableData();
    if (rows.length === 0) return;

    if (format === "csv") {
      downloadCSV(filename, headers, rows);
    } else {
      downloadPDF(title, filename, headers, rows);
    }

    setExported(true);
    setTimeout(() => setExported(false), 3000);
  }

  const { headers, rows, title } = getTableData();
  const showMonthPicker = dataType === "income" || dataType === "expenses";

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Export Data</h1>
        <p className="text-sm text-muted-foreground">Download your financial data as PDF or CSV</p>
      </div>

      <div className="bg-card border border-card-border rounded-xl p-5 space-y-5">
        {/* Data type tabs */}
        <div>
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">What to export</p>
          <div className="flex flex-wrap gap-2">
            {tabs.map(tab => (
              <button
                key={tab.key}
                onClick={() => setDataType(tab.key)}
                className={`px-4 py-2 rounded-lg text-sm font-medium border transition-all ${
                  dataType === tab.key
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-background border-border text-foreground hover:border-primary/50"
                }`}
              >
                {tab.label}
                <span className={`ml-2 text-xs px-1.5 py-0.5 rounded-full ${
                  dataType === tab.key ? "bg-primary-foreground/20 text-primary-foreground" : "bg-muted text-muted-foreground"
                }`}>
                  {tab.count}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Month filter */}
        {showMonthPicker && (
          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">Month</p>
            <MonthPicker month={month} onChange={setMonth} />
          </div>
        )}

        {/* Format toggle */}
        <div>
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">Format</p>
          <div className="flex gap-2">
            <button
              onClick={() => setFormat("pdf")}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium border transition-all ${
                format === "pdf"
                  ? "bg-red-50 border-red-200 text-red-700 dark:bg-red-950/30 dark:border-red-800 dark:text-red-400"
                  : "bg-background border-border text-foreground hover:border-red-200"
              }`}
            >
              <FileText className="w-4 h-4" />
              PDF
            </button>
            <button
              onClick={() => setFormat("csv")}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium border transition-all ${
                format === "csv"
                  ? "bg-emerald-50 border-emerald-200 text-emerald-700 dark:bg-emerald-950/30 dark:border-emerald-800 dark:text-emerald-400"
                  : "bg-background border-border text-foreground hover:border-emerald-200"
              }`}
            >
              <FileSpreadsheet className="w-4 h-4" />
              CSV (Excel)
            </button>
          </div>
        </div>

        {/* Export button */}
        <div className="pt-1">
          <button
            onClick={handleExport}
            disabled={isLoading || rows.length === 0}
            className={`flex items-center gap-2.5 px-6 py-3 rounded-xl text-sm font-semibold transition-all ${
              exported
                ? "bg-emerald-500 text-white"
                : rows.length === 0
                ? "bg-muted text-muted-foreground cursor-not-allowed"
                : "bg-primary text-primary-foreground hover:bg-primary/90 active:scale-95"
            }`}
          >
            {isLoading ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> Loading data...</>
            ) : exported ? (
              <><CheckCircle className="w-4 h-4" /> Downloaded!</>
            ) : rows.length === 0 ? (
              <><Download className="w-4 h-4" /> No data for this period</>
            ) : (
              <><Download className="w-4 h-4" /> Download {format.toUpperCase()} — {rows.length} record{rows.length !== 1 ? "s" : ""}</>
            )}
          </button>
        </div>
      </div>

      {/* Preview table */}
      {rows.length > 0 && (
        <div className="bg-card border border-card-border rounded-xl overflow-hidden">
          <div className="px-5 py-3 border-b border-card-border flex items-center justify-between">
            <h2 className="text-sm font-semibold">{title} — Preview</h2>
            <span className="text-xs text-muted-foreground">{rows.length} record{rows.length !== 1 ? "s" : ""}</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-muted/50">
                  {headers.map(h => (
                    <th key={h} className="text-left px-4 py-2.5 font-semibold text-muted-foreground uppercase tracking-wide text-[10px]">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {rows.slice(0, 10).map((row, i) => (
                  <tr key={i} className="hover:bg-muted/30 transition-colors">
                    {row.map((cell, j) => (
                      <td key={j} className="px-4 py-2.5 text-foreground">{cell || "—"}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
            {rows.length > 10 && (
              <div className="px-4 py-2.5 text-xs text-muted-foreground border-t border-border">
                + {rows.length - 10} more rows in the exported file
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
