/*

    .----.                    _..._                                                     .-'''-.
   / .--./    .---.        .-'_..._''.                          _______                '   _    \
  ' '         |   |.--.  .' .'      '.\     __.....__           \  ___ `'.           /   /` '.   \_________   _...._
  \ \         |   ||__| / .'            .-''         '.    ,.--. ' |--.\  \         .   |     \  '\        |.'      '-.
   `.`'--.    |   |.--.. '             /     .-''"'-.  `. //    \| |    \  ' .-,.--.|   '      |  '\        .'```'.    '.
     `'-. `.  |   ||  || |            /     /________\   \\\    /| |     |  '|  .-. \    \     / /  \      |       \     \
         `. \ |   ||  || |            |                  | `'--' | |     |  || |  | |`.   ` ..' /    |     |        |    |
           \ '|   ||  |. '            \    .-------------' ,.--. | |     ' .'| |  | |   '-...-'`     |      \      /    .
            | |   ||  | \ '.          .\    '-.____...---.//    \| |___.' /' | |  '-                 |     |\`'-.-'   .'
            | |   ||__|  '. `._____.-'/ `.             .' \\    /_______.'/  | |                     |     | '-....-'`
           / /'---'        `-.______ /    `''-...... -'    `'--'\_______|/   | |                    .'     '.
     /...-'.'                       `                                        |_|                  '-----------'
    /--...-'

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

    // clickable stuff
      $(ren3d.sa).mousemove(function(e) {
          var pos = findPos(this);
          var x = e.pageX - pos.x;
          var y = e.pageY - pos.y;
          var coord = "x=" + x + ", y=" + y;
          var c = this.getContext('2d');
          if (ren3d.pick(x,y) in _data.meshlabelmap.dictionary) {
              console.log(x, y, ren3d.pick(x,y), _data.meshlabelmap.dictionary[ren3d.pick(x,y)]);
          }
      });
      $(ren3d.sa).ready(function(){
          $('.btn-success').tooltip({title: "Hooray!", trigger: "click"});
      });

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

  } catch (Error) {

    window.console.log('WebGL *not* supported.');

    _webgl_supported = false;

    // delete the created 3d canvas
    jQuery('#3d').empty();

    jQuery(document.body).addClass('webgl_disabled');
    jQuery(document.body).removeClass('webgl_enabled');
  }


   gizmo = addGizmo(jQuery("#3d")[0], ren3d.camera);


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

  ren3d.onShowtime = function() {

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
            jQuery("#blue_slider").slider("option", "max", dim[2] - 1);
            jQuery("#blue_slider").slider("option", "value", currentVolume.indexZ);

            // sag
            jQuery("#red_slider").slider("option", "disabled", false);
            jQuery("#red_slider").slider("option", "min", 0);
            jQuery("#red_slider").slider("option", "max", dim[0] - 1);
            jQuery("#red_slider").slider("option", "value", currentVolume.indexX);

            // cor
            jQuery("#green_slider").slider("option", "disabled", false);
            jQuery("#green_slider").slider("option", "min", 0);
            jQuery("#green_slider").slider("option", "max", dim[1] - 1);
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
  };


  //
  // LINK THE RENDERERS
  //
  // link the 2d renderers to the 3d one by setting the onScroll
  // method. this means, once you scroll in 2d, it upates 3d as well
  var _updateThreeDSag = function() {

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
  var _updateThreeDAx = function() {

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
  var _updateThreeDCor = function() {

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

  sliceAx.onScroll = _updateThreeDAx;
  sliceSag.onScroll = _updateThreeDSag;
  sliceCor.onScroll = _updateThreeDCor;

  var _updateWLSlider = function() {

    jQuery('#windowlevel-volume').dragslider("option", "values", [currentVolume.windowLow, currentVolume.windowHigh]);

    if (RT.linked) {

      clearTimeout(RT._updater);
      RT._updater = setTimeout(RT.pushVolume.bind(RT, 'windowLow', currentVolume.windowLow), 150);
      clearTimeout(RT._updater2);
      RT._updater2 = setTimeout(RT.pushVolume.bind(RT, 'windowHigh', currentVolume.windowHigh), 150);

    }

  };

  sliceAx.onWindowLevel = _updateWLSlider;
  sliceSag.onWindowLevel = _updateWLSlider;
  sliceCor.onWindowLevel = _updateWLSlider;

};

function createData() {


  // we support here max. 1 of the following
  //
  // volume (.nrrd,.mgz,.mgh)
  // labelmap (.nrrd,.mgz,.mgh)
  // colortable (.txt,.lut)
  // mesh (.stl,.vtk,.fsm,.smoothwm,.inflated,.sphere,.pial,.orig)
  // scalars (.crv)
  // fibers (.trk)

  //
  // the data holder for the scene
  // includes the file object, file data and valid extensions for each object
    if (typeof _data == "undefined")
    {
          _data = {
           'volume': {
             'file': [],
               'loaded' : [],
             'filedata': [],
             'extensions': ['NRRD', 'MGZ', 'MGH', 'NII', 'GZ', 'DCM', 'DICOM']
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
              'dictionary' : {}
          },
           'scalars': {
             'file': [],
               'loaded' : [],
             'filedata': [],
             'extensions': ['CRV', 'LABEL']
           },
           'fibers': {
             'file': [],
               'loaded' : [],
             'filedata': [],
             'extensions': ['TRK', 'TKO']
           }
          };
        currentVolume = null;
        previousVolume = null;
        guiLoaded = false;
        updated_volume = false;
        updated_labelmap = false;
    }

}

//
// Reading files using the HTML5 FileReader.
//
function read(files) {

  createData();

  // show share button
  $('#share').show();

  // number of total files
  var _numberOfFiles = files.length;

  for ( var i = 0; i < files.length; i++) {

   var f = files[i];
   var _fileName = f.name;
   var _fileExtension = _fileName.split('.').pop().toUpperCase();

   // check for files with no extension
   if (_fileExtension == _fileName.toUpperCase()) {
     // this must be dicom
     _fileExtension = 'DCM';
   }

   var _fileSize = f.size;

   // check which type of file it is
   if (_data['volume']['extensions'].indexOf(_fileExtension) >= 0) {
       if (_fileName.toString().includes("wmh")){
           updated_labelmap = true;
           _data['labelmap']['file'].push(f);
           _data['labelmap']['loaded'].push(false);
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
       if (_fileName.toString().includes("wmh")){
           _data['meshlabelmap']['file'].push(f);
           _data['meshlabelmap']['loaded'].push(false);
       } else {
           _data['mesh']['file'].push(f);
           _data['mesh']['loaded'].push(false);
       }

   } else if (_data['scalars']['extensions'].indexOf(_fileExtension) >= 0) {

     // this is a scalars file
     _data['scalars']['file'].push(f);
     _data['scalars']['loaded'].push(false);

   } else if (_data['fibers']['extensions'].indexOf(_fileExtension) >= 0) {

     // this is a fibers file
     _data['fibers']['file'].push(f);
     _data['fibers']['loaded'].push(false);

   } else {
       console.log(_fileName);
       _numberOfFiles -= 1;
   }

  }

  // we now have the following data structure for the scene
  window.console.log('New data', _data);

  var _types = Object.keys(_data);

  var _numberRead = 0;
  window.console.log('Total new files:', _numberOfFiles);

  //
  // the HTML5 File Reader callbacks
  //

  // setup callback for errors during reading
  var errorHandler = function(e) {

   console.log('Error:' + e.target.error.code);

  };

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
  _types.forEach(function(v) {

   if (_data[v]['file'].length > 0) {
     _data[v]['file'].forEach(function(u, i) {
         if (_data[v]['loaded'][i] === true) return;
         _data[v]['loaded'][i] = true;
       var reader = new FileReader();

       reader.onerror = errorHandler;
       reader.onload = (loadHandler)(v,u); // bind the current type

       if (u.name.toLowerCase().endsWith('tko')) {
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
};

function preprocess_colortable(event) {
    data = event.target.result;
    colors = [];
    tick_values = [];
    legend_title = "";
    data.split("\n").forEach((line)=>{
        values = line.split(" ");
        if(line[0] === "#") {
            legend_title = line.replace('#','');
        }
        if (line.length > 0 && parseInt(values[5]) !== 0 && line[0] !=='#') {
            tick_values.push(parseInt(values[0]));
            colors.push(d3.rgb(parseInt(values[2]), parseInt(values[3]), parseInt(values[4]), parseInt(values[5])));
        }
    })
    legend({
        color: d3.scaleOrdinal(tick_values, colors),
        title: legend_title,
        height: 50,
        tickValues: tick_values,
        tickSize: 0
    })
}

//
// Parse file data and setup X.objects
//
function parse(data) {

    // initialize renderers
    initializeRenderers();

    //window.console.time('Loadtime');
    if (updated_volume) {
        volume = new X.volume();
        volume.pickable = false;
        volume.file = data['volume']['file'].map(function (v) {
            return v.name;
        });
        volume.filedata = data['volume']['filedata'];
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
            colortableParent.colortable.file = data['colortable']['file'].map(function (v) {
                return v.name;
            });
            colortableParent.colortable.filedata = data['colortable']['filedata'];
        } else {
            colortableParent.e.xa = {"Ja": 0}
        }
        currentVolume = volume;
        // add the volume
        ren3d.add(volume);
    } else {
        if (_data.updated_labelmap) {
            for (let i = 0; i < data['labelmap']['file'].length; i++) {
                if (data['labelmap']["volumes"].length - 1 >= i)
                    continue;

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
        }
    }
    /*if (data['volume']['file'].length > 0) {
        if (typeof volume == "undefined"){
            // we have a volume
            volume = new X.volume();
            volume.pickable = false;
            volume.file = data['volume']['file'].map(function(v) {
                return v.name;
            });
            volume.filedata = data['volume']['filedata'];
            var colortableParent = volume;

            if (data['labelmap']['file'].length > 0) {
                // we have a label map
                volume.labelmap.file = data['labelmap']['file'].map(function(v) {
                    return v.name;
                });
                volume.labelmap.filedata = data['labelmap']['filedata'];
                colortableParent = volume.labelmap;
                volume.labelmap.visible = false;
                volume.labelmap.opacity = 1.0;
            }

            if (data['colortable']['file'].length > 0) {
                // we have a color table
                colortableParent.colortable.file = data['colortable']['file'].map(function(v) {
                    return v.name;
                });
                colortableParent.colortable.filedata = data['colortable']['filedata'];
            }
            currentVolume = volume;
            // add the volume
            ren3d.add(volume);
        } */
