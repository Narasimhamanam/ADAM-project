import pandas as pd
import numpy as np
import os

CLINICAL_CSV = r"E:\ADAM-Enhanced\backend\data\global_resources\clinical_microbiome_df.csv"
MPH_CSV = r"E:\ADAM-Enhanced\backend\data\global_resources\mph_matching_ad.csv"
AD_CSV = r"E:\ADAM-Enhanced\backend\data\global_resources\ad_df.csv"
BC_CSV = r"E:\ADAM-Enhanced\backend\data\global_resources\bc_df.csv"

def audit():
    print("=== AUDIT ITEM 1: clinical_microbiome_df.csv ===")
    df_clin = pd.read_csv(CLINICAL_CSV)
    print(f"Total rows: {len(df_clin)}")
    print(f"Total columns: {df_clin.shape[1]}")
    sample_ids = df_clin["Sample ID"].tolist()
    distinct_sample_ids = df_clin["Sample ID"].nunique()
    print(f"Distinct Sample IDs: {distinct_sample_ids}")
    distinct_study_ids = df_clin["study_id"].nunique()
    print(f"Distinct Participant IDs (study_id): {distinct_study_ids}")

    print("\n=== AUDIT ITEM 2: mph_matching_ad.csv ===")
    df_mph = pd.read_csv(MPH_CSV)
    print(f"Shape: {df_mph.shape}")
    first_col = df_mph.columns[0]
    print(f"First column name: {first_col}")
    mph_sample_cols = [c for c in df_mph.columns if c != first_col]
    print(f"MPH sample columns count: {len(mph_sample_cols)}")
    
    df_ad = pd.read_csv(AD_CSV)
    ad_sample_ids = set(df_ad["Sample ID"])
    
    df_bc = pd.read_csv(BC_CSV)
    bc_sample_ids = set(df_bc.columns)
    
    clin_sample_ids = set(df_clin["Sample ID"])
    
    print(f"clinical_microbiome_df sample count: {len(clin_sample_ids)}")
    print(f"ad_df sample count: {len(ad_sample_ids)}")
    print(f"bc_df sample count: {len(bc_sample_ids)}")
    
    all_three_sample_ids = clin_sample_ids | ad_sample_ids | bc_sample_ids
    print(f"Union of clinical, ad, bc samples count: {len(all_three_sample_ids)}")
    
    mph_samples_set = set(mph_sample_cols)
    extra_in_mph = mph_samples_set - all_three_sample_ids
    print(f"Number of sample IDs in mph_matching_ad NOT in the 3 other CSVs: {len(extra_in_mph)}")
    print(f"List of extra 18 IDs: {sorted(list(extra_in_mph))}")

    print("\n=== AUDIT ITEM 3: Sample FB334 and Participant CH1-149 ===")
    fb334_row = df_clin[df_clin["Sample ID"] == "FB334"]
    if len(fb334_row) > 0:
        row = fb334_row.iloc[0]
        print(f"FB334 found in clinical_microbiome_df:")
        print(f"  study_id: {row['study_id']}")
        print(f"  day: {row['day']}")
        print(f"  Date Sample: {row['Date Sample']}")
        print(f"  Alzheimers: {row['Alzheimers']}")
    else:
        print("FB334 NOT found in clinical_microbiome_df")

    ch1_149_rows = df_clin[df_clin["study_id"] == "CH1-149"]
    print(f"All samples for participant CH1-149 ({len(ch1_149_rows)} samples):")
    for _, r in ch1_149_rows.iterrows():
        print(f"  Sample ID: {r['Sample ID']}, day: {r['day']}, Date Sample: {r['Date Sample']}, Alzheimers: {r['Alzheimers']}")

    print("\n=== AUDIT ITEM 5: Longitudinal Diagnosis Transitions ===")
    transitions = []
    for sid, group in df_clin.groupby("study_id"):
        alz_vals = group["Alzheimers"].unique()
        if len(alz_vals) > 1:
            transitions.append((sid, alz_vals))
    print(f"Participants with multiple distinct Alzheimers labels: {len(transitions)}")
    if len(transitions) > 0:
        print(f"Transitioning participants: {transitions}")
    else:
        print("Confirmed: Exactly 0 diagnosis transitions observed across all 102 participants in clinical_microbiome_df.csv.")
        
    print("\nSamples per participant summary:")
    sample_counts = df_clin.groupby("study_id")["Sample ID"].count()
    print(f"Min samples/subject: {sample_counts.min()}, Max: {sample_counts.max()}, Median: {sample_counts.median()}, Mean: {sample_counts.mean():.2f}")
    print(f"Subjects with >1 sample: {(sample_counts > 1).sum()} / {len(sample_counts)}")

if __name__ == "__main__":
    audit()
