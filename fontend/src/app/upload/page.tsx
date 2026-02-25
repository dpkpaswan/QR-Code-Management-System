'use client';

import DashboardLayout from '@/components/DashboardLayout';
import ExcelUploader from './components/ExcelUploader';
import EmailDispatch from './components/EmailDispatch';

export default function UploadPage() {
  return (
    <DashboardLayout>
      <div className="p-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-white mb-1" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
            Upload & Send
          </h1>
          <p className="text-sm" style={{ color: '#475569' }}>
            Import participants from Excel and dispatch QR code emails
          </p>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          <ExcelUploader />
          <EmailDispatch />
        </div>
      </div>
    </DashboardLayout>
  );
}