/*else
    {
        if (data['labelmap']['file'].length > 0) {
            for (let i = 0; i < data['labelmap']['file'].length; i++) {
                if (data['labelmap']["volumes"].length - 1 >= i)
                    continue;

                let labeledVolume = new X.volume();

                // load the most current volume file (only one should exist)
                labeledVolume.file = data['volume']['file'].map(function (v) {
                    return v.name;
                });
                labeledVolume.filedata = data['volume']['filedata'];

                // load the labelmap from the new file
                labeledVolume.labelmap.file = data['labelmap']['file'][i].name;
                labeledVolume.labelmap.filedata = data['labelmap']['filedata'][i];

                labeledVolume.labelmap.visible = true;
                labeledVolume.labelmap.opacity = 1.0;
                data.labelmap.volumes.push(labeledVolume);

                // possibly apply a colortable
                //labeledVolume.labelmap.colortable.file = 'http://x.babymri.org/?genericanatomy.txt';
                //updateLabelmapUI();
                if (data['colortable']['file'].length > 0) {

                    // we have a color table
                    labeledVolume.labelmap.colortable.file = data['colortable']['file'].map(function (v) {

                        return v.name;

                    });
                    //labeledVolume.colortable.file = data['colortable']['file'].map(function(v) {
                    // return v.name;
                    //});
                    labeledVolume.labelmap.colortable.filedata = data['colortable']['filedata'];
                    //labeledVolume.colortable.filedata = data['colortable']['filedata'];

                } else {
                    labeledVolume.e.xa = {"Ja": 0}
                }
                // switch to the current labelmap, that we just created
                switchToLabelmap(data.labelmap.volumes.length - 1);
            }
        }
    }*/
  if (data['mesh']['file'].length > 0) {

      for (let i = 0; i < data['mesh']['file'].length; i++){
          if (data['mesh']["meshes"].length - 1 >= i)
            continue;

              // we have a mesh
          mesh = new X.mesh();
          mesh.pickable = false;
          mesh.moved = false;
          mesh.file = data['mesh']['file'][i].name;
          mesh.filedata = data['mesh']['filedata'][i];
          mesh.color = [1, 1, 1];

          if (data['scalars']['file'].length > 0) {

              // we have scalars
              mesh.scalars.file = data['scalars']['file'].map(function(v) {
                  return v.name;
              });
              mesh.scalars.filedata = data['scalars']['filedata'];
          }
          data.mesh.meshes.push(mesh);

          // add the mesh
          ren3d.add(mesh);
      }
  }

  if (data['meshlabelmap']['file'].length > 0) {

        for (let i = 0; i < data['meshlabelmap']['file'].length; i++){
            if (data['meshlabelmap']["meshes"].length - 1 >= i)
                continue;


            // we have a mesh
            meshlabelmap = new X.mesh();
            meshlabelmap.moved = false;
            meshlabelmap.file = data['meshlabelmap']['file'][i].name;
            meshlabelmap.filedata = data['meshlabelmap']['filedata'][i];
            meshlabelmap.color = [1, 0.3, 0.6];
            data.meshlabelmap.dictionary[meshlabelmap.id] = meshlabelmap.file;

            if (data['scalars']['file'].length > 0) {

                // we have scalars
                meshlabelmap.scalars.file = data['scalars']['file'].map(function(v) {
                    return v.name;
                });
                meshlabelmap.scalars.filedata = data['scalars']['filedata'];

            }
            data.meshlabelmap.meshes.push(meshlabelmap);

            // add the mesh
            ren3d.add(meshlabelmap);
        }
    }

  if (data['fibers']['file'].length > 0) {

   // we have fibers
   fibers = new X.fibers();
   fibers.file = data['fibers']['file'].map(function(v) {
     return v.name;
   });
   fibers.filedata = data['fibers']['filedata'];

   // special case for trako

   if (fibers.file.toLowerCase().endsWith('tko')) {

    console.log('Found Trako! Yay!');
    
    tko_json = JSON.parse(fibers.filedata);

    var xtk_tr = new xtkTrakoReader();
    fibers = xtk_tr.parse(tko_json);

   }

/*  if (data['colortable']['file'].length > 0) {
      console.log(data['colortable']['filedata'][0]);
  }*/

   // add the fibers
   ren3d.add(fibers);

  }

  if (currentVolume !== null || typeof mesh !== "undefined"){
      ren3d.camera.position = [0,370,0];
      ren3d.render();
  }
};

function createNewLabelmap(){

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

