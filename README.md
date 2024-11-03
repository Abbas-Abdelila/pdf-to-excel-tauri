# PDF to Excel Converter

A cross-platform desktop app built with Tauri, Vite, and FastAPI that extracts tables from selected pages of a PDF and outputs them in Excel format.

## Features

- Upload a PDF and select the pages containing tables.
- Extracts tables from specified pages and saves them as an Excel file.
- Built using a web stack (Vite for the frontend, FastAPI for the backend) and Tauri for desktop capabilities.

## Requirements

- **Rust**: Required for Tauri to build the desktop app.
- **pnpm**: Used for package management in the Vite frontend. Install [pnpm](https://pnpm.io/installation).
- **Poetry**: Manages dependencies for the FastAPI backend. Install [Poetry](https://python-poetry.org/docs/#installation).
- **Ghostscript**: Required as it is used by camelot-py for extraction. Install [Ghostscript](https://www.ghostscript.com/).

## Getting Started

1. Clone the repository:

    ```bash
    git clone https://github.com/Abbas-Abdelila/pdf-to-excel-tauri.git
    cd pdf-to-excel-tauri
    ```

2. Install dependencies for both the frontend and backend:

    ```bash
    pnpm install
    poetry install
    ```

3. Ensure Ghostscript is installed for Camelot-py compatibility:

    - **Linux**: `sudo apt install ghostscript`
    - **macOS**: `brew install ghostscript`
    - **Windows**: Download and install from [Ghostscript’s official website](https://www.ghostscript.com/download/gsdnld.html).

## Development

To start the development environment:

```bash
pnpm run tauri dev
```

## Build

Configure tauri.conf.json and select add your target system to "bundle"

```bash
pnpm run tauri build
```
