import logging
import pandas as pd
from sklearn.neighbors import LocalOutlierFactor
from sklearn.cluster import KMeans
from sklearn.preprocessing import StandardScaler
from sklearn.metrics import silhouette_score

logging.basicConfig(level=logging.INFO, format='%(asctime)s [%(levelname)s] %(message)s')
logger = logging.getLogger(__name__)

def detect_outliers(
    rfm: pd.DataFrame,
    n_neighbors: int = 20,
    contamination: float = 0.05
) -> tuple[pd.DataFrame, pd.DataFrame]:
    """
    Apply sklearn's LocalOutlierFactor to the RFM feature matrix to detect extreme anomalies.
    
    Args:
        rfm (pd.DataFrame): RFM DataFrame.
        n_neighbors (int): Number of neighbors for LOF. Defaults to 20.
        contamination (float): Expected proportion of outliers. Defaults to 0.05.
        
    Returns:
        tuple[pd.DataFrame, pd.DataFrame]: A tuple containing the inliers DataFrame 
        and outliers DataFrame, both indexed by customer_id.
    """
    # WHY LOF BEFORE K-MEANS:
    # K-Means minimises within-cluster variance. A single extreme outlier
    # (e.g. a whale customer spending 100x the median) will pull a centroid
    # toward itself, distorting all four cluster boundaries. LOF detects
    # points whose local density is significantly lower than their
    # neighbours — exactly the definition of an anomalous spender —
    # without assuming a global distribution shape.
    
    # Scale the three RFM features first using StandardScaler.
    # LOF is distance-based, so unscaled features with different magnitudes 
    # (recency in days vs. monetary in currency units) would bias the distance 
    # metric toward whichever feature has the largest absolute range.
    # Note: A fresh scaler instance is used here independent of K-Means.
    scaler = StandardScaler()
    rfm_scaled = scaler.fit_transform(rfm)
    
    # LOF configuration
    # n_neighbors: 20 (default; too low = noisy, too high = smooth)
    # contamination: 0.05 (expect ~5% outliers from the simulator)
    # novelty: False (transductive mode: score training points only)
    lof = LocalOutlierFactor(
        n_neighbors=n_neighbors, 
        contamination=contamination, 
        novelty=False
    )
    
    lof_labels = lof.fit_predict(rfm_scaled)
    
    inliers_df = rfm[lof_labels == 1].copy()
    outliers_df = rfm[lof_labels == -1].copy()
    
    total = len(rfm)
    n_outliers = len(outliers_df)
    pct = (n_outliers / total) * 100 if total > 0 else 0.0
    
    logger.info(f"LOF detected {n_outliers} outliers ({pct:.1f}%) from {total} customers.")
    return inliers_df, outliers_df

def run_kmeans(
    inliers: pd.DataFrame,
    k: int = 4,
    random_state: int = 42
) -> pd.DataFrame:
    """
    Apply KMeans clustering to the inlier RFM DataFrame.
    
    Args:
        inliers (pd.DataFrame): Inliers RFM DataFrame.
        k (int): Number of clusters. Defaults to 4.
        random_state (int): Random state for reproducibility. Defaults to 42.
        
    Returns:
        pd.DataFrame: Labelled inliers DataFrame with a new 'cluster_label' column.
    """
    # WHY k=4:
    # The four segments map to a well-established marketing taxonomy:
    # Champions (high R, high F, high M), Loyal Customers (mid-high F),
    # At-Risk (previously active, now dormant), Hibernating (low on all).
    
    # For a production system, an elbow-method helper could be used:
    # inertias = []
    # for n in range(2, 11):
    #     km = KMeans(n_clusters=n, init='k-means++', n_init=10, max_iter=300, random_state=random_state)
    #     km.fit(inliers_scaled)
    #     inertias.append(km.inertia_)
    # # plot(range(2, 11), inertias)
    
    # Scale inliers with StandardScaler before fitting KMeans.
    # Use a new scaler instance because the outlier filtering step changes the distribution.
    scaler = StandardScaler()
    inliers_scaled = scaler.fit_transform(inliers)
    
    km = KMeans(
        n_clusters=k,
        init='k-means++', # smarter centroid init, fewer iterations
        n_init=10,        # run 10 times, keep best inertia
        max_iter=300,
        random_state=random_state # reproducibility
    )
    
    raw_labels = km.fit_predict(inliers_scaled)
    inliers_labelled = inliers.copy()
    inliers_labelled['raw_cluster'] = raw_labels
    
    score = silhouette_score(inliers_scaled, raw_labels)
    logger.info(f"K-Means silhouette score: {score:.4f}")
    if score < 0.25:
        logger.warning("Silhouette score is below 0.25. Analyst should inspect cluster separation.")
    
    # Map raw integer cluster labels (0, 1, 2, 3) to human-readable names.
    # Note: Centroid-based label assignment is deterministic only within a fixed dataset.
    # On a live, growing dataset the rank order should be validated after each re-run.
    cluster_means = inliers_labelled.groupby('raw_cluster')['monetary'].mean().sort_values(ascending=False)
    
    # rank 0 (highest monetary) -> "Champions"
    # rank 1 -> "Loyal"
    # rank 2 -> "At-Risk"
    # rank 3 (lowest monetary) -> "Hibernating"
    rank_mapping = {}
    names = ["Champions", "Loyal", "At-Risk", "Hibernating"]
    for i, raw_id in enumerate(cluster_means.index):
        rank_mapping[raw_id] = names[i] if i < len(names) else f"Segment {i}"
        
    inliers_labelled['cluster_label'] = inliers_labelled['raw_cluster'].map(rank_mapping)
    inliers_labelled.drop(columns=['raw_cluster'], inplace=True)
    
    return inliers_labelled

def compute_cluster_summary(labelled: pd.DataFrame) -> pd.DataFrame:
    """
    Group the labelled inliers DataFrame by 'cluster_label' and compute summary metrics.
    
    Args:
        labelled (pd.DataFrame): Labelled inliers DataFrame.
        
    Returns:
        pd.DataFrame: Summary DataFrame.
    """
    summary = labelled.groupby("cluster_label").agg(
        count=("recency", "size"),
        recency=("recency", "mean"),
        frequency=("frequency", "mean"),
        monetary=("monetary", "mean")
    ).reset_index()
    
    logger.info("Cluster Summary:\n" + summary.to_string())
    return summary
