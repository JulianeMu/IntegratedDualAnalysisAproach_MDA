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
            xhr.open("POST", "http://127.0.0.1:5000/get_volume_of_patient/"+patientnames[0], true);
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
            xhr.open("POST", "http://127.0.0.1:5000/get_labelmap_of_patient/"+patientnames[0]+'/combined', true);
            xhr.responseType = 'blob';
            xhr.send();

            // NIFTI CMB
            /*var xhr = new XMLHttpRequest();
            xhr.onreadystatechange = function(){
                if (this.readyState == 4 && this.status == 200){
                    //this.response is what you're looking for
                    b = new Blob([this.response])
                    f = new File([b], 'cmb.nii.gz')
                    loaded_files.push(f)
                    if (loaded_files.length === total_files){
                        read(loaded_files)
                    }
                }
            }
            xhr.open("POST", "http://127.0.0.1:5000/get_labelmap_of_patient/"+patientnames[0]+'/cmb', true);
            xhr.responseType = 'blob';
            xhr.send();*/

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

    add_heading("id_view_selection", "One Subset");
    add_heading("id_compare_individual_selections","Two Subsets")
    add_heading("id_bullseye_box", "");
    add_heading("id_saved_selection_heading", "Saved Selection:");
    add_heading("id_BEP_legend_heading", "Lesion Loads");
    add_heading("id_BEP_legend_heading_lobes", "Legend Lobes");
    add_heading("id_BEP_legend_heading_shells", "Legend Shells");
    add_heading("id_missing_lesionsdata_heading", "Lesions not occurring");



    var tippy_instances_bullseye_legend_lobes = tippy(document.getElementById("id_BEP_legend_lobes_img"),{
        content: "Parcellation into Lobes <br> <strong>Front:</strong> Frontal <br> <strong>Par:</strong> Parietal <br>"+
            "<strong>Temp:</strong> Temporal <br> <strong>Occ:</strong> Occipital <br> <strong>BGIT:</strong>  Basal Ganglia, Infratentorial regions & Thalami",
        //followCursor:true,
        placement: 'right',
        //zIndex: 9999,
        //trigger: "manual",
        //sticky: true,
        allowHTML: true,
        //offset: [0,-5]
    });

    var tippy_instances_bullseye_legend_shells = tippy(document.getElementById("id_BEP_legend_shells_img"),{
        content: "Subdivision of the lobes into <strong>4 equidistant layers</strong> based on the relative distance between the ventricles and the cortical grey matter.",
        //followCursor:true,
        placement: 'right',
        //zIndex: 9999,
        //trigger: "manual",
        //sticky: true,
        allowHTML: true,
        //offset: [0,-5]
    });
}

function initialize_scene2(callback) {
    $.ajax({
        url: "http://127.0.0.1:5000/get_patients/",
        type: "POST",
        contentType: "application/json",
    }).done(function (patientnames) {
        $.ajax({
            url: "http://127.0.0.1:5000/get_static_meshes/",
            type: "POST",
            contentType: "application/json",
        }).done(function (meshfilenames) {
            console.log(meshfilenames)
            $.ajax({
                url: "http://127.0.0.1:5000/create_meshes_of_patient/"+patientnames[0],
                type: "POST",
                contentType: "application/json",
            }).done(function (patientfilenames){
                var total_files = patientfilenames.length+meshfilenames.length+2 //volume and combinedlabelmap
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
                xhr.open("POST", "http://127.0.0.1:5000/get_labelmap_of_patient/"+patientnames[0]+'/combined', true);
                xhr.responseType = 'blob';
                xhr.send();

                // NIFTI CMB
                /*var xhr = new XMLHttpRequest();
                xhr.onreadystatechange = function(){
                    if (this.readyState == 4 && this.status == 200){
                        //this.response is what you're looking for
                        b = new Blob([this.response])
                        f = new File([b], 'cmb.nii.gz')
                        loaded_files.push(f)
                        if (loaded_files.length === total_files){
                            read(loaded_files)
                        }
                    }
                }
                xhr.open("POST", "http://127.0.0.1:5000/get_labelmap_of_patient/"+patientnames[0]+'/cmb', true);
                xhr.responseType = 'blob';
                xhr.send();*/

                // MESH
                patientfilenames.forEach(function (filename) {
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

    add_heading("id_view_selection", "One Subset");
    add_heading("id_compare_individual_selections","Two Subsets")
    add_heading("id_bullseye_box", "");
    add_heading("id_saved_selection_heading", "Saved Selection:");
    add_heading("id_BEP_legend_heading", "Lesion Loads");
    add_heading("id_BEP_legend_heading_lobes", "Legend Lobes");
    add_heading("id_BEP_legend_heading_shells", "Legend Shells");
    add_heading("id_missing_lesionsdata_heading", "Lesions not occurring");


    var tippy_instances_bullseye_legend_lobes = tippy(document.getElementById("id_BEP_legend_lobes_img"),{
        content: "Parcellation into Lobes <br> <strong>Front:</strong> Frontal <br> <strong>Par:</strong> Parietal <br>"+
            "<strong>Temp:</strong> Temporal <br> <strong>Occ:</strong> Occipital <br> <strong>BGIT:</strong>  Basal Ganglia, Infratentorial regions & Thalami",
        //followCursor:true,
        placement: 'right',
        //zIndex: 9999,
        //trigger: "manual",
        //sticky: true,
        allowHTML: true,
        //offset: [0,-5]
    });

    var tippy_instances_bullseye_legend_shells = tippy(document.getElementById("id_BEP_legend_shells_img"),{
        content: "Subdivision of the lobes into <strong>4 equidistant layers</strong> based on the relative distance between the ventricles and the cortical grey matter.",
        //followCursor:true,
        placement: 'right',
        //zIndex: 9999,
        //trigger: "manual",
        //sticky: true,
        allowHTML: true,
        //offset: [0,-5]
    });
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