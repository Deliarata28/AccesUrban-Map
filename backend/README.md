# Backend AccesUrbanMap

## Pornire

```powershell
docker compose up -d database
dotnet run --project backend/Api/AccesUrbanMap.Api.csproj
```

PostgreSQL ruleaza cu imaginea `postgis/postgis`. API-ul aplica doar migrarile noi si pastreaza volumul `accesurbanmap-postgres`.

## Baza de date

Modelul foloseste PostGIS pentru puncte geografice in `places.geometry` si `reports.geometry`. Latitudinea si longitudinea raman pastrate separat pentru API si frontend. `spatial_ref_sys` este metadata interna PostGIS, nu o entitate a proiectului.

Accesibilitatea este pastrata direct pe `places`, iar erorile sunt salvate in `error_logs` de middleware. Tabela de erori este accesibila doar administratorului prin `GET /api/v1/errors` si `GET /api/v1/errors/{id}`.

## E-mail si autentificare

```powershell
dotnet user-secrets set "Smtp:Password" "PAROLA_DE_APLICATIE_GMAIL" --project backend/Api/AccesUrbanMap.Api.csproj
```

Formularul de contact salveaza mesajul in `contact_messages` si trimite notificarea administratorului. Codul de conectare este valabil un minut, este stocat doar ca hash si are maximum cinci incercari.

## Loguri si erori

Serilog pastreaza doar evenimente de nivel Error si mai sus. Pentru erori, logul include metoda, ruta, statusul si Trace ID-ul. Utilizatorul vede in pop-up mesajul si Trace ID-ul; detaliile tehnice raman in `error_logs` si in fisierele serverului.
