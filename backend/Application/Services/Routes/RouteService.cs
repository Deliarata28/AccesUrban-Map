namespace AccesUrbanMap.Application.Services.Routes;

public class RouteService
{
    public RouteResult Create(RouteRequest request)
    {
        var distanceKilometers = HaversineDistance(request.Origin, request.Destination);

        return new RouteResult(
            request.Origin,
            request.Destination,
            request.Profile,
            Math.Round(distanceKilometers * 1000, 0),
            Math.Max(1, (int)Math.Ceiling(distanceKilometers / 4.0 * 60)));
    }

    private static double HaversineDistance(RoutePoint origin, RoutePoint destination)
    {
        const double earthRadiusKilometers = 6371;
        var latitudeDifference = DegreesToRadians((double)(destination.Latitude - origin.Latitude));
        var longitudeDifference = DegreesToRadians((double)(destination.Longitude - origin.Longitude));
        var originLatitude = DegreesToRadians((double)origin.Latitude);
        var destinationLatitude = DegreesToRadians((double)destination.Latitude);
        var a = Math.Sin(latitudeDifference / 2) * Math.Sin(latitudeDifference / 2) +
                Math.Cos(originLatitude) * Math.Cos(destinationLatitude) *
                Math.Sin(longitudeDifference / 2) * Math.Sin(longitudeDifference / 2);
        return earthRadiusKilometers * 2 * Math.Atan2(Math.Sqrt(a), Math.Sqrt(1 - a));
    }

    private static double DegreesToRadians(double value) => value * Math.PI / 180;
}

public record RouteRequest(RoutePoint Origin, RoutePoint Destination, string Profile);
public record RoutePoint(decimal Latitude, decimal Longitude);
public record RouteResult(RoutePoint Origin, RoutePoint Destination, string Profile, double DistanceMeters, int EstimatedMinutes);
