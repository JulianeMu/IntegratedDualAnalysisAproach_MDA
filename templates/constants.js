const meshlabelmap_color = {
    'wmh': [1, 0.55 ,0.2],
    'cmb': [142/255, 68/255, 173/255],
    'epvs': [46/255, 204/255, 113/255]
};

// 3D and 2D views
/*const color_overlap_all = []
const color_overlap_wmh_cmb
const color_overlap_cmb_epvs
const color_overlap_wmh_epvs*/

const color_hovered_mesh = [247/255, 220/255, 111/255];
const color_selected_mesh = [1,1,0.7];


// bullseye plots
const color_bullseye_wmh = d3.interpolateOranges;
const color_bullseye_cmb = d3.interpolatePurples;
const color_bullseye_epvs = d3.interpolateGreens;

const color_bullseye_wmh_diverging = d3.interpolatePiYG;
const color_bullseye_cmb_diverging = d3.interpolateRdBu;
const color_bullseye_epvs_diverging = d3.interpolatePuOr;

//mapping brain parcellation to bullseye
const lobe_to_index = {
    5: 4,
    11: 0,
    12: 1,
    13: 2,
    14: 3,
    21: 8,
    22: 7,
    23: 6,
    24: 5,
}

const index_to_lobe = {
    4: 5,
    0: 11,
    1: 12,
    2: 13,
    3: 14,
    8: 21,
    7: 22,
    6: 23,
    5: 24,
}