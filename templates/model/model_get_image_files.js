/**
 * preprocess NIFTI, create OBJ
 * @param callback
 */

function initialize_scene(callback) {
    $.ajax({
        url: "http://127.0.0.1:5000/get_patients/",
        type: "POST",
        contentType: "application/json",
    }).done(function (patientnames) {
        $.ajax({
            url: "http://127.0.0.1:5000/create_meshes_of_patient/"+patientnames[0],
            type: "POST",
            contentType: "application/json",
        }).done(function (meshfilenames){
            var total_files = meshfilenames.length+2
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
            xhr.open("POST", "http://127.0.0.1:5000/get_volume_of_patient/"+patientnames[0], true);
            xhr.responseType = 'blob';
            xhr.send();

            // NIFTI WMH
            var xhr = new XMLHttpRequest();
            xhr.onreadystatechange = function(){
                if (this.readyState == 4 && this.status == 200){
                    //this.response is what you're looking for
                    b = new Blob([this.response])
                    f = new File([b], 'wmh.nii.gz')
                    loaded_files.push(f)
                    if (loaded_files.length === total_files){
                        read(loaded_files)
                    }
                }
            }
            xhr.open("POST", "http://127.0.0.1:5000/get_labelmap_of_patient/"+patientnames[0], true);
            xhr.responseType = 'blob';
            xhr.send();

            // MESH
            meshfilenames.forEach(function (filename) {
                $.ajax({
                    url: "http://127.0.0.1:5000/get_mesh_file/"+patientnames[0]+"/"+filename,
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
        })
   /* $.ajax({
        url: "http://127.0.0.1:5000/get_file_names/",
        type: "POST",
        contentType: "application/json",
    }).done(function(filelist) {
        var loaded_files = []
        var total_files = filelist[0].length + filelist[1].length

        filelist[0].forEach(function (filename) {
            var xhr = new XMLHttpRequest();
            xhr.onreadystatechange = function(){
                if (this.readyState == 4 && this.status == 200){
                    //this.response is what you're looking for
                    b = new Blob([this.response])
                    f = new File([b], filename)
                    loaded_files.push(f)
                    if (loaded_files.length === total_files){
                        read(loaded_files)
                    }
                }
            }
            xhr.open("POST", "http://127.0.0.1:5000/get_nifti_file/"+filename, true);
            xhr.responseType = 'blob';
            xhr.send();
        })

        filelist[1].forEach(function (filename) {
            $.ajax({
                url: "http://127.0.0.1:5000/get_mesh_file/"+filename,
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
    });*/
}

function initialize_scene_tmpwmh(callback) {
    console.time("timer")
    $.ajax({
        url: "http://127.0.0.1:5000/get_patients/",
        type: "POST",
        contentType: "application/json",
    }).done(function (patientnames) {
        $.ajax({
            url: "http://127.0.0.1:5000/add_patient_labelmaps/",
            type: "POST",
            contentType: "application/json",
            data: JSON.stringify({"message": [patientnames[0], patientnames[1], patientnames[2]]})
        }).done(function (add_data){
            var total_files = add_data[1].length+2
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
                        console.timeEnd("timer")
                        read(loaded_files)
                    }
                }
            }
            xhr.open("POST", "http://127.0.0.1:5000/get_volume_of_patient/"+patientnames[0], true);
            xhr.responseType = 'blob';
            xhr.send();

            // NIFTI WMH
            var xhr = new XMLHttpRequest();
            xhr.onreadystatechange = function(){
                if (this.readyState == 4 && this.status == 200){
                    //this.response is what you're looking for
                    b = new Blob([this.response])
                    f = new File([b], add_data[0][0])
                    loaded_files.push(f)
                    if (loaded_files.length === total_files){
                        console.timeEnd("timer")
                        read(loaded_files)
                    }
                }
            }
            xhr.open("POST", "http://127.0.0.1:5000/get_labelmap_of_patient/tmp", true);
            xhr.responseType = 'blob';
            xhr.send();

            // MESH
            add_data[1].forEach(function (filename) {
                $.ajax({
                    url: "http://127.0.0.1:5000/get_mesh_file/tmp/"+filename,
                    type: "POST",
                }).done(function(filedata) {
                    b = new Blob([filedata],{type:"text/plain"})
                    f = new File([b], filename)
                    loaded_files.push(f)
                    if (loaded_files.length === total_files){
                        console.timeEnd("timer")
                        read(loaded_files)
                    }
                });
            })
        })
    })
    /* $.ajax({
         url: "http://127.0.0.1:5000/get_file_names/",
         type: "POST",
         contentType: "application/json",
     }).done(function(filelist) {
         var loaded_files = []
         var total_files = filelist[0].length + filelist[1].length

         filelist[0].forEach(function (filename) {
             var xhr = new XMLHttpRequest();
             xhr.onreadystatechange = function(){
                 if (this.readyState == 4 && this.status == 200){
                     //this.response is what you're looking for
                     b = new Blob([this.response])
                     f = new File([b], filename)
                     loaded_files.push(f)
                     if (loaded_files.length === total_files){
                         read(loaded_files)
                     }
                 }
             }
             xhr.open("POST", "http://127.0.0.1:5000/get_nifti_file/"+filename, true);
             xhr.responseType = 'blob';
             xhr.send();
         })

         filelist[1].forEach(function (filename) {
             $.ajax({
                 url: "http://127.0.0.1:5000/get_mesh_file/"+filename,
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
     });*/
}

function preprocess_mesh(callback) {

    $.ajax({
        url: "http://127.0.0.1:5000/preprocess_NIFTI/",
        type: "POST",
        contentType: "application/json",
        data: JSON.stringify({"message": "test"})
    }).done(function(data) {
        console.log(data)
    });
}