import numpy as np
import matplotlib.pyplot as plt
import SimpleITK as sitk
import os
from matplotlib.colors import LinearSegmentedColormap


if __name__ == "__main__":
    lobe_to_color = {
        "5" : (255/255, 102/255, 102/255),  # BGIT
        "11": (153/255, 204/255, 255/255),  # Front
        "12": (204/255, 255/255, 153/255),  # Par
        "13": (255/255, 153/255, 153/255),  # Temp
        "14": (255/255, 204/255, 153/255),  # Occ
        "21": (153/255, 153/255, 255/255),  # Front
        "22": (153/255, 255/255, 204/255),  # Par
        "23": (255/255, 153/255, 255/255),  # Temp
        "24": (255/255, 255/255, 153/255),  # Occ
    }

    # TL: (255/255, 153/255, 153/255)
    # TR: (255/255, 153/255, 204/255)

    # FL: (153/255, 204/255, 255/255)
    # FR: (153/255, 153/255, 255/255)

    # PL: (204/255, 255/255, 153/255)
    # PR: (153/255, 255/255, 204/255)

    # OL: (255/255, 204/255, 153/255)
    # OR: (255/255, 255/255, 153/255)

    # BGIT: (153/255, 255/255, 255/255)

    shell_to_color = {
        "1" : (0, 1, 0, 1),
        "2": (0, 0, 1, 1),
        "3": (0.5, 0.5, 0, 1),
        "4": (0.5, 0, 0.5, 1),
    }

    # load bullseye
    image = sitk.ReadImage(os.path.join("..\\..\\resources\\input\\bullseye", "bullseye_wmparc.nii.gz"))
    arr = sitk.GetArrayFromImage(image)
    plt.imshow(arr[arr.shape[0]//2, :, :])

    # load T1
    imageT1 = sitk.ReadImage(os.path.join("..\\..\\resources\\input\\bullseye", "T1.nii.gz"))
    arrT1 = sitk.GetArrayFromImage(imageT1)

    plt.imshow(arrT1[arrT1.shape[0]//2, :, :], cmap="gray")
    plt.show()

    # plot volume backgrounds
    fig, ax = plt.subplots(3, 3, figsize=(15, 15))
    for i in range(3):
        ax[0, i].imshow(arrT1[arrT1.shape[0]//2, :, :], cmap="gray")
        ax[1, i].imshow(arrT1[:, arrT1.shape[0]//2,:][::-1,:], cmap="gray")
        ax[2, i].imshow(arrT1[ :, :, arrT1.shape[0]//2].T[:,::-1], cmap="gray")
        ax[0, i].axis("off")
        ax[1, i].axis("off")
        ax[2, i].axis("off")

    for shell, color in shell_to_color.items():
        colors = [(0, 0, 0, 0), color]
        cm = LinearSegmentedColormap.from_list("test", colors, N=2)

        lesion = np.zeros(arr.shape)
        for lobe in lobe_to_color.keys(): #np.unique(arr):
            lesion = np.logical_or(lesion, arr == int(lobe+shell))
        ax[0, 1].imshow(lesion[lesion.shape[0]//2, :, :], cmap=cm)
        ax[1, 1].imshow(lesion[:, lesion.shape[0]//2, :][::-1,:], cmap=cm)
        ax[2, 1].imshow(lesion[:, :, lesion.shape[0]//2].T[:, ::-1], cmap=cm)


    for lobe, color in lobe_to_color.items(): #np.unique(arr):
        colors = [(0, 0, 0, 0), color]
        cm = LinearSegmentedColormap.from_list("test", colors, N=2)

        lesion = np.zeros(arr.shape)
        for shell in range(1, 5):
            lesion = np.logical_or(lesion, arr == int(lobe+str(shell)))
        ax[0, 2].imshow(lesion[lesion.shape[0]//2, :, :], cmap=cm)
        ax[1, 2].imshow(lesion[:, lesion.shape[0]//2, :][::-1,:], cmap=cm)
        ax[2, 2].imshow(lesion[:, :, lesion.shape[0]//2].T[:, ::-1], cmap=cm)
    plt.show()
