import { useRef, useState } from 'react';
import { isAxiosError } from 'axios';
import { CircleNotch, DownloadSimple, UploadSimple } from '@phosphor-icons/react';
import { downloadProviderImportTemplate, type ProviderImportResult } from '@/api/hyperlocal';
import { useImportWorkers } from '@/hooks/useHyperlocal';
import { Button } from '@/components/ui/button';
import { SectionCard } from '@/components/shared/SectionCard';

const errorMessage = (error: unknown, fallback: string) => isAxiosError<{ error?: { message?: string } }>(error) ? error.response?.data?.error?.message || fallback : fallback;

export const ProviderExcelImport = ({ disabled, onImported }: { disabled?: boolean; onImported: () => void }) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState('');
  const [error, setError] = useState('');
  const [result, setResult] = useState<ProviderImportResult | null>(null);
  const [downloading, setDownloading] = useState(false);
  const importWorkers = useImportWorkers();
  const busy = disabled || importWorkers.isPending;
  const issues = result?.rows.filter((row) => row.status !== 'created') || [];

  const upload = async (file?: File) => {
    if (!file || busy) return;
    setFileName(file.name);
    setResult(null);
    setError('');
    if (!/\.xlsx$/i.test(file.name)) {
      setError('Choose an Excel .xlsx file. Convert older .xls files using Save As in Excel.');
      if (inputRef.current) inputRef.current.value = '';
      return;
    }
    if (!file.size || file.size > 25 * 1024 * 1024) {
      setError('Choose a non-empty Excel file, up to 25 MB.');
      if (inputRef.current) inputRef.current.value = '';
      return;
    }
    try {
      const imported = await importWorkers.mutateAsync(file);
      setResult(imported);
      if (imported.created) onImported();
    } catch (uploadError) {
      setError(errorMessage(uploadError, 'Could not import this file. Try again; existing phone numbers will be skipped.'));
    } finally {
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  const downloadTemplate = async () => {
    setDownloading(true);
    setError('');
    try {
      const blob = await downloadProviderImportTemplate();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'Service_Providers_Import.xlsx';
      document.body.appendChild(link);
      link.click();
      link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch {
      setError('Could not download the template. Please try again.');
    } finally { setDownloading(false); }
  };

  return (
    <SectionCard title="Import providers from Excel">
      <div className="space-y-3" aria-busy={importWorkers.isPending}>
        <p className="text-sm text-muted-foreground">Upload your filled Excel file to add providers directly. Existing phone numbers are skipped.</p>
        <p className="text-xs leading-relaxed text-muted-foreground">Columns: Provider Name, Phone, WhatsApp, City / Location, Service Categories, Service Areas.</p>
        <p className="text-xs leading-relaxed text-muted-foreground">City and category names must already exist and be active. WhatsApp and Service Areas are optional. Separate multiple categories or areas with commas.</p>
        <div className="flex flex-wrap items-center gap-3">
          <input ref={inputRef} type="file" accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" className="hidden" aria-label="Choose provider Excel file" onChange={(event) => void upload(event.target.files?.[0])} disabled={busy} />
          <Button type="button" className="min-h-11" disabled={busy} onClick={() => inputRef.current?.click()}>
            {importWorkers.isPending ? <CircleNotch aria-hidden="true" className="animate-spin" /> : <UploadSimple aria-hidden="true" />}
            {importWorkers.isPending ? 'Importing providers...' : 'Upload Excel'}
          </Button>
          <Button type="button" variant="outline" className="min-h-11" disabled={downloading || busy} onClick={() => void downloadTemplate()}>
            <DownloadSimple aria-hidden="true" /> {downloading ? 'Downloading...' : 'Download template'}
          </Button>
          <span className="text-xs text-muted-foreground">.xlsx · Up to 25 MB · 10,000 providers per file</span>
        </div>
        {fileName && <p className="break-all text-xs text-muted-foreground">File: {fileName}</p>}
        {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
        {importWorkers.isPending && <p role="status" className="text-sm text-muted-foreground">Checking rows and adding providers. Please keep this page open.</p>}
        {result && (
          <div className="space-y-3 border-t pt-3">
            <p role="status" className="text-sm font-medium">{result.created} added · {result.skipped} skipped · {result.failed} rows need correction · {result.total} total</p>
            {result.failed > 0 && <p className="text-xs text-muted-foreground">Correct the rows below and upload again. Providers already added will be skipped.</p>}
            {issues.length > 0 && (
              <details open={result.failed > 0}>
                <summary className="min-h-11 cursor-pointer py-3 text-sm font-medium">View skipped rows and errors ({issues.length})</summary>
                <div className="max-h-72 overflow-auto rounded-md border">
                  <table className="w-full text-left text-sm" aria-label="Excel import row results">
                    <thead className="sticky top-0 bg-muted">
                      <tr>{['Excel row', 'Provider', 'Phone', 'Result', 'Reason'].map((heading) => <th key={heading} scope="col" className="whitespace-nowrap px-3 py-2 font-medium">{heading}</th>)}</tr>
                    </thead>
                    <tbody>
                      {issues.map((row) => (
                        <tr key={row.rowNumber} className="border-t">
                          <td className="px-3 py-2 align-top">{row.rowNumber}</td>
                          <td className="min-w-36 max-w-64 break-words px-3 py-2 align-top">{row.name || 'Unnamed provider'}</td>
                          <td className="whitespace-nowrap px-3 py-2 align-top">{row.phone || '-'}</td>
                          <td className={`whitespace-nowrap px-3 py-2 align-top ${row.status === 'error' ? 'text-destructive' : 'text-muted-foreground'}`}>{row.status === 'error' ? 'Fix row' : 'Skipped'}</td>
                          <td className="min-w-56 px-3 py-2 align-top text-muted-foreground">{row.message}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </details>
            )}
          </div>
        )}
      </div>
    </SectionCard>
  );
};
