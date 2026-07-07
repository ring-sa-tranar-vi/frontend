import { createFileRoute } from '@tanstack/react-router'
import AdminPage from '../features/adminPage/AdminPage'

export const Route = createFileRoute('/admin/trainers')({
  component: AdminPage,
})
