"use client";
import { useTransition } from "react";
import { toast } from "sonner";
import { Loader2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogClose, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { purgeSyntheticAction } from "./actions";

export function PurgeSyntheticButton({ count }: { count: number }) {
  const [pending, start] = useTransition();
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="danger" size="sm"><Trash2 /> Purge synthetic data</Button>
      </DialogTrigger>
      <DialogContent title="Purge synthetic demo data?" description={`Deletes ${count.toLocaleString()} records whose data source is the synthetic demo label. Real records are not affected.`}>
        <div className="flex justify-end gap-2">
          <DialogClose asChild><Button variant="secondary">Cancel</Button></DialogClose>
          <Button
            variant="danger"
            disabled={pending}
            onClick={() => start(async () => {
              await purgeSyntheticAction();
              toast.success("Synthetic data purged");
            })}
          >
            {pending ? <Loader2 className="animate-spin" /> : <Trash2 />} Purge
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
