from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from datetime import datetime
import os
import shutil
import time
from util import ExtractTable

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
            if file_age >  24 * 60 * 60:
                os.remove(file_path)

@app.post("/upload-pdf")
async def upload_pdf(file: UploadFile = File(...)):
    if not file.filename.endswith('.pdf'):
        raise HTTPException(status_code=400, detail="Only PDF files are allowed")

    timestamp = datetime.now().strftime("%Y%m%d%H%M%S")
    filename = f"{timestamp}_{file.filename}"
    file_path = os.path.join(TEMP_DIR, filename)

    clean_old_pdfs()

    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    return {"filename": filename, "message": "PDF uploaded successfully", "documentURL": f"http://localhost:8008/pdf/{filename}"}

@app.get("/pdf/{filename}")
async def get_pdf(filename: str):
    file_path = os.path.join(TEMP_DIR, filename)
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="PDF not found")

    return FileResponse(file_path, media_type="application/pdf", filename=filename)


@app.post("/extract-tables")
async def extract_tables(filename: str, flavor: str = "lattice", pages: str = "all"):
    file_path = os.path.join(TEMP_DIR, filename)

    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="PDF not found")

    extractor = ExtractTable(file_path)
    result_df = extractor.extract_table()
    output_file = os.path.join(f"{filename}.xlsx")
    result_df.to_excel(output_file, index=False)
    return {"filename": output_file, "message": "Tables extracted successfully", "tablesURL": f"http://localhost:8008/excel/{output_file}"}

@app.get("/excel/{filename}")
async def get_excel(filename: str):
    file_path = os.path.join(filename)
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="Excel file not found")

    return FileResponse(file_path, media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", filename=filename)


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8008)