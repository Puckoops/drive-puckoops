import { DriveShell } from "@/components/drive-shell";
import { FilePreview } from "@/components/file-preview";

export default async function FilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <DriveShell title="Drive">
      <FilePreview fileId={id} />
    </DriveShell>
  );
}
