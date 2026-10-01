export type NodeKind = "file" | "folder";

export type Role = "owner" | "editor" | "viewer";

export interface DriveUser {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string;
}

export interface DriveNode {
  id: string;
  parentId: string | null;
  kind: NodeKind;
  name: string;
  ownerId: string;
  sizeBytes: number;
  /** Folders only: maintained server-side by the ancestors rollup. */
  subtreeBytes?: number;
  subtreeFiles?: number;
  contentType: string;
  createdAt: string;
  modifiedAt: string;
  starred: boolean;
  trashedAt: string | null;
  /** Present once a thumbnail worker has run. */
  thumbnailUrl?: string;
  /** Preview extras the inspector shows; absent until derived. */
  meta?: { width?: number; height?: number; pages?: number; durationSec?: number };
  sha256?: string;
  version: number;
  /** Effective permission for the signed-in user, resolved by FGA. */
  access: Role;
  sharedWith: ShareGrant[];
  linkShare: {
    role: Exclude<Role, "owner">;
    expiresAt: string | null;
    /** Present only in the response that created the link. It is stored
     *  hashed, so this is the one chance to copy it. */
    token?: string;
  } | null;
}

export interface ShareGrant {
  user: DriveUser;
  role: Role;
}

export interface Breadcrumb {
  id: string | null;
  name: string;
}

export interface Listing {
  prefix: Breadcrumb[];
  folders: DriveNode[];
  files: DriveNode[];
  nextPageToken: string | null;
}

export interface Quota {
  usedBytes: number;
  quotaBytes: number;
  fileCount: number;
  folderCount: number;
}

export interface CategoryUsage {
  key: string;
  label: string;
  bytes: number;
}

export interface ActivityEvent {
  id: string;
  nodeId: string;
  actor: DriveUser;
  verb: "uploaded" | "commented" | "viewed" | "shared" | "renamed";
  detail?: string;
  at: string;
}

export interface Comment {
  id: string;
  nodeId: string;
  author: DriveUser;
  body: string;
  at: string;
}

export interface UploadInitFile {
  /** Path relative to the dropped folder, so nesting is recreated server-side. */
  path: string;
  contentType?: string;
  /** Advisory: lets a drop that cannot fit fail before any bytes move. The
   *  enforcing check happens at commit, against what storage received. */
  size?: number;
}

export interface UploadGrant {
  path: string;
  /** The row the service created for this file. Commit addresses it by id. */
  nodeId?: string;
  key?: string;
  url?: string;
  headers?: Record<string, string>;
  error?: string;
}

/**
 * The surface puckoops-be implements. Everything the UI needs goes through
 * here, which is what made swapping the mock for HTTP a one-line change in
 * the shell.
 */
export interface DriveApi {
  list(parentId: string | null, pageToken?: string): Promise<Listing>;
  get(id: string): Promise<DriveNode | null>;
  createFolder(parentId: string | null, name: string): Promise<DriveNode>;
  rename(id: string, name: string): Promise<DriveNode>;
  trash(ids: string[]): Promise<void>;
  restore(ids: string[]): Promise<void>;
  star(id: string, starred: boolean): Promise<void>;
  search(query: string): Promise<DriveNode[]>;
  starred(): Promise<DriveNode[]>;
  recent(): Promise<DriveNode[]>;
  sharedWithMe(): Promise<DriveNode[]>;
  trashed(): Promise<DriveNode[]>;
  quota(): Promise<Quota>;
  usageByCategory(): Promise<CategoryUsage[]>;
  largestFiles(limit: number): Promise<DriveNode[]>;
  activity(nodeId: string): Promise<ActivityEvent[]>;
  comments(nodeId: string): Promise<Comment[]>;
  /** Takes the resolved person, not an email: an FGA tuple keys on the
   *  user id, so resolving belongs upstream of the grant. */
  share(nodeId: string, person: DriveUser, role: Role): Promise<DriveNode>;
  unshare(nodeId: string, userId: string): Promise<DriveNode>;
  setRole(nodeId: string, userId: string, role: Role): Promise<DriveNode>;
  setLinkShare(nodeId: string, role: Exclude<Role, "owner"> | null): Promise<DriveNode>;

  move(id: string, parentId: string | null): Promise<DriveNode>;
  addComment(nodeId: string, body: string): Promise<Comment>;
  /** A short-lived signed URL. Not a permanent path: the file may be
   *  unshared a minute after this is handed out. */
  downloadUrl(nodeId: string): Promise<{ url: string; expiresAt: string }>;

  /** Reserves a row and a storage key per file and returns the signed URLs
   *  the browser uploads to. The bytes never pass through the service. */
  initUpload(parentId: string | null, files: UploadInitFile[]): Promise<{ bucket: string; grants: UploadGrant[] }>;
  /** Finishes an upload by the id init handed out. The size is read from
   *  storage, not sent from here, so there is nothing to under-report. */
  commitUpload(nodeId: string, sha256?: string): Promise<DriveNode>;
}
