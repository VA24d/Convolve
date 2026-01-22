from qdrant_client import QdrantClient
from qdrant_client.http import models as qdrant_models

from convolve.config import load_settings
from convolve.qdrant_client import QdrantCollections


def main() -> None:
    settings = load_settings()
    client = QdrantClient(url=settings.qdrant_url, api_key=settings.qdrant_api_key)
    collections = QdrantCollections()

    count_all = client.count(collection_name=collections.schemes, exact=True)
    print(f"Total points: {count_all.count}")

    query_filter = qdrant_models.Filter(
        must=[
            qdrant_models.FieldCondition(
                key="eligibility_rules.caste",
                match=qdrant_models.MatchValue(value="SC"),
            ),
            qdrant_models.FieldCondition(
                key="eligibility_rules.land_max_acres",
                range=qdrant_models.Range(lte=2.0),
            ),
        ],
        should=[
            qdrant_models.FieldCondition(
                key="states",
                match=qdrant_models.MatchValue(value="Rajasthan"),
            ),
            qdrant_models.FieldCondition(
                key="states",
                match=qdrant_models.MatchValue(value="All"),
            ),
        ],
    )

    filtered_count = client.count(
        collection_name=collections.schemes,
        count_filter=query_filter,
        exact=True,
    )
    print(f"Filtered points: {filtered_count.count}")

    results = client.scroll(
        collection_name=collections.schemes,
        scroll_filter=query_filter,
        with_payload=True,
        limit=3,
    )
    print("Sample payloads:")
    for point in results[0]:
        print(point.payload)


if __name__ == "__main__":
    main()