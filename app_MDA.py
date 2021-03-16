import time
from datetime import datetime

import jsonpickle
import numpy
import pandas as pd
from flask import Flask, request, jsonify
import compute_descriptive_statistics_MDA as cds
import global_variables as gv
try:
    import get_data_from_server
except ImportError:
    pass;

start_time = time.time()

app = Flask(__name__)

id_data_type__categorical = "string"
id_data_type__numerical = "number"
id_data_type__date = "date"


# merged_all = get_data_from_server.get_dataframe_from_server()

# csv_file_name_missing_values = 'clinical_data_whole.csv'
# merged_all.to_csv(csv_file_name_missing_values, index=False)

# missingness = merged_all.isnull().astype(int).sum()
# print(missingness)
# header = merged_all.head()
# abc = merged_all.head()
# abc['missing count'] = missingness
# csv_file_name_missing_values = 'clinical_data_missingness.csv'
# missingness.to_csv(csv_file_name_missing_values, index=False)


# FALK
# merged_all = pd.read_csv("resources/Repro_FastSurfer_run-01_cleaned.csv", keep_default_na=False, na_values=[""])

# synthetic
merged_all = pd.read_csv("resources/plantTraits.csv", keep_default_na=False, na_values=[""], encoding='Latin-1', low_memory=False)
data_desc = pd.read_csv("resources/DataDict_plantTraits.csv",keep_default_na=False, na_values=[""])

merged_all = merged_all.loc[:, ~merged_all.columns.duplicated()]  # remove duplicate rows

gv.initial_length_of_data_rows = len(merged_all)

# get all data types
dataTypeSeries = merged_all.dtypes


def is_number(s):
    try:
        complex(s)  # for int, long, float and complex
    except ValueError:
        return False
    return True


class ColumnElementsClass(object):
    def __init__(self, header, column_id, data_type, col_values, descriptive_statistics):
        self.header = header
        self.id = column_id
        self.data_type = data_type
        self.column_values = col_values
        self.key_datatype_change = False
        self.key_removed_during_data_formatting = []
        self.descriptive_statistics = descriptive_statistics

class DescriptionElementsClass(object):
    def __init__(self, coloumn_key, coloum_description):
        self.column_key = coloumn_key
        self.column_description = coloum_description


# extra chars are not valid for json strings
def get_column_label(value):
    value = value.replace("ä", "ae").replace("ü", "ue").replace("ö", "oe").replace("ß", "ss")

    return value


class DescriptiveStatisticsClass(object):
    def __init__(self, currentcol_descriptive, data_type, column_id):

        current_col_without_nan = [current_val for current_val in currentcol_descriptive if str(current_val) != 'nan']

        column_used = current_col_without_nan
        if gv.include_missing_values:
            column_used = currentcol_descriptive

        stdev = 0
        varnc = 0

        if len(current_col_without_nan) > 2:
            [stdev, varnc] = cds.compute_stdev(current_col_without_nan, data_type)

        self.normalized_values = currentcol_descriptive  # .tolist()
        self.coefficient_of_unalikeability = cds.compute_coefficient_of_unalikeability(column_used,
                                                                                       data_type, column_id)
        self.stDev = stdev
        self.varNC = varnc
        #print(column_used,column_id)
        self.number_of_modes = cds.get_number_of_modes(column_used, data_type, column_id)
        self.missing_values_percentage = len(
            [x for x in currentcol_descriptive if (str(x) == 'nan' or str(x) == "None")]) / len(
            currentcol_descriptive)
        self.coefficient_of_unalikeability_deviation = 0
        self.stDev_deviation = 0
        self.varNC_deviation = 0
        self.number_of_modes_deviation = 0
        self.missing_values_percentage_deviation = 0
        self.categories = []
        self.overall_deviation = 0

        if data_type == id_data_type__categorical:
            self.categories = cds.get_categories(currentcol_descriptive)


# this creates the json object for more complex structures
def transform(my_object):
    jsonpickle.enable_fallthrough(False)
    jsonpickle.set_preferred_backend('simplejson')
    jsonpickle.set_encoder_options('simplejson', sort_keys=True, ignore_nan=True)
    return jsonpickle.encode(my_object, unpicklable=False)


class JsonTransformer(object):
    pass


initial_descriptive_statistics = []


# replace extra strings with _
def get_column_id(value):
    value = value.replace(" ", "_").replace(")", "_").replace("(", "_").replace(':', '_') \
        .replace("/", "_").replace("-", "_").replace("[", "_").replace("]", "_") \
        .replace(".", "_").replace("?", "_").replace("!", "_").replace("@", "_").replace("*", "_") \
        .replace("ä", "ae").replace("ü", "ue").replace("ö", "oe").replace("ß", "ss")

    value = "id_" + value

    return value


def normalize_values(current_col_for_normalization, current_data_type, col_id):
    current_col_normalized_in_function = current_col_for_normalization

    if current_data_type == id_data_type__numerical or current_data_type == id_data_type__date:

        min_val = numpy.amin(current_col_for_normalization)
        max_val = numpy.amax(current_col_for_normalization)

        normalized_values = list()

        for index_normalization in range(len(current_col_for_normalization)):
            row = current_col_for_normalization[index_normalization]

            if numpy.isnan(min_val):
                normalized_values.append(row)
            elif min_val == max_val:
                normalized_values.append(row)
            else:
                normalized_values.append((numpy.subtract(row,min_val,dtype=numpy.float32))/ (numpy.subtract(max_val,min_val,dtype=numpy.float32)))

        current_col_normalized_in_function = pd.Series(normalized_values)
        current_col_normalized_in_function = current_col_normalized_in_function.rename(col_id)

    return current_col_normalized_in_function


