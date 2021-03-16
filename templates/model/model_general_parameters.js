let column_values_initially = [];
let column_values_cleaned = [];
let column_values_filtered = [];
let column_values_grouped = [];
let column_values_raw_dimensions = [];
let original_column_values_grouped = [];

let column_values_initially_no_missing_values = [];
let column_values_initially_with_missing_values = [];

let column_values_cleaned_no_missing_values = [];
let column_values_cleaned_with_missing_values = [];

let data_table_cleaned = [];


let threshold_categorical_outlier = 1;

const max_normalization_value = 1;
const min_normalized_deviation_value = -max_normalization_value;
const max_min_dimension_plot_add = 0.01;

const epsilon_percent_for_coefficient_of_unalikeability = 5;

let desciption_of_columns = {}