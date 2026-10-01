import {
  FileArchive,
  FileImage,
  FileSpreadsheet,
  FileText,
  FileVideo,
  File as FileIcon,
  Folder,
  FolderOpen,
} from "lucide-react";
import type { DriveNode } from "@/lib/types";

type Tone = "slate" | "coral" | "ink";

interface Spec {
  Icon: typeof FileIcon;
  label: string;
  tone: Tone;
}

/** Extension wins over content type: it is what the user sees in the name. */
export function specFor(node: Pick<DriveNode, "kind" | "name" | "contentType">): Spec {
  if (node.kind === "folder") return { Icon: Folder, label: "Folder", tone: "slate" };

  const ext = node.name.split(".").pop()?.toLowerCase() ?? "";
  const ct = node.contentType;

  if (ext === "pdf" || ct === "application/pdf") return { Icon: FileText, label: "PDF", tone: "coral" };
  if (/^(xlsx|xls|csv|numbers)$/.test(ext) || /sheet|csv/.test(ct))
    return { Icon: FileSpreadsheet, label: ext.toUpperCase() || "XLS", tone: "ink" };
  if (/^(docx?|rtf|txt|md|pages)$/.test(ext) || /word|text/.test(ct))
    return { Icon: FileText, label: ext.toUpperCase() || "DOC", tone: "ink" };
  if (/^(png|jpe?g|gif|webp|svg|avif|heic)$/.test(ext) || ct.startsWith("image/"))
    return { Icon: FileImage, label: ext.toUpperCase() || "IMG", tone: "ink" };
  if (/^(mp4|mov|webm|avi|mkv)$/.test(ext) || ct.startsWith("video/"))
    return { Icon: FileVideo, label: ext.toUpperCase() || "VIDEO", tone: "ink" };
  if (/^(zip|gz|tgz|tar|rar|7z)$/.test(ext) || /zip|gzip|tar/.test(ct))
    return { Icon: FileArchive, label: "ZIP", tone: "slate" };
  if (ext === "fig") return { Icon: FileImage, label: "FIG", tone: "slate" };

  return { Icon: FileIcon, label: ext.toUpperCase().slice(0, 4) || "FILE", tone: "slate" };
}

const TONE: Record<Tone, string> = {
  // Coral is reserved for destructive actions elsewhere; on a PDF tile it is
  // the one place the spec allows it as an identity cue.
  coral: "bg-[#fef2f2] text-[#dc2626]",
  ink: "bg-secondary text-foreground",
  slate: "bg-secondary text-muted-foreground",
};

export function NodeIcon({
  node,
  size = "md",
}: {
  node: Pick<DriveNode, "kind" | "name" | "contentType">;
  size?: "sm" | "md" | "lg";
}) {
  const { Icon, tone } = specFor(node);
  const box = size === "lg" ? "size-10 rounded-lg" : size === "sm" ? "size-7 rounded-md" : "size-8 rounded-md";
  const glyph = size === "lg" ? "size-5" : "size-4";
  return (
    <span className={`grid shrink-0 place-items-center ${box} ${TONE[tone]}`}>
      <Icon className={glyph} strokeWidth={1.75} />
    </span>
  );
}

export { FolderOpen };
