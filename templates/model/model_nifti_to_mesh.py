from skimage import measure
import numpy as np
import itertools
import networkx as nx
import SimpleITK as sitk
from matplotlib import cm
import math
import trimesh
import pandas as pd

# create brain mesh as OBJ
def create_obj_brain(image, outputpath, threshold):
    """
    :param image: NIFTI Volume Data as ndarray
    :param outputpath: path name
    :param threshold: iso value of marching cubes algorithm
    :return: list of all created files
    """
    p = image.transpose(2, 1, 0)
    verts, faces, normals, values = measure.marching_cubes(p, threshold)
    spacing = np.array([1.2000000477, 0.9765999913, 3.0000000000])
    verts = verts*spacing
    verts[:, 1] = p.shape[1] * spacing[1] - verts[:, 1]

    # find connected components
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

    write_single_obj_file(filtered_vertices, remapped_faces, filtered_normals, outputpath+"\\brain.obj")

    return ["brain.obj"]


# create wmh mesh as OBJ
def create_obj_lesions(image, outputpath, lesiontype, threshold = 0.999):
    """
    :param image: NIFTI WMH Data as ndarray
    :param outputpath: path name
    :param threshold: iso value of marching cubes algorithm
    :return: list of all created files
    """
    p = image.transpose(2, 1, 0)
    verts, faces, normals, values = measure.marching_cubes(p, threshold)
    spacing = np.array([1.2000000477, 0.9765999913, 3.0000000000])
    verts = verts*spacing
    verts[:, 1] = p.shape[1] * spacing[1] - verts[:, 1]
    filenames = write_multiple_obj_files(verts, faces, normals, outputpath + "\\multiple_" + lesiontype)
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
    edges = []
    for face in faces:
        edges.extend(list(itertools.combinations(face, 2)))
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
        filter_faces = np.apply_along_axis(lambda x: x[0] in component and
                                                     x[1] in component and
                                                     x[2] in component, 1, faces)
        remapped_faces = remap(faces[filter_faces])  # apply the remap function to each face
        mesh = trimesh.Trimesh(vertices = filtered_verts, faces = remapped_faces, process = False)  # calc volume and stuff
        filename = outputfile.split("\\")[-1]+f'_{i}.obj'
        df = df.append({'Filename': filename, 'Volume': mesh.volume}, ignore_index=True)
        write_single_obj_file(filtered_verts,remapped_faces,filtered_normals,outputfile+f'_{i}.obj')
        filenames.append(filename)
    df.to_csv(outputfile+'_lesiondata.csv')
    filenames.append(outputfile.split("\\")[-1]+'_lesiondata.csv')
    return filenames


# writes one OBJ per accumulated lesion load
def write_multiple_obj_single_file(verts, faces, normals, outputfile):
    # find connected components
    outputfile = outputfile + ".obj"
    edges = []
    for face in faces:
        edges.extend(list(itertools.combinations(face, 2)))
    g = nx.from_edgelist(edges)

    # compute connected components and print results
    components = list(nx.algorithms.components.connected_components(g))

    with open(outputfile, 'w') as thefile:
        for item in verts:
            thefile.write("v {0} {1} {2}\n".format(item[0],item[1],item[2]))

        for i, component in enumerate(components):
            filter = np.apply_along_axis(lambda x: x[0] in component and
                                                   x[1] in component and
                                                   x[2] in component, 1, faces)
            vertex_filter = [v_idx in component for v_idx in range(verts.shape[0])]
            filtered_normals = normals[vertex_filter]
            filtered_faces = faces[filter] + 1
            filtered_faces = filtered_faces[:, [0, 2, 1]]

            thefile.write(f"o Component_{i}\n")

            for item in filtered_normals:
                thefile.write("vn {0} {1} {2}\n".format(item[0], item[1], item[2]))

            for item in filtered_faces:
                thefile.write("f {0}//{0} {1}//{1} {2}//{2}\n".format(item[0], item[1], item[2]))

    return [outputfile.split("\\")[-1]]


