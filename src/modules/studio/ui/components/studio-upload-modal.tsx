'use client'

import { Loader2Icon, PlusIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { trpc } from "@/trpc/client"
import { toast } from "sonner"

export const StudioUploadModal = () => {
  const utils = trpc.useUtils();
  const { mutate, isPending } = trpc.videos.create.useMutation({
    onSuccess: () => {
      toast.success("Video created")
      utils.studio.getMany.invalidate();
    },
    onError: () => {
      toast.error("Oops! Something went wrong")
    }
  });

  return (
    <Button variant="secondary" onClick={() => mutate()} disabled={isPending}>
      {isPending ? <Loader2Icon className="animate-spin" /> : <PlusIcon />}
      Create
    </Button>
  )
}
