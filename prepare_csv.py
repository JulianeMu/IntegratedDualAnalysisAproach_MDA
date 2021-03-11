import pandas as pd
import os


if __name__ == "__main__":

    # load csv
    table = pd.read_csv(os.path.join("resources", "Vincent_DBVJNS_pseudonymized.csv"), delimiter="\t")

    # rename first table
    table.rename(columns={'Unnamed: 0': 'id'}, inplace=True)

    # filter columns
    selected_columns = ['id', "pseudonym", "Group012", "Mixed_Type"]  #"Group_CAA_Mixed_CAA_like", "Group_HA_Mixed_HA_like"
    filtered_table = table[selected_columns]

    # rename first column
    patientnames = {x for x in os.listdir(os.path.join("resources", "input", "patients"))}
    filtered_table = filtered_table[filtered_table["pseudonym"].isin(patientnames)]

    # set new id values
    filtered_table["id"] = range(0, len(filtered_table))

    # write csv
    filtered_table.to_csv(os.path.join("resources", "test.csv"), index=False)



