/*
    Slice:Drop - Instantly view scientific and medical imaging data in 3D.
    http://slicedrop.com
    Copyright (c) 2012 The Slice:Drop and X Toolkit Developers <dev@goXTK.com>

    Slice:Drop is licensed under the MIT License:
    http://www.opensource.org/licenses/mit-license.php
    CREDITS: http://slicedrop.com/LICENSE
*/

function initializeRenderers(){

  if (ren3d) {
    // do this only once
    return;
  }

  _webgl_supported = true;

  // try to initialize 3D renderer
  initialize3DView();
  initialize2DView();

  ren3d.onShowtime = updateLinkedViews;

  // LINK THE RENDERERS
  // link the 2d renderers to the 3d one by setting the onScroll
  // method. this means, once you scroll in 2d, it upates 3d as well
  sliceAx.onScroll = updateThreeDAx;
  sliceSag.onScroll = updateThreeDSag;
  sliceCor.onScroll = updateThreeDCor;

  sliceAx.onWindowLevel = updateWLSlider;
  sliceSag.onWindowLevel = updateWLSlider;
  sliceCor.onWindowLevel = updateWLSlider;

};

function initialize3DView() {
    try {

        // create the XTK renderers
        ren3d = new X.renderer3D();
        ren3d.container = '3d';
        ren3d.init();
        ren3d.interactor.onTouchStart = ren3d.interactor.onMouseDown = onTouchStart3D;
        ren3d.interactor.onTouchEnd = ren3d.interactor.onMouseUp = onTouchEnd3D;
        ren3d.interactor.onMouseWheel = function(e) {
            if (RT.linked) {
                clearTimeout(RT._updater);
                RT._updater = setTimeout(RT.pushCamera.bind(this, 'ren3d'), 150);
            }
        };

        // webgl is enabled
        window.console.log('WebGL supported.');

        jQuery(document.body).addClass('webgl_enabled');

        hovered_element = {};
        selected_elements = {};
        initializeHovering();
        initializeMeshSelection();

        gizmo = addGizmo(jQuery("#3d")[0], ren3d.camera);

    } catch (Error) {

        window.console.log('WebGL *not* supported.');

        _webgl_supported = false;

        // delete the created 3d canvas
        jQuery('#3d').empty();

        jQuery(document.body).addClass('webgl_disabled');
        jQuery(document.body).removeClass('webgl_enabled');
    }
}
function initialize2DView() {
    sliceAx = new X.renderer2D();
    sliceAx.container = 'sliceAx';
    sliceAx.orientation = 'AXIAL';
    sliceAx.init();
    // observe the on touch thingie to enlarge
    sliceAx.interactor.onTouchStart = sliceAx.interactor.onMouseDown = onTouchStartAx;
    sliceAx.interactor.onTouchEnd = sliceAx.interactor.onMouseUp = onTouchEndAx;
    sliceAx.onSliceNavigation = onSliceNavigation;

    sliceSag = new X.renderer2D();
    sliceSag.container = 'sliceSag';
    sliceSag.orientation = 'SAGITTAL';
    sliceSag.init();
    // observe the on touch thingie to enlarge
    sliceSag.interactor.onTouchStart = sliceSag.interactor.onMouseDown = onTouchStartSag;
    sliceSag.interactor.onTouchEnd = sliceSag.interactor.onMouseUp = onTouchEndSag;
    sliceSag.onSliceNavigation = onSliceNavigation;

    sliceCor = new X.renderer2D();
    sliceCor.container = 'sliceCor';

    if (!_webgl_supported) {

        sliceCor.container = '3d';

        // move the green slider to the 3d view
        var el1 = jQuery('#3d');
        el1.prepend('<span/>'); // drop a marker in place
        var tag1 = jQuery(el1.children()[0]);
        tag1.replaceWith(jQuery('#green_slider'));

    } else {

        sliceCor.container = 'sliceCor';

    }
    sliceCor.orientation = 'CORONAL';
    sliceCor.init();

    // observe the on touch thingie to enlarge
    sliceCor.interactor.onTouchStart = sliceCor.interactor.onMouseDown = onTouchStartCor;
    sliceCor.interactor.onTouchEnd = sliceCor.interactor.onMouseUp = onTouchEndCor;
    sliceCor.onSliceNavigation = onSliceNavigation;

    if (!_webgl_supported) {

        // now our ren3d is sliceZ
        ren3d = sliceCor;

    }
}

