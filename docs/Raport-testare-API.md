# Raport de testare API – AccesUrban Map

## 1. Cum pornesc testarea

1. Pornesc PostgreSQL/PostGIS.
2. Pornesc proiectul `AccesUrbanMap.Api` din Rider cu **Run**.
3. Deschid în browser: `http://localhost:5000/swagger`.

Swagger este interfața în care fiecare endpoint poate fi testat direct.

Pentru fiecare test:

1. Deschid endpointul apăsând pe rândul lui.
2. Apăs **Try it out** în partea dreaptă.
3. Completez câmpurile marcate ca `path`, `query` sau `body`.
4. Apăs **Execute**.
5. Verific `Response code` și răspunsul JSON.

`path` înseamnă că valoarea se scrie în URL. De exemplu, pentru
`/api/v1/places/{id}`, `{id}` devine `65` și URL-ul devine
`/api/v1/places/65`.

## 2. Cum folosesc ID-urile

- ID-ul unei locații se copiază din răspunsul `GET /api/v1/places`.
- Pentru demonstrație se poate folosi locația `65` – Academia de Studii Economice a Moldovei.
- ID-ul unui mesaj se copiază din răspunsul primit după `POST /api/v1/contact-messages`.
- ID-ul unui raport se copiază din răspunsul primit după trimiterea raportului.
- `verificationToken` se copiază din răspunsul `POST /api/v1/auth/login`.
- `code` este codul primit pe email și este valabil un minut.
- `token` se copiază din răspunsul `POST /api/v1/auth/login/verify`.
- `Trace ID` se copiază din headerul `X-Trace-Id` când un request eșuează.

Nu se inventează ID-uri. Se folosește ID-ul întors de endpointul anterior.

## 3. Teste publice

### T01 – Verificarea aplicației

Endpoint: `GET /api/v1/health`

Nu se completează nimic. Se apasă **Execute**.

Rezultat așteptat: `200 OK`, cu baza de date indicată ca fiind conectată.

Rezultat verificat: `200 OK`.

### T02 – Încărcarea locațiilor

Endpoint: `GET /api/v1/places`

Nu se completează nimic. Se apasă **Execute**.

Rezultat așteptat: `200 OK` și lista locațiilor cu `id`, `name`, `description`,
`address`, `latitude`, `longitude` și accesibilitate.

Rezultat verificat: `200 OK`, 51 de locații.

### T03 – Detaliile unei locații

Endpoint: `GET /api/v1/places/{id}`

1. Apăs **Try it out**.
2. La `id` scriu `65`.
3. Apăs **Execute**.

Rezultat așteptat: `200 OK` și detaliile Academiei de Studii Economice.

### T04 – Accesibilitatea unei locații

Endpoint: `GET /api/v1/places/{placeId}/accessibility`

1. Apăs **Try it out**.
2. La `placeId` scriu `65`.
3. Apăs **Execute**.

Rezultat așteptat: `200 OK` și câmpuri precum `wheelchairAccess`, `ramp`,
`stepFreeEntry`, `elevator` și `accessibleToilet`.

### T05 – Căutarea unei locații

Endpoint: `GET /api/v1/places/search`

1. Apăs **Try it out**.
2. La `query` scriu `Academia`.
3. Apăs **Execute**.

Rezultat așteptat: `200 OK` și locațiile care corespund căutării.

## 4. Autentificarea și tokenul

### T06 – Crearea unui utilizator de test

Endpoint: `POST /api/v1/auth/register`

În zona **Request body** șterg exemplul și introduc:

```json
{
  "name": "Demo User",
  "email": "adresa-mea@gmail.com",
  "password": "DemoPassword123!",
  "accessibilityProfile": "Wheelchair"
}
```

Emailul trebuie să fie unul la care am acces. Dacă emailul există deja,
folosesc o altă adresă de test.

Rezultat așteptat: `201 Created`.

### T07 – Cererea codului de conectare

Endpoint: `POST /api/v1/auth/login`

```json
{
  "email": "adresa-mea@gmail.com",
  "password": "DemoPassword123!"
}
```

După **Execute** copiez valoarea `verificationToken` din răspuns. Apoi deschid
Gmail și copiez codul din mesajul primit.

Rezultat așteptat: `200 OK`, `verificationToken` și `expiresAt`.

### T08 – Verificarea codului primit pe email

Endpoint: `POST /api/v1/auth/login/verify`

```json
{
  "verificationToken": "TOKEN_COPIAT_DE_LA_LOGIN",
  "code": "123456"
}
```

