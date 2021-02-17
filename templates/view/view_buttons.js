stored_ids = null;

function storeIDs () {
    stored_ids = column_values_grouped[1].column_values;
    $('#ShowTwoSelections').prop('disabled', false);
    let targetDiv = document.getElementById("currentSavedSelection");
    actives_copy.forEach( (x) => {
        let currentDiv = document.createElement("div");
        currentDiv.innerHTML = x.dimension + ": " + x.extent;
        targetDiv.appendChild(currentDiv);
    })
}

function deleteIDs() {
    stored_ids = null;
    $('#ShowTwoSelections').prop('disabled', true);
}

function showComparisonWithAll() {
    showSelectionComparison(column_values_initially[0].column_values)
}

function showComparisonWithRemaining() {
    var remainingIDs = column_values_initially[0].column_values.filter((x) => {
        return column_values_grouped[1].column_values.indexOf(x) === -1
    })
    showSelectionComparison(remainingIDs)
}

function showComparisonNewSelection() {
    showSelectionComparison(stored_ids)
}

function addPatientLabelmaps(patientIDs, callback) {
    $.ajax({
        url: "http://127.0.0.1:5000/add_patient_labelmaps/",
        type: "POST",
        contentType: "application/json",
        data: JSON.stringify({"message": patientIDs})
    }).done(function (meshfilenames) {
        callback(meshfilenames)
    })
}

function addBullseyeplots(patientIDs, callback) {
    $.ajax({
        url: "http://127.0.0.1:5000/add_bullseye/",
        type: "POST",
        contentType: "application/json",
        data: JSON.stringify({"message": patientIDs})
    }).done(function (bullseyedata) {
        callback(bullseyedata)
    })
}


function subPatientLabelmaps(patientIDs, patientIDs2, callback) {
    $.ajax({
        url: "http://127.0.0.1:5000/sub_patient_labelmaps/",
        type: "POST",
        contentType: "application/json",
        data: JSON.stringify({"IDs1": patientIDs, "IDs2": patientIDs2})
    }).done(function (meshfilenames) {
        callback(meshfilenames)
    })
}

function subBullseyeplots(patientIDs, patientIDs2, callback) {
    $.ajax({
        url: "http://127.0.0.1:5000/sub_bullseye/",
        type: "POST",
        contentType: "application/json",
        data: JSON.stringify({"IDs1": patientIDs, "IDs2": patientIDs2})
    }).done(function (bullseyedata) {
        callback(bullseyedata)
    })
}

function loadFlair(patientID, onFileLoadedCallback){
    // NIFTI Volume
    var xhr = new XMLHttpRequest();
    xhr.onreadystatechange = function(){
        if (this.readyState == 4 && this.status == 200){
            //this.response is what you're looking for
            b = new Blob([this.response])
            f = new File([b], 'FLAIR.nii.gz')
            onFileLoadedCallback(f)
        }
    }
    xhr.open("POST", "http://127.0.0.1:5000/get_volume_of_patient/"+patientID, true);
    xhr.responseType = 'blob';
    xhr.send();
}

function loadCombined(onFileLoadedCallback){
    // NIFTI combined
    var xhr = new XMLHttpRequest();
    xhr.onreadystatechange = function(){
        if (this.readyState == 4 && this.status == 200){
            //this.response is what you're looking for
            b = new Blob([this.response])
            f = new File([b], 'combined.nii.gz')
            onFileLoadedCallback(f)
        }
    }
    xhr.open("POST", "http://127.0.0.1:5000/get_labelmap_of_patient/tmp/combined", true);
    xhr.responseType = 'blob';
    xhr.send();
}

function loadMeshes(meshfilenames, onFileLoadedCallback){
    // MESH
    meshfilenames.forEach(function (filename) {
        $.ajax({
            url: "http://127.0.0.1:5000/get_mesh_file/tmp/"+filename,
            type: "POST",
        }).done(function(filedata) {
            b = new Blob([filedata],{type:"text/plain"})
            f = new File([b], filename)
            onFileLoadedCallback(f)
        });
    })
}