function updateLinkedViews() {
    window.console.log('Loading completed.');

    if (previousVolume === null && currentVolume !== null){

        //window.console.timeEnd('Loadtime');
        if (!guiLoaded){
            guiLoaded = true;

            //setupUi();
            setupGUIfy();
            configurator();
        }

        // prepare 2D renderer
        sliceAx.add(currentVolume);
        sliceSag.add(currentVolume);
        sliceCor.add(currentVolume);
        sliceAx.render();
        sliceSag.render();
        sliceCor.render();
    } else {
        if (previousVolume === null && currentVolume === null){
            // mesh has been loaded, do nothing with the 2d renderers
        } else {
            // update 2D renderer
            sliceAx.remove(previousVolume);
            sliceSag.remove(previousVolume);
            sliceCor.remove(previousVolume);
            sliceAx.add(currentVolume);
            sliceSag.add(currentVolume);
            sliceCor.add(currentVolume);
            sliceAx.render();
            sliceSag.render();
            sliceCor.render();

            //update sliders
            var dim = currentVolume.range;
            // ax
            jQuery("#blue_slider").slider("option", "disabled", false);
            jQuery("#blue_slider").slider("option", "min", 0);
            jQuery("#blue_slider").slider("option", "max", dim[2]-1); //dim[2] - 1);
            jQuery("#blue_slider").slider("option", "value", currentVolume.indexZ);

            // sag
            jQuery("#red_slider").slider("option", "disabled", false);
            jQuery("#red_slider").slider("option", "min", 0);
            jQuery("#red_slider").slider("option", "max", dim[0] - 1); //dim[0] - 1);
            jQuery("#red_slider").slider("option", "value", currentVolume.indexX);

            // cor
            jQuery("#green_slider").slider("option", "disabled", false);
            jQuery("#green_slider").slider("option", "min", 0);
            jQuery("#green_slider").slider("option", "max", dim[1] - 1); //dim[1] - 1);
            jQuery("#green_slider").slider("option", "value", currentVolume.indexY);
        }
    }

    // if volume data exists
    for (let i = 0; i < _data.mesh.meshes.length; i++){
        if(currentVolume !== null && _data.mesh.meshes[i].moved == false) {
            _data.mesh.meshes[i].moved = true;
            _data.mesh.meshes[i].transform.translateX(currentVolume.bbox[0]);
            _data.mesh.meshes[i].transform.translateY(currentVolume.bbox[2]);
            _data.mesh.meshes[i].transform.translateZ(currentVolume.bbox[4]);
            console.log("mesh translate");
        }
    }
    for (let i = 0; i < _data.meshlabelmap.meshes.length; i++){
        if(currentVolume !== null && _data.meshlabelmap.meshes[i].moved == false) {
            _data.meshlabelmap.meshes[i].moved = true;
            _data.meshlabelmap.meshes[i].transform.translateX(currentVolume.bbox[0]);
            _data.meshlabelmap.meshes[i].transform.translateY(currentVolume.bbox[2]);
            _data.meshlabelmap.meshes[i].transform.translateZ(currentVolume.bbox[4]);
            console.log("meshlabelmap translate");
        }
    }
}

