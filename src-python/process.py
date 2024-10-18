import camelot
import pandas as pd
import re
import concurrent.futures
import os

# def split_and_move_column(df):
#     # Ensure column 1 is of type string
#     df[1] = df[1].astype(str)

#     # Split column 1 at the first space
#     split_series = df[1].str.split(' ', n=1, expand=True)

#     # Update column 1 with the part before the first space
#     df[1] = split_series[0].str.strip()

#     # Move the part after the first space to column 2
#     df[2] = split_series[1]

#     return df

# Function to reverse Arabic strings, ignoring dates and numbers
def reverse_arabic_if_needed(x):
    if isinstance(x, str):
        if re.search(r'[\u0600-\u06FF]', x):
            return x[::-1]  # Reverse the string
        elif re.match(r'^\d{1,2}[-/]\d{1,2}[-/]\d{2,4}$', x) or re.match(r'^\d+(\.\d+)?$', x):
            return x  # Return unchanged for dates and numbers
    return x  # Return unchanged for non-string types

# Function to process a single page
def process_page(page_number):
    print(f"Processing page {page_number}...")
    tables = camelot.read_pdf('gaza-victims.pdf', pages=str(page_number))
    df = pd.concat([table.df for table in tables])
    df = df.map(reverse_arabic_if_needed)
    print(f"Finished processing page {page_number}.")
    return df

# Main function to handle batch processing
def main():
    total_pages = 165  # Get total number of pages
    print(f"Total pages in PDF: {total_pages}")

    all_dataframes = [None] * total_pages  # Preallocate list for DataFrames

    # Use ThreadPoolExecutor for concurrent processing
    with concurrent.futures.ThreadPoolExecutor() as executor:
        futures = {executor.submit(process_page, page): page - 1 for page in range(1, total_pages + 1)}  # Store index

        for future in concurrent.futures.as_completed(futures):
            page_index = futures[future]  # Get the index
            try:
                df = future.result()
                all_dataframes[page_index] = df  # Place DataFrame in correct order
            except Exception as e:
                print(f"Error processing page {page_index + 1}: {e}")

    # Combine all DataFrames into a single DataFrame, filtering out None values
    df = pd.concat([df for df in all_dataframes if df is not None], ignore_index=True)
    # df = split_and_move_column(final_df)
    # Save to Excel
    df.to_excel('gaza-victims-165.xlsx', index=False)
    print(f"Extracted {len(df)} rows from {total_pages} pages.")
if __name__ == "__main__":
    main()