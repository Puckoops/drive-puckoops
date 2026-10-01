"use client";

/**
 * The DriveApi implementation, talking to puckoops-be.
 *
 * The service returns nodes in exactly the shape `types.ts` declares, so
 * nothing here reshapes a payload — that was the point of writing the types
 * first. What this file does own is the URL layout and the query encoding.
 */

import { DRIVE_BASE, makeClient } from "@/lib/api";
import type {
  ActivityEvent,
  CategoryUsage,
  Comment,
  DriveApi,
  DriveNode,
  Listing,
  Quota,
  Role,
  UploadGrant,
  UploadInitFile,
} from "@/lib/types";

const drive = makeClient(DRIVE_BASE);

/** Query building goes through URLSearchParams: a "+" or a space in a name
 *  is a different string once it reaches a query string. */
function qs(params: Record<string, string | number | null | undefined>): string {
  const out = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v === null || v === undefined || v === "") continue;
    out.set(k, String(v));
  }
  const s = out.toString();
  return s ? `?${s}` : "";
}

export const puckoopsDrive: DriveApi = {
  list(parentId, pageToken) {
    return drive.get<Listing>(`/nodes${qs({ parent: parentId, page_token: pageToken })}`);
  },

  async get(id) {
    try {
      return await drive.get<DriveNode>(`/nodes/${id}`);
    } catch {
      // A node that is gone, or was never visible, is the same answer here.
      // The caller renders "not found" either way.
      return null;
    }
  },

  createFolder(parentId, name) {
    return drive.post<DriveNode>("/nodes/folders", { parentId, name });
  },

  rename(id, name) {
    return drive.patch<DriveNode>(`/nodes/${id}`, { name });
  },

  move(id, parentId) {
    return drive.put<DriveNode>(`/nodes/${id}/parent`, { parentId });
  },

  async trash(ids) {
    await drive.post<unknown>("/nodes/trash", { ids });
  },

  async restore(ids) {
    await drive.post<unknown>("/nodes/restore", { ids });
  },

  async star(id, starred) {
    await drive.put<unknown>(`/nodes/${id}/star`, { starred });
  },

  search(query) {
    return drive.get<DriveNode[]>(`/nodes/search${qs({ q: query })}`);
  },

  starred() {
    return drive.get<DriveNode[]>("/nodes/starred");
  },

  recent() {
    return drive.get<DriveNode[]>("/nodes/recent");
  },

  sharedWithMe() {
    return drive.get<DriveNode[]>("/nodes/shared-with-me");
  },

  trashed() {
    return drive.get<DriveNode[]>("/nodes/trashed");
  },

  quota() {
    return drive.get<Quota>("/quota");
  },

  usageByCategory() {
    return drive.get<CategoryUsage[]>("/usage/categories");
  },

  largestFiles(limit) {
    return drive.get<DriveNode[]>(`/usage/largest${qs({ limit })}`);
  },

  activity(nodeId) {
    return drive.get<ActivityEvent[]>(`/nodes/${nodeId}/activity`);
  },

  comments(nodeId) {
    return drive.get<Comment[]>(`/nodes/${nodeId}/comments`);
  },

  addComment(nodeId, body) {
    return drive.post<Comment>(`/nodes/${nodeId}/comments`, { body });
  },

  share(nodeId, person, role) {
    // The person, not the email: a tuple keys on the user id, and resolving
    // an address to an account is user-svc's job, done before this call.
    return drive.post<DriveNode>(`/nodes/${nodeId}/shares`, { userId: person.id, role });
  },

  unshare(nodeId, userId) {
    return drive.del<DriveNode>(`/nodes/${nodeId}/shares/${userId}`);
  },

  setRole(nodeId, userId, role) {
    return drive.put<DriveNode>(`/nodes/${nodeId}/shares/${userId}`, { role });
  },

  setLinkShare(nodeId, role) {
    return drive.put<DriveNode>(`/nodes/${nodeId}/link-share`, { role });
  },

  downloadUrl(nodeId) {
    return drive.get<{ url: string; expiresAt: string }>(`/nodes/${nodeId}/download`);
  },

  initUpload(parentId, files) {
    return drive.post<{ bucket: string; grants: UploadGrant[] }>("/uploads/init", {
      parentId,
      files,
    });
  },

  commitUpload(nodeId, sha256) {
    return drive.post<DriveNode>("/uploads/commit", { nodeId, sha256 });
  },
};

export type { UploadGrant, UploadInitFile, Role };