function updateThreeDSag() {
    if (_data.volume.file.length > 0) {
        let opacity = currentVolume.opacity;
        jQuery('#red_slider').slider("option", "value",currentVolume.indexX);
        currentVolume.opacity = opacity;
        // jQuery('#red_slider').slider("option", "value",volume.indexY);
        // jQuery('#green_slider').slider("option", "value",volume.indexZ);

        if (RT.linked) {
            clearTimeout(RT._updater);
            RT._updater = setTimeout(RT.pushVolume.bind(RT, 'indexX', currentVolume.indexX), 150);
        }
    }
};
function updateThreeDAx() {

    if (_data.volume.file.length > 0) {
        let opacity = currentVolume.opacity;
        jQuery('#blue_slider').slider("option", "value",currentVolume.indexZ);
        currentVolume.opacity = opacity;

        if (RT.linked) {
            clearTimeout(RT._updater);
            RT._updater = setTimeout(RT.pushVolume.bind(RT, 'indexZ', currentVolume.indexZ), 150);
        }
    }
};
function updateThreeDCor() {
    if (_data.volume.file.length > 0) {
        let opacity = currentVolume.opacity;
        jQuery('#green_slider').slider("option", "value",currentVolume.indexY);
        currentVolume.opacity = opacity;

        if (RT.linked) {
            clearTimeout(RT._updater);
            RT._updater = setTimeout(RT.pushVolume.bind(RT, 'indexY', currentVolume.indexY), 150);
        }
    }
};

function updateWLSlider() {
    jQuery('#windowlevel-volume').dragslider("option", "values", [currentVolume.windowLow, currentVolume.windowHigh]);

    if (RT.linked) {
        clearTimeout(RT._updater);
        RT._updater = setTimeout(RT.pushVolume.bind(RT, 'windowLow', currentVolume.windowLow), 150);
        clearTimeout(RT._updater2);
        RT._updater2 = setTimeout(RT.pushVolume.bind(RT, 'windowHigh', currentVolume.windowHigh), 150);
    }
};

//
function createData() {
  // the data holder for the scene
  // includes the file object, file data and valid extensions for each object
    if (typeof _data == "undefined")
    {
          _data = {
           'volume': {
             'file': [], // link to file
               'loaded' : [],
             'filedata': [], // binary information of file
             'extensions': ['NRRD', 'MGZ', 'MGH', 'NII', 'GZ', 'DCM', 'DICOM'],
               'volumes': []
           },
           'labelmap': {
             'file': [],
               'loaded' : [],
             'filedata': [],
             'extensions': ['NRRD', 'MGZ', 'MGH', 'NII', 'GZ'], //added NII and GZ,
               'volumes': []
           },
           'colortable': {
             'file': [],
               'loaded' : [],
             'filedata': [],
             'extensions': ['TXT', 'LUT']
           },
           'mesh': {
             'file': [],
               'loaded' : [],
               'meshes' : [],
             'filedata': [],
             'extensions': ['STL', 'VTK', 'FSM', 'SMOOTHWM', 'INFLATED', 'SPHERE',
                            'PIAL', 'ORIG', 'OBJ']
           },
          'meshlabelmap': {
              'file': [],
              'loaded' : [],
              'meshes' : [],
              'filedata': [],
              'extensions': ['STL', 'VTK', 'FSM', 'SMOOTHWM', 'INFLATED', 'SPHERE',
                  'PIAL', 'ORIG', 'OBJ'],
              'dictionary' : {},
              'type' : []
          },
          'lesionmetadata': {
              'file': [],
              'loaded' : [],
              'filedata': [],
              'extensions': ['CSV'],
              'metadata' : []
          }
          };
        currentVolume = null;
        previousVolume = null;
        guiLoaded = false;
        updated_volume = false;
        updated_labelmap = false;
        selected_color = [0,1,1];
        hovered_color = [1,1,1];
    }

}

//
// Reading files using the HTML5 FileReader.
//
function read(files) {

  createData();

  // number of total files
  var _numberOfFiles = files.length;

  sortFileTypes(files);

  // we now have the following data structure for the scene
  window.console.log('New data', _data);
  window.console.log('Total new files:', _numberOfFiles);

  loadFiles(_numberOfFiles);
};

