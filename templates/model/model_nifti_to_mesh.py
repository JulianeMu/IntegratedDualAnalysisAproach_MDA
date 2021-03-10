from skimage import measure
import numpy as np
import itertools
import networkx as nx
import SimpleITK as sitk
from matplotlib import cm
import math
import trimesh
import pandas as pd
import os
from scipy.ndimage import sobel, generic_gradient_magnitude

# create brain mesh as OBJ
def create_obj_brain(image, outputpath, threshold):
    """
    :param image: NIFTI Volume Data as ndarray
    :param outputpath: path name
    :param threshold: iso value of marching cubes algorithm
    :return: list of all created files
    """
    p = image.transpose(2,0,1)
    verts, faces, normals, values = measure.marching_cubes(p, threshold)
    #spacing = np.array([1.2000000477, 0.9765999913, 3.0000000000])
    spacing = np.array([1, 1, 1])
    verts = verts*spacing
    verts[:, 1] = p.shape[1] * spacing[1] - verts[:, 1]

    """# find connected components
    edges = []
    for face in faces:
        edges.extend(list(itertools.combinations(face, 2)))
    g = nx.from_edgelist(edges)

    # compute connected components and print results
    components = list(nx.algorithms.components.connected_components(g))

    largestComponent = components[0]
    largestComponentSize = len(components[0])
    for component in components[1:]:
        a = len(component)
        if a > largestComponentSize:
            largestComponentSize = a
            largestComponent = component

    # get a mapping of old vector indices to new vector indices and ...
    # reduce the numpy array the the vertices of the largest component
    vertices_map = {prev_idx: idx for idx, prev_idx in enumerate(sorted(list(largestComponent)))}
    vertex_filter = [v_idx in largestComponent for v_idx in range(verts.shape[0])]
    filtered_vertices = verts[vertex_filter]

    # also filter normals
    filtered_normals = normals[vertex_filter]

    # remap faces to new vertices indexes
    def remap(x):
        return vertices_map[x]
    remap = np.vectorize(remap)                  # vectorize the function such that numpy can apply it in parallel
    filter_faces = np.apply_along_axis(lambda x: x[0] in largestComponent and
                                                 x[1] in largestComponent and
                                                 x[2] in largestComponent, 1, faces)
    remapped_faces = remap(faces[filter_faces])  # apply the remap function to each face

    write_single_obj_file(filtered_vertices, remapped_faces, filtered_normals, os.path.join(outputpath,"brain.obj"))"""
    write_single_obj_file(verts, faces, normals, os.path.join(outputpath,"brain.obj"))

    return ["brain.obj"]


# create wmh mesh as OBJ
def create_obj_lesions(image, outputpath, lesiontype, threshold = 0.999, threshold_digit = 0.5):
    """
    :param image: NIFTI WMH Data as ndarray
    :param outputpath: path name
    :param threshold: iso value of marching cubes algorithm
    :return: list of all created files
    """
    image[image < threshold_digit] = 0
    image[image >= threshold_digit] = 1
    p = image.transpose(2,0,1)
    verts, faces, normals, values = measure.marching_cubes(p, threshold)
    spacing = np.array([1,1,1]) #([1.2000000477, 0.9765999913, 3.0000000000])
    verts = verts*spacing
    verts[:, 1] = p.shape[1] * spacing[1] - verts[:, 1]
    filenames = write_multiple_obj_files(verts, faces, normals, os.path.join(outputpath,"multiple_" + lesiontype))
    return filenames


# writes a single OBJ file
def write_single_obj_file(verts, faces, normals, outputfile):
    """
    :param verts: vertices
    :param faces: faces
    :param normals: normals
    :param outputfile: filename
    :return: filename
    """
    faces = faces + 1          # add +1 since the obj-file indexing starts with 1 and not 0
    faces = faces[:, [0, 2, 1]]

    # write obj file
    with open(outputfile, 'w') as thefile:
        for item in verts:
            thefile.write("v {0} {1} {2}\n".format(item[0], item[1], item[2]))

        for item in normals:
            thefile.write("vn {0} {1} {2}\n".format(item[0], item[1], item[2]))

        for item in faces:
            thefile.write("f {0}//{0} {1}//{1} {2}//{2}\n".format(item[0], item[1], item[2]))
            thefile.write("f {0}//{0} {1}//{1} {2}//{2}\n".format(item[0], item[2], item[1]))
    return outputfile


