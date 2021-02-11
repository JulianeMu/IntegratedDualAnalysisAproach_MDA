# Integrated Dual Analysis of Quantitative and Qualitative High-Dimensional Data
This Javascript / Python project is the authors implementation of the article **[Integrated Dual Analysis of Quantitative and Qualitative High-Dimensional Data](https://github.com/JulianeMu/IntegratedDualAnalysisAproach_MDA/blob/master/paper/TVCG2020_IntegratedDualAnalysisOfQuanitativeAndQualitativeHigh_DimensionalData.pdf)**.

## Authors
***Juliane Müller<sup>1</sup>, Laura Garrison<sup>2</sup>, Philipp Ulbrich<sup>3,4</sup>, Stefanie Schreiber<sup>3,4</sup>, Stefan Bruckner<sup>2</sup>, Helwig Hauser<sup>2</sup>, Steffen Oeltze-Jafra<sup>1,4</sup>***

<sup>1</sup>Dept. of Neurology, Otto von Guericke University Magdeburg, Germany \
<sup>2</sup>Dept. of Informatics \& Mohn Medical Imaging and Visualization Centre, Dept. of Radiology, Haukeland Univ. Hospital, University of Bergen, Norway \
<sup>3</sup>Dept. of Neurology, Otto von Guericke University Magdeburg, Germany\
<sup>4</sup>Center for Behavioral Brain Sciences, Otto von Guericke University Magdeburg, Germany

accepted for TVCG 2021

## Abstract
The Dual Analysis framework is a powerful enabling technology for the exploration of high dimensional quantitative data by treating data dimensions as first-class objects that can be explored in tandem with data values. In this work, we extend the Dual Analysis framework through the ***joint*** treatment of quantitative (numerical) and qualitative (categorical) dimensions. 
Computing common measures for all dimensions allows us to visualize both quantitative and qualitative dimensions in the same view. This enables a natural ***joint*** treatment of mixed data during interactive visual exploration and analysis. Several measures of variation for nominal qualitative data can also be applied to ordinal qualitative and quantitative data. For example, instead of measuring variability from a mean or median, other measures assess inter-data variation or average variation from a mode. In this work, we demonstrate how these measures can be integrated into the Dual Analysis framework to explore and generate hypotheses about high-dimensional mixed data. A medical case study using clinical routine data of patients suffering from Cerebral Small Vessel Disease~(CSVD), conducted with a senior neurologist and a medical student, shows that a joint Dual Analysis approach for quantitative and qualitative data can rapidly lead to new insights based on which new hypotheses may be generated. 

## How to run it
- download repository from github
- open project in development environment, such as IntelliJ idea
- make sure python 3.7 or python 3.8 is installed
- install libraries listed in **requirements.txt**
- right click on **app_MDA.py** and run it
- navigate to */templates/index.html* and select run

Now, the project is running.


## Modification
- new data table: 
    - add csv to */resources*
    - in **app_MDA.py** line 43 specify path to your csv file
