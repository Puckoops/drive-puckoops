import { CollectionView } from "@/components/collection-view";
import { DriveShell } from "@/components/drive-shell";

export default function RecentPage() {
  return (
    <DriveShell title="Recent">
      <CollectionView kind="recent" />
    </DriveShell>
  );
}
