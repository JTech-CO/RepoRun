# RepoRun report

octo/demo
Commit: a49d85e211029f2f055bafbc5adb9fdff34451b8
Directory: /
Checked: 2026-09-19T11:41:12.817Z

Only the selected directory is inspected. Parent configuration, nested packages, CI workflows and runtime behavior are not resolved.
READ-ONLY · NO COMMANDS EXECUTED

## Project type [Declared]

    Node.js / JavaScript package
A package manifest is present. This is not proof the project builds or starts.
https://github.com/octo/demo/blob/a49d85e211029f2f055bafbc5adb9fdff34451b8/package.json

## Runtime declarations [Declared]

    engines.node: >=22
    .nvmrc: 22
These declarations are shown separately. Version ranges are not resolved or checked for compatibility.
https://github.com/octo/demo/blob/a49d85e211029f2f055bafbc5adb9fdff34451b8/package.json
https://github.com/octo/demo/blob/a49d85e211029f2f055bafbc5adb9fdff34451b8/.nvmrc#L1

## Package manager [Declared]

    pnpm@10.14.0
The project declares this manager. Its installation and version were not verified.
https://github.com/octo/demo/blob/a49d85e211029f2f055bafbc5adb9fdff34451b8/package.json

## Build script [Declared]

    tsc --noEmit && vite build
Only a declared build script is reported. No install, build or runtime test is performed.
https://github.com/octo/demo/blob/a49d85e211029f2f055bafbc5adb9fdff34451b8/package.json

## Declared tools [Declared]

    vite
A dependency declaration does not establish deployment mode or a required external service.
https://github.com/octo/demo/blob/a49d85e211029f2f055bafbc5adb9fdff34451b8/package.json

## Configuration files [Declared]

    vite.config.ts
Presence only. Executable configuration files are not evaluated.
https://github.com/octo/demo/blob/a49d85e211029f2f055bafbc5adb9fdff34451b8/vite.config.ts

## Static hosting compatibility [Not established]

    Not established
RepoRun does not certify GitHub Pages or other static hosting compatibility.
https://github.com/octo/demo/blob/a49d85e211029f2f055bafbc5adb9fdff34451b8/index.html

## Commands

Literal scripts from package.json, not verified launch instructions. A package manager may supply PATH entries and run pre/post hooks. Copying does not execute anything.

    dev: vite --host
https://github.com/octo/demo/blob/a49d85e211029f2f055bafbc5adb9fdff34451b8/package.json

    build: tsc --noEmit && vite build
https://github.com/octo/demo/blob/a49d85e211029f2f055bafbc5adb9fdff34451b8/package.json

    preview: vite preview
https://github.com/octo/demo/blob/a49d85e211029f2f055bafbc5adb9fdff34451b8/package.json

    test: node --test
https://github.com/octo/demo/blob/a49d85e211029f2f055bafbc5adb9fdff34451b8/package.json

## Environment variable names

Names from example/template files only. Values are discarded; presence does not prove a variable is required.

    API_BASE_URL
https://github.com/octo/demo/blob/a49d85e211029f2f055bafbc5adb9fdff34451b8/.env.example#L1
    API_KEY
https://github.com/octo/demo/blob/a49d85e211029f2f055bafbc5adb9fdff34451b8/.env.example#L2

## Container clues
    node:22-alpine
Base-image declaration only; a Dockerfile does not prove Docker is required for all usage.
https://github.com/octo/demo/blob/a49d85e211029f2f055bafbc5adb9fdff34451b8/Dockerfile#L1

## README command examples

A small sample of shell-like fenced lines from this directory’s README. Context and multi-line sequences may be incomplete. Open the source before use.
    pnpm install
https://github.com/octo/demo/blob/a49d85e211029f2f055bafbc5adb9fdff34451b8/README.md#L6
    pnpm run dev
https://github.com/octo/demo/blob/a49d85e211029f2f055bafbc5adb9fdff34451b8/README.md#L7

## Review notes

## Files examined
    package.json: Read
    .nvmrc: Read
    .env.example: Read
    README.md: Read
    Dockerfile: Read
    index.html: Presence only
    pnpm-lock.yaml: Presence only
    vite.config.ts: Presence only
