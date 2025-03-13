import { CornerDownRightIcon, Loader2Icon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { DEFAULT_LIMIT } from "@/constants";
import { trpc } from "@/trpc/client";
import { CommentItem } from "./comment-item";

interface CommentRepliesProps {
  parentId: string;
  videoId: string;
}

export const CommentReplies = ({ parentId, videoId }: CommentRepliesProps) => {
  const {
    data,
    isLoading,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage
  } = trpc.comments.getMany.useInfiniteQuery({
    limit: DEFAULT_LIMIT,
    parentId,
    videoId,
  }, {
    getNextPageParam: (lastPage) => lastPage.nextCursor
  });

  return (
    <div className="pl-14">
      <div className="flex flex-col gap-4 mt-2">
        {isLoading && (
          <div className="flex items-center justify-center">
            <Loader2Icon className="size-6 animate-spin text-muted-foreground" />
          </div>
        )}
        {!isLoading &&
          data?.pages
            .flatMap((page) => page.items)
            .map((item) => (
              <CommentItem
                key={item.id}
                comment={item}
                variant="reply"
              />
            ))}
      </div>
      {hasNextPage && (
        <Button
          onClick={() => fetchNextPage()}
          variant="tertiary"
          size="sm"
          disabled={isFetchingNextPage}
        >
          <CornerDownRightIcon />
          Show more replies
        </Button>
      )}
    </div>
  )
}
