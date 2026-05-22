import pandas as pd
import numpy as np
import datetime
import os
import uuid

def generate_data(num_rows=1000):
    np.random.seed(42)
    
    # Generate base data
    start_date = datetime.datetime.now() - datetime.timedelta(days=365)
    dates = [start_date + datetime.timedelta(days=int(np.random.randint(0, 365)), 
                                             hours=int(np.random.randint(0, 24)),
                                             minutes=int(np.random.randint(0, 60))) 
             for _ in range(num_rows)]
    
    # Generate normal amounts (mostly between 10 and 500)
    amounts = np.random.lognormal(mean=4.0, sigma=1.0, size=num_rows)
    amounts = np.round(amounts, 2)
    
    # Create customer IDs (some repeat to show returning customers)
    base_customers = [f"CUST_{i:04d}" for i in range(1, 201)]
    customer_ids = np.random.choice(base_customers, size=num_rows)
    
    # Create transaction IDs
    transaction_ids = [str(uuid.uuid4()) for _ in range(num_rows)]
    
    # Assemble dataframe
    df = pd.DataFrame({
        "transaction_id": transaction_ids,
        "customer_id": customer_ids,
        "amount": amounts,
        "date": dates
    })
    
    # INJECT MESSY DATA
    
    # 1. Missing IDs (5% missing customer_id)
    missing_indices = np.random.choice(df.index, size=int(num_rows * 0.05), replace=False)
    df.loc[missing_indices, "customer_id"] = np.nan
    
    # 2. Negative amounts (returns) (10% returns)
    return_indices = np.random.choice(df.index, size=int(num_rows * 0.10), replace=False)
    df.loc[return_indices, "amount"] = -np.abs(df.loc[return_indices, "amount"])
    
    # 3. One massive outlier
    outlier_index = np.random.choice(df.index)
    df.loc[outlier_index, "amount"] = 999999.99
    
    # Create data directory if it doesn't exist
    current_dir = os.path.dirname(os.path.abspath(__file__))
    backend_dir = os.path.dirname(os.path.dirname(current_dir))
    data_dir = os.path.join(backend_dir, "data")
    os.makedirs(data_dir, exist_ok=True)
    
    output_path = os.path.join(data_dir, "raw_transactions.csv")
    
    # Save to CSV
    df.to_csv(output_path, index=False)
    print(f"Generated {num_rows} rows of messy data and saved to {output_path}")

if __name__ == "__main__":
    generate_data()
