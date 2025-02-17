'use client'

import { Loader2Icon, PlusIcon } from "lucide-react"

import { ResponsiveModal } from "@/components/responsive-modal"
import { Button } from "@/components/ui/button"
import { trpc } from "@/trpc/client"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { StudioUploader } from "./studio-uploader"

export const StudioUploadModal = () => {
  const router = useRouter()
  const utils = trpc.useUtils();
  const { mutate, isPending, data, reset } = trpc.videos.create.useMutation({
    onSuccess: () => {
      toast.success("Video created")
      utils.studio.getMany.invalidate();
    },
    onError: () => {
      toast.error("Oops! Something went wrong")
    }
  });

  const onSuccess = () => {
    if (!data?.video.id) return

    reset()
    router.push(`/studio/videos/${data.video.id}`)
  }

  return (
    <>
      <ResponsiveModal
        title="Upload Video"
        open={!!data}
        onOpenChange={() => reset()}
      >
        {data?.url
          ? <StudioUploader endpoint={data.url} onSuccess={() => onSuccess()} />
          : <Loader2Icon className="animate-spin" />
        }
      </ResponsiveModal>
      <Button variant="secondary" onClick={() => mutate()} disabled={isPending}>
        {isPending ? <Loader2Icon className="animate-spin" /> : <PlusIcon />}
        Create
      </Button>
    </>
  )
}
