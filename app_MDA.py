import json
import time
from datetime import datetime
import base64
import gzip

import jsonpickle
import numpy
import pandas as pd
from flask import Flask, request, jsonify, send_from_directory, send_file
from joblib import Parallel, delayed
import multiprocessing
import io

import compute_descriptive_statistics_MDA as cds
import global_variables as gv
try:
    import get_data_from_server
except ImportError:
    pass
from collections import namedtuple

from templates.model.model_nifti_to_mesh import *
import os
import SimpleITK as sitk
import logging

start_time = time.time()

app = Flask(__name__)

id_data_type__categorical = "string"
id_data_type__numerical = "number"
id_data_type__date = "date"

# merged_all = get_data_from_server.get_dataframe_from_server()

# csv_file_name_missing_values = 'clinical_data_imputed.csv'
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
merged_all = pd.read_csv("resources/synthetic_dates_missingness2.csv", keep_default_na=False, na_values=[""])

#merged_all = pd.read_csv("resources/clinical_data_imputed.csv", keep_default_na=False, na_values=[""])


merged_all = merged_all.loc[:, ~merged_all.columns.duplicated()]  # remove duplicate rows

gv.initial_length_of_data_rows = len(merged_all)

# get all data types
dataTypeSeries = merged_all.dtypes

# remove_randomized_values = False
#
# def remove_randomized_values():
#
#     for col in merged_all.columns:
#
#         rand_percentage = numpy.random.randint(0, 20)
#         rand_percentage_data_rows = int(rand_percentage * 0.01 * len(merged_all))
#         randomized_indexes = numpy.random.randint(0, len(merged_all), size=rand_percentage_data_rows)
#
#         for rand_index in randomized_indexes:
#             merged_all[col][rand_index] = None
#
#
# if remove_randomized_values:
#     remove_randomized_values()


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
                normalized_values.append((row - min_val) / (max_val - min_val))

        current_col_normalized_in_function = pd.Series(normalized_values)
        current_col_normalized_in_function = current_col_normalized_in_function.rename(col_id)

    return current_col_normalized_in_function


UNIXTIME = datetime.fromtimestamp(0)

def get_timestamp_windows(date, format='%Y-%m-%d'):
    """ Calculate timestamp using start of Gregorian calender as epoch.

        The date parameter can be either a string or a datetime.datetime
        object. Strings will be parsed using the '%Y-%m-%d' format by default
        unless a different one is specfied via the optional format parameter.
    """
    try:
        date = datetime.strptime(date, format)
    except TypeError:
        pass
    return (date - UNIXTIME).total_seconds() + -3600.0  # The timedelta in seconds.


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
                    #print(number)
                    #date_in_milisec = datetime.strptime(str(number), "%d.%m.%Y").timestamp() * 1000
                    date_in_milisec = get_timestamp_windows(str(number), "%d.%m.%Y") * 1000
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


#[sqrt(i ** 2) for i in range(10)]
#Parallel(n_jobs=2)(delayed(sqrt)(i ** 2) for i in range(10))
#gv.data_initially_formatted = [get_data_initially_formatted(i) for i in merged_all.columns]
num_cores = multiprocessing.cpu_count()

gv.data_initially_formatted = Parallel(n_jobs=num_cores)(delayed(get_data_initially_formatted)(i) for i in merged_all.columns)

gv.include_missing_values = False
gv.data_initially_formatted_no_missing_values = Parallel(n_jobs=num_cores)(delayed(get_data_initially_formatted)(i) for i in merged_all.columns)

#gv.data_initially_formatted_no_missing_values = [get_data_initially_formatted(i) for i in merged_all.columns]

gv.include_missing_values = True

print("--- %s seconds ---" % (time.time() - start_time))


@app.route('/load_csv/', methods=["POST"])
def main_interface():

    gv.request_data_list = []

    return transform([gv.data_initially_formatted, gv.data_initially_formatted_no_missing_values])


def customStudentDecoder(studentDict):
    return namedtuple('X', studentDict.keys())(*studentDict.values())


