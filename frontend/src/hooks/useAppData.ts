import { useQuery } from "@tanstack/react-query";
import { getApiPlaces } from "../services/placesApi";
import { getApiReports, getPublicApiReports } from "../services/reportsApi";
import { getApiUsers } from "../services/usersApi";
import { getContactMessages } from "../services/contactMessagesApi";
import { useCurrentUser } from "./useCurrentUser";
import type { MapPlace } from "../types/place";

export const usePlaces = () =>
  useQuery<MapPlace[]>({
    queryKey: ["places"],
    queryFn: ({ signal }): Promise<MapPlace[]> => getApiPlaces(signal),
    staleTime: 15 * 60 * 1000,
  });

export function useReports() {
  const user = useCurrentUser();
  return useQuery({
    queryKey: ["reports", user?.id, user?.role],
    queryFn: () => getApiReports(user!.role),
    enabled: !!user,
  });
}

export const usePublicReports = () =>
  useQuery({ queryKey: ["public-reports"], queryFn: getPublicApiReports });

export function useUsers() {
  const user = useCurrentUser();
  return useQuery({
    queryKey: ["users", user?.id],
    queryFn: getApiUsers,
    enabled: user?.role === "ADMIN",
  });
}

export function useContactMessages() {
  const user = useCurrentUser();
  return useQuery({
    queryKey: ["contact-messages"],
    queryFn: getContactMessages,
    enabled: user?.role === "ADMIN",
  });
}
