import { ClientTaskDetail } from '@/features/client-portal/components/ClientTaskDetail';

export default async function ClientTaskDetailPage({ params }: { params: Promise<{ taskId: string }> }) {
  const { taskId } = await params;
  return <ClientTaskDetail taskId={taskId} />;
}
