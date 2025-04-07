import { useAuth } from "@clerk/nextjs";
import { Edit2Icon } from "lucide-react";
import { useState } from "react";

import { UserGetOneOutput } from "../../types";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { BannerUploadModal } from "./banner-upload-modal";

interface UserPageBannerProps {
  user: UserGetOneOutput;
}

export const UserPageBannerSkeleton = () => {
  return (
    <Skeleton className="w-full max-h-[200px] h-[15vh] md:h-[25vh]" />
  )
}

export const UserPageBanner = ({ user }: UserPageBannerProps) => {
  const [isBannerUploadOpen, setIsBannerUploadOpen] = useState(false);
  const { userId } = useAuth()

  return (
    <div className="relative group">
      <BannerUploadModal
        userId={user.id}
        open={isBannerUploadOpen}
        onOpenChange={setIsBannerUploadOpen}
      />
      <div
        className={cn(
          "w-full max-h-[200px] h-[15vh] md:h-[25vh] bg-gradient-to-r from-gray-100 to-gray-200 rounded-xl",
          user.bannerUrl ? "bg-cover bg-center" : "bg-gray-100"
        )}
        style={{
          backgroundImage: user.bannerUrl ? `url(${user.bannerUrl})` : undefined
        }}
      >
        {user.clerkId === userId && (
          <Button
            onClick={() => setIsBannerUploadOpen(true)}
            type="button"
            size="icon"
            className="absolute top-4 right-4 rounded-full bg-black/50 hover:bg-black/50 opacity-100 md:opacity-0 group-hover:opacity-100 transition-opacity duration-300"
          >
            <Edit2Icon className="size-4 text-white" />
          </Button>
        )}
      </div>
    </div>
  )
}
