using AccesUrbanMap.Domain;
using Microsoft.EntityFrameworkCore;
using NetTopologySuite.Geometries;

namespace AccesUrbanMap.Infrastructure.Persistence;

public static class PlaceDataSeeder
{
    public static async Task SeedAsync(
        AccesUrbanMapDbContext dbContext,
        CancellationToken cancellationToken = default)
    {
        var seedKeys = PlaceSeedData.All.Select(place => place.Key).ToArray();
        var existingSeededPlaces = await dbContext.Places
            .Where(place => place.SeedKey != null && seedKeys.Contains(place.SeedKey))
            .ToDictionaryAsync(place => place.SeedKey!, cancellationToken);

        var changed = false;
        foreach (var seed in PlaceSeedData.All)
        {
            if (existingSeededPlaces.TryGetValue(seed.Key, out var seededPlace))
            {
                if (MergeAccessibility(seededPlace, ValuesFor(seed)))
                    changed = true;
                continue;
            }

            var existingPlace = await dbContext.Places
                .FirstOrDefaultAsync(
                place => place.Name == seed.Name || place.Address == seed.Address,
                cancellationToken);
            if (existingPlace is not null)
            {
                existingPlace.SeedKey = seed.Key;
                existingSeededPlaces[seed.Key] = existingPlace;
                changed = true;
                if (MergeAccessibility(existingPlace, ValuesFor(seed)))
                    changed = true;
                continue;
            }

            var place = new Place
            {
                SeedKey = seed.Key,
                Name = seed.Name,
                Description = seed.Description,
                Category = seed.Category,
                Address = seed.Address,
                Latitude = seed.Latitude,
                Longitude = seed.Longitude,
                Geometry = CreatePoint(seed.Latitude, seed.Longitude),
                Source = seed.Source,
                IsVerified = seed.IsVerified,
            };
            MergeAccessibility(place, ValuesFor(seed));

            dbContext.Places.Add(place);
            changed = true;
        }

        var allPlaces = await dbContext.Places
            .ToListAsync(cancellationToken);
        foreach (var place in allPlaces)
        {
            if (MergeAccessibility(place, DefaultsForCategory(place.Category)))
                changed = true;
        }

        if (changed || dbContext.ChangeTracker.HasChanges())
            await dbContext.SaveChangesAsync(cancellationToken);
    }

    private static AccessibilityValues ValuesFor(SeedPlace seed)
    {
        var defaults = DefaultsForCategory(seed.Category);
        return new AccessibilityValues(
            seed.Ramp ?? defaults.Ramp,
            seed.StepFreeEntry ?? defaults.StepFreeEntry,
            seed.Elevator ?? defaults.Elevator,
            seed.AccessibleToilet ?? defaults.AccessibleToilet,
            seed.AccessibleParking ?? defaults.AccessibleParking,
            seed.TactilePaving ?? defaults.TactilePaving,
            seed.AudioSignal ?? defaults.AudioSignal);
    }

    private static AccessibilityValues DefaultsForCategory(string category)
    {
        var value = category.ToLowerInvariant();
        if (value.Contains("spital") || value.Contains("hospital"))
            return new(true, true, true, true, true, false, false);
        if (value.Contains("aeroport"))
            return new(true, true, true, true, true, true, true);
        if (value.Contains("transport"))
            return new(true, true, true, false, true, true, true);
        if (value.Contains("muzeu"))
            return new(true, true, true, true, false, true, true);
        if (value.Contains("restaurant"))
            return new(true, true, false, true, true, false, false);
        if (value.Contains("magazin") || value.Contains("comercial") || value.Contains("shopping"))
            return new(true, true, true, true, true, false, false);
        if (value.Contains("universitate"))
            return new(true, true, true, true, false, false, false);
        if (value.Contains("parc") || value.Contains("park"))
            return new(true, true, false, false, true, false, false);
        if (value.Contains("catedral"))
            return new(true, true, false, false, false, false, false);
        if (value.Contains("istoric") || value.Contains("hotel"))
            return new(false, false, false, false, false, false, false);
        return new(true, true, true, true, false, false, false);
    }

    private static bool MergeAccessibility(Place place, AccessibilityValues values)
    {
        var changed = false;

        if (place.Ramp is null && values.Ramp is not null)
        {
            place.Ramp = values.Ramp;
            changed = true;
        }
        if (place.StepFreeEntry is null && values.StepFreeEntry is not null)
        {
            place.StepFreeEntry = values.StepFreeEntry;
            changed = true;
        }
        if (place.Elevator is null && values.Elevator is not null)
        {
            place.Elevator = values.Elevator;
            changed = true;
        }
        if (place.AccessibleToilet is null && values.AccessibleToilet is not null)
        {
            place.AccessibleToilet = values.AccessibleToilet;
            changed = true;
        }
        if (place.AccessibleParking is null && values.AccessibleParking is not null)
        {
            place.AccessibleParking = values.AccessibleParking;
            changed = true;
        }
        if (place.TactilePaving is null && values.TactilePaving is not null)
        {
            place.TactilePaving = values.TactilePaving;
            changed = true;
        }
        if (place.AudioSignal is null && values.AudioSignal is not null)
        {
            place.AudioSignal = values.AudioSignal;
            changed = true;
        }

        var wheelchairAccess = CalculateWheelchairAccess(place);
        if (place.WheelchairAccess is null && wheelchairAccess is not null)
        {
            place.WheelchairAccess = wheelchairAccess;
            changed = true;
        }

        var score = CalculateScore(place);
        if (place.AccessibilityScore != score)
        {
            place.AccessibilityScore = score;
            changed = true;
        }
        return changed;
    }

    private static bool? CalculateWheelchairAccess(Place place) =>
        place.StepFreeEntry == true && place.Ramp != false
            ? true
            : place.StepFreeEntry == false ? false : null;

    private static int CalculateScore(Place place) =>
        (place.WheelchairAccess == true ? 20 : 0) +
        (place.Ramp == true ? 15 : 0) +
        (place.StepFreeEntry == true ? 20 : 0) +
        (place.Elevator == true ? 10 : 0) +
        (place.AccessibleToilet == true ? 15 : 0) +
        (place.AccessibleParking == true ? 10 : 0) +
        (place.TactilePaving == true ? 5 : 0) +
        (place.AudioSignal == true ? 5 : 0);

    private static Point CreatePoint(decimal latitude, decimal longitude) =>
        new((double)longitude, (double)latitude) { SRID = 4326 };

    private sealed record AccessibilityValues(
        bool? Ramp,
        bool? StepFreeEntry,
        bool? Elevator,
        bool? AccessibleToilet,
        bool? AccessibleParking,
        bool? TactilePaving,
        bool? AudioSignal);
}
