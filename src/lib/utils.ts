import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export const formatDuration = (duration: number): string => {
  const seconds = Math.floor((duration % 60_000) / 1000)
  const minutes = Math.floor(duration / 60_000)
  return `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`
};

export const snakeCaseToTitle = (str: string): string => {
  return str.replace(/_/g, " ").replace(/\b\w/g, (match) => match.toUpperCase());
}
