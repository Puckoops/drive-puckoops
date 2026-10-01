import { DriveShell } from "@/components/drive-shell";
import { StorageView } from "@/components/storage-view";

export default function StoragePage() {
  return (
    <DriveShell title="Storage">
      <StorageView />
    </DriveShell>
  );
}
