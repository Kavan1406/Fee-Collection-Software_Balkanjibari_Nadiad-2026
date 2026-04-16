'use client';

import React from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FileDown, Loader2 } from 'lucide-react';
import type { PaymentReportData } from '@/lib/api/reports';

interface PaymentReportTableProps {
  data: PaymentReportData[];
  isLoading?: boolean;
  onExportCSV?: () => void;
  onExportPDF?: () => void;
  isExporting?: boolean;
}

export const PaymentReportTable: React.FC<PaymentReportTableProps> = ({
  data,
  isLoading = false,
  onExportCSV,
  onExportPDF,
  isExporting = false,
}) => {
  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-12">
          <div className="flex items-center justify-center gap-2">
            <Loader2 className="h-5 w-5 animate-spin" />
            <span>Loading payment data...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!data || data.length === 0) {
    return (
      <Card>
        <CardContent className="py-12">
          <div className="text-center text-gray-500">
            No payment data found for the selected date range.
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Payment Report</CardTitle>
          <div className="flex gap-2">
            <Button
              onClick={onExportCSV}
              disabled={isExporting}
              variant="outline"
              size="sm"
            >
              <FileDown className="mr-2 h-4 w-4" />
              {isExporting ? 'Exporting...' : 'CSV'}
            </Button>
            <Button
              onClick={onExportPDF}
              disabled={isExporting}
              variant="outline"
              size="sm"
            >
              <FileDown className="mr-2 h-4 w-4" />
              {isExporting ? 'Exporting...' : 'PDF'}
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border border-gray-200 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-gray-50">
                <TableHead className="font-semibold">Receipt ID</TableHead>
                <TableHead className="font-semibold">Payment Ref</TableHead>
                <TableHead className="font-semibold">Student Name</TableHead>
                <TableHead className="font-semibold">Subject</TableHead>
                <TableHead className="font-semibold">Phone</TableHead>
                <TableHead className="font-semibold text-right">Amount</TableHead>
                <TableHead className="font-semibold">Mode</TableHead>
                <TableHead className="font-semibold">Status</TableHead>
                <TableHead className="font-semibold">Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((payment, index) => (
                <TableRow key={index} className="hover:bg-gray-50">
                  <TableCell className="text-sm font-mono">
                    {payment.receipt_id}
                  </TableCell>
                  <TableCell className="text-sm">
                    {payment.payment_ref || '-'}
                  </TableCell>
                  <TableCell className="text-sm font-medium">
                    {payment.student_name}
                  </TableCell>
                  <TableCell className="text-sm">
                    {payment.subject_name || '-'}
                  </TableCell>
                  <TableCell className="text-sm">
                    {payment.phone || '-'}
                  </TableCell>
                  <TableCell className="text-sm font-semibold text-right">
                    ₹ {parseFloat(payment.amount.toString()).toFixed(2)}
                  </TableCell>
                  <TableCell className="text-sm">
                    <span
                      className={`inline-block px-2 py-1 rounded text-xs font-semibold ${
                        payment.payment_mode === 'ONLINE'
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-green-100 text-green-800'
                      }`}
                    >
                      {payment.payment_mode === 'ONLINE' ? '💳' : '💵'}{' '}
                      {payment.payment_mode}
                    </span>
                  </TableCell>
                  <TableCell className="text-sm">
                    <span
                      className={`inline-block px-2 py-1 rounded text-xs font-semibold ${
                        payment.payment_status === 'SUCCESS'
                          ? 'bg-green-100 text-green-800'
                          : payment.payment_status === 'PENDING'
                          ? 'bg-yellow-100 text-yellow-800'
                          : 'bg-red-100 text-red-800'
                      }`}
                    >
                      {payment.payment_status}
                    </span>
                  </TableCell>
                  <TableCell className="text-sm">
                    {new Date(payment.created_at).toLocaleDateString('en-IN')}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        <div className="mt-4 text-sm text-gray-500">
          Total Records: <span className="font-semibold">{data.length}</span>
        </div>
      </CardContent>
    </Card>
  );
};

export default PaymentReportTable;
