stored_ids = null;
swapButtonPressed = false;
isVisibleCohorts = true;
isVisibleDifference = true;

function storeIDs () {
    stored_ids = getPatientIDs();
    $('#ShowTwoSelections').prop('disabled', false);
    let targetDiv = document.getElementById("currentSavedSelection");
    targetDiv.innerHTML = "";
    actives_copy.forEach( (x) => {
        let currentDiv = document.createElement("div");
        let data_type = column_values_cleaned.find((y) => x.dimension === y.id).data_type;
        let dimension_name = column_values_cleaned.find((col) => col[key_id] === x.dimension)[key_header];
        if (data_type === id_data_type__numerical || data_type === id_data_type__date) {
            let val_min = 0;
            let val_max = 0;
            if (data_type === id_data_type__numerical) {
                val_min = y_scale_pcp_new[x.dimension].scale.invert(x.extent[1]).toFixed(2);
                val_max = y_scale_pcp_new[x.dimension].scale.invert(x.extent[0]).toFixed(2);
            } else {
                let date_min = new Date(y_scale_pcp_new[x.dimension].scale.invert(x.extent[1]));
                let date_max = new Date(y_scale_pcp_new[x.dimension].scale.invert(x.extent[0]));
                val_min = date_min.getDate()+"."+(date_min.getMonth()+1)+"."+(date_min.getFullYear());
                val_max = date_max.getDate()+"."+(date_max.getMonth()+1)+"."+(date_max.getFullYear());
            }
            currentDiv.innerHTML = dimension_name + ": [" + val_min + "; " + val_max + "]";
        }
        else if (data_type === id_data_type__categorical) {
            currentDiv.innerHTML = dimension_name + ": {" + x.unique_values.join("; ") + "}";
        }
        targetDiv.appendChild(currentDiv);
    })
}

function deleteIDs() {
    stored_ids = null;
    document.getElementById("currentSavedSelection").innerHTML = "";
    $('#ShowTwoSelections').prop('disabled', true);
}

function getPatientIDs() {
    for (let column in column_values_grouped){
        column = column_values_grouped[column]
        if (column.id === "id_pseudonym")
            return column.column_values
    }
}

function showMissingImageData (missing_wmh, missing_cmb, missing_epvs) {
    let targetDiv = document.getElementById("id_show_missing_image_data");
    targetDiv.innerHTML = "";
    if (missing_wmh.length > 0) {
        let currentDiv = document.createElement("div");
        currentDiv.innerHTML = "<strong>WMH:</strong> " + missing_wmh.length // map(x => Number(x)).sort().join()
        targetDiv.appendChild(currentDiv)
    }
    if (missing_cmb.length > 0) {
        let currentDiv = document.createElement("div");
        currentDiv.innerHTML = "<strong>CMB:</strong> " + missing_cmb.length
        targetDiv.appendChild(currentDiv)
    }
    if (missing_epvs.length > 0) {
        let currentDiv = document.createElement("div");
        currentDiv.innerHTML = "<strong>ePVS:</strong> " + missing_epvs.length
        targetDiv.appendChild(currentDiv)
    }
}


function showComparisonWithAll() {
    for (let column in column_values_initially){
        column = column_values_initially[column]
        if (column.id === "id_pseudonym")
            return showSelectionComparison(column.column_values)
    }
}

