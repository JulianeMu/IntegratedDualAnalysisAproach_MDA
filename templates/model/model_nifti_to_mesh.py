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
def create_obj_wmh(image, outputpath, threshold = 0.999):
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
    filenames = write_multiple_obj_files(verts, faces, normals, outputpath + "\\multiple_wmh")
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