function sortFileTypes(files) {
    for ( var i = 0; i < files.length; i++) {

        var f = files[i];
        var _fileName = f.name;
        var _fileExtension = _fileName.split('.').pop().toUpperCase();

        // check for files with no extension
        if (_fileExtension == _fileName.toUpperCase()) {
            // this must be dicom
            _fileExtension = 'DCM';
        }

        // check which type of file it is
        if (_data['volume']['extensions'].indexOf(_fileExtension) >= 0) {
            if (_fileName.toString().includes("wmh") || _fileName.toString().includes("combined")) {
                updated_labelmap = true;
                _data['labelmap']['file'].push(f);
                _data['labelmap']['loaded'].push(false);
            } else if (_fileName.toString().includes("cmb")){
                //updated_labelmap = true;
                //_data['labelmap']['file'].push(f);
                //_data['labelmap']['loaded'].push(false);
                _numberOfFiles -= 1;
            } else if (_fileName.toString().includes("epvs")){
                //updated_labelmap = true;
                //_data['labelmap']['file'].push(f);
                //_data['labelmap']['loaded'].push(false);
                _numberOfFiles -= 1;
            } else {
                updated_volume = true;
                _data['volume']['file'].push(f);
                _data['volume']['loaded'].push(false);
            }

        } else if (_data['colortable']['extensions'].indexOf(_fileExtension) >= 0) {

            // this is a color table
            _data['colortable']['file'].push(f);
            _data['colortable']['loaded'].push(false);

        } else if (_data['mesh']['extensions'].indexOf(_fileExtension) >= 0) {
            if (_fileName.toString().includes("wmh")) {
                _data['meshlabelmap']['file'].push(f);
                _data['meshlabelmap']['loaded'].push(false);
                _data['meshlabelmap']['type'].push('wmh');
            } else if (_fileName.toString().includes("cmb")) {
                _data['meshlabelmap']['file'].push(f);
                _data['meshlabelmap']['loaded'].push(false);
                _data['meshlabelmap']['type'].push('cmb');
            } else if (_fileName.toString().includes("epvs")) {
                _data['meshlabelmap']['file'].push(f);
                _data['meshlabelmap']['loaded'].push(false);
                _data['meshlabelmap']['type'].push('epvs');
            } else {
                _data['mesh']['file'].push(f);
                _data['mesh']['loaded'].push(false);
            }

        } else if (_data['lesionmetadata']['extensions'].indexOf(_fileExtension) >= 0) {

            // this is a fibers file
            _data['lesionmetadata']['file'].push(f);
            _data['lesionmetadata']['loaded'].push(false);

        } else {
            console.warn(_fileName + " cannot be parsed");
            _numberOfFiles -= 1;
        }
    }
}
function loadFiles(_numberOfFiles) {

    //
    // the HTML5 File Reader callbacks
    //

    // setup callback for errors during reading
    var errorHandler = function(e) {
        console.log('Error:' + e.target.error.code);
    };

    var _numberRead = 0;

    // setup callback after reading
    var loadHandler = function(type, file) {

        return function(e) {

            // reading complete
            var data = e.target.result;

            // might have multiple files associated
            // attach the filedata to the right one
            _data[type]['filedata'][_data[type]['file'].indexOf(file)] = data;

            _numberRead++;
            if (_numberRead == _numberOfFiles) {
                // all done, start the parsing
                parse(_data);
            }
        };
    };

    //
    // start reading
    //

    var _types = Object.keys(_data);

    _types.forEach(function(v) {

        if (_data[v]['file'].length > 0) {
            _data[v]['file'].forEach(function(u, i) {
                if (_data[v]['loaded'][i] === true) return;
                _data[v]['loaded'][i] = true;
                var reader = new FileReader();

                reader.onerror = errorHandler;
                reader.onload = (loadHandler)(v,u); // bind the current type

                if (u.name.toLowerCase().endsWith('tko') || u.name.toLowerCase().endsWith('csv')) {
                    // Trako Yay!!
                    reader.readAsText(u);

                } else {
                    if (v === 'colortable') {
                        var colortable_reader = new FileReader();
                        colortable_reader.onload = preprocess_colortable;
                        colortable_reader.readAsText(u);
                    }
                    // start reading this file
                    reader.readAsArrayBuffer(u);
                }
            });
        }
    });
}


function preprocess_colortable(event) {
    data = event.target.result;
    colors = [];
    tick_values = [];
    legend_title = "";
    lines = data.split("\n");
    if (lines[0][0] === "#") {
        values = lines[0].split(" ");
        if (values[1] === "combined" && values[2] === "diverging")
            preprocess_diverging_combined_colortable(lines);
        else if (values[1] === "combined" && values[2] === "summedup")
            preprocess_diverging_combined_colortable(lines)
        else if (values[1] === "combined" && values[2].startsWith("binary"))
            preprocessing_swatches_colortable(lines)
    }
}

