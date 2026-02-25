'use client';

import DashboardLayout from '@/components/DashboardLayout';
import EntriesTable from './components/EntriesTable';

export default function EntriesPage() {
  return (
    <DashboardLayout>
      <div className="p-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-white mb-1" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
            Entries
          </h1>
          <p className="text-sm" style={{ color: '#475569' }}>
            All scanned check-in entries with export functionality
          </p>
        </div>
        <EntriesTable />
      </div>
    </DashboardLayout>
  );
}