function showSingleSelection(){
    addPatientLabelmaps(column_values_grouped[1].column_values, function(filenames){
        var total_files = filenames.length+2 //volume and combinedlabelmap
        var loaded_files = []
        var onFileLoaded = function (file) {
            loaded_files.push(f)
            if (loaded_files.length === total_files){
                read(loaded_files)
            }
        }
        loadFlair(column_values_grouped[1].column_values[0], onFileLoaded)
        loadCombined(onFileLoaded)
        loadMeshes(filenames, onFileLoaded)
    })
    addBullseyeplots(column_values_grouped[1].column_values, function(bullseyedata){
        current_bullseyedata = bullseyedata
        if (column_values_grouped[1].column_values.length > 1)
            showCohortBullseye(bullseyedata)
        else
            showSingleBullseye(bullseyedata)
    })
}

function showSelectionComparison(comparedGroup) {
    subPatientLabelmaps(comparedGroup, column_values_grouped[1].column_values, function(filenames){
        var total_files = filenames.length+2 //volume and combinedlabelmap
        var loaded_files = []
        var onFileLoaded = function (file) {
            loaded_files.push(f)
            if (loaded_files.length === total_files){
                read(loaded_files)
            }
        }
        loadFlair(column_values_grouped[1].column_values[0], onFileLoaded)
        loadCombined(onFileLoaded)
        loadMeshes(filenames, onFileLoaded)
    })
    subBullseyeplots(comparedGroup, column_values_grouped[1].column_values, function(bullseyedata){
        current_bullseyedata = bullseyedata
        showSubBullseye(bullseyedata)
    })
}

function showCohortBullseye(bullseyedata) {
    document.getElementById("single_bullseye_view").style.display = "none"
    document.getElementById("cohort_bullseye_view").style.display = "block"
    document.getElementById("sub_bullseye_view").style.display = "none"
    wmh_data = bullseyedata[0] //[colordata, max, min, iqr, iqrmax, iqrmin]
    cmb_data = bullseyedata[1]
    epvs_data = bullseyedata[2]

    create_bullseye("#bullseye_wmh_cohort", wmh_data[0], wmh_data[2], wmh_data[1], color_bullseye_wmh)
    create_bullseye("#bullseye_cmb_cohort", cmb_data[0], cmb_data[2], cmb_data[1], color_bullseye_cmb)
    create_bullseye("#bullseye_epvs_cohort", epvs_data[0], epvs_data[2], epvs_data[1], color_bullseye_epvs)
    create_bullseye("#bullseye_wmh_iqr", wmh_data[3], wmh_data[5], wmh_data[4], color_bullseye_wmh, false)
    create_bullseye("#bullseye_cmb_iqr", cmb_data[3], cmb_data[5], cmb_data[4], color_bullseye_cmb, false)
    create_bullseye("#bullseye_epvs_iqr", epvs_data[3], epvs_data[5], epvs_data[4], color_bullseye_epvs, false)

    legend({
        target: "#bullseye_wmh_cohort_colorbar",
        color: d3.scaleSequential([wmh_data[2], wmh_data[1]],color_bullseye_wmh),
        title: "WMH Lesion Load",
        scaleGraphic: true,
        textColor: "black"
    });
    legend({
        target: "#bullseye_cmb_cohort_colorbar",
        color: d3.scaleSequential([cmb_data[2], cmb_data[1]], color_bullseye_cmb),
        title: "CMB Lesion Load",
        scaleGraphic: true,
        textColor: "black"
    });
    legend({
        target: "#bullseye_epvs_cohort_colorbar",
        color: d3.scaleSequential([epvs_data[2], epvs_data[1]], color_bullseye_epvs),
        title: "ePVS Lesion Load",
        scaleGraphic: true,
        textColor: "black"
    });
}