# add lesionmaps
def add_wmh(images, originalImage, outputpath):
    """
    :param images: List of NIFTI Labelmap ndarrays
    :param originalImage: one NIFTI Volume Data object
    :param outputpath: outputpath
    :return: filename, NIFTI Labelmap ndarray
    """
    finalImage = np.zeros(images[0].shape)

    for image in images:
        image[image == 2] = 0
        finalImage += image

    mesh_files = create_layered_meshes(finalImage,outputpath)

    finalImageFile = sitk.GetImageFromArray(finalImage)
    finalImageFile.CopyInformation(originalImage)
    writer = sitk.ImageFileWriter()
    writer.SetFileName(outputpath + "/wmh.nii.gz")
    writer.Execute(finalImageFile)

    mesh_files.append(create_colormap(int(np.max(images)), outputpath))
    return outputpath + "/wmh.nii.gz", finalImage, mesh_files

def combine_labelmaps(wmhImage, cmbImage, epvsImage, originalImage, outputpath):
    cmbOffset = np.max(np.abs(wmhImage))
    epvsOffset = np.max(np.abs(cmbImage))+cmbOffset
    combinationOffset = np.max(np.abs(epvsImage))+epvsOffset
    finalImage = np.zeros(wmhImage.shape)
    wmh_mask = wmhImage != 0
    cmb_mask = cmbImage != 0
    epvs_mask = epvsImage != 0
    finalImage[wmh_mask] = wmhImage[wmh_mask]
    finalImage[cmb_mask] = cmbImage[cmb_mask]+cmbOffset*np.sign(cmbImage[cmb_mask])
    finalImage[epvs_mask] = epvsImage[epvs_mask]+epvsOffset*np.sign(epvsImage[epvs_mask])
    finalImage[wmh_mask*cmb_mask] = combinationOffset+1
    finalImage[wmh_mask*epvs_mask] = combinationOffset+2
    finalImage[cmb_mask*epvs_mask] = combinationOffset+3
    finalImage[wmh_mask*cmb_mask*epvs_mask] = combinationOffset+4

    """for x,y,z in itertools.product(range(finalImage.shape[0]),range(finalImage.shape[1]),range(finalImage.shape[2])):
        if wmhImage[x,y,z] != 0 and cmbImage[x,y,z] == 0 and epvsImage[x,y,z] == 0:
            finalImage[x,y,z] = wmhImage[x,y,z]
        elif wmhImage[x,y,z] == 0 and cmbImage[x,y,z] != 0 and epvsImage[x,y,z] == 0:
            finalImage[x,y,z] = cmbOffset*np.sign(cmbImage[x,y,z])+cmbImage[x,y,z]
        elif wmhImage[x,y,z] == 0 and cmbImage[x,y,z] == 0 and epvsImage[x,y,z] != 0:
            finalImage[x,y,z] = epvsOffset*np.sign(epvsImage[x,y,z])+epvsImage[x,y,z]
        elif wmhImage[x,y,z] != 0 and cmbImage[x,y,z] != 0 and epvsImage[x,y,z] == 0:
            finalImage[x,y,z] = combinationOffset+1
        elif wmhImage[x,y,z] != 0 and cmbImage[x,y,z] == 0 and epvsImage[x,y,z] != 0:
            finalImage[x,y,z] = combinationOffset+2
        elif wmhImage[x,y,z] == 0 and cmbImage[x,y,z] != 0 and epvsImage[x,y,z] != 0:
            finalImage[x,y,z] = combinationOffset+3
        elif wmhImage[x,y,z] != 0 and cmbImage[x,y,z] != 0 and epvsImage[x,y,z] != 0:
            finalImage[x,y,z] = combinationOffset+4"""

    finalImageFile = sitk.GetImageFromArray(finalImage)
    finalImageFile.CopyInformation(originalImage)
    writer = sitk.ImageFileWriter()
    writer.SetFileName(outputpath + "/combined.nii.gz")
    writer.Execute(finalImageFile)

    if np.max(wmhImage) <= 1 and np.min(wmhImage) >= 0 and\
        np.max(cmbImage) <= 1 and np.min(cmbImage) >= 0 and\
        np.max(epvsImage) <= 1 and np.min(epvsImage) >= 0:
        combinedColormap = create_combined_binary_colormap(outputpath)
    elif np.min(wmhImage) >= 0 and np.min(cmbImage) >= 0 and np.min(epvsImage) >= 0:
        combinedColormap = create_combined_summedup_colormap(cmbOffset, epvsOffset, combinationOffset, outputpath)
    else: #diverging colormap
        combinedColormap = create_combined_diverging_colormap(cmbOffset, epvsOffset, combinationOffset, outputpath)

    return outputpath + "/combined.nii.gz", finalImage, combinedColormap

