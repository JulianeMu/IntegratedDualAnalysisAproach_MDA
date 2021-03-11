/**
 *  new GUI
 **/

function setupGUIfy() {

    // VOLUME
    if (_data.volume.file.length > 0) {

        var gui = new guify({
            title: 'View Image Data of Selection',
            //align: 'left',
            theme: 'dark',
            //width: '300px',
            open: true,
            root: document.getElementById("right_view"),
        });

        gui.container.style.width = "100%";

        var dim = currentVolume.range;

        a = gui.Register([
            {
                type: 'folder', label: 'Slices & Volume',
                open: true
            },
            {
                type: 'folder', label: 'Surface Models',
                open: true
            },
            /*{
                type: 'checkbox', label: 'Toggle WMH',
                initial: true,
                onChange: toggleWMH,
                folder: 'Indirect Vis'
            },
            {
                type: 'checkbox', label: 'Toggle CMB',
                initial: true,
                onChange: toggleCMB,
                folder: 'Indirect Vis'
            },
            {
                type: 'checkbox', label: 'Toggle ePVS',
                initial: true,
                onChange: toggleEPVS,
                folder: 'Indirect Vis'
            },*/
            {
                type: 'select', label: 'View',
                options: ['Slices', 'DVR'],
                onChange: switchView,
            },
            {
                type: 'checkbox', label: 'Toggle Lesions',
                initial: true,
                onChange: switchLabelmapVisibility,
                folder: 'Slices & Volume'
            },
            {
                type: 'range', label: 'Opacity',
                min: 0, max: 100, step: 1, scale: 'linear',
                initial: 100,
                onChange: opacity3dVolume,
                folder: 'Slices & Volume'
            },
            {
                type: 'interval', label: 'DVR Threshold',
                min: volume.min, max: volume.max,
                initial: [200, volume.max],
                onChange: thresholdVolume,
                folder: 'Slices & Volume'
            },
            /*{
                type: 'interval', label: 'DVR_windowLevel',
                min: volume.min, max: volume.max, step: 10,
                onChange: windowLevelVolume,
                folder: 'Slices'
            },*/
            {
                type: 'range', label: 'Opacity Brain',
                min: 0, max: 100, step: 1, scale: 'linear',
                initial: 100,
                onChange: opacityMesh,
                folder: 'Surface Models'
            },
            {
                type: 'interval', label: 'WMH Load Threshold',
                min: 0, max: column_values_initially[0].column_values.length,
                step: 1, scale: 'linear',
                initial: [0, column_values_initially[0].column_values.length],
                onChange: thresholdWMHLoad,
                folder: 'Surface Models'
            },
            {
                type: 'interval', label: 'CMB Load Threshold',
                min: 0, max: column_values_initially[0].column_values.length,
                step: 1, scale: 'linear',
                initial: [0, column_values_initially[0].column_values.length],
                onChange: thresholdCMBLoad,
                folder: 'Surface Models'
            },
            {
                type: 'interval', label: 'ePVS Load Threshold',
                min: 0, max: column_values_initially[0].column_values.length,
                step: 1, scale: 'linear',
                initial: [0, column_values_initially[0].column_values.length],
                onChange: thresholdePVSLoad,
                folder: 'Surface Models'
            }
        ]);
        gui.loadedComponents.forEach((x) => {
            if (x.opts.type === "checkbox") {
                x.container.children[0].style.float = "left";
                x.container.children[2].style.float = "left";
            }
        })
        /*
        // if mesh data exists
        if(typeof mesh !== "undefined") {
            mesh.transform.translateX(currentVolume.bbox[0]);
            mesh.transform.translateY(currentVolume.bbox[2]);
            mesh.transform.translateZ(currentVolume.bbox[4]);
        }
        */

    }

    // MESH
    if (_data.mesh.file.length > 0) {


        mesh.opacity = 0.7; // re-propagate

        mesh.color = [1, 1, 1];

    } else {

        // no mesh

    }
}

function updateLabelMapListGUIfy(){

}

function switchView(selection){
    switch(selection) {
        case 'Slices':
            volumerenderingOnOff(false);
            break;
        case 'DVR':
            volumerenderingOnOff(true);
            break;
        default:
            console.log("Error within DropDown Menu");
    }
}

function switchLabelmapVisibility(value){
    currentVolume.labelmap.visible = value;
}

