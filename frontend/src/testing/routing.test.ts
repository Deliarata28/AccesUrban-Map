import { describe, expect, it, vi } from "vitest";
import {
  evaluateRoute,
  recommendRoute,
  getRoutes,
  buildRouteGuidance,
  formatDuration,
  type RouteCandidate,
  type RouteSegment,
} from "../features/Map/routing";
const candidate = (
  id: string,
  changes: Partial<RouteSegment> = {},
): RouteCandidate => ({
  id,
  name: id,
  coordinates: [
    [47.01, 28.82],
    [47.02, 28.83],
  ],
  segments: [
    {
      distance: 1000,
      stairs: false,
      wheelchairAccess: "yes",
      incline: 4,
      surface: "smooth",
      width: 1.5,
      kerb: 0,
      ...changes,
    },
  ],
});
describe("Accessible routing", () => {
  it("chooses a longer accessible route over a short route with stairs", () => {
    const result = recommendRoute(
      [candidate("A", { stairs: true }), candidate("B", { distance: 1300 })],
      "WHEELCHAIR",
    );
    expect(result.recommendedId).toBe("B");
    expect(result.routes.find((r) => r.id === "A")?.cost).toBe(Infinity);
  });
  it("excludes wheelchair=no even without stairs", () => {
    expect(
      evaluateRoute(candidate("A", { wheelchairAccess: "no" }), "WHEELCHAIR")
        .blocked,
    ).toBe(true);
  });
  it("has no recommendation when all alternatives are blocked", () => {
    expect(
      recommendRoute([candidate("A", { stairs: true })], "WHEELCHAIR")
        .recommendedId,
    ).toBeNull();
  });
  it("penalizes steep, rough, narrow paths and kerbs", () => {
    const flat = evaluateRoute(candidate("A"), "WHEELCHAIR");
    const rough = evaluateRoute(
      candidate("B", { incline: 9, surface: "rough", width: 1, kerb: 0.1 }),
      "WHEELCHAIR",
    );
    expect(rough.cost).toBeGreaterThan(flat.cost);
    expect(rough.reasons).toHaveLength(4);
    expect(rough.blocked).toBe(false);
  });
  it("does not assign a reassuring score to an entirely unknown segment", () => {
    const route = evaluateRoute(
      candidate("A", {
        stairs: null,
        wheelchairAccess: "unknown",
        incline: null,
        surface: "unknown",
        width: null,
        kerb: null,
      }),
      "WHEELCHAIR",
    );
    expect(route.score).toBeNull();
    expect(route.unknownSegments).toBe(1);
  });
  it("changes behavior for a walking-aid profile without treating stairs as free", () => {
    const route = evaluateRoute(
      candidate("A", { stairs: true }),
      "WALKING_AID",
    );
    expect(route.blocked).toBe(false);
    expect(route.penalty).toBeGreaterThan(0);
  });
  it("estimates a different realistic duration for each mobility profile", () => {
    const wheelchair = evaluateRoute(candidate("wheelchair"), "WHEELCHAIR");
    const walkingAid = evaluateRoute(candidate("walking-aid"), "WALKING_AID");
    const visual = evaluateRoute(candidate("visual"), "VISUAL_IMPAIRMENT");

    expect(wheelchair.duration).toBeLessThan(walkingAid.duration);
    expect(walkingAid.duration).toBeGreaterThan(visual.duration);
    expect(wheelchair.duration).toBeGreaterThan(1000);
  });
  it("rejects malformed segment metrics", () => {
    expect(() =>
      evaluateRoute(candidate("A", { distance: -10 }), "WHEELCHAIR"),
    ).toThrow();
  });
  it("formats time in hours and minutes", () => {
    expect(formatDuration(8400)).toBe("2 ore și 20 min");
    expect(formatDuration(3600)).toBe("1 oră");
    expect(formatDuration(1200)).toBe("20 min");
  });
  it("converts real pedestrian route geometry and rejects identical endpoints", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            code: "Ok",
            routes: [
              {
                distance: 1_200,
                duration: 900,
                geometry: {
                  coordinates: [
                    [28.82, 47.01],
                    [28.825, 47.015],
                    [28.83, 47.02],
                  ],
                },
                legs: [
                  {
                    steps: [
                      {
                        distance: 600,
                        name: "Strada Alecu Russo",
                        maneuver: {
                          type: "depart",
                          location: [28.82, 47.01],
                        },
                      },
                      {
                        distance: 600,
                        name: "Strada Kiev",
                        maneuver: {
                          type: "turn",
                          modifier: "left",
                          location: [28.825, 47.015],
                        },
                      },
                    ],
                  },
                ],
              },
            ],
          }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        ),
      ),
    );
    const result = await getRoutes(
      [47.01, 28.82],
      [47.02, 28.83],
      "WHEELCHAIR",
    );
    expect(result.recommendedId).toBe("osm-0");
    expect(buildRouteGuidance(result.routes[0]).map((item) => item.title)).toContain(
      "Virează la stânga pe Strada Kiev",
    );
    await expect(
      getRoutes([47, 28], [47, 28], "WHEELCHAIR"),
    ).rejects.toThrow("diferite");
  });
  it("cancels route requests before they start", async () => {
    const controller = new AbortController();
    controller.abort();
    const request = getRoutes(
      [47.01, 28.82],
      [47.02, 28.83],
      "WHEELCHAIR",
      controller.signal,
    );
    await expect(request).rejects.toThrow("Aborted");
  });
  it("requests a real driving route and keeps the provider duration", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          code: "Ok",
          routes: [
            {
              distance: 1_846,
              duration: 221,
              geometry: {
                coordinates: [
                  [28.8353, 47.0105],
                  [28.8406, 47.00443],
                ],
              },
              legs: [{ steps: [{ distance: 1_846 }] }],
            },
          ],
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      ),
    );
    vi.stubGlobal("fetch", fetchMock);
    const result = await getRoutes(
      [47.0105, 28.8353],
      [47.00443, 28.8406],
      "WHEELCHAIR",
      undefined,
      "driving",
    );
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining("router.project-osrm.org/route/v1/driving"),
      expect.any(Object),
    );
    expect(result.routes[0].duration).toBe(221);
    expect(result.routes[0].score).toBeNull();
  });
});
