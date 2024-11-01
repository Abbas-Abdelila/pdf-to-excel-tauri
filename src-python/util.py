import pandas as pd
import camelot.io as camelot
from datetime import datetime, timedelta
import re
import pypdf
import traceback
import asyncio

def reverse_arabic_if_needed(x):
    if isinstance(x, str):
        if re.search(r'[\u0600-\u06FF]', x):
            return x[::-1]  # Reverse the string
        elif re.match(r'^\d{1,2}[-/]\d{1,2}[-/]\d{2,4}$', x) or re.match(r'^\d+(\.\d+)?$', x):
            return x  # Return unchanged for dates and numbers
    return x

class ExtractTable:
    def __init__(self, file_path, progress_queue=None):
        self.file_path = file_path
        self.progress_queue = progress_queue
        self.current_page = 0
        self.total_pages_to_process = 0
        self.last_progress_time = None
        self.progress_interval = 5  # seconds

    async def report_progress(self, message, percentage, processed_pages, total_pages, msg_type="progress"):
        if self.progress_queue:
            try:
                current_time = datetime.now()

                # Send progress if it's the first message, last message, or 5 seconds have passed
                should_send = (
                    self.last_progress_time is None or  # First message
                    msg_type in ["completion", "error"] or  # Important messages
                    self.last_progress_time + timedelta(seconds=self.progress_interval) <= current_time  # Time interval
                )

                if should_send:
                    progress_data = {
                        "type": msg_type,
                        "message": message,
                        "percentage": percentage,
                        "processed": processed_pages,
                        "total": total_pages,
                        "timestamp": current_time.isoformat()
                    }

                    # Add additional fields for completion message
                    if msg_type == "completion":
                        progress_data["extractionComplete"] = True
                        progress_data["tables"] = processed_pages

                    print(f"Reporting progress: {progress_data}")
                    await self.progress_queue.put(progress_data)
                    self.last_progress_time = current_time

            except Exception as e:
                print(f"Error reporting progress: {str(e)}")
                print(traceback.format_exc())

    async def extract_table_by_range(self, start_page, end_page, flavor):
        try:
            total_pages = end_page - start_page + 1
            await self.report_progress(
                f"Starting extraction for pages {start_page} to {end_page}",
                0, 0, total_pages
            )

            tables_list = []
            for idx, page_num in enumerate(range(start_page, end_page + 1), 1):
                # Process the current page
                page_tables = camelot.read_pdf(
                    self.file_path,
                    pages=str(page_num),
                    flavor=flavor
                )

                if len(page_tables) > 0:
                    tables_list.extend([table.df for table in page_tables])

                # Report progress
                percentage = (idx / total_pages) * 100
                await self.report_progress(
                    f"Processing page {page_num}",
                    percentage, idx, total_pages
                )

                # Add a small delay to prevent overwhelming the system
                await asyncio.sleep(0.1)

            if not tables_list:
                await self.report_progress(
                    "No tables found in specified range",
                    100, total_pages, total_pages,
                    msg_type="completion"
                )
                return pd.DataFrame()

            await self.report_progress(
                f"Found {len(tables_list)} tables in specified range",
                100, len(tables_list), len(tables_list),
                msg_type="completion"
            )

            df = pd.concat(tables_list, ignore_index=True)
            df = df.map(reverse_arabic_if_needed)
            return df

        except Exception as e:
            print(f"Error extracting tables from range {start_page}-{end_page}: {str(e)}")
            print(traceback.format_exc())
            await self.report_progress(
                f"Error: {str(e)}",
                0, 0, total_pages,
                msg_type="error"
            )
            raise

    async def extract_table_by_page(self, page, flavor):
        try:
            await self.report_progress(
                f"Processing page {page}",
                0, 0, 1
            )

            tables = camelot.read_pdf(self.file_path, pages=str(page), flavor=flavor)

            if len(tables) == 0:
                await self.report_progress(
                    f"No tables found on page {page}",
                    100, 1, 1,
                    msg_type="completion"
                )
                return pd.DataFrame()

            await self.report_progress(
                f"Found {len(tables)} tables in page {page}",
                100, len(tables), len(tables),
                msg_type="completion"
            )

            df = pd.concat([table.df for table in tables], ignore_index=True)
            df = df.map(reverse_arabic_if_needed)
            return df

        except Exception as e:
            print(f"Error extracting table from page {page}: {str(e)}")
            print(traceback.format_exc())
            await self.report_progress(
                f"Error: {str(e)}",
                0, 0, 1,
                msg_type="error"
            )
            raise

    async def extract_table_from_pdf(self, flavor='lattice', pages='all'):
        try:
            with open(self.file_path, 'rb') as f:
                pdf_reader = pypdf.PdfReader(f)
                total_pages = len(pdf_reader.pages)

            await self.report_progress(
                "Starting full PDF extraction",
                0, 0, total_pages
            )

            current_page = 0
            tables_list = []

            if pages == 'all':
                page_range = range(1, total_pages + 1)
            else:
                page_range = [int(p) for p in pages.split(',')]

            for page_num in page_range:
                current_page += 1

                page_tables = camelot.read_pdf(
                    self.file_path,
                    pages=str(page_num),
                    flavor=flavor
                )

                if len(page_tables) > 0:
                    tables_list.extend([table.df for table in page_tables])

                await self.report_progress(
                    f"Processing page {page_num}",
                    (current_page / total_pages) * 100,
                    current_page,
                    total_pages
                )

                await asyncio.sleep(0.1)

            if not tables_list:
                await self.report_progress(
                    "No tables found in document",
                    100, total_pages, total_pages,
                    msg_type="completion"
                )
                return pd.DataFrame()

            await self.report_progress(
                f"Found {len(tables_list)} tables in document",
                100, len(tables_list), len(tables_list),
                msg_type="completion"
            )

            df = pd.concat(tables_list, ignore_index=True)
            df = df.map(reverse_arabic_if_needed)
            return df

        except Exception as e:
            with open(self.file_path, 'rb') as f:
                pdf_reader = pypdf.PdfReader(f)
                total_pages = len(pdf_reader.pages)

            print(f"Error extracting tables from PDF: {str(e)}")
            print(traceback.format_exc())
            await self.report_progress(
                f"Error: {str(e)}",
                0, 0, total_pages,
                msg_type="error"
            )
            raise