//
// 3D SLICES
//
function volumeslicingSagUI(value) {

    if (!currentVolume) {
        return;
    }

    currentVolume.indexX = value;

    if (RT.linked) {

        clearTimeout(RT._updater);
        RT._updater = setTimeout(RT.pushVolume.bind(RT, 'indexY', currentVolume.indexX), 150);

    }

}

function volumeslicingAxUI(value) {

    if (!currentVolume) {
        return;
    }

    currentVolume.indexZ = value;
    if (RT.linked) {

        clearTimeout(RT._updater);
        RT._updater = setTimeout(RT.pushVolume.bind(RT, 'indexX', currentVolume.indexZ), 150);

    }

}

function volumeslicingCorUI(value) {

    if (!currentVolume) {
        return;
    }

    currentVolume.indexY = value;

    if (RT.linked) {

        clearTimeout(RT._updater);
        RT._updater = setTimeout(RT.pushVolume.bind(RT, 'indexPA', currentVolume.indexY), 150);

    }

}

//
// 3D SLICES
//
function volumeslicingSag(event, ui) {

    if (!currentVolume) {
        return;
    }

    currentVolume.indexX = Math
        .floor(jQuery('#red_slider').slider("option", "value"));

    if (RT.linked) {

        clearTimeout(RT._updater);
        RT._updater = setTimeout(RT.pushVolume.bind(RT, 'indexY', currentVolume.indexX), 150);

    }

}

function volumeslicingAx(event, ui) {

    if (!currentVolume) {
        return;
    }

    currentVolume.indexZ = Math.floor(jQuery('#blue_slider').slider("option", "value"));

    if (RT.linked) {

        clearTimeout(RT._updater);
        RT._updater = setTimeout(RT.pushVolume.bind(RT, 'indexX', currentVolume.indexZ), 150);

    }

}

function volumeslicingCor(event, ui) {

    if (!currentVolume) {
        return;
    }

    currentVolume.indexY = Math.floor(jQuery('#green_slider').slider("option", "value"));

    if (RT.linked) {

        clearTimeout(RT._updater);
        RT._updater = setTimeout(RT.pushVolume.bind(RT, 'indexPA', currentVolume.indexY), 150);

    }

}

function opacity3dVolume(value) {

    if (!currentVolume) {
        return;
    }

    currentVolume.opacity = value/100;
    global_opacity_volume = currentVolume.opacity;
    if (RT.linked) {

        clearTimeout(RT._updater);
        RT._updater = setTimeout(RT.pushVolume.bind(RT, 'opacity', currentVolume.opacity), 150);

    }


}

//
// DVR
//
function volumerenderingOnOff(bool) {

    if (!currentVolume) {
        return;
    }

    if (bool) {
        currentVolume.lowerThreshold = (currentVolume.min + (currentVolume.max/10));
    }else{
        currentVolume.lowerThreshold = 0;
    }

    currentVolume.volumeRendering = bool;

    if (RT.linked) {

        clearTimeout(RT._updater);
        RT._updater = setTimeout(RT.pushVolume.bind(RT, 'volumeRendering', currentVolume.volumeRendering), 150);
    }


}

function thresholdVolume(values) {

    if (!currentVolume) {
        return;
    }

    currentVolume.lowerThreshold = values[0];
    currentVolume.upperThreshold = values[1];

    if (RT.linked) {

        clearTimeout(RT._updater);
        RT._updater = setTimeout(RT.pushVolume.bind(RT, 'lowerThreshold', currentVolume.lowerThreshold), 150);
        clearTimeout(RT._updater2);
        RT._updater2 = setTimeout(RT.pushVolume.bind(RT, 'upperThreshold', currentVolume.upperThreshold), 150);

    }


}

function windowLevelVolume(values) {

    if (!currentVolume) {
        return;
    }

    currentVolume.windowLow = values[0];
    currentVolume.windowHigh = values[1];

    if (RT.linked) {

        clearTimeout(RT._updater);
        RT._updater = setTimeout(RT.pushVolume.bind(RT, 'windowLow', currentVolume.windowLow), 150);
        clearTimeout(RT._updater2);
        RT._updater2 = setTimeout(RT.pushVolume.bind(RT, 'windowHigh', currentVolume.windowHigh), 150);

    }


}

