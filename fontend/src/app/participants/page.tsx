'use client';

import DashboardLayout from '@/components/DashboardLayout';
import ParticipantsTable from './components/ParticipantsTable';

export default function ParticipantsPage() {
  return (
    <DashboardLayout>
      <div className="p-4 lg:p-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-white mb-1" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
            Participants
          </h1>
          <p className="text-sm" style={{ color: '#475569' }}>
            View, search, and manage all registered participants
          </p>
        </div>
        <ParticipantsTable />
      </div>
    </DashboardLayout>
  );
}