function preprocessing_swatches_colortable(lines) {
    if (typeof combined_colortable === "undefined")
        combined_colortable = {};

    values = [];
    tick_values = [];
    colors = [];

    lines.forEach((line)=>{
        values = line.split(" ");
        if (line.length > 0 && line[0] !=='#' && parseInt(values[5]) !== 0) {
            if (values[1].startsWith("combined")) {
                tmp_1 = values[1].split("_");
                tmp_1 = tmp_1.slice(1,tmp_1.length);
                tick_values.push(tmp_1.join(" & "));
            } else {
                combined_colortable[values[1].toLowerCase()] = [parseInt(values[2])/255, parseInt(values[3])/255, parseInt(values[4])/255];
                tick_values.push(values[1]);
            }
            colors.push(d3.rgb(parseInt(values[2]), parseInt(values[3]), parseInt(values[4]), parseInt(values[5])));
        }
    })
    swatches({
        target: "#colormap_overlaps",
        color: d3.scaleOrdinal(tick_values, colors),
    })
}

function preprocess_diverging_colortable(lines,title,target) {
    color_dict = {}
    values = [];
    tick_values = [];
    colors = [];

    lines.forEach((line)=>{
        values = line.split(" ");
        if (line.length > 0 && parseInt(values[5]) !== 0 && line[0] !=='#') {
            tick_values.push(parseInt(values[1].split("_")[1]));
            colors.push(d3.rgb(parseInt(values[2]), parseInt(values[3]), parseInt(values[4]), parseInt(values[5])));
            color_dict[parseInt(values[1].split("_")[1])] = [parseInt(values[2])/255, parseInt(values[3])/255, parseInt(values[4])/255];
        }
    })
    legend({
        target: target,
        color: d3.scaleOrdinal(tick_values, colors),
        title: title,
        height: 50,
        tickValues: tick_values,
        tickSize: 0
    })

    return color_dict;
}

function preprocess_diverging_combined_colortable(lines) {
    combined_colortable = {}
    wmh_data = [];
    cmb_data = [];
    epvs_data = [];
    combined_data = [];

    lines.forEach( (x) => {
        values = x.split(" ");
        if (x.length === 0 || values[0] === "#") {
            // do nothing
        } else if (values[1].startsWith("wmh")) {
            wmh_data.push(x);
        } else if (values[1].startsWith("cmb")) {
            cmb_data.push(x);
        } else if (values[1].startsWith("epvs")) {
            epvs_data.push(x);
        } else if (values[1].startsWith("combined")) {
            combined_data.push(x);
        } else {
            console.warn("Cannot parse line: " + x);
        }
    })

    combined_colortable["wmh"] = preprocess_diverging_colortable(wmh_data, "WMH Lesion Load", "#colormap_wmh");
    combined_colortable["cmb"] = preprocess_diverging_colortable(cmb_data, "CMB Lesion Load", "#colormap_cmb");
    combined_colortable["epvs"] = preprocess_diverging_colortable(epvs_data, "ePVS Lesion Load", "#colormap_epvs");
    preprocessing_swatches_colortable(combined_data);
}

//
// Parse file data and setup X.objects
//
function parse(data) {

    // initialize renderers
    initializeRenderers();

    //window.console.time('Loadtime');
    if (updated_volume) {
        for (let i = 0; i < data['volume']['file'].length; i++) {
            if (data['volume']["volumes"].length - 1 >= i)
                continue;
            createVolume(data, i);
        }
    } else {
        if (_data.updated_labelmap) {
            for (let i = 0; i < data['labelmap']['file'].length; i++) {
                if (data['labelmap']["volumes"].length - 1 >= i)
                    continue;
                createLabelmap(data, i);
            }
        }
    }

  if (data['mesh']['file'].length > 0) {

      for (let i = 0; i < data['mesh']['file'].length; i++){
          if (data['mesh']["meshes"].length - 1 >= i)
            continue;

              // we have a mesh
          createMesh(data, i);
      }
  }

  if (data['meshlabelmap']['file'].length > 0) {

        for (let i = 0; i < data['meshlabelmap']['file'].length; i++){
            if (data['meshlabelmap']["meshes"].length - 1 >= i) {
                ren3d.remove(data['meshlabelmap']['meshes'][i]);
                continue;
            }

            // we have a mesh
            createMeshLabelmap(data, i);
        }
    }

    if (data['lesionmetadata']['file'].length > 0) {

        for (let i = 0; i < data['lesionmetadata']['file'].length; i++){
            if (data['lesionmetadata']["metadata"].length - 1 >= i)
                continue;
            createLesionMetadata(data, i);
        }
    }

  if (currentVolume !== null || typeof mesh !== "undefined"){
      ren3d.camera.position = [0,370,0];
      ren3d.render();
  }
};

