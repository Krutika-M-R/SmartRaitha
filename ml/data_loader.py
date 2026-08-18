import pandas as pd
from config import get_connection


def load_price_history():
    """
    Pull every price record, joined with crop and mandi names, into a
    pandas DataFrame ready for feature engineering.
    """
    query = """
        SELECT
            p.id,
            p."cropId"   AS crop_id,
            c.name       AS crop_name,
            p."mandiId"  AS mandi_id,
            m.name       AS mandi_name,
            p."minPrice"   AS min_price,
            p."maxPrice"   AS max_price,
            p."modalPrice" AS modal_price,
            p.date
        FROM "Price" p
        JOIN "Crop" c ON c.id = p."cropId"
        JOIN "Mandi" m ON m.id = p."mandiId"
        ORDER BY p.date ASC;
    """
    conn = get_connection()
    try:
        df = pd.read_sql(query, conn)
    finally:
        conn.close()

    return clean(df)


def clean(df: pd.DataFrame) -> pd.DataFrame:
    """Basic cleaning: drop missing prices/dates, remove obvious outliers."""
    df = df.dropna(subset=["modal_price", "date"])
    df = df[df["modal_price"] > 0]

    # Drop rows where modal_price is wildly outside the min/max range -
    # a simple sanity check on bad government data entries.
    df = df[(df["modal_price"] >= df["min_price"] * 0.5) & (df["modal_price"] <= df["max_price"] * 1.5)]

    df["date"] = pd.to_datetime(df["date"])
    return df.reset_index(drop=True)


if __name__ == "__main__":
    data = load_price_history()
    print(f"Loaded {len(data)} clean price records.")
    print(data.head())