@app.route('/update_thresholds/', methods=["POST"])
def update_thresholds():

    request_thresholds = request.get_json()

    gv.coefficient_of_unalikeability_threshold = request_thresholds[0]
    gv.modes_threshold = request_thresholds[1]

    filtered_values = list(request_thresholds[2])

    gv.data_initially_formatted = [cds.update_coeff_unalikeability_modes(i) for i in gv.data_initially_formatted]
    gv.data_initially_formatted_no_missing_values = [cds.update_coeff_unalikeability_modes(i) for i in
                                                     gv.data_initially_formatted_no_missing_values]

    filtered_values = [cds.update_coeff_unalikeability_modes_dict(i) for i in filtered_values]

    filtered_values = [cds.update_coeff_unalikealibiity_modes_deviations(i) for i in filtered_values]

    return transform([gv.data_initially_formatted, gv.data_initially_formatted_no_missing_values, filtered_values])


@app.route('/toggle_include_missing_values/', methods=["POST"])
def toggle_include_missing_values():

    request_data_list = request.get_json()

    gv.include_missing_values = not gv.include_missing_values  # toggle_missing_json.include_missing_values_bool

    return comp_deviations(request_data_list)


@app.route('/compute_deviations_and_get_current_values/', methods=["POST"])
def compute_deviations_and_get_current_values():

    request_data_list = request.get_json()

    return comp_deviations(request_data_list)

def comp_deviation_in_loop (data_initial, request_data_list, data_to_use):
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

    return col_description_new


def comp_deviations(request_data_list):
    start_time_deviations = time.time()

    data_initially_formatted_new = []

    data_to_use = gv.data_initially_formatted

    if not gv.include_missing_values:
        data_to_use = gv.data_initially_formatted_no_missing_values

    data_initially_formatted_new = Parallel(n_jobs=num_cores)(delayed(comp_deviation_in_loop)(data_initial, request_data_list, data_to_use) for data_initial in data_to_use)

    print("--- %s seconds ---" % (time.time() - start_time_deviations))

    return jsonify(transform([data_initially_formatted_new, gv.columns_not_contributing]))


@app.route('/', methods=["GET", "POST"])
def hello():
    return "Hello World!"


@app.after_request
def add_headers(response):
    response.headers.add('Access-Control-Allow-Origin', '*')
    response.headers.add('Access-Control-Allow-Headers', 'Content-Type,Authorization')
    return response

@app.route('/create_meshes_of_patient/<string:patientname>', methods=["POST"])
def create_meshes_of_patient(patientname):
    inputDir = os.path.join('resources\\input', patientname)
    outputDir = os.path.join('resources\\output', patientname)
    if not os.path.exists(outputDir):
        os.makedirs(outputDir)

    filenames = []

    # load NIFTI volume data
    logging.debug("Process Volume Data")
    flairImage = sitk.ReadImage(os.path.join(inputDir, 'FLAIR.nii.gz'))
    volume_size = sitk.GetArrayFromImage(flairImage).shape
    if not os.path.exists(os.path.join(outputDir, 'brain.obj')):
        filenames.extend(create_obj_brain(sitk.GetArrayFromImage(flairImage), outputDir, 800))
    else:
        filenames.extend(["brain.obj"])

    # Load NIFTI labelmap
    logging.debug("Process Labelmap Data")
    if not os.path.exists(os.path.join(outputDir, 'combinedcolortable.txt')):
        if os.path.exists(os.path.join(inputDir,"wmh.nii.gz")):
            wmhImage = sitk.ReadImage(os.path.join(inputDir, 'wmh.nii.gz'))
            #filenames.append(create_colormap(2,outputDir))
            wmh_mat = sitk.GetArrayFromImage(wmhImage)
            filenames.extend(create_obj_lesions(wmh_mat, outputDir, "wmh"))
        else:
            wmh_mat = np.zeros(volume_size)
        if os.path.exists(os.path.join(inputDir,"cmb.nii.gz")):
            cmbImage = sitk.ReadImage(os.path.join(inputDir, 'cmb.nii.gz'))
            #filenames.append(create_colormap(2,outputDir))
            cmb_mat = sitk.GetArrayFromImage(cmbImage)
            filenames.extend(create_obj_lesions(cmb_mat, outputDir, "cmb"))
        else:
            cmb_mat = np.zeros(volume_size)
        if os.path.exists(os.path.join(inputDir,"epvs.nii.gz")):
            epvsImage = sitk.ReadImage(os.path.join(inputDir, 'epvs.nii.gz'))
            #filenames.append(create_colormap(2,outputDir))
            epvs_mat = sitk.GetArrayFromImage(epvsImage)
            filenames.extend(create_obj_lesions(epvs_mat, outputDir, "epvs"))
        else:
            epvs_mat = np.zeros(volume_size)

        combined_labelmap,_,colortable = combine_labelmaps(wmh_mat,cmb_mat,epvs_mat,flairImage,outputDir)
        filenames.extend([combined_labelmap,colortable])
    else:
        #
        wmhImage = sitk.ReadImage(os.path.join(inputDir, 'wmh.nii.gz'))
        wmh_mat = sitk.GetArrayFromImage(wmhImage)
        cmbImage = sitk.ReadImage(os.path.join(inputDir, 'cmb.nii.gz'))
        cmb_mat = sitk.GetArrayFromImage(cmbImage)
        epvsImage = sitk.ReadImage(os.path.join(inputDir, 'epvs.nii.gz'))
        epvs_mat = sitk.GetArrayFromImage(epvsImage)
        combined_labelmap,_,colortable = combine_labelmaps(wmh_mat,cmb_mat,epvs_mat,flairImage,outputDir)
        #
        filenames.extend(["combinedcolortable.txt"])
        filenames.extend([x for x in os.listdir(outputDir) if x.startswith("multiple") and x.endswith(".obj")])
        if os.path.exists(os.path.join(outputDir,"multiple_wmh_lesiondata.csv")):
            filenames.extend(["multiple_wmh_lesiondata.csv"])
        if os.path.exists(os.path.join(outputDir,"multiple_cmb_lesiondata.csv")):
            filenames.extend(["multiple_cmb_lesiondata.csv"])
        if os.path.exists(os.path.join(outputDir,"multiple_epvs_lesiondata.csv")):
            filenames.extend(["multiple_epvs_lesiondata.csv"])

    """wmhImageAdd = sitk.ReadImage(os.path.join('output', 'test.nii.gz'))
    sub_wmh(sitk.GetArrayFromImage(wmhImage1), sitk.GetArrayFromImage(wmhImageAdd), wmhImage1, outputDir)"""

    return jsonify(filenames)


