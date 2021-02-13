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
}