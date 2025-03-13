'use client'

import { DEFAULT_LIMIT } from "@/constants";
import { trpc } from "@/trpc/client";

import { InfiniteScroll } from "@/components/infinite-scroll";
import { Suspense } from "react";
import { ErrorBoundary } from "react-error-boundary";
import { VideoGridCard, VideoGridCardSkeleton } from "../components/video-grid-card";
import { VideoRowCard, VideoRowCardSkeleton } from "../components/video-row-card";

interface SuggestionsSectionProps {
  videoId: string;
  isManual?: boolean;
}

export const SuggestionsSection = ({ videoId, isManual }: SuggestionsSectionProps) => {
  return (
    <Suspense fallback={<SuggestionsSectionSkeleton />}>
      <ErrorBoundary fallback={<div>Error</div>}>
        <SuggestionsSectionSuspense videoId={videoId} isManual={isManual} />
      </ErrorBoundary>
    </Suspense>
  )
}

const SuggestionsSectionSkeleton = () => {
  return (
    <>
      <div className="hidden md:block space-y-3">
        {Array.from({ length: 8 }).map((_, index) => (
          <VideoRowCardSkeleton key={index} size="compact" />
        ))}
      </div>
      <div className="block md:hidden space-y-10">
        {Array.from({ length: 8 }).map((_, index) => (
          <VideoGridCardSkeleton key={index} />
        ))}
      </div>
    </>
  )
}

const SuggestionsSectionSuspense = ({ videoId, isManual }: SuggestionsSectionProps) => {
  const [suggestions, query] = trpc.suggestions.getMany.useSuspenseInfiniteQuery({
    videoId,
    limit: DEFAULT_LIMIT
  }, {
    getNextPageParam: (lastPage) => lastPage.nextCursor,
  })
  return (
    <>
      <div className="hidden md:block space-y-3">
        {suggestions.pages.flatMap((page) => page.items).map((video) => (
          <VideoRowCard
            key={video.id}
            data={video}
            size="compact"
          />
        ))}
      </div>
      <div className="block md:hidden space-y-10">
        {suggestions.pages.flatMap((page) => page.items).map((video) => (
          <VideoGridCard
            key={video.id}
            data={video}
          />
        ))}
      </div>
      <InfiniteScroll
        hasNextPage={query.hasNextPage}
        fetchNextPage={query.fetchNextPage}
        isFetchingNextPage={query.isFetchingNextPage}
        isManual={isManual}
      />
    </>
  );
};
