function storeIDs () {
    console.log("bubu");
    stored_ids = column_values_grouped[1].column_values;
}

function showSelection () {
    $.ajax({
        url: "http://127.0.0.1:5000/add_patient_labelmaps/",
        type: "POST",
        contentType: "application/json",
        data: JSON.stringify({"message": column_values_grouped[1].column_values})
    }).done(function (meshfilenames){
        var total_files = meshfilenames.length+2 //volume and combinedlabelmap
        var loaded_files = []

        // NIFTI Volume
        var xhr = new XMLHttpRequest();
        xhr.onreadystatechange = function(){
            if (this.readyState == 4 && this.status == 200){
                //this.response is what you're looking for
                b = new Blob([this.response])
                f = new File([b], 'FLAIR.nii.gz')
                loaded_files.push(f)
                if (loaded_files.length === total_files){
                    read(loaded_files)
                }
            }
        }
        xhr.open("POST", "http://127.0.0.1:5000/get_volume_of_patient/"+column_values_grouped[1].column_values[0], true);
        xhr.responseType = 'blob';
        xhr.send();

        // NIFTI combined
        var xhr = new XMLHttpRequest();
        xhr.onreadystatechange = function(){
            if (this.readyState == 4 && this.status == 200){
                //this.response is what you're looking for
                b = new Blob([this.response])
                f = new File([b], 'combined.nii.gz')
                loaded_files.push(f)
                if (loaded_files.length === total_files){
                    read(loaded_files)
                }
            }
        }
        xhr.open("POST", "http://127.0.0.1:5000/get_labelmap_of_patient/tmp/combined", true);
        xhr.responseType = 'blob';
        xhr.send();

        // MESH
        meshfilenames.forEach(function (filename) {
            $.ajax({
                url: "http://127.0.0.1:5000/get_mesh_file/tmp/"+filename,
                type: "POST",
            }).done(function(filedata) {
                b = new Blob([filedata],{type:"text/plain"})
                f = new File([b], filename)
                loaded_files.push(f)
                if (loaded_files.length === total_files){
                    read(loaded_files)
                }
            });
        })
    })
}

function initializeDropDown() {
    new SelectPure("#dropdown_compare_cohorts", {
        options:[
            {value: "0", label: "test"},
            {value: "1", label: "test1"},
            {value: "2", label: "test2"}
            ],
        onChange: handleDropdown
    });
}


function handleDropdown(value) {
    console.log(value);
}