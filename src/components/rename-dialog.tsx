"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { DriveNode } from "@/lib/types";

interface Props {
  node: DriveNode | null;
  onClose: () => void;
  onSubmit: (name: string) => void;
}

export function RenameDialog({ node, onClose, onSubmit }: Props) {
  const [name, setName] = useState("");

  useEffect(() => {
    if (node) setName(node.name);
  }, [node]);

  if (!node) return null;

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Rename</DialogTitle>
          <DialogDescription className="truncate">{node.name}</DialogDescription>
        </DialogHeader>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const next = name.trim();
            if (next) onSubmit(next);
          }}
        >
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="rename" className="label-md">
              Name
            </Label>
            <Input id="rename" value={name} autoFocus onChange={(e) => setName(e.target.value)} />
          </div>
          <DialogFooter className="mt-5">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={!name.trim() || name.trim() === node.name}>
              Rename
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