# writes multiple OBJ files
def write_multiple_obj_files(verts, faces, normals, outputfile):
    """
    Writes multiple OBJ files and meta file data including volume information
    :param verts: vertices
    :param faces: faces
    :param normals: normals
    :param outputfile: base filename
    :return: filenames
    """
    # find connected components
    vert_to_faceset = {vert: set() for vert in range(verts.shape[0])}
    edges = []
    for i, face in enumerate(faces):
        edges.extend(list(itertools.combinations(face, 2)))
        for vertex in face:
            vert_to_faceset[vertex].add(i)
    g = nx.from_edgelist(edges)

    # compute connected components and print results
    components = list(nx.algorithms.components.connected_components(g))

    df = pd.DataFrame(columns=['Filename', 'Volume'])

    filenames = []
    for i,component in enumerate(components):
        vertices_map = {prev_idx: idx for idx, prev_idx in enumerate(sorted(list(component)))}
        vertex_filter = [v_idx in component for v_idx in range(verts.shape[0])]
        filtered_verts = verts[vertex_filter]
        filtered_normals = normals[vertex_filter]

        def remap(x):
            return vertices_map[x]
        remap = np.vectorize(remap)                  # vectorize the function such that numpy can apply it in parallel
        filter_faces = set().union(*[vert_to_faceset[vert] for vert in component])
        remapped_faces = remap(faces[np.array(list(filter_faces)), :])  # apply the remap function to each face
        mesh = trimesh.Trimesh(vertices = filtered_verts, faces = remapped_faces, process = False)  # calc volume and stuff
        filename = outputfile.split(os.sep)[-1]+f'_{i}.obj'
        df = df.append({'Filename': filename, 'Volume': mesh.volume}, ignore_index=True)
        write_single_obj_file(filtered_verts,remapped_faces,filtered_normals,outputfile+f'_{i}.obj')
        filenames.append(filename)
    df.to_csv(outputfile+'_lesiondata.csv')
    filenames.append(outputfile.split(os.sep)[-1]+'_lesiondata.csv')
    return filenames


# extracting spheres instead of marching cubes
def write_spheres_file(image, outputpath, lesiontype):
    p = image.transpose(2,0,1)
    verts = np.array(np.where(p>=1)).T
    values = p[np.where(p>=1)]
    spacing = np.array([1, 1, 1])
    verts = verts*spacing
    verts[:, 1] = p.shape[1] * spacing[1] - verts[:, 1]

    with open (os.path.join(outputpath, lesiontype + ".spheres"),"w") as f:
        for i,sphere in enumerate(verts):
            f.write(f"{sphere[0]} {sphere[1]} {sphere[2]} {values[i]}\n")
    return [lesiontype + ".spheres"]


# add lesionmaps
def add_wmh(images, originalImage, outputpath, filetype):
    """
    :param images: List of NIFTI Labelmap ndarrays
    :param originalImage: one NIFTI Volume Data object
    :param outputpath: outputpath
    :return: filename, NIFTI Labelmap ndarray
    """
    finalImage = np.zeros(images[0].shape)

    for image in images:
        # make sure no weird numbers appear
        image[image > 0] = 1
        image[image < 0] = 0
        finalImage += image

    mesh_files = create_layered_meshes(finalImage,outputpath, filetype)

    finalImageFile = sitk.GetImageFromArray(finalImage)
    finalImageFile.CopyInformation(originalImage)
    writer = sitk.ImageFileWriter()
    writer.SetFileName(os.path.join(outputpath,filetype+".nii.gz"))
    writer.Execute(finalImageFile)

    #mesh_files.append(create_colormap(int(np.max(images)), outputpath))
    return filetype+".nii.gz", finalImage, mesh_files

