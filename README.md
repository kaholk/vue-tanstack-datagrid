# VUE-TANSTACK-DATAGRID

Docelowy uklad repo:

```text
VUE-TANSTACK-DATAGRID/
|- .vscode/
|- backend/
|- frontend/
|- packages/
|  \- datagrid/
```

## Po co tak

- `frontend` zostaje aplikacja demo i integracja.
- `backend` jest osobno, wiec frontend nie udaje pelnego projektu.
- `packages/datagrid` jest miejscem na wydzielana paczke pod npm / bun.
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

## Build paczki

Paczka `packages/datagrid` ma teraz osobny build do `dist/`, wiec eksporty paczki
nie wskazuja juz na surowe pliki `src`.

```sh
bun run build:datagrid
```

## License

Repo jest na licencji `MPL-2.0`. Szczegoly sa w pliku `LICENSE`.