Înlocuiesc `TOKEN_COPIAT_DE_LA_LOGIN` și `123456` cu valorile reale.
Din răspuns copiez câmpul `token`.

Rezultat așteptat: `200 OK` și token JWT.

### T09 – Autorizarea în Swagger

1. Mă întorc sus în pagină și apăs **Authorize**.
2. În câmp scriu:

```text
Bearer TOKENUL_COPIAT_DE_LA_LOGIN_VERIFY
```

3. Apăs **Authorize**.
4. Apăs **Close**.

Acum Swagger trimite tokenul la endpointurile protejate.

### T10 – Verificarea profilului conectat

Endpoint: `GET /api/v1/auth/me`

Nu se completează nimic. Se apasă **Execute**.

Rezultat așteptat: `200 OK` și datele utilizatorului autentificat.

## 5. Mesaj către administrator

### T11 – Trimiterea unui mesaj

Endpoint: `POST /api/v1/contact-messages`

```json
{
  "name": "Demo User",
  "email": "adresa-mea@gmail.com",
  "subject": "Test API",
  "message": "Acesta este un mesaj trimis în timpul prezentării."
}
```

Din răspuns copiez `id`. Acest ID va fi folosit la citirea și răspunsul la mesaj.

### T12 – Citirea mesajului

Endpoint: `GET /api/v1/contact-messages/{id}`

1. Apăs **Try it out**.
2. La `id` scriu ID-ul primit la T11.
3. Apăs **Execute**.

Rezultat așteptat: `200 OK` și mesajul trimis.

### T13 – Răspunsul administratorului

Endpoint: `POST /api/v1/contact-messages/{id}/reply`

La `id` scriu același ID primit la T11. În body scriu:

```json
{
  "message": "Vă mulțumim pentru mesaj. Vom reveni în cel mai scurt timp."
}
```

Rezultat așteptat: `200 OK`. Administratorul poate verifica apoi emailul primit.

## 6. Raportarea unei probleme pe hartă

Endpoint: `POST /api/v1/reports/submit`

Acest endpoint se execută după autentificarea din T09.

```json
{
  "placeId": 65,
  "locationName": "Academia de Studii Economice a Moldovei",
  "latitude": 47.0246,
  "longitude": 28.8328,
  "type": "DamagedSidewalk",
  "description": "Trotuarul din fața intrării are o porțiune deteriorată."
}
```

Valorile permise pentru `type` sunt:

- `BlockedRamp`
- `DamagedSidewalk`
- `BrokenElevator`
- `WrongInformation`
- `Other`

Rezultat așteptat: `200 OK` și raportul creat cu un `id` propriu.

## 7. Testarea unei erori și a Trace ID-ului

1. Folosesc o fereastră incognito sau apăs **Authorize** → **Logout**.
2. Deschid `GET /api/v1/users`.
3. Apăs **Try it out** și **Execute**.
4. Rezultatul trebuie să fie `401 Unauthorized`.
5. În zona de headers copiez `X-Trace-Id`.

Explicația pentru prezentare:

> Utilizatorul primește un mesaj simplu și un Trace ID. Administratorul poate
> folosi acel Trace ID pentru a găsi eroarea completă în `GET /api/v1/errors`.

Endpointul de erori este accesibil doar administratorului.

## 8. Ordinea recomandată pentru prezentare

Prezint doar următoarele fluxuri, nu toate endpointurile:

1. `GET /api/v1/health` – aplicația și baza de date funcționează.
2. `GET /api/v1/places` – locațiile vin din baza de date.
3. `GET /api/v1/places/{id}` – o locație are detalii reale.
4. Login cu cod primit pe email – autentificare în doi pași.
5. `GET /api/v1/auth/me` – tokenul identifică utilizatorul.
6. `POST /api/v1/contact-messages` – utilizatorul trimite mesaj.
7. `POST /api/v1/reports/submit` – utilizatorul raportează o problemă.
8. `401 Unauthorized` + `Trace ID` – gestionarea controlată a erorilor.

## 9. Text scurt de spus

> Încep cu endpointul de health pentru a confirma că API-ul și baza de date
> sunt disponibile. Apoi verific locațiile încărcate din PostgreSQL și aleg o
> locație după ID pentru a-i vedea detaliile. Pentru zonele protejate folosesc
> autentificarea cu parolă și cod unic primit pe email. După autentificare,
> tokenul JWT este trimis automat de Swagger. În final demonstrez trimiterea
> unui mesaj și raportarea unei probleme. Dacă apare o eroare, utilizatorul
> primește un Trace ID, iar administratorul îl poate folosi pentru găsirea
> detaliilor în loguri.