def combine_labelmaps(wmhImage, cmbImage, epvsImage, originalImage, outputpath, colormapType = None, threshold = 0.5):
    cmbOffset = np.max(np.abs(wmhImage))
    epvsOffset = np.max(np.abs(cmbImage))+cmbOffset
    combinationOffset = np.max(np.abs(epvsImage))+epvsOffset
    finalImage = np.zeros(wmhImage.shape)
    wmh_mask = np.abs(wmhImage) > threshold
    cmb_mask = np.abs(cmbImage) > threshold
    epvs_mask = np.abs(epvsImage) > threshold
    finalImage[wmh_mask] = np.round(wmhImage[wmh_mask])
    finalImage[cmb_mask] = np.round(cmbImage[cmb_mask]+cmbOffset*np.sign(cmbImage[cmb_mask]))
    finalImage[epvs_mask] = np.round(epvsImage[epvs_mask]+epvsOffset*np.sign(epvsImage[epvs_mask]))
    finalImage[wmh_mask*cmb_mask] = combinationOffset+1
    finalImage[wmh_mask*epvs_mask] = combinationOffset+2
    finalImage[cmb_mask*epvs_mask] = combinationOffset+3
    finalImage[wmh_mask*cmb_mask*epvs_mask] = combinationOffset+4

    finalImageFile = sitk.GetImageFromArray(finalImage)
    finalImageFile.CopyInformation(originalImage)
    writer = sitk.ImageFileWriter()
    writer.SetFileName(outputpath + "/combined.nii.gz")
    writer.Execute(finalImageFile)
    if colormapType is None:
        if np.max(wmhImage) <= 1 and np.min(wmhImage) >= 0 and \
                np.max(cmbImage) <= 1 and np.min(cmbImage) >= 0 and \
                np.max(epvsImage) <= 1 and np.min(epvsImage) >= 0:
            colormapType = "binary"
        elif np.min(wmhImage) >= 0 and np.min(cmbImage) >= 0 and np.min(epvsImage) >= 0:
            colormapType = "summedup"
        else:
            colormapType = "diverging"

    if colormapType == "binary":
        combinedColormap = create_combined_binary_colormap(outputpath)
    elif colormapType == "summedup":
        combinedColormap = create_combined_summedup_colormap(cmbOffset, epvsOffset, combinationOffset, outputpath)
    else: #diverging colormap
        combinedColormap = create_combined_diverging_colormap(cmbOffset, epvsOffset, combinationOffset, outputpath)

    return "combined.nii.gz", finalImage, combinedColormap

# writes one OBJ per accumulated lesion load
def create_layered_meshes(image, outputpath, filetype, basename = "add_", exportLayerMask = False):
    filenames = []
    image = image.transpose(2, 0, 1)
    layers = np.unique(image)
    df = pd.DataFrame(columns=['Filename', 'Volume'])

    for layer in layers:
        if int(layer) == 0:
            continue
        layer_image = image == layer
        layer_image = layer_image*1

        if exportLayerMask:
            #sobel_image = generic_gradient_magnitude(layer_image, sobel) > 0
            np.savez_compressed(os.path.join(outputpath, "layer_mask_" + str(layer)), image=layer_image.transpose(1, 2, 0))
        verts, faces, normals, values = measure.marching_cubes(layer_image, 0.99)
        spacing = np.array([1,1,1]) #([1.2000000477, 0.9765999913, 3.0000000000])
        verts = verts*spacing
        verts[:, 1] = layer_image.shape[1] * spacing[1] - verts[:, 1]

        mesh = trimesh.Trimesh(vertices = verts, faces = faces, process = False)  # calc volume and stuff
        filename = basename + str(filetype) + "_" + str(int(layer))+".obj"
        df = df.append({'Filename': filename, 'Volume': mesh.volume}, ignore_index=True)

        #filenames.extend(write_multiple_obj_files(verts, faces, normals, outputpath + "\\"+basename+"_wmh_" + str(int(layer))))
        #filenames.extend(write_multiple_obj_single_file(verts, faces, normals, outputpath + "\\"+basename+"_wmh_" + str(int(layer))))
        write_single_obj_file(verts, faces, normals, os.path.join(outputpath, filename))
        filenames.extend([filename])

    df.to_csv(os.path.join(outputpath, filetype + '_lesiondata.csv'))
    filenames.append(filetype + '_lesiondata.csv')

    return filenames


