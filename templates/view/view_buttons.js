stored_ids = null;
swapButtonPressed = false;
isVisibleCohorts = true;
isVisibleDifference = true;

function storeIDs () {
    stored_ids = column_values_grouped[1].column_values;
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
        if (column_values_grouped[1].column_values.length > 1) {
            if (swapButtonPressed)
                swapMedianIQR()
            showCohortBullseye(bullseyedata)
        } else
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
        resetBullseyeSelection()
        if (swapButtonPressed)
            swapMedianIQR()
        showSubBullseye(bullseyedata)
    })
}

// Bullseye Plots

function showCohortBullseye(bullseyedata) {
    resetBullseyeSelection()
    document.getElementById("single_bullseye_view").style.display = "none"
    document.getElementById("cohort_bullseye_view").style.display = "block"
    document.getElementById("sub_bullseye_view").style.display = "none"
    wmh_data = bullseyedata[0] //[colordata, max, min, iqr, iqrmax, iqrmin]
    cmb_data = bullseyedata[1]
    epvs_data = bullseyedata[2]

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
        title: "WMH Lesion Load",
        scaleGraphic: true,
        textColor: "black"
    })
        .style.height = "auto";
    legend({
        target: "#bullseye_cmb_cohort_colorbar",
        color: d3.scaleSequential([cmb_combined_min, cmb_combined_max], color_bullseye_cmb),
        title: "CMB Lesion Load",
        scaleGraphic: true,
        textColor: "black"
    })
        .style.height = "auto";
    legend({
        target: "#bullseye_epvs_cohort_colorbar",
        color: d3.scaleSequential([epvs_combined_min, epvs_combined_max], color_bullseye_epvs),
        title: "ePVS Lesion Load",
        scaleGraphic: true,
        textColor: "black"
    })
        .style.height = "auto";
}

function showSingleBullseye(bullseyedata) {
    resetBullseyeSelection()
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
    })
        .style.height = "auto";
    legend({
        target: "#bullseye_cmb_colorbar",
        color: d3.scaleSequential([cmb_data[2], cmb_data[1]], color_bullseye_cmb),
        title: "CMB Lesion Load",
        scaleGraphic: true,
        textColor: "black"
    })
        .style.height = "auto";
    legend({
        target: "#bullseye_epvs_colorbar",
        color: d3.scaleSequential([epvs_data[2], epvs_data[1]], color_bullseye_epvs),
        title: "ePVS Lesion Load",
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


    wmh_data = bullseyedata[2] //[colordata, max, min]
    cmb_data = bullseyedata[5]
    epvs_data = bullseyedata[8]

    let wmh_max_abs = Math.max(Math.abs(wmh_data[2]), Math.abs(wmh_data[1]))
    let cmb_max_abs = Math.max(Math.abs(cmb_data[2]), Math.abs(cmb_data[1]))
    let epvs_max_abs = Math.max(Math.abs(epvs_data[2]), Math.abs(epvs_data[1]))

    create_bullseye("#bullseye_wmh_sub", wmh_data[0], -wmh_max_abs, wmh_max_abs, color_bullseye_wmh_diverging)
    create_bullseye("#bullseye_cmb_sub", cmb_data[0], -cmb_max_abs, cmb_max_abs, color_bullseye_cmb_diverging)
    create_bullseye("#bullseye_epvs_sub", epvs_data[0], -epvs_max_abs, epvs_max_abs, color_bullseye_epvs_diverging)

    legend({
        target: "#bullseye_wmh_sub_colorbar",
        color: d3.scaleSequential([-wmh_max_abs, wmh_max_abs], color_bullseye_wmh_diverging),
        title: "WMH Lesion Load Dominance",
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
        title: "CMB Lesion Load Dominance",
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
        title: "ePVS Lesion Load Dominance",
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