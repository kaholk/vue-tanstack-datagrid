# TESTPROJECT

Docelowy uklad repo:

```text
TESTPROJECT/
|- .vscode/
|- backend/
|- frontend/
|- packages/
|  \- datagrid/
```

## Po co tak

- `frontend` zostaje aplikacja demo i integracja.
- `backend` jest osobno, wiec frontend nie udaje pelnego projektu.
- `packages/datagrid` jest miejscem na wydzielana paczke pod npm.
- `.vscode` jest na root, wiec taski dzialaja dla calego repo.

## Dev

Frontend:

```sh
bun run dev:frontend
```

Backend:

```sh
php -S 127.0.0.1:8000 -t backend
```

## Nastepny krok

Kolejny sensowny etap to dodanie builda paczki `packages/datagrid`,
zeby publikacja na npm nie opierala sie na surowych plikach `src`.