# subtract lesion maps
def sub_wmh(image1, image2, originalImage, outputpath):
    """
    :param image1: NIFTI lesionmap ndarray
    :param image2: NIFTI lesionmap ndarray
    :param originalImage: one NIFTI Volume Data object
    :param outputpath: outputpath
    :return: filename, NIFTI Labelmap ndarray
    """
    finalImage = image1 - image2

    finalImageFile = sitk.GetImageFromArray(finalImage)
    finalImageFile.CopyInformation(originalImage)
    writer = sitk.ImageFileWriter()
    writer.SetFileName(outputpath + "/sub.nii.gz")
    writer.Execute(finalImageFile)

    create_divergingcolormap(int(np.min(finalImage)), int(np.max(finalImage)), outputpath)
    return outputpath + "/sub.nii.gz", finalImage


# creates colormap based on number of labelmaps
def create_colormap(numentries,outputpath):
    """
    :param numentries: number of labelmaps
    :param outputpath: outputpath
    :return: filename
    """
    cmap = cm.get_cmap('OrRd', numentries)
    samplingColors = cmap(np.linspace(0, 1, numentries))
    print(samplingColors)

    with open(outputpath+"/colortable.txt", "w") as f:
        f.write("0 background 0 0 0 0\n")
        for i in range(1, numentries):
            f.write(str(i) + " wmh " + " ".join([str(math.floor(x*255)) for x in samplingColors[i]]) + "\n")

    return "colortable.txt"


# creates colormap based on number of labelmaps
def create_combined_diverging_colormap(cmbOffset, epvsOffset, combinedOffset, outputpath):
    """
    :param outputpath: outputpath
    :return: filename
    """

    #cmbOffset = 23
    #epvsOffset = 20+cmbOffset
    #combinedOffset = 30+epvsOffset


    def writeBinnedColormap(numberOfColors, cmap, type, f, offset, minus):
        if numberOfColors > 10:
            binSize = numberOfColors//3
            nrOfBins = math.ceil(numberOfColors/binSize)
            bins = [x*binSize + 1 for x in range(nrOfBins)]
            window_label = [(bins[x], bins[x+1]-1) for x in range(len(bins)-1)]
            if window_label[-1][-1] != numberOfColors:
                if bins[-1] == numberOfColors:
                    window_label.append((bins[-1],))
                else:
                    window_label.append((bins[-1], numberOfColors))
            if minus:
                window_label = [str(-x[0]) if len(x) == 1 or x[0] == x[1] else str(-x[1]) + "_" + str(-x[0]) for x in window_label]
            else:
                window_label = [str(x[0]) if len(x) == 1 or x[0] == x[1] else str(x[0]) + "_" + str(x[1]) for x in window_label]

            #print(numberOfColors, window_label)
        else:
            if minus:
                window_label = [str(-i) for i in range(1, int(numberOfColors+1))]
            else:
                window_label = [str(i) for i in range(1, int(numberOfColors+1))]

        cmap = cm.get_cmap(cmap, len(window_label)*2+1)

        if minus:
            colors = [cmap(i) for i in range(0, len(window_label))][::-1]

            offset = offset * -1
            for i, label in list(enumerate(window_label))[::-1]:
                if len(label.split("_")) > 1:   #backwards compatible
                    for j in range(int(label.split("_")[0]), int(label.split("_")[1])+1):
                        f.write(f"{str(offset+int(j))} {type}_{label} {' '.join([str(math.floor(x*255)) for x in colors[i]])}\n")
                else:
                    f.write(f"{str(offset+int(label))} {type}_{label} {' '.join([str(math.floor(x*255)) for x in colors[i]])}\n")

        else:
            colors = [cmap(i) for i in range(len(window_label)+1, len(window_label)*2+1)]
            for i, label in enumerate(window_label):
                if len(label.split("_")) > 1:   #backwards compatible
                    for j in range(int(label.split("_")[0]), int(label.split("_")[1])+1):
                        f.write(f"{str(offset+int(j))} {type}_{label} {' '.join([str(math.floor(x*255)) for x in colors[i]])}\n")
                else:
                    f.write(f"{str(offset+int(label))} {type}_{label} {' '.join([str(math.floor(x*255)) for x in colors[i]])}\n")


    with open(outputpath+"/combinedcolortable.txt", "w") as f:
        f.write("# combined diverging" + " " + str(int(cmbOffset)) + " " + str(int(epvsOffset)) + " " + str(int(combinedOffset)) + "\n")
        f.write("0 background 0 0 0 0\n")

        writeBinnedColormap(cmbOffset, "PiYG", "wmh", f, 0, True)
        writeBinnedColormap(cmbOffset, "PiYG", "wmh", f, 0, False)
        writeBinnedColormap(epvsOffset-cmbOffset, "RdBu", "cmb", f, cmbOffset, True)
        writeBinnedColormap(epvsOffset-cmbOffset, "RdBu", "cmb", f, cmbOffset, False)
        writeBinnedColormap(combinedOffset-epvsOffset, 'PuOr', "epvs", f, epvsOffset, True)
        writeBinnedColormap(combinedOffset-epvsOffset, 'PuOr', "epvs", f, epvsOffset, False)

        f.write(str(int(combinedOffset+1))+" combined_WMH_CMB 196 30 171 255\n")
        f.write(str(int(combinedOffset+2))+" combined_WMH_ePVS 255 204 47 255\n")
        f.write(str(int(combinedOffset+3))+" combined_CMB_ePVS 51 181 255 255\n")
        f.write(str(int(combinedOffset+4))+" combined_WMH_CMB_ePVS 255 0 0 255\n")
        f.write(str(int(combinedOffset+5))+" combined_parcellation 255 255 255 255\n")
        global parcellation_colortable_value
        parcellation_colortable_value = int(combinedOffset+5)

    return "combinedcolortable.txt"