function showComparisonWithRemaining() {
    for (let column in column_values_initially){
        column = column_values_initially[column]
        if (column.id === "id_pseudonym") {
            var remainingIDs = column.column_values.filter((x) => {
                return getPatientIDs().indexOf(x) === -1
            })
            showSelectionComparison(remainingIDs)
        }
    }
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
    }).done(function (response) {
        callback(response.meshfilenames)
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
    }).done(function (response) {
        callback(response.meshfilenames)
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

function loadCombined(onFileLoadedCallback, patient = "tmp"){
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
    xhr.open("POST", "http://127.0.0.1:5000/get_labelmap_of_patient/" + patient + "/combined", true);
    xhr.responseType = 'blob';
    xhr.send();
}

function loadMeshes(meshfilenames, onFileLoadedCallback, patient = "tmp"){
    // MESH
    meshfilenames.forEach(function (filename) {
        $.ajax({
            url: "http://127.0.0.1:5000/get_mesh_file/" + patient + "/" + filename,
            type: "POST",
        }).done(function(filedata) {
            b = new Blob([filedata],{type:"text/plain"})
            f = new File([b], filename)
            onFileLoadedCallback(f)
        });
    })
}

function showSinglePatient(patientname, callback){
    $.ajax({
        url: "http://127.0.0.1:5000/create_meshes_of_patient/"+patientname,
        type: "POST",
        contentType: "application/json",
    }).done(function (patientfilenames){
        callback(patientfilenames)
    })
}

function showSingleSelection(){
    patientIDs = getPatientIDs()
    if (patientIDs.length === 0)
        return
    activatePause()

    if (patientIDs.length === 1) {
        showSinglePatient(patientIDs[0], function(filenames){
            var total_files = filenames.length+2 //volume and combinedlabelmap
            var loaded_files = []
            var onFileLoaded = function (file) {
                loaded_files.push(f)
                if (loaded_files.length === total_files){
                    read(loaded_files)
                }
            }
            loadFlair(patientIDs[0], onFileLoaded)
            loadCombined(onFileLoaded, patientIDs[0])
            loadMeshes(filenames, onFileLoaded, patientIDs[0])
        })
    } else {
        addPatientLabelmaps(patientIDs, function(filenames){
            var total_files = filenames.length+2 //volume and combinedlabelmap
            var loaded_files = []
            var onFileLoaded = function (file) {
                loaded_files.push(f)
                if (loaded_files.length === total_files){
                    read(loaded_files)
                }
            }
            loadFlair(patientIDs[0], onFileLoaded)
            loadCombined(onFileLoaded)
            loadMeshes(filenames, onFileLoaded)
        })
    }
    addBullseyeplots(patientIDs, function(response){
        current_bullseyedata = response.bullseyedata
        showMissingImageData(response.missing_wmh, response.missing_cmb, response.missing_epvs)
        if (patientIDs.length > 1) {
            if (swapButtonPressed)
                swapMedianIQR()
            showCohortBullseye(response.bullseyedata)
        } else
            showSingleBullseye(response.bullseyedata)
    })
}

function showSelectionComparison(comparedGroup) {
    activatePause()
    subPatientLabelmaps(comparedGroup, getPatientIDs(), function(filenames){
        var total_files = filenames.length+2 //volume and combinedlabelmap
        var loaded_files = []
        var onFileLoaded = function (file) {
            loaded_files.push(f)
            if (loaded_files.length === total_files){
                read(loaded_files)
            }
        }
        loadFlair(getPatientIDs()[0], onFileLoaded)
        loadCombined(onFileLoaded)
        loadMeshes(filenames, onFileLoaded)
    })
    subBullseyeplots(comparedGroup, getPatientIDs(), function(response){
        current_bullseyedata = response.bullseyedata
        showMissingImageData(response.missing_wmh, response.missing_cmb, response.missing_epvs)
        resetBullseyeSelection()
        if (swapButtonPressed)
            swapMedianIQR()
        showSubBullseye(response.bullseyedata)
    })
}

// Bullseye Plots

function showSingleBullseye(bullseyedata) {
    resetBullseyeSelection()
    document.getElementById("single_bullseye_view").style.display = "block"
    document.getElementById("cohort_bullseye_view").style.display = "none"
    document.getElementById("sub_bullseye_view").style.display = "none"
    wmh_data = bullseyedata.wmh //[colordata, max, min, iqr, iqrmax, iqrmin]
    cmb_data = bullseyedata.cmb
    epvs_data = bullseyedata.epvs

    create_bullseye("#bullseye_wmh", wmh_data[0], wmh_data[2], wmh_data[1], color_bullseye_wmh)
    create_bullseye("#bullseye_cmb", cmb_data[0], cmb_data[2], cmb_data[1], color_bullseye_cmb)
    create_bullseye("#bullseye_epvs", epvs_data[0], epvs_data[2], epvs_data[1], color_bullseye_epvs)

    legend({
        target: "#bullseye_wmh_colorbar",
        color: d3.scaleSequential([wmh_data[2], wmh_data[1]],color_bullseye_wmh),
        title: "WMH Lesion Load (Volume Ratio)",
        scaleGraphic: true,
        textColor: "black"
    })
        .style.height = "auto";
    legend({
        target: "#bullseye_cmb_colorbar",
        color: d3.scaleSequential([cmb_data[2], cmb_data[1]], color_bullseye_cmb),
        title: "CMB Lesion Load (Lesion Count)",
        scaleGraphic: true,
        textColor: "black"
    })
        .style.height = "auto";
    legend({
        target: "#bullseye_epvs_colorbar",
        color: d3.scaleSequential([epvs_data[2], epvs_data[1]], color_bullseye_epvs),
        title: "ePVS Lesion Load (Lesion Count)",
        scaleGraphic: true,
        textColor: "black"
    })
        .style.height = "auto";
}

function showCohortBullseye(bullseyedata) {
    resetBullseyeSelection()
    document.getElementById("single_bullseye_view").style.display = "none"
    document.getElementById("cohort_bullseye_view").style.display = "block"
    document.getElementById("sub_bullseye_view").style.display = "none"
    wmh_data = bullseyedata.wmh //[colordata, max, min, iqr, iqrmax, iqrmin]
    cmb_data = bullseyedata.cmb
    epvs_data = bullseyedata.epvs

    wmh_combined_min = Math.min(wmh_data[2], wmh_data[5])
    wmh_combined_max = Math.max(wmh_data[1], wmh_data[4])
    cmb_combined_min = Math.min(cmb_data[2], cmb_data[5])
    cmb_combined_max = Math.max(cmb_data[1], cmb_data[4])
    epvs_combined_min = Math.min(epvs_data[2], epvs_data[5])
    epvs_combined_max = Math.max(epvs_data[1], epvs_data[4])


    create_bullseye("#bullseye_wmh_cohort", wmh_data[0], wmh_combined_min, wmh_combined_max, color_bullseye_wmh)
    create_bullseye("#bullseye_cmb_cohort", cmb_data[0], cmb_combined_min, cmb_combined_max, color_bullseye_cmb)
    create_bullseye("#bullseye_epvs_cohort", epvs_data[0], epvs_combined_min, epvs_combined_max, color_bullseye_epvs)
    create_bullseye("#bullseye_wmh_iqr", wmh_data[3], wmh_combined_min, wmh_combined_max, color_bullseye_wmh, false)
    create_bullseye("#bullseye_cmb_iqr", cmb_data[3], cmb_combined_min, cmb_combined_max, color_bullseye_cmb, false)
    create_bullseye("#bullseye_epvs_iqr", epvs_data[3], epvs_combined_min, epvs_combined_max, color_bullseye_epvs, false)

    legend({
        target: "#bullseye_wmh_cohort_colorbar",
        color: d3.scaleSequential([wmh_combined_min, wmh_combined_max], color_bullseye_wmh),
        title: "WMH Lesion Load (Volume Ratio)",
        scaleGraphic: true,
        textColor: "black"
    })
        .style.height = "auto";
    legend({
        target: "#bullseye_cmb_cohort_colorbar",
        color: d3.scaleSequential([cmb_combined_min, cmb_combined_max], color_bullseye_cmb),
        title: "CMB Lesion Load (Lesion Count)",
        scaleGraphic: true,
        textColor: "black"
    })
        .style.height = "auto";
    legend({
        target: "#bullseye_epvs_cohort_colorbar",
        color: d3.scaleSequential([epvs_combined_min, epvs_combined_max], color_bullseye_epvs),
        title: "ePVS Lesion Load (Lesion Count)",
        scaleGraphic: true,
        textColor: "black"
    })
        .style.height = "auto";
}

function showSubBullseye(bullseyedata) {
    resetBullseyeSelection()
    document.getElementById("single_bullseye_view").style.display = "none"
    document.getElementById("cohort_bullseye_view").style.display = "none"
    document.getElementById("sub_bullseye_view").style.display = "block"

    wmh_data1 = bullseyedata.wmh[0] //[colordata, max, min, iqr, iqrmax, iqrmin]
    cmb_data1 = bullseyedata.cmb[0]
    epvs_data1 = bullseyedata.epvs[0]

    wmh_data2 = bullseyedata.wmh[1] //[colordata, max, min, iqr, iqrmax, iqrmin]
    cmb_data2 = bullseyedata.cmb[1]
    epvs_data2 = bullseyedata.epvs[1]

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
    })
        .style.height = "auto";
    legend({
        target: "#bullseye_cmb_sub_cohort_colorbar",
        color: d3.scaleSequential([cmb_combined_min, cmb_combined_max],color_bullseye_cmb),
        title: "CMB Lesion Load & IQR",
        scaleGraphic: true,
        textColor: "black"
    })
        .style.height = "auto";
    legend({
        target: "#bullseye_epvs_sub_cohort_colorbar",
        color: d3.scaleSequential([epvs_combined_min, epvs_combined_max],color_bullseye_epvs),
        title: "ePVS Lesion Load & IQR",
        scaleGraphic: true,
        textColor: "black"
    })
        .style.height = "auto";


    wmh_data = bullseyedata.wmh[2] //[colordata, max, min]
    cmb_data = bullseyedata.cmb[2]
    epvs_data = bullseyedata.epvs[2]

    let wmh_max_abs = Math.max(Math.abs(wmh_data[2]), Math.abs(wmh_data[1]))
    let cmb_max_abs = Math.max(Math.abs(cmb_data[2]), Math.abs(cmb_data[1]))
    let epvs_max_abs = Math.max(Math.abs(epvs_data[2]), Math.abs(epvs_data[1]))

    create_bullseye("#bullseye_wmh_sub", wmh_data[0], -wmh_max_abs, wmh_max_abs, color_bullseye_wmh_diverging)
    create_bullseye("#bullseye_cmb_sub", cmb_data[0], -cmb_max_abs, cmb_max_abs, color_bullseye_cmb_diverging)
    create_bullseye("#bullseye_epvs_sub", epvs_data[0], -epvs_max_abs, epvs_max_abs, color_bullseye_epvs_diverging)

    legend({
        target: "#bullseye_wmh_sub_colorbar",
        color: d3.scaleSequential([-wmh_max_abs, wmh_max_abs], color_bullseye_wmh_diverging),
        title: "WMH Lesion Load Dominance (Volume Ratio)",
        subtitle1: "Subset 1",
        subtitle2: "Subset 2",
        height: 50 + 15,
        scaleGraphic: true,
        textColor: "black",
        tickFormat : function(x) {return Math.abs(x)}
    })
        .style.height = "auto";
    legend({
        target: "#bullseye_cmb_sub_colorbar",
        color: d3.scaleSequential([-cmb_max_abs, cmb_max_abs], color_bullseye_cmb_diverging),
        title: "CMB Lesion Load Dominance (Lesion Count)",
        subtitle1: "Subset 1",
        subtitle2: "Subset 2",
        height: 50 + 15,
        scaleGraphic: true,
        textColor: "black",
        tickFormat : function(x) {return Math.abs(x)}
    })
        .style.height = "auto";
    legend({
        target: "#bullseye_epvs_sub_colorbar",
        color: d3.scaleSequential([-epvs_max_abs, epvs_max_abs], color_bullseye_epvs_diverging),
        title: "ePVS Lesion Load Dominance (Lesion Count)",
        subtitle1: "Subset 1",
        subtitle2: "Subset 2",
        height: 50 + 15,
        scaleGraphic: true,
        textColor: "black",
        tickFormat : function(x) {return Math.abs(x)}
    })
        .style.height = "auto";
}

