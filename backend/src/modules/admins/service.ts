import type { User } from '@supabase/supabase-js';
import { getSupabaseAdmin } from '../../infrastructure/supabase';
import { prisma } from '../../infrastructure/prisma';
import { AdminRole, AuditAction, AuditActorType } from '../../types/enums';
import { ApiError } from '../../utils/http';
import type { ChangeAdminRoleInput, CreateAdminInput, UpdateAdminInput } from './schema';

function requireAdminClient() {
  const client = getSupabaseAdmin();
  if (!client) {
    throw ApiError.serviceUnavailable('Supabase admin management is not configured on this server');
  }
  return client;
}

function toAdminView(user: User) {
  const roles = (user.app_metadata?.roles ?? []) as AdminRole[];
  const role = (roles[0] ?? null) as AdminRole | null;
  return {
    id: user.id,
    email: user.email ?? null,
    name: (user.user_metadata?.name as string | undefined) ?? null,
    role,
    isActive: user.banned_until === null && user.deleted_at === null,
    createdAt: user.created_at,
    lastSignInAt: user.last_sign_in_at ?? null,
  };
}

export async function listAdmins(query: { page: number; limit: number; q?: string }) {
  const client = requireAdminClient();
  const { data, error } = await client.auth.admin.listUsers({
    page: query.page,
    perPage: query.limit,
  });

  if (error) {
    throw ApiError.badRequest(error.message);
  }

  let users = data.users ?? [];
  if (query.q) {
    const q = query.q.toLowerCase();
    users = users.filter(
      (u) =>
        u.email?.toLowerCase().includes(q) ||
        (u.user_metadata?.name as string | undefined)?.toLowerCase().includes(q),
    );
  }

  return {
    items: users.map(toAdminView),
    pagination: {
      page: query.page,
      limit: query.limit,
      total: data.total ?? users.length,
    },
  };
}

export async function getAdmin(id: string) {
  const client = requireAdminClient();
  const { data, error } = await client.auth.admin.getUserById(id);
  if (error) {
    throw ApiError.notFound('Admin account not found');
  }
  if (!data) {
    throw ApiError.notFound('Admin account not found');
  }
  return toAdminView(data.user);
}

export async function createAdmin(input: CreateAdminInput) {
  const client = requireAdminClient();
  const { data, error } = await client.auth.admin.createUser({
    email: input.email,
    password: input.password,
    email_confirm: true,
    user_metadata: input.name ? { name: input.name } : undefined,
    app_metadata: { roles: [input.role] },
  });

  if (error) {
    throw ApiError.conflict(
      error.message.toLowerCase().includes('already registered')
        ? 'An account with this email already exists'
        : error.message,
    );
  }
  if (!data) {
    throw ApiError.conflict('Failed to create admin account');
  }

  await prisma.auditLog.create({
    data: {
      actorType: AuditActorType.SYSTEM,
      action: AuditAction.ADMIN_ROLE_CHANGED,
      resource: `admin:${data.user.id}`,
      summary: `Admin account created with role ${input.role}`,
      metadata: { email: input.email, role: input.role },
    },
  });

  return toAdminView(data.user);
}

export async function updateAdmin(id: string, input: UpdateAdminInput) {
  const client = requireAdminClient();
  const { data, error } = await client.auth.admin.updateUserById(id, {
    email: input.email,
    user_metadata:
      input.name !== undefined
        ? { name: input.name }
        : undefined,
    ban_duration: input.isActive === true ? 'none' : input.isActive === false ? '876000h' : undefined,
  });

  if (error) {
    throw ApiError.conflict(error.message);
  }
  if (!data) {
    throw ApiError.notFound('Admin account not found');
  }
  return toAdminView(data.user);
}

export async function changeAdminRole(id: string, input: ChangeAdminRoleInput, actorId: string) {
  const client = requireAdminClient();
  const { data, error } = await client.auth.admin.updateUserById(id, {
    app_metadata: { roles: [input.role] },
  });

  if (error) {
    throw ApiError.conflict(error.message);
  }
  if (!data) {
    throw ApiError.notFound('Admin account not found');
  }

  await prisma.auditLog.create({
    data: {
      actorType: AuditActorType.ADMIN,
      actorId,
      action: AuditAction.ADMIN_ROLE_CHANGED,
      resource: `admin:${id}`,
      summary: `Role changed to ${input.role}`,
      metadata: { role: input.role },
    },
  });

  return toAdminView(data.user);
}

export async function deleteAdmin(id: string) {
  const client = requireAdminClient();
  const { error } = await client.auth.admin.deleteUser(id);
  if (error) {
    throw ApiError.badRequest(error.message);
  }
  return null;
}