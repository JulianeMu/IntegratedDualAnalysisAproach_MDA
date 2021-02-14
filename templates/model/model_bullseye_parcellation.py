import numpy as np
import SimpleITK as sitk
import os

def mapToBullseye():
    image = sitk.ReadImage(os.path.join("resources\\input\\0", "bullseye_wmparc.nii.gz"))
    arr = sitk.GetArrayFromImage(image)
    #import matplotlib.pyplot as plt
    #plt.imshow(arr[arr.shape[0]//2, :, :])
    #plt.show()
    imagewmh = sitk.ReadImage(os.path.join("resources\\input\\0", "wmhtransformed.nii.gz"))
    arrwmh = sitk.GetArrayFromImage(imagewmh)
    results = {x: {} for x in range(6)}

    lobe_to_index = { #mapping brain parcellation to bullseye
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

    values = []
    for label in np.unique(arr):
        if label == 0:
            continue #no parcellation
        volume_mask = arr == label
        total_volume = np.sum(volume_mask)
        wmh_volume = np.sum(arrwmh[volume_mask] > 0) #label > 0 is considered wmh
        lobe = lobe_to_index[int(str(label)[:-1])] #brain lobes
        shell = int(str(label)[-1]) #bullseye rings
        results[shell][lobe] = wmh_volume/total_volume
        values.append(wmh_volume/total_volume)
        print(shell,lobe,wmh_volume/total_volume)
    return results, np.max(values), np.min(values)
