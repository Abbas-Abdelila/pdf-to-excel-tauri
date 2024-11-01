import os
import shutil
import time
import asyncio
import json
import uvicorn
from fastapi import FastAPI, UploadFile, File, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from datetime import datetime
from util import ExtractTable
import pypdf
from sse_starlette.sse import EventSourceResponse
import traceback
import pandas as pd

app = FastAPI()

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

TEMP_DIR = "temp_pdfs"
os.makedirs(TEMP_DIR, exist_ok=True)


# Create global progress queue
progress_queue = asyncio.Queue()

async def clear_progress_queue():
    try:
        while not progress_queue.empty():
            await progress_queue.get()
    except Exception as e:
        print(f"Error clearing progress queue: {str(e)}")

def clean_old_pdfs():
    now = time.time()
    for filename in os.listdir(TEMP_DIR):
        file_path = os.path.join(TEMP_DIR, filename)
        if os.path.isfile(file_path):
            file_age = now - os.path.getmtime(file_path)
            if file_age > 24 * 60 * 60:
                os.remove(file_path)

def clean_old_excels():
    now = time.time()
    for filename in os.listdir("."):
        if filename.endswith(".xlsx"):
            file_age = now - os.path.getmtime(filename)
            if file_age > 24 * 60 * 60:
                os.remove(filename)

@app.get('/extraction-progress')
async def extraction_progress(request: Request):
    async def event_generator():
        try:
            while True:
                if await request.is_disconnected():
                    print("Client disconnected")
                    break

                try:
                    # Get progress update with timeout
                    progress = await asyncio.wait_for(
                        progress_queue.get(),
                        timeout=0.5
                    )

                    # If we receive a special cleanup message, break the loop
                    if progress.get("type") == "cleanup":
                        break

                    yield {
                        "event": "message",
                        "retry": 500,
                        "data": json.dumps(progress)
                    }

                    # Exit after completion message
                    if progress.get("type") == "completion":
                        await asyncio.sleep(0.2)
                        break

                except asyncio.TimeoutError:
                    yield {
                        "event": "keepalive",
                        "data": json.dumps({"type": "keepalive"})
                    }

                await asyncio.sleep(0.1)

        except Exception as e:
            print(f"Error in event generator: {str(e)}")
            print(traceback.format_exc())

    return EventSourceResponse(event_generator())


@app.post("/upload-pdf")
async def upload_pdf(file: UploadFile = File(...)):
    timestamp = datetime.now().strftime("%Y%m%d%H%M%S")
    filename = f"{timestamp}_{file.filename}"
    file_path = os.path.join(TEMP_DIR, filename)

    clean_old_pdfs()

    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    with open(file_path, 'rb') as f:
        pdf_reader = pypdf.PdfReader(f)
        total_pages = len(pdf_reader.pages)

    return {
        "filename": filename,
        "message": "PDF uploaded successfully",
        "documentURL": f"http://localhost:8008/pdf/{filename}",
        "totalPages": total_pages
    }

@app.get("/pdf/{filename}")
async def get_pdf(filename: str):
    file_path = os.path.join(TEMP_DIR, filename)
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="PDF not found")
    return FileResponse(file_path, media_type="application/pdf", filename=filename)