//
// MESH
//
function opacityMesh(value) {

    if (!mesh) {
        return;
    }
    if (value === 0)
        mesh.visible = false
    else if (!checkIfSelected()) {
        mesh.visible = true
    }

    mesh.opacity = value / 100;

    if (RT.linked) {

        clearTimeout(RT._updater);
        RT._updater = setTimeout(RT.pushMesh.bind(RT, 'opacity', mesh.opacity), 150);

    }
}

function toggleMeshVisibility() {

    if (!mesh) {
        return;
    }

    mesh.visible = !mesh.visible;

    if (RT.linked) {

        clearTimeout(RT._updater);
        RT._updater = setTimeout(RT.pushMesh.bind(RT, 'visible', mesh.visible), 150);

    }

}

function opacityMeshlabelmap(value) {

    if (!meshlabelmap) {
        return;
    }

    _data.meshlabelmap.meshes.forEach(x => x.opacity = value / 100);
    //meshlabelmap.opacity = value / 100;

    if (RT.linked) {

        clearTimeout(RT._updater);
        RT._updater = setTimeout(RT.pushMesh.bind(RT, 'opacity', meshlabelmap.opacity), 150);

    }
}

function toggleWMH(value){
    toggleMeshlabelmapVisibility(value,'wmh');
}
function toggleCMB(value){
    toggleMeshlabelmapVisibility(value,'cmb');
}

function toggleEPVS(value){
    toggleMeshlabelmapVisibility(value,'epvs');
}

function toggleMeshlabelmapVisibility(value,type) {

    if (!meshlabelmap) {
        return;
    }

    //_data.meshlabelmap.meshes.forEach(x => x.visible = value);
    //meshlabelmap.visible = !meshlabelmap.visible;
    for (let i = 0; i < _data.meshlabelmap.meshes.length; i++) {
        if ( _data.meshlabelmap.type[i] === type) {
            _data.meshlabelmap.meshes[i].visible = value;
        }
    }

    if (RT.linked) {

        clearTimeout(RT._updater);
        RT._updater = setTimeout(RT.pushMesh.bind(RT, 'visible', meshlabelmap.visible), 150);

    }

}

function thresholdWMHLoad(values){
    if(!_data)
        return
    _data.meshlabelmap.wmh_threshold = values
    thresholdMeshLabelmaps(values, "wmh")
}

function thresholdCMBLoad(values){
    if(!_data)
        return
    _data.meshlabelmap.cmb_threshold = values
    thresholdMeshLabelmaps(values, "cmb")
}

function thresholdePVSLoad(values){
    if(!_data)
        return
    _data.meshlabelmap.epvs_threshold = values
    thresholdMeshLabelmaps(values, "epvs")
}

function thresholdMeshLabelmaps(values, lesiontype){
    if(!_data)
        return
    for(let i = 0; i < _data.meshlabelmap.meshes.length; i++){
        let filename = _data.meshlabelmap.meshes[i].file //_data.meshlabelmap.file[i].name
        if (filename === "")
            continue;
        if(filename.includes(lesiontype)){
            if(filename.startsWith("multiple")){
                _data.meshlabelmap.meshes[i].visible = values[1] >= 1 && values[0] <= 1
            } else {
                let lesionload = 0;
                if(typeof _data.meshlabelmap.meshes[i].lesionload === "undefined") {
                    lesionload = Number(filename.split("_")[2].split(".")[0])
                } else {
                    lesionload = _data.meshlabelmap.meshes[i].lesionload;
                }
                _data.meshlabelmap.meshes[i].visible = values[1] >= lesionload && values[0] <= lesionload
            }
        }
    }
}



//
// LABELMAP
//
/*
function opacityLabelmap(event, ui) {

    if (!volume) {
        return;
    }

    volume.labelmap.opacity = ui.value / 100;

    if (RT.linked) {

        clearTimeout(RT._updater);
        RT._updater = setTimeout(RT.pushLabelmap.bind(RT, 'opacity', volume.labelmap.opacity), 150);

    }

}

function toggleLabelmapVisibility() {

    if (!volume) {
        return;
    }

    volume.labelmap.visible = !volume.labelmap.visible;

    if (RT.linked) {

        clearTimeout(RT._updater);
        RT._updater = setTimeout(RT.pushLabelmap.bind(RT, 'visible', volume.labelmap.visible), 150);

    }

}
*/
