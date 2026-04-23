'use client';

import React from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import SecuritySettings from '@/components/SecuritySettings';

export default function SecurityPage() {
    return (
        <DashboardLayout>
            <div className="py-6">
                <SecuritySettings />
            </div>
        </DashboardLayout>
    );
}