@app.route('/get_mesh_file/<string:patientname>/<string:filename>', methods=["POST"])
def get_mesh_file(patientname,filename):
    logging.debug("get mesh file",filename)
    return send_from_directory(os.path.join('resources\\output',patientname), filename)

@app.route('/get_volume_of_patient/<string:patientname>', methods=["POST"])
def get_volume_of_patient(patientname):
    logging.debug("get volume file", patientname)
    return send_from_directory(os.path.join('resources\\input', patientname),'FLAIR.nii.gz')

@app.route('/get_labelmap_of_patient/<string:patientname>/<string:lesiontype>', methods=["POST"])
def get_labelmap_of_patient(patientname, lesiontype):
    logging.debug("get labelmap file", patientname, lesiontype)
    if patientname == "tmp":
        return send_from_directory(os.path.join('resources\\output', patientname),f'{lesiontype}.nii.gz')
    if lesiontype == "combined":
        return send_from_directory(os.path.join('resources\\output', patientname),f'{lesiontype}.nii.gz')
    return send_from_directory(os.path.join('resources\\input', patientname),f'{lesiontype}.nii.gz')

@app.route('/get_patients/', methods=["POST"])
def get_patients():
    patients = [name for name in os.listdir("resources\\input") if os.path.isdir(os.path.join("resources\\input", name))]
    logging.debug(patients)
    return jsonify(patients)

@app.route('/add_patient_labelmaps/', methods=["POST"])
def add_patient_labelmaps():
    images = []
    patients = request.get_json()["message"]
    logging.debug(patients)
    if len(patients) == 0:
        return
    if not os.path.exists(os.path.join('resources\\output','tmp')):
        os.mkdir(os.path.join('resources\\output','tmp'))
    for patient in patients:
        patientImage = sitk.ReadImage(os.path.join('resources\\input', patient, 'wmh.nii.gz'))
        images.append(sitk.GetArrayFromImage(patientImage))
    [nifti_file, _, mesh_files] = add_wmh(images,patientImage, os.path.join('resources\\output','tmp'))
    return jsonify([[nifti_file],mesh_files])

if __name__ == '__main__':
    app.run(debug=True)
