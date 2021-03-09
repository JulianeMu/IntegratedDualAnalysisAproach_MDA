import numpy as np
import SimpleITK as sitk
import os

def get_lesion_mask_of_patient(patientname, lesiontype):
    if os.path.exists(os.path.join("resources", "input", "patients", patientname, lesiontype)):
        file_candidates = [file for file in os.listdir(os.path.join("resources", "input", "patients", patientname, lesiontype)) if file.endswith("mask.nii.gz")]
        if len(file_candidates) > 0:
            return os.path.join("resources", "input", "patients", patientname, lesiontype, file_candidates[0])
    return None

def scale_single_image(filename):
    if filename is not None and not os.path.exists(filename.split(".")[0]+"_Scaled.nii.gz"):
        print(filename)
        img = sitk.ReadImage(filename)
        arr = sitk.GetArrayFromImage(img)
        targetsize = np.array([256, 256, 256])
        sizeoffset = np.floor((targetsize-arr.shape)/2)
        sizeoffset = [int(sizeoffset[0]), int(sizeoffset[1]), int(sizeoffset[2])]
        targetarray = np.zeros((256, 256, 256))
        targetarray[sizeoffset[0]:(sizeoffset[0]+arr.shape[0]), sizeoffset[1]:(sizeoffset[1]+arr.shape[1]), sizeoffset[2]:(sizeoffset[2]+arr.shape[2])] = arr
        targetarray = targetarray.transpose(1, 0, 2)
        targetarray = targetarray[:, ::-1, :]
        newimg = sitk.GetImageFromArray(targetarray)

        newimg.CopyInformation(bepimg)
        writer = sitk.ImageFileWriter()
        writer.SetFileName(filename.split(".")[0]+"_Scaled.nii.gz")
        writer.Execute(newimg)

if __name__ == "__main__":
    bepimg = sitk.ReadImage("D:/Uni/MA/IntegratedDualAnalysisAproach_MDA/resources/input/bullseye/bullseye_wmparc.nii.gz")
    patients = [name for name in os.listdir(os.path.join("resources", "input", "patients")) if os.path.isdir(os.path.join("resources", "input", "patients", name))]
    for patient in patients:
        for lesiontype in ["wmh", "cmb", "epvs"]:
            filename = get_lesion_mask_of_patient(patient, lesiontype)
            scale_single_image(filename)
    scale_single_image(os.path.join("resources", "input", "default", "CerebrA_brain.nii"))