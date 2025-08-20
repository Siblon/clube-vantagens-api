# Changelog
All notable changes to this project will be documented in this file.

## [2025-08-20]
### Added
- Planos service CRUD with Supabase and fixed controller import.
### Changed
- Exported createApp and guarded listen for test env; added explicit `/status` routes.
### Tests
- Added Jest setup, Supabase mock and basic route tests (health, status, planos).
### Chore
- Added cycle scripts for bash and PowerShell with EOL normalization (.editorconfig, .gitattributes).
### CI
- Added GitHub Actions workflow to run tests on Node 18, 20 and 22.