def create_layered_meshes(image, outputpath):
    filenames = []
    image = image.transpose(2, 1, 0)
    layers = np.unique(image)
    for layer in layers:
        if int(layer) == 0:
            continue
        layer_image = image == layer
        layer_image = layer_image*1
        verts, faces, normals, values = measure.marching_cubes(layer_image, 0.99)
        spacing = np.array([1.2000000477, 0.9765999913, 3.0000000000])
        verts = verts*spacing
        verts[:, 1] = layer_image.shape[1] * spacing[1] - verts[:, 1]
        #filenames.extend(write_multiple_obj_files(verts, faces, normals, outputpath + "\\add_wmh_" + str(int(layer))))
        #filenames.extend(write_multiple_obj_single_file(verts, faces, normals, outputpath + "\\add_wmh_" + str(int(layer))))
        write_single_obj_file(verts, faces, normals, outputpath + "\\add_wmh_" + str(int(layer))+".obj")
        filenames.extend(["add_wmh_" + str(int(layer))+".obj"])

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
    cmap_wmh = cm.get_cmap('PiYG', cmbOffset*2+1)
    cmap_cmb = cm.get_cmap('RdBu', (epvsOffset-cmbOffset)*2+1)
    cmap_epvs = cm.get_cmap('PuOr', (combinedOffset-epvsOffset)*2+1)

    samplingColors_wmh = cmap_wmh(np.linspace(0, 1, int(cmbOffset*2+1)))
    wmh_mapping = {**{x:y for x,y in zip(range(int(-cmbOffset),0),range(int(cmbOffset+1)))},**{x:y for x,y in zip(range(1,int(cmbOffset+1)),range(int(cmbOffset+1),int(cmbOffset*2+1)))}}
    samplingColors_cmb = cmap_cmb(np.linspace(0, 1, int((epvsOffset-cmbOffset)*2+1)))
    cmb_mapping = {**{x:y for x,y in zip(range(int(-epvsOffset),int(cmbOffset)),range(int(epvsOffset-cmbOffset)))},**{x:y for x,y in zip(range(int(cmbOffset+1),int(epvsOffset+1)),range(int(epvsOffset-cmbOffset+1),int(((epvsOffset-cmbOffset)*2+1))))}}
    samplingColors_epvs = cmap_epvs(np.linspace(0, 1, int((combinedOffset-epvsOffset)*2+1)))
    epvs_mapping = {**{x:y for x,y in zip(range(int(-combinedOffset),int(epvsOffset)),range(int(combinedOffset-epvsOffset)))},**{x:y for x,y in zip(range(int(epvsOffset+1),int(combinedOffset+1)),range(int(combinedOffset-epvsOffset+1),int(((combinedOffset-epvsOffset)*2+1))))}}

    with open(outputpath+"/combinedcolortable.txt", "w") as f:
        f.write("# combined diverging" + " " + str(int(cmbOffset)) + " " + str(int(epvsOffset)) + " " + str(int(combinedOffset)) + "\n")
        f.write("0 background 0 0 0 0\n")
        for i in range(int(-cmbOffset), int(cmbOffset+1)):
            if i in wmh_mapping:
                f.write(str(i) + " wmh_" + str(int(wmh_mapping[i]-cmbOffset)) + " " + " ".join([str(math.floor(x*255)) for x in samplingColors_wmh[wmh_mapping[i]]]) + "\n")
        for i in range(int(-epvsOffset), int(epvsOffset+1)):
            if -cmbOffset <= i <= cmbOffset:
                continue
            else:
                if i in cmb_mapping:
                    f.write(str(i) + " cmb_" + str(int(cmb_mapping[i]-(epvsOffset-cmbOffset))) + " " + " ".join([str(math.floor(x*255)) for x in samplingColors_cmb[cmb_mapping[i]]]) + "\n")
        for i in range(int(-combinedOffset), int(combinedOffset+1)):
            if -epvsOffset <= i <= epvsOffset:
                continue
            else:
                if i in epvs_mapping:
                    f.write(str(i) + " epvs_" + str(int(epvs_mapping[i]-(combinedOffset-epvsOffset))) + " " + " ".join([str(math.floor(x*255)) for x in samplingColors_epvs[epvs_mapping[i]]]) + "\n")

        f.write(str(int(combinedOffset+1))+" combined_wmh_cmb 255 128 128 1\n")
        f.write(str(int(combinedOffset+2))+" combined_wmh_epvs 201 255 229 1\n")
        f.write(str(int(combinedOffset+3))+" combined_cmb_epvs 0 255 8 1\n")
        f.write(str(int(combinedOffset+4))+" combined_wmh_cmb_epvs 255 237 163 1")

    return "combinedcolortable.txt"

