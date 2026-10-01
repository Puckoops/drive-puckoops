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

interface Props {
  open: boolean;
  destination: string;
  onClose: () => void;
  onCreate: (name: string) => void;
}

export function NewFolderDialog({ open, destination, onClose, onCreate }: Props) {
  const [name, setName] = useState("Untitled folder");

  useEffect(() => {
    if (open) setName("Untitled folder");
  }, [open]);

  if (!open) return null;

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>New folder</DialogTitle>
          <DialogDescription>Inside {destination}</DialogDescription>
        </DialogHeader>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const next = name.trim();
            if (next) onCreate(next);
          }}
        >
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="folder-name" className="label-md">
              Name
            </Label>
            <Input
              id="folder-name"
              value={name}
              autoFocus
              onFocus={(e) => e.currentTarget.select()}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <DialogFooter className="mt-5">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={!name.trim()}>
              Create
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
