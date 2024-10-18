import pandas as pd
import camelot

class ExtractTable:
    def __init__(self, file_path):
        self.file_path = file_path

    def extract_table(self):
        tables = camelot.read_pdf(self.file_path, pages='all')
        df = pd.concat([table.df for table in tables])
        return df

    def extract_table_by_page(self, page_number):
        tables = camelot.read_pdf(self.file_path, pages=str(page_number))
        df = pd.concat([table.df for table in tables])
        return df

    def extract_separate_pages(self, page_numbers):
        all_dataframes = [None] * len(page_numbers)
        for i, page in enumerate(page_numbers):
            tables = camelot.read_pdf(self.file_path, pages=str(page))
            df = pd.concat([table.df for table in tables])
            all_dataframes[i] = df

        return all_dataframes

    def extract_table_by_range(self, start_page, end_page):
        all_dataframes = [None] * (end_page - start_page + 1)
        for page in range(start_page, end_page + 1):
            tables = camelot.read_pdf(self.file_path, pages=str(page))
            df = pd.concat([table.df for table in tables])
            all_dataframes[page - start_page] = df
        return all_dataframes