import pandas as pd
import camelot
import re

def reverse_arabic_if_needed(x):
    if isinstance(x, str):
        if re.search(r'[\u0600-\u06FF]', x):
            return x[::-1]  # Reverse the string
        elif re.match(r'^\d{1,2}[-/]\d{1,2}[-/]\d{2,4}$', x) or re.match(r'^\d+(\.\d+)?$', x):
            return x  # Return unchanged for dates and numbers
    return x

class ExtractTable:

    def __init__(self, file_path):
        self.file_path = file_path

    def extract_table_by_page(self, page):
        tables = camelot.read_pdf(self.file_path, pages=str(page), flavor='lattice')
        df = pd.concat([table.df for table in tables])
        df = df.map(reverse_arabic_if_needed)
        return df

    def extract_table_by_pages(self, pages):
        # Handle single pages or ranges like '1,3' or '1-3'
        if isinstance(pages, str):
            pages = pages.split(',')
            extracted_tables = []
            for page_range in pages:
                if '-' in page_range:
                    start, end = page_range.split('-')
                    if start.isdigit() and end.isdigit():
                        for page in range(int(start), int(end) + 1):
                            extracted_tables.append(self.extract_table_by_page(page))
                    elif end == "end":
                        # Handle "end" keyword - get all pages after the start
                        current_page = int(start)
                        while True:
                            try:
                                extracted_tables.append(self.extract_table_by_page(current_page))
                                current_page += 1
                            except camelot.errors.TableExtractionError:
                                break
                    else:
                        raise ValueError("Invalid page range")
                else:
                    extracted_tables.append(self.extract_table_by_page(int(page_range)))
            return extracted_tables
        elif isinstance(pages, list):
            return [self.extract_table_by_page(page) for page in pages]
        else:
            raise TypeError("Invalid pages type, should be string or list")


    def extract_table_by_page_numbers(self, page_numbers):
        """
        Extracts tables from a PDF based on provided comma-separated page numbers.
        Args:
            page_numbers (str): Comma-separated page numbers, like "1,4,6".
        Returns:
            list: A list of extracted tables as pandas DataFrames.
        """
        try:
            pages = [int(page) for page in page_numbers.split(',')]
            return [self.extract_table_by_page(page) for page in pages]
        except ValueError:
            raise ValueError("Invalid page numbers format")

    def extract_table_from_pdf(self, flavor='lattice', pages='all'):
        """
        Extracts tables from a PDF based on provided parameters.

        Args:
            flavor (str, optional): The parsing method to use (default: 'lattice').
            pages (str, optional): Comma-separated page numbers or ranges, like '1,3,4' or '1-end' or 'all' (default: 'all').

        Returns:
            list: A list of extracted tables as pandas DataFrames.
        """
        tables = camelot.read_pdf(self.file_path, pages=pages, flavor=flavor)
        df = pd.concat([table.df for table in tables])
        df = df.map(reverse_arabic_if_needed)
        return df