import ReportsPage from '@/components/pages/ReportsPage';

export const metadata = {
  title: 'Reports | Admin Dashboard',
  description: 'Payment and enrollment reports with export options',
};

export default function ReportsRoute() {
  return <ReportsPage userRole="admin" />;
}
