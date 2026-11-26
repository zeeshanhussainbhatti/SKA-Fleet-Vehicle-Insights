"use client";
import { useTransition } from "react";
import { Loader2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogClose, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { deleteVehicleAction } from "./actions";

export function DeleteVehicleButton({ id, registration }: { id: string; registration: string }) {
  const [pending, start] = useTransition();
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="danger-ghost">
          <Trash2 /> Delete
        </Button>
      </DialogTrigger>
      <DialogContent title="Delete vehicle record?" description={`This permanently removes ${registration} from the database. A snapshot is kept in the audit log.`}>
        <div className="flex justify-end gap-2">
          <DialogClose asChild>
            <Button variant="secondary">Cancel</Button>
          </DialogClose>
          <Button variant="danger" disabled={pending} onClick={() => start(() => deleteVehicleAction(id))}>
            {pending ? <Loader2 className="animate-spin" /> : <Trash2 />} Delete permanently
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
