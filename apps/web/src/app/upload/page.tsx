'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Upload, FileText, Loader2 } from 'lucide-react';
import { api } from '@/lib/api';

export default function UploadPage() {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async () => {
    if (!file) return;
    setSubmitting(true);
    setError(null);
    try {
      const sign = await api.signUpload({
        fileName: file.name,
        mimeType: file.type,
        fileSize: file.size,
      });
      await api.upload(sign.uploadUrl, file);
      const job = await api.createJob({
        fileKey: sign.fileKey,
        fileName: file.name,
        fileSize: file.size,
        mimeType: file.type,
        settings: { color: false, duplex: false, copies: 1, paperSize: 'A4' },
      });
      router.push(`/jobs/${job.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'upload_failed');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col px-6 py-10">
      <h1 className="text-2xl font-bold">Upload your file</h1>
      <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
        PDF, PNG, JPG, or DOCX. Up to 50 MB.
      </p>

      <label className="mt-8 grid cursor-pointer place-items-center rounded-2xl border-2 border-dashed border-slate-300 px-6 py-12 text-center dark:border-slate-700">
        <input
          type="file"
          className="hidden"
          accept=".pdf,.png,.jpg,.jpeg,.docx"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
        />
        {file ? (
          <div className="flex items-center gap-3">
            <FileText className="h-6 w-6 text-brand" />
            <div className="text-left">
              <p className="font-medium">{file.name}</p>
              <p className="text-xs text-slate-500">
                {(file.size / 1024 / 1024).toFixed(2)} MB
              </p>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2 text-slate-500">
            <Upload className="h-8 w-8" />
            <span className="text-sm">Tap to choose a file</span>
          </div>
        )}
      </label>

      {error && <p className="mt-4 text-sm text-rose-500">{error}</p>}

      <button
        onClick={onSubmit}
        disabled={!file || submitting}
        className="mt-8 flex items-center justify-center gap-2 rounded-xl bg-brand py-4 font-semibold text-white shadow-lg shadow-brand/30 transition active:scale-[0.98] disabled:opacity-50"
      >
        {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
        Continue
      </button>
    </main>
  );
}
