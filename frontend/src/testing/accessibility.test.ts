import { describe, expect, it } from "vitest";
import { evaluateAccessibility, filterPlaces } from "../utils/accessibility";
import { seedPlaces } from "./mocks/places";
import type { AccessibilityFeature, AccessibilityValue } from "../types/place";
const features = (value: AccessibilityValue) => ({
  rampa: value,
  intrareFaraTrepte: value,
  lift: value,
  toaletaAccesibila: value,
  parcareAccesibila: value,
  pavajTactil: value,
  semnalAudio: value,
});
describe("Accessibility score and filters", () => {
  it("implements the PDR example: ramp + step-free + elevator + toilet = 75", () => {
    expect(
      evaluateAccessibility({
        ...features("nu"),
        rampa: "da",
        intrareFaraTrepte: "da",
        lift: "da",
        toaletaAccesibila: "da",
      }),
    ).toMatchObject({ score: 75, status: "partial" });
  });
  it("keeps no data distinct from confirmed inaccessible", () => {
    expect(evaluateAccessibility(features("necunoscut"))).toMatchObject({
      score: 0,
      known: 0,
      status: "necunoscut",
    });
    expect(evaluateAccessibility(features("nu"))).toMatchObject({
      score: 0,
      known: 7,
      status: "redus",
    });
    expect(
      evaluateAccessibility({
        ...features("necunoscut"),
        parcareAccesibila: "da",
      }),
    ).toMatchObject({ status: "partial" });
    expect(evaluateAccessibility(features("da"))).toMatchObject({
      score: 100,
      status: "accesibil",
    });
  });
  it.each([
    { remove: ["rampa"], score: 80, status: "accesibil" },
    { remove: ["intrareFaraTrepte"], score: 75, status: "partial" },
    {
      remove: ["rampa", "lift", "toaletaAccesibila"],
      score: 50,
      status: "partial",
    },
    {
      remove: ["rampa", "lift", "toaletaAccesibila", "semnalAudio"],
      score: 45,
      status: "redus",
    },
  ])(
    "classifies the $score threshold correctly",
    ({ remove, score, status }) => {
      const data = features("da");
      remove.forEach((key) => {
        data[key as AccessibilityFeature] = "nu";
      });
      expect(evaluateAccessibility(data)).toMatchObject({ score, status });
    },
  );
  it("combines facilities with AND, supports aliases and diacritics", () => {
    const placesWithConfirmedUsm = seedPlaces.map((place) =>
      place.id === "usm" ? { ...place, accessibility: features("da") } : place,
    );
    const usm = filterPlaces(placesWithConfirmedUsm, {
      search: " USM ",
      category: "Universitate",
      minScore: 80,
      facilities: ["rampa", "parcareAccesibila"],
    });
    expect(usm.map((place) => place.id)).toEqual(["usm"]);
    expect(
      filterPlaces(seedPlaces, { search: "tehnica" }).map((place) => place.id),
    ).toContain("utm");
    expect(
      filterPlaces(seedPlaces, {
        search: "mall",
        facilities: ["rampa", "lift"],
      }),
    ).toEqual([]);
  });
  it("does not pass unknown values as yes and keeps catalog positions confirmed", () => {
    expect(filterPlaces(seedPlaces, { search: "port mall", minScore: 5 })).toEqual(
      [],
    );
    expect(filterPlaces(seedPlaces, { verifiedOnly: true })).toHaveLength(
      seedPlaces.length,
    );
    expect(seedPlaces).toHaveLength(48);
    expect(new Set(seedPlaces.map((place) => place.id)).size).toBe(48);
  });
});