def create_combined_summedup_colormap(cmbOffset, epvsOffset, combinedOffset, outputpath):
    """
    :param outputpath: outputpath
    :return: filename
    """
    #cmbOffset = 12
    #epvsOffset = 18+cmbOffset
    #combinedOffset = 100+epvsOffset

    def writeBinnedColormap(numberOfColors, nameOfColormap, type, f, offset):
        if numberOfColors > 10:
            binSize = numberOfColors//5
            nrOfBins = math.ceil(numberOfColors/binSize)
            bins = [x*binSize + 1 for x in range(nrOfBins)]
            window_label = [(bins[x], bins[x+1]-1) for x in range(len(bins)-1)]
            if window_label[-1][-1] != numberOfColors:
                if bins[-1] == numberOfColors:
                    window_label.append((bins[-1],))
                else:
                    window_label.append((bins[-1], numberOfColors))
            window_label = [str(x[0]) if len(x) == 1 or x[0] == x[1] else str(x[0]) + "_" + str(x[1]) for x in window_label]
            #print("number of colors", numberOfColors, "binsize", binSize, window_label)
            #window = np.round(np.linspace(1, numberOfColors, int(11)))
            #window_label = [str(np.round(window[i])) + "-" + str(np.round(window[i+1]-1))  for i in range(len(window)-1)]
            #window_center = [(float(i.split("-")[1]) + float(i.split("-")[0])) / 2 for i in window_label]
            #window_label = [i.split("-")[1].split(".")[0] if np.floor(float(i.split("-")[1])) == np.floor(float(i.split("-")[0])) else i.split("-")[0].split(".")[0] + "_"+ i.split("-")[1].split(".")[0] for i in window_label]
            cmap = cm.get_cmap(nameOfColormap, len(window_label))
            #print(numberOfColors, window_center, window_label)
        else:
            window_label = [str(i) for i in range(1, int(numberOfColors+1))]
            cmap = cm.get_cmap(nameOfColormap, len(window_label))
            #print(numberOfColors, window_label)

        for i, label in enumerate(window_label):
            if len(label.split("_")) > 1:   #backwards compatible
                for j in range(int(label.split("_")[0]), int(label.split("_")[1])+1):
                    f.write(f"{str(offset+int(j))} {type}_{label} {' '.join([str(math.floor(x*255)) for x in cmap(i)])}\n")

            else:
                f.write(f"{str(offset+int(label))} {type}_{label} {' '.join([str(math.floor(x*255)) for x in cmap(i)])}\n")

    with open(outputpath+"/combinedcolortable.txt", "w") as f:
        f.write("# combined summedup" + " " + str(int(cmbOffset)) + " " + str(int(epvsOffset)) + " " + str(int(combinedOffset)) + "\n")
        f.write("0 background 0 0 0 0\n")

        writeBinnedColormap(cmbOffset, 'Oranges', "wmh", f, 0)
        writeBinnedColormap(epvsOffset-cmbOffset, 'Purples', "cmb", f, cmbOffset)
        writeBinnedColormap(combinedOffset-epvsOffset, 'Greens', "epvs", f, epvsOffset)

        f.write(str(int(combinedOffset+1))+" combined_WMH_CMB 196 30 171 255\n")
        f.write(str(int(combinedOffset+2))+" combined_WMH_ePVS 255 204 47 255\n")
        f.write(str(int(combinedOffset+3))+" combined_CMB_ePVS 51 181 255 255\n")
        f.write(str(int(combinedOffset+4))+" combined_WMH_CMB_ePVS 255 0 0 255\n")
        f.write(str(int(combinedOffset+5))+" combined_parcellation 255 255 255 255\n")
        global parcellation_colortable_value
        parcellation_colortable_value = int(combinedOffset+5)

    return "combinedcolortable.txt"