function showSingleBullseye(bullseyedata) {
    document.getElementById("single_bullseye_view").style.display = "block"
    document.getElementById("cohort_bullseye_view").style.display = "none"
    document.getElementById("sub_bullseye_view").style.display = "none"
    wmh_data = bullseyedata[0] //[colordata, max, min, iqr, iqrmax, iqrmin]
    cmb_data = bullseyedata[1]
    epvs_data = bullseyedata[2]

    create_bullseye("#bullseye_wmh", wmh_data[0], wmh_data[2], wmh_data[1], color_bullseye_wmh)
    create_bullseye("#bullseye_cmb", cmb_data[0], cmb_data[2], cmb_data[1], color_bullseye_cmb)
    create_bullseye("#bullseye_epvs", epvs_data[0], epvs_data[2], epvs_data[1], color_bullseye_epvs)

    legend({
        target: "#bullseye_wmh_colorbar",
        color: d3.scaleSequential([wmh_data[2], wmh_data[1]],color_bullseye_wmh),
        title: "WMH Lesion Load",
        scaleGraphic: true,
        textColor: "black"
    });
    legend({
        target: "#bullseye_cmb_colorbar",
        color: d3.scaleSequential([cmb_data[2], cmb_data[1]], color_bullseye_cmb),
        title: "CMB Lesion Load",
        scaleGraphic: true,
        textColor: "black"
    });
    legend({
        target: "#bullseye_epvs_colorbar",
        color: d3.scaleSequential([epvs_data[2], epvs_data[1]], color_bullseye_epvs),
        title: "ePVS Lesion Load",
        scaleGraphic: true,
        textColor: "black"
    });
}