def get_data_initially_formatted(index):
    this_data_type_parallel = id_data_type__numerical
    current_col_parallel = merged_all[index]

    if current_col_parallel.dtype == object:
        test_current_col_numeric_parallel = pd.to_numeric(current_col_parallel, errors='coerce')

        this_data_type_parallel = id_data_type__categorical

        if ~numpy.isnan(test_current_col_numeric_parallel.mean()):
            current_col_parallel = test_current_col_numeric_parallel
            this_data_type_parallel = id_data_type__numerical

        datatype_before = this_data_type_parallel
        for i in range(len(current_col_parallel)):
            number = current_col_parallel[i]

            if str(number) != 'nan' and number is not None and str(number).count('.') == 2:
                date_in_milisec = current_col_parallel[i]

                try:
                    date_in_milisec = datetime.strptime(str(number), "%d.%m.%Y").timestamp() * 1000
                    this_data_type_parallel = id_data_type__date

                except (ValueError, TypeError):
                    this_data_type_parallel = datatype_before

                current_col_parallel.at[i] = date_in_milisec

            if number is None:
                current_col_parallel.at[i] = numpy.NaN

    if this_data_type_parallel == id_data_type__date:

        current_col_name = current_col_parallel.name

        for date_index in range(len(current_col_parallel)):
            date = current_col_parallel.at[date_index]
            if is_number(date):
                current_col_parallel.at[date_index] = current_col_parallel.at[date_index]
            else:
                current_col_parallel.at[date_index] = numpy.NaN

        current_col_parallel.astype('float64')

    current_col_normalized = list(normalize_values(current_col_parallel, this_data_type_parallel,
                                                   get_column_id(current_col_parallel.name)))

    col_descriptive_statistics = DescriptiveStatisticsClass(current_col_normalized, this_data_type_parallel,
                                                            get_column_id(current_col_parallel.name))
    col_description = ColumnElementsClass(get_column_label(current_col_parallel.name),
                                          get_column_id(current_col_parallel.name),
                                          this_data_type_parallel, current_col_parallel.tolist(),
                                          col_descriptive_statistics)

    return col_description

def get_description_data_formatted(index):
    current_col_parallel = data_desc[index]
    col_description = DescriptionElementsClass(get_column_label(current_col_parallel.name),
                                               current_col_parallel.tolist())
    return col_description


gv.data_initially_formatted = [get_data_initially_formatted(i) for i in merged_all.columns]
gv.description_data_initially_formatted = [get_description_data_formatted(i) for i in data_desc.columns]

gv.include_missing_values = False
gv.data_initially_formatted_no_missing_values = [get_data_initially_formatted(i) for i in merged_all.columns]

gv.include_missing_values = True

print("--- %s seconds ---" % (time.time() - start_time))


@app.route('/load_csv/', methods=["POST"])
def main_interface():

    gv.request_data_list = []

    return transform([gv.data_initially_formatted, gv.data_initially_formatted_no_missing_values])

@app.route('/desc_csv/', methods=["POST"])
def get_description():

    gv.request_data_list = []

    return transform([gv.description_data_initially_formatted])


@app.route('/toggle_include_missing_values/', methods=["POST"])
def toggle_include_missing_values():

    request_data_list = request.get_json()

    gv.include_missing_values = not gv.include_missing_values  # toggle_missing_json.include_missing_values_bool

    return comp_deviations(request_data_list)


@app.route('/compute_deviations_and_get_current_values/', methods=["POST"])
def compute_deviations_and_get_current_values():

    request_data_list = request.get_json()

    return comp_deviations(request_data_list)


def comp_deviations(request_data_list):
    start_time_deviations = time.time()

    data_initially_formatted_new = []

    data_to_use = gv.data_initially_formatted

    if not gv.include_missing_values:
        data_to_use = gv.data_initially_formatted_no_missing_values

    for data_initial in data_to_use:
        new_values = list([data_initial.column_values[item_index] for
                           item_index in range(len(data_initial.column_values)) if item_index in request_data_list])

        new_values_normalized = list([data_initial.descriptive_statistics.normalized_values[
                                          item_index] for
                                      item_index in range(len(data_initial.column_values)) if item_index in request_data_list])

        col_descriptive_statistics_new = DescriptiveStatisticsClass(new_values_normalized, data_initial.data_type,
                                                                    data_initial.id)
        col_descriptive_statistics_new = cds.get_descriptive_statistics_deviations(col_descriptive_statistics_new,
                                                                                   [x for x in
                                                                                    data_to_use if
                                                                                    x.id == data_initial.id][
                                                                                       0].descriptive_statistics)

        col_description_new = ColumnElementsClass(data_initial.header, data_initial.id,
                                                  data_initial.data_type, new_values, col_descriptive_statistics_new)

        data_initially_formatted_new.append(col_description_new)

    print("--- %s seconds ---" % (time.time() - start_time_deviations))

    return jsonify(transform([data_initially_formatted_new, gv.columns_not_contributing]))


@app.route('/')
def hello():
    return "Hello World!"


@app.after_request
def add_headers(response):
    response.headers.add('Access-Control-Allow-Origin', '*')
    response.headers.add('Access-Control-Allow-Headers', 'Content-Type,Authorization')
    return response


if __name__ == '__main__':
    app.run(debug=True)