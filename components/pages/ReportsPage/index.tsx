'use client';

import React, { useState, useCallback } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { reportsApi } from '@/lib/api/reports';
import { PaymentReportTable } from './PaymentReportTable';
import { EnrollmentReportTable } from './EnrollmentReportTable';
import { EntryActivityReportTable } from './EntryActivityReportTable';
import { ReportFilterBar } from './ReportFilterBar';
import type { PaymentReportData, EnrollmentReportData, EntryActivityReportData } from '@/lib/api/reports';

interface ReportsPageProps {
  userRole?: 'admin' | 'staff' | 'student' | 'accountant';
}

export const ReportsPage: React.FC<ReportsPageProps> = ({ userRole = 'admin' }) => {
  // Payment Report State
  const [paymentData, setPaymentData] = useState<PaymentReportData[]>([]);
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [paymentExporting, setPaymentExporting] = useState(false);
  const [paymentStartDate, setPaymentStartDate] = useState<string>();
  const [paymentEndDate, setPaymentEndDate] = useState<string>();

  // Enrollment Report State
  const [enrollmentData, setEnrollmentData] = useState<EnrollmentReportData[]>(
    []
  );
  const [enrollmentLoading, setEnrollmentLoading] = useState(false);
  const [enrollmentExporting, setEnrollmentExporting] = useState(false);
  const [enrollmentStartDate, setEnrollmentStartDate] = useState<string>();
  const [enrollmentEndDate, setEnrollmentEndDate] = useState<string>();

  // Entry Activity Report State
  const [entryActivityData, setEntryActivityData] = useState<EntryActivityReportData[]>([]);
  const [entryActivityLoading, setEntryActivityLoading] = useState(false);
  const [entryActivityExporting, setEntryActivityExporting] = useState(false);
  const [entryActivityStartDate, setEntryActivityStartDate] = useState<string>();
  const [entryActivityEndDate, setEntryActivityEndDate] = useState<string>();

  // Payment Report Handlers
  const handlePaymentFilter = useCallback(
    async (startDate?: string, endDate?: string) => {
      try {
        setPaymentLoading(true);
        setPaymentStartDate(startDate);
        setPaymentEndDate(endDate);

        const response = await reportsApi.getPaymentReport(startDate, endDate);

        if (response.success) {
          setPaymentData(response.data);
          toast.success(`Loaded ${response.count} payment records`);
        } else {
          toast.error('Failed to load payment report');
        }
      } catch (error) {
        console.error('Error loading payment report:', error);
        toast.error('Error loading payment report');
      } finally {
        setPaymentLoading(false);
      }
    },
    []
  );

  const handleExportPaymentCSV = useCallback(async () => {
    try {
      setPaymentExporting(true);
      await reportsApi.exportPaymentReportCSV(
        paymentStartDate,
        paymentEndDate
      );
      toast.success('Payment report exported as CSV');
    } catch (error) {
      console.error('Error exporting payment report:', error);
      toast.error('Error exporting payment report');
    } finally {
      setPaymentExporting(false);
    }
  }, [paymentStartDate, paymentEndDate]);

  const handleExportPaymentPDF = useCallback(async () => {
    try {
      setPaymentExporting(true);
      await reportsApi.exportPaymentReportPDF(
        paymentStartDate,
        paymentEndDate
      );
      toast.success('Payment report exported as PDF');
    } catch (error) {
      console.error('Error exporting payment report:', error);
      toast.error('Error exporting payment report');
    } finally {
      setPaymentExporting(false);
    }
  }, [paymentStartDate, paymentEndDate]);

  // Enrollment Report Handlers
  const handleEnrollmentFilter = useCallback(
    async (startDate?: string, endDate?: string) => {
      try {
        setEnrollmentLoading(true);
        setEnrollmentStartDate(startDate);
        setEnrollmentEndDate(endDate);

        const response = await reportsApi.getEnrollmentReport(startDate, endDate);

        if (response.success) {
          setEnrollmentData(response.data);
          toast.success(`Loaded ${response.count} enrollment records`);
        } else {
          toast.error('Failed to load enrollment report');
        }
      } catch (error) {
        console.error('Error loading enrollment report:', error);
        toast.error('Error loading enrollment report');
      } finally {
        setEnrollmentLoading(false);
      }
    },
    []
  );

  const handleExportEnrollmentCSV = useCallback(async () => {
    try {
      setEnrollmentExporting(true);
      await reportsApi.exportEnrollmentReportCSV(
        enrollmentStartDate,
        enrollmentEndDate
      );
      toast.success('Enrollment report exported as CSV');
    } catch (error) {
      console.error('Error exporting enrollment report:', error);
      toast.error('Error exporting enrollment report');
    } finally {
      setEnrollmentExporting(false);
    }
  }, [enrollmentStartDate, enrollmentEndDate]);

  const handleExportEnrollmentPDF = useCallback(async () => {
    try {
      setEnrollmentExporting(true);
      await reportsApi.exportEnrollmentReportPDF(
        enrollmentStartDate,
        enrollmentEndDate
      );
      toast.success('Enrollment report exported as PDF');
    } catch (error) {
      console.error('Error exporting enrollment report:', error);
      toast.error('Error exporting enrollment report');
    } finally {
      setEnrollmentExporting(false);
    }
  }, [enrollmentStartDate, enrollmentEndDate]);

  // Entry Activity Report Handlers
  const handleEntryActivityFilter = useCallback(
    async (startDate?: string, endDate?: string) => {
      try {
        setEntryActivityLoading(true);
        setEntryActivityStartDate(startDate);
        setEntryActivityEndDate(endDate);

        const response = await reportsApi.getEntryActivityReport(startDate, endDate);

        if (response.success) {
          setEntryActivityData(response.data);
          toast.success(`Loaded ${response.count} entry activity records`);
        } else {
          toast.error('Failed to load entry activity report');
        }
      } catch (error) {
        console.error('Error loading entry activity report:', error);
        toast.error('Error loading entry activity report');
      } finally {
        setEntryActivityLoading(false);
      }
    },
    []
  );

  const handleExportEntryActivityCSV = useCallback(async () => {
    try {
      setEntryActivityExporting(true);
      await reportsApi.exportEntryActivityReportCSV(
        entryActivityStartDate,
        entryActivityEndDate
      );
      toast.success('Entry activity report exported as CSV');
    } catch (error) {
      console.error('Error exporting entry activity report:', error);
      toast.error('Error exporting entry activity report');
    } finally {
      setEntryActivityExporting(false);
    }
  }, [entryActivityStartDate, entryActivityEndDate]);

  const handleExportEntryActivityPDF = useCallback(async () => {
    try {
      setEntryActivityExporting(true);
      await reportsApi.exportEntryActivityReportPDF(
        entryActivityStartDate,
        entryActivityEndDate
      );
      toast.success('Entry activity report exported as PDF');
    } catch (error) {
      console.error('Error exporting entry activity report:', error);
      toast.error('Error exporting entry activity report');
    } finally {
      setEntryActivityExporting(false);
    }
  }, [entryActivityStartDate, entryActivityEndDate]);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Reports</h1>
        <p className="mt-2 text-gray-600">
          Generate and export payment and enrollment reports with custom date filters.
        </p>
      </div>

      {/* Reports Tabs */}
      <Tabs defaultValue="payments" className="w-full">
        <TabsList className="grid w-full max-w-2xl grid-cols-3">
          <TabsTrigger value="payments">Payments Report</TabsTrigger>
          <TabsTrigger value="enrollments">Enrollment Report</TabsTrigger>
          <TabsTrigger value="entry-activity">Entry Activity Report</TabsTrigger>
        </TabsList>

        {/* Payment Report Tab */}
        <TabsContent value="payments" className="space-y-4">
          <ReportFilterBar
            onFilter={handlePaymentFilter}
            isLoading={paymentLoading}
          />
          <PaymentReportTable
            data={paymentData}
            isLoading={paymentLoading}
            onExportCSV={handleExportPaymentCSV}
            onExportPDF={handleExportPaymentPDF}
            isExporting={paymentExporting}
          />
        </TabsContent>

        {/* Enrollment Report Tab */}
        <TabsContent value="enrollments" className="space-y-4">
          <ReportFilterBar
            onFilter={handleEnrollmentFilter}
            isLoading={enrollmentLoading}
          />
          <EnrollmentReportTable
            data={enrollmentData}
            isLoading={enrollmentLoading}
            onExportCSV={handleExportEnrollmentCSV}
            onExportPDF={handleExportEnrollmentPDF}
            isExporting={enrollmentExporting}
          />
        </TabsContent>

        {/* Entry Activity Report Tab */}
        <TabsContent value="entry-activity" className="space-y-4">
          <ReportFilterBar
            onFilter={handleEntryActivityFilter}
            isLoading={entryActivityLoading}
          />
          <EntryActivityReportTable
            data={entryActivityData}
            loading={entryActivityLoading}
            startDate={entryActivityStartDate}
            endDate={entryActivityEndDate}
            onExportCSV={handleExportEntryActivityCSV}
            onExportPDF={handleExportEntryActivityPDF}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ReportsPage;
