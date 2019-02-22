solutions-widget-utility-network-trace

A widget to perform tracing for the ArcGIS Utility Network Management Extension

Read a step by step primer [here](https://esri.github.io/solutions-widget-utility-network-trace/)


## Features
* An ArcGIS Web AppBuilder Widget
* Configure a trace in the web without the need for ArcGIS Pro
* Ability to combine a series a traces into a single workflor
* Import trace ArcPy command into the configuration

## Requirements
1. A published ArcGIS Utility Network Management feature service
2. A map service of the above to use in ArcGIS Web Appbuilder for visualization. (Web Scene does not support UN Feature Layers as of 8/30/18)
3. Developed for ArcGIS Web AppBuilder, use 3D layout to deploy

## Instructions
1. Create a map with the UN map service.
2. Download ArcGIS Web AppBuilder Dev Edition
3. Download this widget and add it to `<location of WAB dev edition download>/client/stemapp3d/widgets`
4. Register WAB dev ed to your organization
5. Create and app, select the map you created.
6. Add and configure the UNTrace widget.

## Usage
1. Launch the configuration application
2. Click the trace widget to open it in the panel
3. Click the starting point icon (marker icon) and click an asset on the map
4. Click on the trace button with your named traced to run the trace

NOTE: The widget looks for the Utility Network Feature Service, not the map service.  map service is purely for visualization.
Works on ES6 and greater supported browsers

## Issues

Find a bug or want to request a new feature?  Please let us know by submitting an issue.

## Contributing

Esri welcomes contributions from anyone and everyone. Please see our [guidelines for contributing](https://github.com/esri/contributing).

## Licensing
Copyright 2018 Esri

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

   http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.

A copy of the license is available in the repository's [license.txt](License.txt) file.