function createVolume(data, i) {
    volume = new X.volume();
    volume.pickable = false;
    volume.file = data['volume']['file'][i].name;
    volume.filedata = data['volume']['filedata'][i];
    data.volume.volumes.push(volume);
    var colortableParent = volume;

    if (updated_labelmap) {
        // we have a label map
        volume.labelmap.file = data['labelmap']['file'][data['labelmap']['file'].length-1].name
        volume.labelmap.filedata = data['labelmap']['filedata'][data['labelmap']['file'].length-1];
        colortableParent = volume.labelmap;
        volume.labelmap.visible = true;
        volume.labelmap.opacity = 1.0;
        data['labelmap']['volumes'].push(volume);
    }

    if (data['colortable']['file'].length > 0) {
        // we have a color table
        colortableParent.colortable.file = data['colortable']['file'][data["colortable"]["file"].length-1].name;
        colortableParent.colortable.filedata = data['colortable']['filedata'][data["colortable"]["file"].length-1];
    } else {
        colortableParent.e.xa = {"Ja": 0}
    }
    if (currentVolume === null) {
        currentVolume = volume;
        // add the volume
        ren3d.add(volume);
    } else {
        switchToVolume(i);
    }
}
function createLabelmap(data, i) {
    let labeledVolume = new X.volume();

    // load the most current volume file (only one should exist)
    labeledVolume.file = data['volume']['file'][data['volume']['file'].length - 1].name
    labeledVolume.filedata = data['volume']['filedata'][data['volume']['filedata'].length - 1];

    // load the labelmap from the new file
    labeledVolume.labelmap.file = data['labelmap']['file'][i].name;
    labeledVolume.labelmap.filedata = data['labelmap']['filedata'][i];

    labeledVolume.labelmap.visible = true;
    labeledVolume.labelmap.opacity = 1.0;
    data.labelmap.volumes.push(labeledVolume);

    // possibly apply a colortable
    //updateLabelmapUI();
    if (data['colortable']['file'].length > 0) {
        // we have a color table
        labeledVolume.labelmap.colortable.file = data['colortable']['file'][data['colortable']['file'].length - 1].name
        labeledVolume.labelmap.colortable.filedata = data['colortable']['filedata'][data['colortable']['filedata'].length - 1];
    } else {
        labeledVolume.e.xa = {"Ja": 0}
    }
    // switch to the current labelmap, that we just created
    switchToLabelmap(data.labelmap.volumes.length - 1);
}
function createMesh(data, i) {
    mesh = new X.mesh();
    mesh.pickable = false;
    mesh.moved = false;
    mesh.file = data['mesh']['file'][i].name;
    mesh.filedata = data['mesh']['filedata'][i];
    mesh.color = [1, 1, 1];

    data.mesh.meshes.push(mesh);

    // add the mesh
    ren3d.add(mesh);
}
function createMeshLabelmap(data, i) {
    meshlabelmap = new X.mesh();
    meshlabelmap.moved = false;
    meshlabelmap.file = data['meshlabelmap']['file'][i].name;
    meshlabelmap.filedata = data['meshlabelmap']['filedata'][i];
    if (typeof combined_colortable !== "undefined") {
        let filename_parts = data['meshlabelmap']['file'][i].name.split(".")[0].split("_")
        if (filename_parts[0] === "add")
            meshlabelmap.color = combined_colortable[filename_parts[1]][filename_parts[2]]
        else if (filename_parts[0] === "multiple")
            meshlabelmap.color = combined_colortable[filename_parts[1]]
    } else {
        meshlabelmap.color = meshlabelmap_color[data['meshlabelmap']['type'][i]];
    }
    data.meshlabelmap.dictionary[meshlabelmap.id] = meshlabelmap.file;
    data.meshlabelmap.meshes.push(meshlabelmap);

    // add the mesh
    ren3d.add(meshlabelmap);
}
function createLesionMetadata(data, i) {
    var lines = data.lesionmetadata.filedata[i].split("\n")
    var metadata = {}
    for (line in lines) {
        //var values = line.split(",")
        var values = lines[line].split(",")
        //console.log(parseInt(values[0]),values[1],parseFloat(values[2]))
        metadata[values[1]] = {
            volume: parseFloat(values[2])
        }
    }
    data["lesionmetadata"]["metadata"].push(metadata)
}

