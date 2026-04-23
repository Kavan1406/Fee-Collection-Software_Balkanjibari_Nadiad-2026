import axios from 'axios';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
const REPORTS_BASE = `${API_BASE_URL}/api/v1/reports`;

export interface PaymentReportData {
  receipt_id: string;
  payment_ref: string;
  student_name: string;
  subject_name: string;
  phone: string;
  amount: number;
  payment_mode: string;
  payment_status: string;
  created_at: string;
}

export interface EnrollmentReportData {
  receipt_id: string;
  payment_ref: string;
  student_name: string;
  subject_name: string;
  phone: string;
  amount: number;
  payment_mode: string;
  payment_status: string;
  created_at: string;
}

export interface EntryActivityReportData {
  entry_id: string;
  entry_date: string;
  entry_time: string;
  student_name: string;
  student_id: string;
  subject_name: string;
  entry_type: string;
  recorded_by: string;
  notes?: string;
  created_at: string;
}

export interface ReportResponse<T> {
  success: boolean;
  count: number;
  start_date: string;
  end_date: string;
  data: T[];
}

export const reportsApi = {
  /**
   * Fetch Payment Report data
   */
  getPaymentReport: async (
    startDate?: string,
    endDate?: string
  ): Promise<ReportResponse<PaymentReportData>> => {
    try {
      const params: Record<string, string> = {};
      if (startDate) params.start_date = startDate;
      if (endDate) params.end_date = endDate;

      const response = await axios.get(`${REPORTS_BASE}/payments/`, {
        params,
      });

      return response.data;
    } catch (error) {
      console.error('Error fetching payment report:', error);
      throw error;
    }
  },

  /**
   * Fetch Enrollment Report data
   */
  getEnrollmentReport: async (
    startDate?: string,
    endDate?: string
  ): Promise<ReportResponse<EnrollmentReportData>> => {
    try {
      const params: Record<string, string> = {};
      if (startDate) params.start_date = startDate;
      if (endDate) params.end_date = endDate;

      const response = await axios.get(`${REPORTS_BASE}/enrollments/`, {
        params,
      });

      return response.data;
    } catch (error) {
      console.error('Error fetching enrollment report:', error);
      throw error;
    }
  },

  /**
   * Export Payment Report as CSV
   */
  exportPaymentReportCSV: async (
    startDate?: string,
    endDate?: string
  ): Promise<void> => {
    try {
      const params: Record<string, string> = {};
      if (startDate) params.start_date = startDate;
      if (endDate) params.end_date = endDate;

      const response = await axios.get(
        `${REPORTS_BASE}/payments/export/csv/`,
        {
          params,
          responseType: 'blob',
        }
      );

      // Create blob and download
      const blob = new Blob([response.data], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `payment_report_${new Date().toISOString().split('T')[0]}.csv`;
      link.click();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error exporting payment report as CSV:', error);
      throw error;
    }
  },

  /**
   * Export Enrollment Report as CSV
   */
  exportEnrollmentReportCSV: async (
    startDate?: string,
    endDate?: string
  ): Promise<void> => {
    try {
      const params: Record<string, string> = {};
      if (startDate) params.start_date = startDate;
      if (endDate) params.end_date = endDate;

      const response = await axios.get(
        `${REPORTS_BASE}/enrollments/export/csv/`,
        {
          params,
          responseType: 'blob',
        }
      );

      // Create blob and download
      const blob = new Blob([response.data], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `enrollment_report_${new Date().toISOString().split('T')[0]}.csv`;
      link.click();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error exporting enrollment report as CSV:', error);
      throw error;
    }
  },

  /**
   * Export Payment Report as PDF
   */
  exportPaymentReportPDF: async (
    startDate?: string,
    endDate?: string
  ): Promise<void> => {
    try {
      const params: Record<string, string> = {};
      if (startDate) params.start_date = startDate;
      if (endDate) params.end_date = endDate;

      const response = await axios.get(
        `${REPORTS_BASE}/payments/export/pdf/`,
        {
          params,
          responseType: 'blob',
        }
      );

      // Create blob and download
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `payment_report_${new Date().toISOString().split('T')[0]}.pdf`;
      link.click();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error exporting payment report as PDF:', error);
      throw error;
    }
  },

  /**
   * Export Enrollment Report as PDF
   */
  exportEnrollmentReportPDF: async (
    startDate?: string,
    endDate?: string
  ): Promise<void> => {
    try {
      const params: Record<string, string> = {};
      if (startDate) params.start_date = startDate;
      if (endDate) params.end_date = endDate;

      const response = await axios.get(
        `${REPORTS_BASE}/enrollments/export/pdf/`,
        {
          params,
          responseType: 'blob',
        }
      );

      // Create blob and download
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `enrollment_report_${new Date().toISOString().split('T')[0]}.pdf`;
      link.click();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error exporting enrollment report as PDF:', error);
      throw error;
    }
  },

  /**
   * Fetch Entry Activity Report data (chronological log of all entries)
   */
  getEntryActivityReport: async (
    startDate?: string,
    endDate?: string
  ): Promise<ReportResponse<EntryActivityReportData>> => {
    try {
      const params: Record<string, string> = {};
      if (startDate) params.start_date = startDate;
      if (endDate) params.end_date = endDate;

      const response = await axios.get(`${REPORTS_BASE}/entry-activity/`, {
        params,
      });

      return response.data;
    } catch (error) {
      console.error('Error fetching entry activity report:', error);
      throw error;
    }
  },

  /**
   * Export Entry Activity Report as CSV
   */
  exportEntryActivityReportCSV: async (
    startDate?: string,
    endDate?: string
  ): Promise<void> => {
    try {
      const params: Record<string, string> = {};
      if (startDate) params.start_date = startDate;
      if (endDate) params.end_date = endDate;

      const response = await axios.get(
        `${REPORTS_BASE}/entry-activity/export/csv/`,
        {
          params,
          responseType: 'blob',
        }
      );

      // Create blob and download
      const blob = new Blob([response.data], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `entry_activity_report_${new Date().toISOString().split('T')[0]}.csv`;
      link.click();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error exporting entry activity report as CSV:', error);
      throw error;
    }
  },

  /**
   * Export Entry Activity Report as PDF
   */
  exportEntryActivityReportPDF: async (
    startDate?: string,
    endDate?: string
  ): Promise<void> => {
    try {
      const params: Record<string, string> = {};
      if (startDate) params.start_date = startDate;
      if (endDate) params.end_date = endDate;

      const response = await axios.get(
        `${REPORTS_BASE}/entry-activity/export/pdf/`,
        {
          params,
          responseType: 'blob',
        }
      );

      // Create blob and download
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `entry_activity_report_${new Date().toISOString().split('T')[0]}.pdf`;
      link.click();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error exporting entry activity report as PDF:', error);
      throw error;
    }
  },
};

export default reportsApi;
