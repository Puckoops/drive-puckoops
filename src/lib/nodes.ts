import type { DriveNode, ShareGrant } from "@/lib/types";

/**
 * The people a node is shared *with*, excluding its owner.
 *
 * The service puts the owner in `sharedWith` because the share dialog and
 * the owner column both need it there. Anything asking "is this shared?"
 * has to discount them, or every private file reports itself as shared.
 */
export function collaborators(node: Pick<DriveNode, "sharedWith">): ShareGrant[] {
  return node.sharedWith.filter((s) => s.role !== "owner");
}
