import { CollectionView } from "@/components/collection-view";
import { DriveShell } from "@/components/drive-shell";

export default function TrashPage() {
  return (
    <DriveShell title="Trash">
      <CollectionView kind="trash" />
    </DriveShell>
  );
}
