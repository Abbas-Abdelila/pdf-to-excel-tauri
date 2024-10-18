import os
import shutil
import time
from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from datetime import datetime
from util import ExtractTable
from camelot.core import TableList
from PyPDF2 import PdfReader


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


@app.post("/upload-pdf")
async def upload_pdf(file: UploadFile = File(...)):

    timestamp = datetime.now().strftime("%Y%m%d%H%M%S")
    filename = f"{timestamp}_{file.filename}"
    file_path = os.path.join(TEMP_DIR, filename)

    clean_old_pdfs()

    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    # Import PyPDF2 to get the total number of pages in the uploaded PDF

    # Open the uploaded PDF file to get the total number of pages
    with open(file_path, 'rb') as f:
        pdf_reader = PdfReader(f)
        total_pages = len(pdf_reader.pages)

    return {
        "filename": filename,
        "message": "PDF uploaded successfully",
        "documentURL": f"http://localhost:8008/pdf/{filename}",
        "totalPages": total_pages  # Return the total number of pages in the PDF
    }


@app.get("/pdf/{filename}")
async def get_pdf(filename: str):
    file_path = os.path.join(TEMP_DIR, filename)
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="PDF not found")

    return FileResponse(file_path,
                        media_type="application/pdf",
                        filename=filename)


@app.post("/extract-tables")
async def extract_tables(filename: str,
                         flavor: str = "lattice",
                         pages: str = "all"):
    clean_old_excels()
    file_path = os.path.join(TEMP_DIR, filename)
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="PDF not found")
    extractor = ExtractTable(file_path)
    if pages == "all":
        tables = extractor.extract_table_from_pdf(flavor=flavor, pages=pages)
    elif ',' in pages:
        tables = extractor.extract_table_by_page_numbers(pages)
    elif '-' in pages:
        tables = extractor.extract_table_by_pages(pages)
    else:
        try:
            page_num = int(pages)
            tables = extractor.extract_table_by_page(page_num)
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid pages parameter")

    if isinstance(tables, TableList):
        for i, table in enumerate(tables):
            output_file = os.path.join(f"{filename}_{i+1}.xlsx")
            table.df.to_excel(output_file, index=False)
            print(f"Extracted table from page {i+1} and saved to {output_file}")

    elif isinstance(tables, list):
        for i, table in enumerate(tables):
            output_file = os.path.join(f"{filename}_{i+1}.xlsx")
            table.to_excel(output_file, index=False)
            print(f"Extracted table from page {i+1} and saved to {output_file}")

    else:
        output_file = os.path.join(f"{filename}.xlsx")
        tables.to_excel(output_file, index=False)
        print(f"Extracted table and saved to {output_file}")

    return {
        "filename": filename,
        "message": "Tables extracted successfully",
        "tablesURL": f"http://localhost:8008/excel/{filename}",
        "number of tables": len(tables)
    }

@app.get("/excel/{filename}")
async def get_excel(filename: str):
    files = []
    file_path_1 = os.path.join(f"{filename}.xlsx")
    file_path_2 = os.path.join(f"{filename}_1.xlsx")
    if not os.path.exists(file_path_1) and not os.path.exists(file_path_2):
        raise HTTPException(status_code=404, detail="Excel file not found")

    if os.path.exists(file_path_1):
        files.append(f"{filename}.xlsx")
    else:
        files.append(f"{filename}_1.xlsx")


    # Check for numbered files
    num_files = 2
    while True:
        next_file = f"{filename}_{num_files}.xlsx"
        next_file_path = os.path.join(next_file)
        if not os.path.exists(next_file_path):
            break
        files.append(next_file)
        num_files += 1

    # If no files were found, raise an exception
    if not files:
        raise HTTPException(status_code=404, detail="No matching Excel files found")

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
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8008)