def create_combined_summedup_colormap(cmbOffset, epvsOffset, combinedOffset, outputpath):
    """
    :param outputpath: outputpath
    :return: filename
    """
    cmap_wmh = cm.get_cmap('Oranges', cmbOffset+1)
    cmap_cmb = cm.get_cmap('Purples', (epvsOffset-cmbOffset)+1)
    cmap_epvs = cm.get_cmap('Greens', (combinedOffset-epvsOffset)+1)

    samplingColors_wmh = cmap_wmh(np.linspace(0, 1, int(cmbOffset+1)))
    wmh_mapping = {x:y for x,y in zip(range(1,int(cmbOffset+1)),range(1,int(cmbOffset+1)))}
    samplingColors_cmb = cmap_cmb(np.linspace(0, 1, int((epvsOffset-cmbOffset)+1)))
    cmb_mapping = {x:y for x,y in zip(range(int(cmbOffset+1),int(epvsOffset+1)),range(1,int(epvsOffset-cmbOffset)+1))}
    samplingColors_epvs = cmap_epvs(np.linspace(0, 1, int((combinedOffset-epvsOffset)+1)))
    epvs_mapping = {x:y for x,y in zip(range(int(epvsOffset+1),int(combinedOffset+1)),range(1,int(combinedOffset-epvsOffset)+1))}

    with open(outputpath+"/combinedcolortable.txt", "w") as f:
        f.write("# combined summedup" + " " + str(int(cmbOffset)) + " " + str(int(epvsOffset)) + " " + str(int(combinedOffset)) + "\n")
        f.write("0 background 0 0 0 0\n")
        for i in range(0, int(cmbOffset+1)):
            if i in wmh_mapping:
                f.write(str(i) + " wmh_" + str(int(wmh_mapping[i]-cmbOffset+1)) + " " + " ".join([str(math.floor(x*255)) for x in samplingColors_wmh[wmh_mapping[i]]]) + "\n")
        for i in range(int(cmbOffset+1), int(epvsOffset+1)):
            if i in cmb_mapping:
                f.write(str(i) + " cmb_" + str(int(cmb_mapping[i]-(epvsOffset-cmbOffset)+1)) + " " + " ".join([str(math.floor(x*255)) for x in samplingColors_cmb[cmb_mapping[i]]]) + "\n")
        for i in range(int(epvsOffset+1), int(combinedOffset+1)):
            if i in epvs_mapping:
                f.write(str(i) + " epvs_" + str(int(epvs_mapping[i]-(combinedOffset-epvsOffset)+1)) + " " + " ".join([str(math.floor(x*255)) for x in samplingColors_epvs[epvs_mapping[i]]]) + "\n")

        f.write(str(int(combinedOffset+1))+" combined_wmh_cmb 255 128 128 1\n")
        f.write(str(int(combinedOffset+2))+" combined_wmh_epvs 201 255 229 1\n")
        f.write(str(int(combinedOffset+3))+" combined_cmb_epvs 0 255 8 1\n")
        f.write(str(int(combinedOffset+4))+" combined_wmh_cmb_epvs 255 237 163 1")

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
        f.write(str(1) + " wmh " + " ".join([str(math.floor(x*255)) for x in samplingColors_wmh[1]]) + "\n")
        f.write(str(2) + " cmb " + " ".join([str(math.floor(x*255)) for x in samplingColors_cmb[1]]) + "\n")
        f.write(str(3) + " epvs " + " ".join([str(math.floor(x*255)) for x in samplingColors_epvs[1]]) + "\n")

        f.write("4 combined_wmh_cmb 255 128 128 1\n")
        f.write("5 combined_wmh_epvs 201 255 229 1\n")
        f.write("6 combined_cmb_epvs 0 255 8 1\n")
        f.write("7 combined_wmh_cmb_epvs 255 237 163 1")

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