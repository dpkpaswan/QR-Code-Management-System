'use client';

import { useState, useRef, useCallback } from 'react';
import { UploadCloud, File as FileIcon, AlertCircle, FileSpreadsheet } from 'lucide-react';
import { api } from '@/lib/api';

interface ParsedParticipant {
  participant_id: string;
  name: string;
  college_name: string;
  email: string;
}

const REQUIRED_COLUMNS = ['PARTICIPANT ID', 'PARTICIPANT NAME', 'COLLEGE NAME', 'MAIL ID'];

export default function ExcelUploader() {
  const [dragging, setDragging] = useState(false);
  const [parsed, setParsed] = useState<ParsedParticipant[] | null>(null);
  const [parseError, setParseError] = useState('');
  const [errorDetail, setErrorDetail] = useState('');
  const [fileName, setFileName] = useState('');
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState('');
  const [uploadResult, setUploadResult] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);
  const selectedFileRef = useRef<globalThis.File | null>(null);

  const parseFile = useCallback(async (file: globalThis.File) => {
    setParseError('');
    setParsed(null);
    setUploadResult('');

    if (!file.name.endsWith('.xlsx') && !file.name.endsWith('.xls')) {
      setParseError('Invalid file type. Please upload an .xlsx file.');
      return;
    }

    setFileName(file.name);
    selectedFileRef.current = file;

    try {
      // Fix: import the module namespace (some setups don't expose .default)
      const XLSX = await import('xlsx');

      const buffer = await file.arrayBuffer();
      const wb = XLSX.read(new Uint8Array(buffer), { type: 'array' });

      if (!wb || !wb.SheetNames || wb.SheetNames.length === 0) {
        setParseError('Failed to parse file. Empty workbook.');
        return;
      }

      const ws = wb.Sheets[wb.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, { defval: '' });

      if (rows.length === 0) {
        setParseError('The file appears to be empty.');
        return;
      }

      // Check headers
      const headers = Object.keys(rows[0]).map((h) => h.trim().toUpperCase());
      const missing = REQUIRED_COLUMNS.filter((col) => !headers.includes(col));
      if (missing.length > 0) {
        setParseError(`Invalid Excel format. Missing columns: ${missing.join(', ')}`);
        return;
      }

      const participants: ParsedParticipant[] = rows
        .map((row) => {
          const getVal = (key: string) => {
            const found = Object.entries(row).find(
              ([k]) => k.trim().toUpperCase() === key
            );
            return found ? String(found[1]).trim() : '';
          };
          return {
            participant_id: getVal('PARTICIPANT ID'),
            name: getVal('PARTICIPANT NAME'),
            college_name: getVal('COLLEGE NAME'),
            email: getVal('MAIL ID'),
          };
        })
        .filter((p) => p.participant_id && p.name);

      setParsed(participants);
    } catch (err: any) {
      console.error('Excel parse error:', err);
      setErrorDetail(err?.stack || String(err));
      setParseError(err?.message || 'Failed to parse file.');
    }
  }, []);

  const handleForceUpload = async () => {
    if (!selectedFileRef.current) return;
    setUploading(true);
    setUploadResult('');
    try {
      const formData = new FormData();
      formData.append('file', selectedFileRef.current);
      const res = await api.uploadParticipants(formData);
      const data = await res.json();
      if (res.ok) setUploadResult(`✅ ${data.message || `${data.total} participants uploaded successfully`}`);
      else setUploadResult(`❌ ${data.error || 'Upload failed on server'}`);
    } catch (e: any) {
      setUploadResult(`❌ Network or server error: ${e?.message || String(e)}`);
    } finally {
      setUploading(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) parseFile(file);
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) parseFile(file);
  };

  const handleUpload = async () => {
    if (!selectedFileRef.current) return;
    setUploading(true);
    setUploadResult('');
    setUploadProgress('Uploading to server...');

    try {
      const formData = new FormData();
      formData.append('file', selectedFileRef.current);

      const res = await api.uploadParticipants(formData);
      const data = await res.json();

      if (res.ok) {
        setUploadResult(`✅ ${data.message || `${data.total} participants uploaded successfully`}`);
      } else {
        setUploadResult(`❌ ${data.error || 'Upload failed'}`);
      }
    } catch {
      setUploadResult('❌ Network error. Please try again.');
    } finally {
      setUploading(false);
      setUploadProgress('');
    }
  };

  return (
    <div className="glass-card p-6 rounded-2xl">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'rgba(59,130,246,0.15)', border: '1px solid rgba(59,130,246,0.3)' }}>
          <FileSpreadsheet size={16} style={{ color: '#3B82F6' }} />
        </div>
        <h2 className="font-semibold text-white" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>Upload Participants Excel</h2>
      </div>

      {/* Drop Zone */}
      <div
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        onClick={() => fileRef.current?.click()}
        className="relative rounded-xl cursor-pointer transition-all duration-300 flex flex-col items-center justify-center py-8 sm:py-12 mb-4"
        style={{ border: `2px dashed ${dragging ? 'rgba(59,130,246,0.7)' : 'rgba(59,130,246,0.2)'}`, background: dragging ? 'rgba(59,130,246,0.05)' : 'rgba(15,15,30,0.4)', boxShadow: dragging ? '0 0 20px rgba(59,130,246,0.1)' : 'none' }}
      >
        <UploadCloud size={40} className="mb-3" style={{ color: dragging ? '#3B82F6' : '#334155' }} />
        <p className="font-medium mb-1" style={{ color: '#94A3B8' }}>Drag & drop .xlsx file here</p>
        <p className="text-xs" style={{ color: '#475569' }}>or click to browse</p>
        {fileName && (
          <div className="mt-4 flex items-center gap-2 px-3 py-1.5 rounded-lg" style={{ background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.2)' }}>
            <FileIcon size={14} style={{ color: '#3B82F6' }} />
            <span className="text-xs" style={{ color: '#3B82F6' }}>{fileName}</span>
          </div>
        )}
        <input ref={fileRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={handleFileInput} />
      </div>

      <p className="text-xs mb-6" style={{ color: '#334155' }}>Required columns: {REQUIRED_COLUMNS.join(' · ')}</p>

      {parseError && (
        <div className="flex items-start gap-3 px-4 py-3 rounded-xl mb-4" style={{ background: 'rgba(244,63,94,0.08)', border: '1px solid rgba(244,63,94,0.25)' }}>
          <AlertCircle size={16} className="text-rose-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm text-rose-400">{parseError}</p>
            {errorDetail && <pre className="mt-2 text-xs text-rose-200 max-h-36 overflow-auto" style={{ whiteSpace: 'pre-wrap' }}>{errorDetail}</pre>}
          </div>
        </div>
      )}

      {parsed && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-medium" style={{ color: '#10B981' }}>✅ {parsed.length} participants found in file</p>
            <span className="text-xs" style={{ color: '#475569' }}>Showing first 10 rows</span>
          </div>

          <div className="-mx-4 px-4 sm:mx-0 sm:px-0" style={{ WebkitOverflowScrolling: 'touch' }}>
            <div className="rounded-xl overflow-hidden mb-4" style={{ border: '1px solid rgba(59,130,246,0.1)' }}>
              <div className="overflow-x-auto max-h-64">
                <table className="w-full data-table min-w-[500px]">
                  <thead style={{ background: 'rgba(10,10,20,0.8)' }}>
                    <tr>
                      <th>Participant ID</th>
                      <th>Name</th>
                      <th>College</th>
                      <th>Email</th>
                    </tr>
                  </thead>
                  <tbody>
                    {parsed.slice(0, 10).map((p, i) => (
                      <tr key={i}>
                        <td style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '11px', color: '#3B82F6' }}>{p.participant_id}</td>
                        <td style={{ color: '#F1F5F9' }}>{p.name}</td>
                        <td style={{ color: '#94A3B8' }}>{p.college_name}</td>
                        <td style={{ color: '#475569', fontSize: '11px' }}>{p.email}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {uploadProgress && <div className="flex items-center gap-3 px-4 py-3 rounded-xl mb-4" style={{ background: 'rgba(59,130,246,0.08)', border: '1px solid rgba(59,130,246,0.2)' }}>
            <span className="w-4 h-4 border-2 border-blue-400 border-t-transparent rounded-full animate-spin flex-shrink-0" />
            <p className="text-sm" style={{ color: '#3B82F6' }}>{uploadProgress}</p>
          </div>}

          {uploadResult && <div className="px-4 py-3 rounded-xl mb-4" style={{ background: uploadResult.startsWith('✅') ? 'rgba(16,185,129,0.08)' : 'rgba(244,63,94,0.08)', border: uploadResult.startsWith('✅') ? '1px solid rgba(16,185,129,0.25)' : '1px solid rgba(244,63,94,0.25)' }}>
            <p className="text-sm" style={{ color: uploadResult.startsWith('✅') ? '#10B981' : '#F43F5E' }}>{uploadResult}</p>
          </div>}

          {selectedFileRef.current && <div className="mb-4"><button onClick={handleForceUpload} disabled={uploading} className="w-full py-2 rounded-lg font-medium text-sm text-white btn-glow disabled:opacity-50 disabled:cursor-not-allowed" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>{uploading ? 'UPLOADING...' : 'Try upload file to server (skip preview)'}</button></div>}

          <button onClick={handleUpload} disabled={uploading} className="w-full py-3 rounded-xl font-semibold text-sm text-white btn-glow disabled:opacity-50 disabled:cursor-not-allowed tracking-wide" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>{uploading ? 'UPLOADING...' : `UPLOAD ${parsed.length} PARTICIPANTS TO DATABASE`}</button>
        </div>
      )}
    </div>
  );
}