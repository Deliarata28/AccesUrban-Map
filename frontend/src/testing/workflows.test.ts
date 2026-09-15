import { describe, expect, it } from "vitest";
import {
  getCurrentMockUser,
  getMockUsers,
  loginMockUser,
  logoutMockUser,
  registerMockUser,
} from "../stores/authStore";
import {
  createMockReport,
  getMockReports,
  getPublicMockReports,
  moderateMockReport,
} from "../stores/reportStore";
import {
  deleteMockPlace,
  getMockPlaces,
  saveMockPlace,
} from "../stores/placeStore";
const admin = () =>
  loginMockUser("accesurbanmap@gmail.com", "accesurbanmap123");
const register = (email = "tester@example.test") =>
  registerMockUser({
    name: "Test User",
    email,
    password: "testing123",
    accessibilityProfile: "WHEELCHAIR",
  });
const draft = () => ({
  ...getMockPlaces()[0],
  name: "Locație de test",
  source: "MANUAL" as const,
  verified: false,
});
describe("Mock administration boundaries", () => {
  it("recognizes the requested administrator and keeps sessions across reads", () => {
    expect(admin()).toMatchObject({ name: "AccesUrban Map", role: "ADMIN" });
    expect(getCurrentMockUser()?.email).toBe("accesurbanmap@gmail.com");
    logoutMockUser();
    expect(getCurrentMockUser()).toBeNull();
  });
  it("never returns passwords to consumers", () => {
    admin();
    expect(getMockUsers().every((user) => !("password" in user))).toBe(true);
  });
  it("prevents public registration of the reserved admin email", () => {
    expect(() => register(" ACCESURBANMAP@gmail.com ")).toThrow("deja");
  });
  it("rejects duplicate normalized email and invalid credentials", () => {
    register();
    expect(() => register(" TESTER@example.test ")).toThrow("deja");
    expect(() => loginMockUser("tester@example.test", "wrong")).toThrow();
  });
  it("prevents guests and users from modifying places or reading users", () => {
    expect(() => saveMockPlace(draft())).toThrow("administrator");
    expect(() => deleteMockPlace("usm")).toThrow("administrator");
    register();
    expect(getCurrentMockUser()?.role).toBe("USER");
    expect(() => getMockUsers()).toThrow("administrator");
    expect(() => saveMockPlace(draft())).toThrow("administrator");
  });
  it("persists create/update/delete and recomputes status from facilities", () => {
    admin();
    const initial = getMockPlaces().length;
    const created = saveMockPlace(draft());
    expect(getMockPlaces()).toHaveLength(initial + 1);
    const edited = saveMockPlace(
      {
        ...created,
        accessibility: { ...created.accessibility, rampa: "nu", lift: "nu" },
      },
      created.id,
    );
    expect(edited.status).toBe("redus");
    expect(
      getMockPlaces().find((place) => place.id === created.id)?.accessibility
        .rampa,
    ).toBe("nu");
    deleteMockPlace(created.id);
    expect(getMockPlaces()).toHaveLength(initial);
  });
  it("rejects missing records, invalid coordinates, and verified mock data", () => {
    admin();
    expect(() => saveMockPlace({ ...draft(), position: [NaN, 28.8] })).toThrow(
      "Coordonatele",
    );
    expect(() =>
      saveMockPlace({ ...draft(), source: "MOCK", verified: true }),
    ).toThrow("sursa locală");
    expect(() => saveMockPlace(draft(), "deleted-id")).toThrow("nu mai există");
  });
});
describe("Reports from submission to moderation", () => {
  const input = () => ({
    placeId: "usm",
    placeName: "ignored",
    position: [47.0198, 28.8154] as [number, number],
    type: "BLOCKED_RAMP" as const,
    description: "Pe rampă este parcat un automobil.",
    photoUrl: "data:image/png;base64,iVBORw0KGgo=",
  });
  it("requires login, persists a photo, and hides pending reports from the public", () => {
    expect(() => createMockReport(input())).toThrow("Conectează");
    register();
    const report = createMockReport(input());
    expect(report).toMatchObject({
      status: "PENDING",
      photoUrl: input().photoUrl,
      placeName: "Universitatea de Stat din Moldova",
    });
    expect(getPublicMockReports().some((item) => item.id === report.id)).toBe(
      false,
    );
    logoutMockUser();
    expect(() => getMockReports()).toThrow();
  });
  it("allows users to see only their own reports and denies moderation", () => {
    register();
    const report = createMockReport(input());
    expect(() => moderateMockReport(report.id, "APPROVED", "")).toThrow(
      "administrator",
    );
    logoutMockUser();
    register("second@example.test");
    expect(getMockReports()).toEqual([]);
    admin();
    expect(getMockReports().map((r) => r.id)).toContain(report.id);
  });
  it("publishes approved problems without silently changing facilities", () => {
    register();
    const report = createMockReport(input());
    const before = getMockPlaces().find((p) => p.id === "usm")!.accessibility;
    admin();
    moderateMockReport(report.id, "APPROVED", "Problema a fost confirmată.");
    expect(getPublicMockReports().map((item) => item.id)).toContain(report.id);
    expect(getMockPlaces().find((p) => p.id === "usm")!.accessibility).toEqual(
      before,
    );
    expect(() =>
      moderateMockReport(report.id, "REJECTED", "răzgândire"),
    ).toThrow("deja verificat");
  });
  it("requires a rejection reason and delivers it to the reporter", () => {
    register();
    const report = createMockReport(input());
    admin();
    expect(() => moderateMockReport(report.id, "REJECTED", "")).toThrow(
      "motivul",
    );
    moderateMockReport(
      report.id,
      "REJECTED",
      "Fotografia nu arată această locație.",
    );
    loginMockUser("tester@example.test", "testing123");
    expect(getMockReports()[0]).toMatchObject({
      status: "REJECTED",
      moderatorNote: "Fotografia nu arată această locație.",
    });
  });
  it("rejects too short descriptions, unsupported images, and deleted places", () => {
    register();
    expect(() => createMockReport({ ...input(), description: "x" })).toThrow();
    expect(() =>
      createMockReport({ ...input(), photoUrl: "data:image/svg+xml,<svg/>" }),
    ).toThrow();
    admin();
    deleteMockPlace("usm");
    expect(() => createMockReport(input())).toThrow("nu mai există");
  });
  it("allows an authenticated user to report a selected point on the map", () => {
    register();
    const report = createMockReport({
      ...input(),
      placeId: "map-point:47.01800,28.83000",
      placeName: "Punct selectat pe hartă",
      position: [47.018, 28.83],
    });
    expect(report).toMatchObject({
      placeName: "Punct selectat pe hartă",
      position: [47.018, 28.83],
    });
  });
  it("retains report history when an administrator removes a place", () => {
    register();
    const report = createMockReport(input());
    admin();
    deleteMockPlace("usm");
    expect(getMockReports().some((item) => item.id === report.id)).toBe(true);
  });
});
