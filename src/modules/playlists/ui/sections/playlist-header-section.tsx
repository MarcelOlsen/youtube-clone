'use client'

import { Trash2Icon } from "lucide-react";
import { Suspense } from "react";
import { ErrorBoundary } from "react-error-boundary";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { trpc } from "@/trpc/client";
import { useRouter } from "next/navigation";

interface PlaylistHeaderSectionProps {
  playlistId: string;
}

export const PlaylistHeaderSection = ({ playlistId }: PlaylistHeaderSectionProps) => {
  return (
    <Suspense fallback={<PlaylistHeaderSectionSkeleton />}>
      <ErrorBoundary fallback={<div>Error loading playlist header</div>}>
        <PlaylistHeaderSectionSuspense playlistId={playlistId} />
      </ErrorBoundary>
    </Suspense>
  );
};

const PlaylistHeaderSectionSkeleton = () => {
  return (
    <div className="flex flex-col gap-y-2">
      <Skeleton className="h-6 w-24" />
      <Skeleton className="h-4 w-32" />
    </div>
  )
}

const PlaylistHeaderSectionSuspense = ({ playlistId }: PlaylistHeaderSectionProps) => {§
  const utils = trpc.useUtils()
  const router = useRouter()

  const remove = trpc.playlists.remove.useMutation({
    onSuccess: () => {
      toast.success("Playlist deleted successfully");
      utils.playlists.getMany.invalidate()
      router.push("/playlists")
    },
    onError: () => {
      toast.error("Failed to delete playlist");
    }
  });

  return (
    <div className="flex justify-between items-center">
      <div>
        <h1 className="text-2xl font-bold">History</h1>
        <p className="text-xs text-muted-foreground">
          Videos from the playlist
        </p>
      </div>
      <Button
        variant="outline"
        size="icon"
        className="rounded-full"
        onClick={() => remove.mutate({ id: playlistId })}
        disabled={remove.isPending}
      >
        <Trash2Icon />
      </Button>
    </div>
  );
};