function showSubBullseye(bullseyedata) {
    document.getElementById("single_bullseye_view").style.display = "none"
    document.getElementById("cohort_bullseye_view").style.display = "none"
    document.getElementById("sub_bullseye_view").style.display = "block"

    wmh_data1 = bullseyedata[0] //[colordata, max, min, iqr, iqrmax, iqrmin]
    cmb_data1 = bullseyedata[3]
    epvs_data1 = bullseyedata[6]

    wmh_data2 = bullseyedata[1] //[colordata, max, min, iqr, iqrmax, iqrmin]
    cmb_data2 = bullseyedata[4]
    epvs_data2 = bullseyedata[7]

    wmh_combined_min = Math.min(wmh_data1[2], wmh_data2[2], wmh_data1[5], wmh_data2[5])
    wmh_combined_max = Math.max(wmh_data1[1], wmh_data2[1], wmh_data1[4], wmh_data2[4])
    cmb_combined_min = Math.min(cmb_data1[2], cmb_data2[2], cmb_data1[5], cmb_data2[5])
    cmb_combined_max = Math.max(cmb_data1[1], cmb_data2[1], cmb_data1[4], cmb_data2[4])
    epvs_combined_min = Math.min(epvs_data1[2], epvs_data2[2], epvs_data1[5], epvs_data2[5])
    epvs_combined_max = Math.max(epvs_data1[1], epvs_data2[1], epvs_data1[4], epvs_data2[4])

    create_bullseye("#bullseye_wmh_cohort1", wmh_data1[0], wmh_combined_min, wmh_combined_max, color_bullseye_wmh)
    create_bullseye("#bullseye_cmb_cohort1", cmb_data1[0], cmb_combined_min, cmb_combined_max, color_bullseye_cmb)
    create_bullseye("#bullseye_epvs_cohort1", epvs_data1[0], epvs_combined_min, epvs_combined_max, color_bullseye_epvs)
    create_bullseye("#bullseye_wmh_iqr1", wmh_data1[3], wmh_combined_min, wmh_combined_max, color_bullseye_wmh, false)
    create_bullseye("#bullseye_cmb_iqr1", cmb_data1[3], cmb_combined_min, cmb_combined_max, color_bullseye_cmb, false)
    create_bullseye("#bullseye_epvs_iqr1", epvs_data1[3], epvs_combined_min, epvs_combined_max, color_bullseye_epvs, false)


    create_bullseye("#bullseye_wmh_cohort2", wmh_data2[0], wmh_combined_min, wmh_combined_max, color_bullseye_wmh)
    create_bullseye("#bullseye_cmb_cohort2", cmb_data2[0], cmb_combined_min, cmb_combined_max, color_bullseye_cmb)
    create_bullseye("#bullseye_epvs_cohort2", epvs_data2[0], epvs_combined_min, epvs_combined_max, color_bullseye_epvs)
    create_bullseye("#bullseye_wmh_iqr2", wmh_data2[3], wmh_combined_min, wmh_combined_max, color_bullseye_wmh, false)
    create_bullseye("#bullseye_cmb_iqr2", cmb_data2[3], cmb_combined_min, cmb_combined_max, color_bullseye_cmb, false)
    create_bullseye("#bullseye_epvs_iqr2", epvs_data2[3], epvs_combined_min, epvs_combined_max, color_bullseye_epvs, false)

    legend({
        target: "#bullseye_wmh_sub_cohort_colorbar",
        color: d3.scaleSequential([wmh_combined_min, wmh_combined_max],color_bullseye_wmh),
        title: "WMH Lesion Load & IQR",
        scaleGraphic: true,
        textColor: "black"
    });
    legend({
        target: "#bullseye_cmb_sub_cohort_colorbar",
        color: d3.scaleSequential([cmb_combined_min, cmb_combined_max],color_bullseye_cmb),
        title: "CMB Lesion Load & IQR",
        scaleGraphic: true,
        textColor: "black"
    });
    legend({
        target: "#bullseye_epvs_sub_cohort_colorbar",
        color: d3.scaleSequential([epvs_combined_min, epvs_combined_max],color_bullseye_epvs),
        title: "ePVS Lesion Load & IQR",
        scaleGraphic: true,
        textColor: "black"
    });


    wmh_data = bullseyedata[2] //[colordata, max, min]
    cmb_data = bullseyedata[5]
    epvs_data = bullseyedata[8]

    create_bullseye("#bullseye_wmh_sub", wmh_data[0], wmh_data[2], wmh_data[1], color_bullseye_wmh_diverging)
    create_bullseye("#bullseye_cmb_sub", cmb_data[0], cmb_data[2], cmb_data[1], color_bullseye_cmb_diverging)
    create_bullseye("#bullseye_epvs_sub", epvs_data[0], epvs_data[2], epvs_data[1], color_bullseye_epvs_diverging)

    legend({
        target: "#bullseye_wmh_sub_colorbar",
        color: d3.scaleSequential([wmh_data[2], wmh_data[1]], color_bullseye_wmh_diverging),
        title: "WMH Lesion Load Differences",
        scaleGraphic: true,
        textColor: "black"
    });
    legend({
        target: "#bullseye_cmb_sub_colorbar",
        color: d3.scaleSequential([cmb_combined_min, cmb_combined_max], color_bullseye_cmb_diverging),
        title: "CMB Lesion Load & IQR",
        scaleGraphic: true,
        textColor: "black"
    });
    legend({
        target: "#bullseye_epvs_sub_colorbar",
        color: d3.scaleSequential([epvs_combined_min, epvs_combined_max], color_bullseye_epvs_diverging),
        title: "ePVS Lesion Load & IQR",
        scaleGraphic: true,
        textColor: "black"
    });
}

function swapMedianIQR(){
    swap = function (data) {
        tmp = data[0]
        data[0] = data[3]
        data[3] = tmp

        tmp = data[1]
        data[1] = data[4]
        data[4] = tmp

        tmp = data[2]
        data[2] = data[5]
        data[5] = tmp
    }
    if (current_bullseyedata.length === 3) {
        if (current_bullseyedata[0].length === 3)
            return
        swap(current_bullseyedata[0])
        swap(current_bullseyedata[1])
        swap(current_bullseyedata[2])
        showCohortBullseye(current_bullseyedata)
    } else {
        if (current_bullseyedata.length === 9) {
            swap(current_bullseyedata[0])
            swap(current_bullseyedata[1])
            swap(current_bullseyedata[3])
            swap(current_bullseyedata[4])
            swap(current_bullseyedata[6])
            swap(current_bullseyedata[7])
            showSubBullseye(current_bullseyedata)
        }
    }
}