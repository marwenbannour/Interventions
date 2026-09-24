import { useQuery } from '@tanstack/react-query';
import { workflowsApi } from '../api/workflows.api';

export function useWorkflowsAdmin() {
  return useQuery({ queryKey: ['admin-workflows'], queryFn: workflowsApi.list });
}
