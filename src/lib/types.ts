export type Role = "admin" | "employee" | "client";

export interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  role: Role;
}

export type Member = Pick<Profile, "id" | "full_name" | "email" | "role">;

export interface Project {
  id: string;
  name: string;
  description: string | null;
  client_name: string | null;
  client_email: string | null;
  share_token?: string;
}

export interface Stage {
  id: string;
  project_id: string;
  name: string;
  position: number;
}

export type PersonRef = Pick<Profile, "id" | "full_name" | "email">;

export interface Task {
  id: string;
  project_id: string;
  stage_id: string;
  title: string;
  description: string | null;
  position: number;
  assigned_to?: string | null;
  created_by?: string | null;
  created_at?: string;
  updated_at?: string;
  assignee?: PersonRef | null;
  creator?: PersonRef | null;
  subtasks?: { done: boolean }[];
}

export interface Subtask {
  id: string;
  task_id: string;
  title: string;
  done: boolean;
  position: number;
  assigned_to?: string | null;
  created_at?: string;
}

/** What the signed-in user may do on the current project. */
export interface Perms {
  /** Staff (admin/employee) — full edit rights. */
  canEdit: boolean;
  /** Clients may add tasks, but not change or delete them. */
  canAddTasks: boolean;
  /** Assignments are internal; clients never see who is working on what. */
  canSeeAssignees: boolean;
}

export function permsFor(role: Role): Perms {
  const staff = role !== "client";
  return { canEdit: staff, canAddTasks: true, canSeeAssignees: staff };
}

export interface Note {
  id: string;
  project_id: string;
  title: string;
  content: string;
  updated_at: string;
}
