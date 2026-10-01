import { CollectionView } from "@/components/collection-view";
import { DriveShell } from "@/components/drive-shell";

export default function StarredPage() {
  return (
    <DriveShell title="Starred">
      <CollectionView kind="starred" />
    </DriveShell>
  );
}