function buttonSwap(){
    swapButtonPressed = !swapButtonPressed
    swapMedianIQR()
    // swap cohort headers
    let tableheadertmp = document.getElementById("cohort_table_header_left").innerHTML
    document.getElementById("cohort_table_header_left").innerHTML = document.getElementById("cohort_table_header_right").innerHTML
    document.getElementById("cohort_table_header_right").innerHTML = tableheadertmp
    // swap sub headers
    tableheadertmp = document.getElementById("sub_table_header_left1").innerHTML
    document.getElementById("sub_table_header_left1").innerHTML = document.getElementById("sub_table_header_right1").innerHTML
    document.getElementById("sub_table_header_right1").innerHTML = tableheadertmp
    tableheadertmp = document.getElementById("sub_table_header_left2").innerHTML
    document.getElementById("sub_table_header_left2").innerHTML = document.getElementById("sub_table_header_right2").innerHTML
    document.getElementById("sub_table_header_right2").innerHTML = tableheadertmp
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
    if (Object.keys(current_bullseyedata).length === 3) {
        if (current_bullseyedata.wmh.length === 3 && current_bullseyedata.wmh[0].length === 6) {
            swap(current_bullseyedata.wmh[0])
            swap(current_bullseyedata.wmh[1])
            swap(current_bullseyedata.cmb[0])
            swap(current_bullseyedata.cmb[1])
            swap(current_bullseyedata.epvs[0])
            swap(current_bullseyedata.epvs[1])
            showSubBullseye(current_bullseyedata)
        } else {
            if (current_bullseyedata.wmh.length === 3)
                return
            swap(current_bullseyedata.wmh)
            swap(current_bullseyedata.cmb)
            swap(current_bullseyedata.epvs)
            showCohortBullseye(current_bullseyedata)
        }
    }
}

