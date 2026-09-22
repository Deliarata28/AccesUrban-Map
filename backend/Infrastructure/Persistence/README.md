# Persistenta bazei de date

Schema foloseste PostgreSQL cu PostGIS:

- `places` pastreaza datele locatiei, coordonate simple si geometria PostGIS `Point(4326)`.
- `reports` pastreaza coordonatele raportului si geometria lui cand exista coordonate.
- campurile de accesibilitate sunt direct pe `places`; nu exista o entitate separata `AccessibilityFeature`.
- `error_logs` este entitatea folosita de middleware pentru erori HTTP si exceptii.

`spatial_ref_sys` este tabela tehnica standard instalata de extensia PostGIS. Ea descrie sistemele de coordonate si nu trebuie modelata ca entitate de aplicatie. Pentru proiect, coordonatele sunt WGS84 / EPSG:4326.

`PlaceDataSeeder` este idempotent: adauga locatiile lipsa si completeaza doar valorile de accesibilitate lipsa. Nu sterge utilizatori, raportari sau modificari manuale si nu recreeaza baza la fiecare pornire.