@app.post("/extract-tables")
async def extract_tables(filename: str, flavor: str = "lattice", pages: str = "all"):
    clean_old_excels()
    session_id = datetime.now().strftime("%Y%m%d%H%M%S%f")
    file_path = os.path.join(TEMP_DIR, filename)
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="PDF not found")

    try:
        # Clear the progress queue before starting new extraction
        await clear_progress_queue()

        # Initial progress update
        await progress_queue.put({
            "type": "progress",
            "message": "Starting extraction process",
            "percentage": 0,
            "processed": 0,
            "total": 0,
            "timestamp": datetime.now().isoformat()
        })

        # add small delay
        await asyncio.sleep(0.3)

        extractor = ExtractTable(file_path, progress_queue)

        # Extract tables based on page selection
        if pages == "all":
            tables = await extractor.extract_table_from_pdf(flavor=flavor, pages=pages)
        elif ',' in pages:
                    # Handle comma-separated pages
            page_numbers = [int(p.strip()) for p in pages.split(',')]
            tables = []
            for page_num in page_numbers:
                page_tables = await extractor.extract_table_by_page(page_num, flavor=flavor)
                if isinstance(page_tables, pd.DataFrame) and not page_tables.empty:
                    tables.append(page_tables)
                elif isinstance(page_tables, list):
                    tables.extend([t for t in page_tables if isinstance(t, pd.DataFrame) and not t.empty])
        elif '-' in pages:
            start, end = map(int, pages.split('-'))
            tables = await extractor.extract_table_by_range(start, end, flavor=flavor)
        else:
            try:
                page_num = int(pages)
                tables = await extractor.extract_table_by_page(page_num, flavor=flavor)
            except ValueError:
                raise HTTPException(status_code=400, detail="Invalid pages parameter")

        # Handle case where no tables were found
        if tables is None or (isinstance(tables, pd.DataFrame) and tables.empty):
            await progress_queue.put({
                "type": "completion",
                "message": "No tables found in the specified pages",
                "percentage": 100,
                "processed": 0,
                "total": 0,
                "timestamp": datetime.now().isoformat(),
                "extractionComplete": True,
                "tables": 0
            })
            return {
                "filename": filename,
                "message": "No tables found in the specified pages",
                "number_of_tables": 0,
                "success": False
            }

        # Process extracted tables
        excel_files = []
        if isinstance(tables, list):
            num_tables = 0
            total_tables = sum(1 for t in tables if isinstance(t, pd.DataFrame) and not t.empty)

            for i, table in enumerate(tables):
                if not isinstance(table, pd.DataFrame) or table.empty:
                    continue

                output_file = f"{session_id}_{filename}_{i+1}.xlsx"
                output_path = os.path.join(output_file)
                table.to_excel(output_path, index=False)
                excel_files.append(output_file)
                num_tables += 1

                await progress_queue.put({
                    "type": "progress",
                    "message": f"Saved table {num_tables} of {total_tables} to Excel",
                    "percentage": (num_tables / total_tables) * 100,
                    "processed": num_tables,
                    "total": total_tables,
                    "timestamp": datetime.now().isoformat()
                })

                await asyncio.sleep(0.2)
        else:
            output_file = f"{session_id}_{filename}.xlsx"
            output_path = os.path.join(output_file)
            tables.to_excel(output_path, index=False)
            excel_files.append(output_file)
            num_tables = 1


            await progress_queue.put({
                "type": "progress",
                "message": "Saved table to Excel",
                "percentage": 95,
                "processed": 1,
                "total": 1,
                "timestamp": datetime.now().isoformat()
            })

            await asyncio.sleep(0.1)

        await asyncio.sleep(0.2)
        # Final completion message
        await progress_queue.put({
            "type": "completion",
            "message": "Extraction completed successfully",
            "percentage": 100,
            "processed": num_tables,
            "total": num_tables,
            "timestamp": datetime.now().isoformat(),
            "extractionComplete": True,
            "tables": num_tables
        })

        await asyncio.sleep(0.3)

        return {
            "filename": filename,
            "message": "Tables extracted successfully",
            "tablesURL": f"http://localhost:8008/excel/{filename}",
            "number_of_tables": num_tables,
            "success": True,
            "excel_files": excel_files
        }

    except Exception as e:
        print(f"Error in extract_tables: {str(e)}")
        print(traceback.format_exc())

        await asyncio.sleep(0.1)

        await progress_queue.put({
            "type": "error",
            "message": f"Error: {str(e)}",
            "percentage": 0,
            "processed": 0,
            "total": 0,
            "timestamp": datetime.now().isoformat()
        })

        return {
            "filename": filename,
            "message": f"Error during extraction: {str(e)}",
            "number_of_tables": 0,
            "success": False,
            "error": str(e)
        }

@app.get("/excel/{filename}")
async def get_excel(filename: str):
    files = []

    # Get all Excel files matching the base filename
    all_matching_files = [f for f in os.listdir() if f.endswith(".xlsx") and filename in f]

    if not all_matching_files:
        raise HTTPException(status_code=404, detail="Excel file not found")

    # Group files by session ID (first part before the filename)
    session_groups = {}
    for file in all_matching_files:
        session_id = file.split('_')[0]  # Get session ID
        if session_id not in session_groups:
            session_groups[session_id] = []
        session_groups[session_id].append(file)

    # Get most recent session (highest timestamp)
    latest_session = max(session_groups.keys())
    session_files = session_groups[latest_session]

    # Sort files using the original numbering pattern
    single_file = f"{latest_session}_{filename}.xlsx"
    first_file = f"{latest_session}_{filename}_1.xlsx"

    # Check for single file or first numbered file
    if single_file in session_files:
        files.append(single_file)
    elif first_file in session_files:
        files.append(first_file)

        # Check for additional numbered files
        num_files = 2
        while True:
            next_file = f"{latest_session}_{filename}_{num_files}.xlsx"
            if next_file not in session_files:
                break
            files.append(next_file)
            num_files += 1

    return {"files": files}


@app.get("/download/{filename}")
async def download_file(filename: str):
    file_path = os.path.join(filename)
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail=f"File not found: {filename}")

    return FileResponse(
        file_path,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        filename=filename
    )

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8008)
