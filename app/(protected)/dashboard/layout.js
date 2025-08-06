import DashboardLayout from '../../../components/layout/DashboardLayout'

export default function DashboardLayoutWrapper({ children }) {
  return (
    <DashboardLayout showQuickActions={true}>
      {children}
    </DashboardLayout>
  )
}