import { DriveShell } from "@/components/drive-shell";
import { FilesBrowser } from "@/components/files-browser";

export default function FilesPage() {
  return (
    <DriveShell title="Drive">
      <FilesBrowser folderId={null} />
    </DriveShell>
  );
}