function onSliceNavigation() {


  jQuery('#red_slider').slider("option", "value",currentVolume.indexX);

  jQuery('#green_slider').slider("option", "value",currentVolume.indexY);

  jQuery('#blue_slider').slider("option", "value",currentVolume.indexZ);


};

function switchToLabelmap(index) {
    if (index < _data.labelmap.volumes.length){
        // remember the previous volume to update the 2D renderer after the data has been loaded in ren3d
        ren3d.remove(currentVolume);
        previousVolume = currentVolume;
        currentVolume = _data.labelmap.volumes[index];
        ren3d.add(currentVolume);
    } else {
        console.warn("labelmap with index ", index, "has not been loaded yet. so far ",
            _data.labelmap.volumes.length, "have been loaded");
    }
}

function switchToVolume(index) {
    if (index < _data.volume.volumes.length){
        // remember the previous volume to update the 2D renderer after the data has been loaded in ren3d
        ren3d.remove(currentVolume);
        previousVolume = currentVolume;
        currentVolume = _data.volume.volumes[index];
        ren3d.add(currentVolume);
    } else {
        console.warn("volume with index ", index, "has not been loaded yet. so far ",
            _data.volume.volumes.length, "have been loaded");
    }
}

//
// Interaction callbacks
//
function onTouchStartAx() {

  onTouchStart('sliceAx');

};

function onTouchStartSag() {

  onTouchStart('sliceSag');

};

function onTouchStartCor() {

  onTouchStart('sliceCor');

};

function onTouchStart3D() {

  onTouchStart('ren3d');

}

function onTouchEndAx() {

  onTouchEnd('sliceAx','Ax');

};

function onTouchEndSag() {

  onTouchEnd('sliceSag','Sag');

};

function onTouchEndCor() {

  onTouchEnd('sliceCor','Cor');

};

function onTouchEnd3D() {

  onTouchEnd('ren3d','3d');

}

function onTouchStart(renderer) {

  log('Touch start');

  _touch_started = Date.now();

  if (RT.linked) {
    clearInterval(RT._updater);
    RT._updater = setInterval(RT.pushCamera.bind(this, renderer), 150);
  }

}

function onTouchEnd(rend,container) {

  if (RT.linked){
    clearInterval(RT._updater);
  }

  _touch_ended = Date.now();

  if (typeof _touch_started == 'undefined') {
    _touch_started = _touch_ended;
  }

  if (_touch_ended - _touch_started < 200) {

    var _old_2d_content = eval('_current_' + container + '_content');
    eval('var cont = '+rend+'.container');

    showLarge(jQuery(cont), _old_2d_content);

    if (RT.linked) {

      RT._updater = setInterval(RT.pushUI.bind(RT, rend, container), 150);

    }

  }

};