function resetBullseyeSelection() {
    bullseye_paths = [];
    //hide bullseye meshes
    for (shell in bullseyecell_to_parcellationmesh) {
        for (lobe in bullseyecell_to_parcellationmesh[shell]) {
            bullseyecell_to_parcellationmesh[shell][lobe].visible = false;
        }
    }
}

function buttonToggleCohorts(){
    isVisibleCohorts = !isVisibleCohorts;
    document.getElementById("toggle_button_bep_sub").disabled = !isVisibleCohorts;
    adjustTable()
}

function buttonToggleDifference(){
    isVisibleDifference = !isVisibleDifference;
    document.getElementById("toggle_button_bep_cohorts").disabled = !isVisibleDifference;
    adjustTable()
}

function adjustTable() {
    let col_width

    if (isVisibleCohorts && isVisibleDifference){
        col_width = [24,14,24,14,24]
        document.getElementById("sub_table_header_subset1").style.width = null
        document.getElementById("sub_table_header_subset1").style.display = null
        document.getElementById("sub_table_header_subset2").style.width = null
        document.getElementById("sub_table_header_subset2").style.display = null
        document.getElementById("sub_table_header_subsetempty").style.width = null
    } else if (isVisibleCohorts) {
        col_width = [30,20,30,20,0]
        document.getElementById("sub_table_header_subset1").style.width = "50%"
        document.getElementById("sub_table_header_subset1").style.display = null
        document.getElementById("sub_table_header_subset2").style.width = "50%"
        document.getElementById("sub_table_header_subset2").style.display = null
        document.getElementById("sub_table_header_subsetempty").style.width = "0"
    } else if (isVisibleDifference) {
        col_width = [0,0,0,0,100]
        document.getElementById("sub_table_header_subset1").style.width = "0"
        document.getElementById("sub_table_header_subset1").style.display = "none"
        document.getElementById("sub_table_header_subset2").style.width = "0"
        document.getElementById("sub_table_header_subset2").style.display = "none"
        document.getElementById("sub_table_header_subsetempty").style.width = "100%"
    } else{ //empty
    }
    $("tbody","#id_bullseye_table_sub").find("tr").each((i,x) => {
        if(x.children.length===5){
            for(let y = 0; y < 5; y++) {
                if(col_width[y] === 0){
                    x.children[y].style.display = "none"
                } else {
                    x.children[y].style.display = null
                }
                x.children[y].style.width = ""+col_width[y]+"%"
            }
        }
        if(x.children.length===2){
            x.children[0].style.display = !isVisibleCohorts ? "none" : null
            x.children[1].style.display = !isVisibleDifference ? "none" : null
        }
    })
}

function show2DParcels() {
    selected_parcels = []
    for (let shell = 1; shell <= 4; shell++) {
        for (let lobe = 0; lobe <= 8; lobe++) {
            if (selected_parcellations[shell][lobe]) {
                selected_parcels.push(""+index_to_lobe[lobe]+shell)
            }
        }
    }
    $.ajax({
        url: "http://127.0.0.1:5000/show_2Dparcellation/",
        type: "POST",
        contentType: "application/json",
        data: JSON.stringify({"selected_parcels":selected_parcels})
    }).done(function (labelmap_filename) {
        var xhr = new XMLHttpRequest();
        xhr.onreadystatechange = function(){
            if (this.readyState == 4 && this.status == 200){
                //this.response is what you're looking for
                b = new Blob([this.response])
                f = new File([b], 'combined_parcellation.nii.gz')
                read([f])
            }
        }
        xhr.open("POST", "http://127.0.0.1:5000/get_latest_parcellation/" + labelmap_filename[0].split(".")[0], true);
        xhr.responseType = 'blob';
        xhr.send();
    })
}

// Pause Screen
function activatePause() {
    document.getElementById("pause").style.display = "block"
}

function deactivatePause() {
    document.getElementById("pause").style.display = "none"
}
