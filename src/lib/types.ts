export type Role = "admin" | "employee" | "client";

export interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  role: Role;
}

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

export interface Task {
  id: string;
  project_id: string;
  stage_id: string;
  title: string;
  description: string | null;
  position: number;
  assigned_to?: string | null;
  created_at?: string;
  updated_at?: string;
  assignee?: Pick<Profile, "id" | "full_name" | "email"> | null;
  subtasks?: { done: boolean }[];
}

export interface Subtask {
  id: string;
  task_id: string;
  title: string;
  done: boolean;
  position: number;
}

export interface Note {
  id: string;
  project_id: string;
  title: string;
  content: string;
  updated_at: string;
}