function initializeHovering() {

    $(ren3d.sa).mousemove(function(e) {
        var pos = findPos(this);
        var x = e.pageX - pos.x;
        var y = e.pageY - pos.y;
        var coord = "x=" + x + ", y=" + y;
        var c = this.getContext('2d');
        var mesh_id = ren3d.pick(x,y);
        if (mesh_id in _data.meshlabelmap.dictionary) {
            //console.log(x, y, mesh_id, _data.meshlabelmap.dictionary[mesh_id]);
            if (mesh_id in hovered_element) {
                // do nothing :)
            } else {
                for (x in hovered_element) {
                    if (x !== mesh_id) {
                        hovered_element[x].mesh.color = hovered_element[x].originalColor;
                    }
                }
                hovered_element = {};

                var mesh = ren3d.get(mesh_id);
                hovered_element[mesh_id] = {
                    //originalColor: mesh.color,
                    originalColor: ((mesh_id in selected_elements) ? selected_elements[mesh_id].originalColor : mesh.color),
                    mesh: mesh
                }
                mesh.color = hovered_color;
            }
        } else {
            for (x in hovered_element) {
                if (x in selected_elements) {
                    hovered_element[x].mesh.color = selected_color;
                } else {
                    hovered_element[x].mesh.color = hovered_element[x].originalColor;
                }
            }
            hovered_element = {};
        }
    });
}

function initializeMeshSelection() {

    // clickable stuff
    $(ren3d.sa).click(function(e) {
        var pos = findPos(this);
        var x = e.pageX - pos.x;
        var y = e.pageY - pos.y;
        var coord = "x=" + x + ", y=" + y;
        var c = this.getContext('2d');
        var mesh_id = ren3d.pick(x,y);
        if (mesh_id in _data.meshlabelmap.dictionary) {
            //console.log(x, y, mesh_id, _data.meshlabelmap.dictionary[mesh_id]);
            if (mesh_id in selected_elements){
                destroyTooltip(mesh_id);
                if (x in hovered_element) {
                    hovered_element[x].mesh.color = hovered_color;
                }
                for ( x in selected_elements) {
                    selected_elements[x].tippyInstance.show();
                }
            } else {
                createTooltip(x,y,mesh_id);
            }
        } else {
            for ( x in selected_elements) {
                destroyTooltip(x);
            }
        }
    });
}

function findPos(obj) {
    var curleft = 0, curtop = 0;
    if (obj.offsetParent) {
        do {
            curleft += obj.offsetLeft;
            curtop += obj.offsetTop;
        } while (obj = obj.offsetParent);
        return { x: curleft, y: curtop };
    }
    return undefined;
}

// Tooltips
function createTooltip(x,y,mesh_id){
    var mesh_name = _data.meshlabelmap.dictionary[mesh_id];
    var fake_div = document.createElement("div");
    fake_div.style.position = "absolute";
    fake_div.style.left = x+"px";
    fake_div.style.top = y+"px";
    fake_div.id = "tooltipTarget"+mesh_id;
    $("#3d").append(fake_div);

    var volume = "na";
    for (let i = 0; i < _data.lesionmetadata.metadata.length; i++) {
        if (mesh_name in _data.lesionmetadata.metadata[i]) {
            volume = _data["lesionmetadata"]["metadata"][i][mesh_name].volume.toFixed(4);
        }
    }

    var tippy_instance = tippy("#tooltipTarget"+mesh_id,{
        content: "<strong>Name:</strong> "+mesh_name+"<br>"+
            "<strong>Volume:</strong> "+volume,
        zIndex: 9999,
        trigger: "manual",
        sticky: true,
        allowHTML: true,
        offset: [0,-5]
    });

    var selected_mesh = ren3d.get(mesh_id);
    selected_elements[mesh_id] = {
        originalColor: ((mesh_id in hovered_element) ? hovered_element[mesh_id].originalColor : selected_mesh.color),
        fakeDiv: fake_div,
        tippyInstance: tippy_instance[0],
        selectedMesh: selected_mesh
    }

    selected_mesh.color = selected_color;
    //tippy_instance[0].show();
    for ( x in selected_elements) {
        selected_elements[x].tippyInstance.show();
    }
}

function destroyTooltip(mesh_id){
    selected_elements[mesh_id].selectedMesh.color = selected_elements[mesh_id].originalColor;
    selected_elements[mesh_id].tippyInstance.destroy();
    selected_elements[mesh_id].fakeDiv.remove();
    delete selected_elements[mesh_id];
}