def create_combined_binary_colormap(outputpath):
    """
    :param outputpath: outputpath
    :return: filename
    """
    cmap_wmh = cm.get_cmap('Oranges', 2)
    cmap_cmb = cm.get_cmap('Purples', 2)
    cmap_epvs = cm.get_cmap('Greens', 2)

    samplingColors_wmh = cmap_wmh(np.linspace(0, 1, 2))
    samplingColors_cmb = cmap_cmb(np.linspace(0, 1, 2))
    samplingColors_epvs = cmap_epvs(np.linspace(0, 1, 2))

    with open(outputpath+"/combinedcolortable.txt", "w") as f:
        f.write("# combined binary" + "\n")
        f.write("0 background 0 0 0 0\n")
        #f.write(str(1) + " WMH " + " ".join([str(math.floor(x*255)) for x in samplingColors_wmh[1]]) + "\n")
        f.write(str(1) + " WMH 243 115 31 255\n")
        f.write(str(2) + " CMB 111 105 224 255\n")
        f.write(str(3) + " ePVS 116 196 118 255\n")

        f.write("4 combined_WMH_CMB 196 30 171 255\n")
        f.write("5 combined_WMH_ePVS 255 204 47 255\n")
        f.write("6 combined_CMB_ePVS 51 181 255 255\n")
        f.write("7 combined_WMH_CMB_ePVS 255 0 0 255\n")
        f.write("8 combined_parcellation 255 255 255 255\n")
        global parcellation_colortable_value
        parcellation_colortable_value = 8

    return "combinedcolortable.txt"

# create diverging colormap based on number of labelmaps
def create_divergingcolormap(minvalue, maxvalue, outputpath):
    """
    :param minvalue: min value of NIFTI labelmap
    :param maxvalue: max value of NIFTI labelmap
    :param outputpath: outputpath
    :return: filename
    """
    numentries = max(abs(minvalue), maxvalue)*2+1
    cmap = cm.get_cmap('PiYG', numentries)
    samplingColors = cmap(np.linspace(0, 1, numentries))

    with open(outputpath+"/subcolortable.txt", "w") as f:
        for i in range(0, numentries):
            if i == max(abs(minvalue), maxvalue):
                f.write("0 background 0 0 0 0\n")
            else:
                f.write(str(i-(max(abs(minvalue), maxvalue))) + " sub " + " ".join([str(math.floor(x*255)) for x in samplingColors[i]]) + "\n")
    return outputpath+"/subcolortable.txt"


def createParcellationMeshes(arr, outputfolder = os.path.join("resources", "input", "default")):
    mesh_files = create_layered_meshes(arr, outputfolder, "parcellation", "", True)
    return mesh_files

def createParcellationSlices(combined_array, image_masks, original_image, outputpath):
    #combined_array[np.logical_and(combined_array, image_masks[0])] = np.max(combined_array)+1
    for image_mask in image_masks:
        combined_array[np.logical_and(image_mask, combined_array == 0)] = parcellation_colortable_value

    finalImageFile = sitk.GetImageFromArray(combined_array)
    finalImageFile.CopyInformation(original_image)
    writer = sitk.ImageFileWriter()
    writer.SetFileName(os.path.join(outputpath, "combined_parcellation.nii.gz"))
    writer.Execute(finalImageFile)

    return "combined_parcellation.nii.gz"


if __name__ == "__main__":
    import SimpleITK as sitk
    img = sitk.ReadImage("..\\..\\resources\\input\\0\\epvstransformed.nii.gz")
    a = sitk.GetArrayFromImage(img)
    write_spheres_file(a, "..\\..\\resources\\output\\0", "epvs")