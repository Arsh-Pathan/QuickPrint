import { Users as UsersIcon } from 'lucide-react';

export default function UsersPage() {
  return (
    <div className="mx-auto max-w-7xl space-y-8 py-2">
      <header>
        <h1 className="text-[24px] font-normal text-[#202124]">Students & Users</h1>
        <p className="mt-1 text-[13px] text-[#5f6368]">
          Manage registered students and shop staff.
        </p>
      </header>

      <div className="google-card border-dashed !border-2">
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#f1f3f4] mb-4">
            <UsersIcon className="h-6 w-6 text-[#5f6368]" />
          </div>
          <h2 className="text-[15px] font-medium text-[#202124]">User Management</h2>
          <p className="mt-2 text-[13px] text-[#5f6368] max-w-md">
            This module is currently being configured. Future updates will allow you to view, verify, and moderate student accounts directly from this panel.
          </p>
        </div>
      </div>
    </div>
  );
}
