import { CollectionView } from "@/components/collection-view";
import { DriveShell } from "@/components/drive-shell";

export default function SharedPage() {
  return (
    <DriveShell title="Shared">
      <CollectionView kind="shared" />
    </DriveShell>
  );
}
