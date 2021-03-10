import numpy as np
import SimpleITK as sitk
import os
from scipy.stats import iqr

def mapToBullseye(arr_bullseye, arr_lesion, absolute = False):
    #image = sitk.ReadImage(os.path.join("resources\\input\\0", "bullseye_wmparc.nii.gz"))
    #arr = sitk.GetArrayFromImage(image)
    #import matplotlib.pyplot as plt
    #plt.imshow(arr[arr.shape[0]//2, :, :])
    #plt.show()
    #imagewmh = sitk.ReadImage(os.path.join("resources\\input\\0", "wmhtransformed.nii.gz"))
    #arrwmh = sitk.GetArrayFromImage(imagewmh)
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
    for label in np.unique(arr_bullseye):
        if label == 0:
            continue #no parcellation
        volume_mask = arr_bullseye == label
        total_volume = np.sum(volume_mask)
        wmh_volume = np.sum(arr_lesion[volume_mask] > 0) #label > 0 is considered wmh
        lobe = lobe_to_index[int(str(label)[:-1])] #brain lobes
        shell = int(str(label)[-1]) #bullseye rings

        if absolute:
            results[shell][lobe] = np.float(wmh_volume)
            values.append(np.float(wmh_volume))
        else:
            results[shell][lobe] = wmh_volume/total_volume
            values.append(wmh_volume/total_volume)
        #print(shell,lobe,wmh_volume/total_volume)
    return results, np.max(values), np.min(values)

def addBullseyeData(bullseye_data):
    new_min = np.min([x[2] for x in bullseye_data])
    new_max = np.max([x[1] for x in bullseye_data])
    new_data = bullseye_data[0][0]

    if len(bullseye_data) == 1:
        return new_data, new_max, new_min, defaultBullseyeData()[3], 0, 0

    iqr_data = dict()
    iqr_min = new_max-new_min
    iqr_max = 0
    min_ = new_max
    max_ = new_min
    for shell in new_data:
        iqr_data[shell] = dict()
        for lobe in new_data[shell]:
            values = []
            for data in bullseye_data[1:]:
                values.append(data[0][shell][lobe])
            median_ = np.median(values)
            if median_ > max_:
                max_ = median_
            if median_ < min_:
                min_ = median_
            new_data[shell][lobe] = median_
            iqr_data[shell][lobe] = iqr(values)
            if iqr_data[shell][lobe] > iqr_max:
                iqr_max = iqr_data[shell][lobe]
            if iqr_data[shell][lobe] < iqr_min:
                iqr_min = iqr_data[shell][lobe]
    return new_data, max_, min_, iqr_data, iqr_max, iqr_min

def subBullseyeData(bullseye_data_group1, bullseye_data_group2):
    new_data = dict()
    values = []
    for shell in bullseye_data_group1:
        new_data[shell] = dict()
        for lobe in bullseye_data_group1[shell]:
            values.append(bullseye_data_group1[shell][lobe]-bullseye_data_group2[shell][lobe])
            new_data[shell][lobe] = bullseye_data_group1[shell][lobe]-bullseye_data_group2[shell][lobe]
    return new_data, np.max(values), np.min(values)

def defaultBullseyeData():
    return {x: {y: 0 for y in range(9)} for x in range(1, 5)}, 0, 0, {x: {y: 0 for y in range(9)} for x in range(1, 5)}, 0, 0