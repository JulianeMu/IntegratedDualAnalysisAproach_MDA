/**
 * preprocess NIFTI, create OBJ
 * @param callback
 */

function str2ab(str) {
    var buf = new ArrayBuffer(str.length); // 2 bytes for each char
    var bufView = new Uint8Array(buf);
    for (var i=0, strLen=str.length; i < strLen; i++) {
        bufView[i] = str[i].charCodeAt(0);
    }
    return buf;
}

function initialize_scene(callback) {

    $.ajax({
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
    });
}