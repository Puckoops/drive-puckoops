import { DriveShell } from "@/components/drive-shell";
import { FilesBrowser } from "@/components/files-browser";

export default async function FolderPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <DriveShell title="Drive">
      <FilesBrowser folderId={id} />
    </DriveShell>
  );
}
