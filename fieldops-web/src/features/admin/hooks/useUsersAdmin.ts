import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { usersAdminApi } from '../api/users-admin.api';
import type { CreateUserInput, Role, UpdateUserInput, UserStatus } from '../types';

export function useUsersAdmin(params: { role?: Role; status?: UserStatus; search?: string } = {}) {
  return useQuery({ queryKey: ['admin-users-full', params], queryFn: () => usersAdminApi.list(params) });
}

export function useCreateUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateUserInput) => usersAdminApi.create(input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-users-full'] });
      qc.invalidateQueries({ queryKey: ['admin-users'] });
    },
  });
}

export function useUpdateUser(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: UpdateUserInput) => usersAdminApi.update(id, input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-users-full'] });
      qc.invalidateQueries({ queryKey: ['admin-users'] });
    },
  });
}
