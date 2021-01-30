/**
 * preprocess NIFTI, create OBJ
 * @param callback
 */
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