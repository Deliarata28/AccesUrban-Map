import { useQuery } from "@tanstack/react-query";
import { getMockPlaces, getPlaces } from "../stores/placeStore";
import { getMockReports, getPublicMockReports } from "../stores/reportStore";
import { getMockUsers } from "../stores/authStore";
import { useCurrentUser } from "./useCurrentUser";
import type { MapPlace } from "../types/place";
export const usePlaces = () =>
  useQuery<MapPlace[]>({
    queryKey: ["places"],
    queryFn: ({ signal }): Promise<MapPlace[]> => getPlaces(signal),
    placeholderData: getMockPlaces(),
    staleTime: 15 * 60 * 1000,
  });
export function useReports() {
  const user = useCurrentUser();
  return useQuery({
    queryKey: ["reports", user?.id, user?.role],
    queryFn: getMockReports,
    enabled: !!user,
  });
}
export const usePublicReports = () =>
  useQuery({ queryKey: ["public-reports"], queryFn: getPublicMockReports });
export function useUsers() {
  const user = useCurrentUser();
  return useQuery({
    queryKey: ["users", user?.id],
    queryFn: getMockUsers,
    enabled: user?.role === "ADMIN",
  });
}
