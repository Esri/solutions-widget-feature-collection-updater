///////////////////////////////////////////////////////////////////////////
// Copyright © 2014 - 2018 Esri. All Rights Reserved.
//
// Licensed under the Apache License Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//    http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
///////////////////////////////////////////////////////////////////////////

define(['dojo/_base/declare',
  'dojo/_base/lang',
  'dojo/_base/array',
  'dojo/_base/event',
  'dojo/on',
  'dojo/Evented',
  'dojo/dom-style',
  'dojo/dom-attr',
  'dojo/dom-construct',
  'dijit/_WidgetBase',
  'dijit/_TemplatedMixin',
  'dijit/_WidgetsInTemplateMixin',
  'dojo/text!./saveOptions.html',
  'esri/graphicsUtils',
  'esri/tasks/FeatureSet',
  'jimu/dijit/AddItemForm',
  'jimu/dijit/Popup',
  'jimu/dijit/Message',
  'jimu/dijit/CheckBox',
  'jimu/dijit/RadioBtn',
  'dijit/form/ValidationTextBox',
], function(declare, lang, array, Event, on, Evented, domStyle, domAttr, domConstruct, _WidgetBase, _TemplatedMixin,_WidgetsInTemplateMixin, template, graphicsUtils, FeatureSet, AddItemForm, Popup, Message, CheckBox, RadioButton, ValidationTextBox) {
  return declare([_WidgetBase, _TemplatedMixin, _WidgetsInTemplateMixin, Evented], {
    baseClass: 'save-options',
    templateString: template,
    nls: null,
    portalUrl: null,
    itemContent: null,
    publicFlag: false,
    portalUser: null,
    portal: null,
    newId: null,
    targetMap: null,

    postCreate: function() {
      this.inherited(arguments);

      domStyle.set(this.saveChooserOptions, "display", "block");
      domStyle.set(this.saveMyContentHolder, "display", "none");
      this._createAddItemForm();
      /*
      Not used right now since we only allow option to save Collection to MyContent and not in the map directly.
      this.own(on(this.saveMyContent, "change", lang.hitch(this, function(checked) {
        if(checked) {
          domStyle.set(this.saveChooserOptions, "display", "block");
          this._createAddItemForm();
        } else {
          domStyle.set(this.saveChooserOptions, "display", "none");
        }
      })));
      */

      this.own(on(this.makePublic, "change", lang.hitch(this, function(checked) {
        if(checked) {
          this.publicFlag = true;
        } else {
          this.publicFlag = false;
        }
      })));
    },

    _createAddItemForm: function() {
      domConstruct.empty(this.saveChooserText);
      this.itemContent = new AddItemForm({
        appConfig: this.appConfig
      });
      this.itemContent.placeAt(this.saveChooserText);
    //end _CreateItemSelector
    },

    _createBasicTitleForm: function() {
      domConstruct.empty(this.saveChooserText);
      var saveToMapForm = domConstruct.create("div", {width: "100%"});
      var titleTextLabel = domConstruct.create("div", {"innerHTML": this.nls.saveOptionsPanel.titleLabel, "class":"input-label"});
      domConstruct.place(titleTextLabel, saveToMapForm);
      var saveToMapText = domConstruct.create("span");
      var titleText = new ValidationTextBox({
        "name": "saveToJustMapTitle",
        "required": true,
        "missingMessage": this.nls.saveOptionsPanel.titleError,
        "class":"input-item"
      });
      titleText.placeAt(saveToMapText);
      domConstruct.place(saveToMapText, saveToMapForm);
      domConstruct.place(saveToMapForm, this.saveChooserText);
    },

    validate: function() {
      //if(this.saveMyContent.getValue()) {
        this.itemContent.showBusy();
        this.itemContent.validate().then(lang.hitch(this, function(res) {
          if (res.valid) {
            this._addItem(this.featureSet, this.itemContent);
          } else {
            this.itemContent.hideBusy();
            new Message({
              message: this.nls.saveOptionsPanel.notValidForm
            });
          }
        }));
      //} else {
        //just apply edits on target layer data, no saving new layer
        //this.emit("save-applyedits");
      //}
    },

    _addItem: function(featureSet, itemContent) {
      var itemName = itemContent.getName();
      folderId = itemContent.getFolderId();

      var featureCollection = this._createCollectionObject(featureSet);

      itemContent.addItem({
        name: itemName,
        title: itemName,
        type: 'Feature Collection',
        typeKeywords: "WAB_created",
        text: JSON.stringify(featureCollection)
      }, folderId).then(lang.hitch(this, function(res) {
        if(res.success === true) {
          this.newId = res.id;
          //After item is added, share it if user decide
          if(this.publicFlag) {
            this.portal.getUser().then(lang.hitch(this, function(user) {
              this.portalUser = user;
              var data = {"org":true, "everyone":true};
              this.portalUser.shareItem(data, res.id, folderId).then(lang.hitch(this, function(result) {
                //this.saveToMap(featureCollection, itemName, res.id, true, popup, null);
                this._updateCollectionReference();
              }));
            }));
          } else {
            //this.saveToMap(featureCollection, itemName, res.id, true, popup, null);
            this._updateCollectionReference();
          }
        } else {
          itemContent.hideBusy();
          new Message({
            message: res.error ? res.error.message : ''
          });
        }
      }), function (err) {
        itemContent.hideBusy();
        new Message({
          message: err.message
        });
      });
    },

    _createCollectionObject: function(featureSets) {
      var layerObj = [];
      array.forEach(featureSets, lang.hitch(this, function(featureSet) {
        var layer = featureSet.layer;
        var extent;
        var layerDefinition = {
          name: layer.name || layer.id,
          type: layer.type || 'Feature Layer',
          displayField: layer.displayField,
          description: layer.description,
          copyrightText: layer.copyright,
          geometryType: layer.geometryType,
          fields: layer.fields,
          objectIdField: layer.objectIdField
        };
        if (featureSet.features[0].geometry) {
          extent = graphicsUtils.graphicsExtent(featureSet.features);
          layerDefinition.initialExtent = extent;
          layerDefinition.fullExtent = extent;
          layerDefinition.extent = extent;
        }
        if(!layerDefinition.objectIdField && layerDefinition.fields) {
          array.some(layerDefinition.fields, function(field) {
            if (field.type === 'esriFieldTypeOID') {
              layerDefinition.objectIdField = field.name;
              return true;
            }
          });
        }
        var featureSetObj = new FeatureSet();
        featureSetObj.displayFieldName= layer.displayField;
        featureSetObj.features= featureSet.features;
        featureSetObj.fields = layer.fields;
        featureSetObj.geometryType= layer.geometryType;
        featureSetObj.spatialReference= layer.spatialReference;

        this.renderer = layer.renderer;
        layerObj.push({
          layerDefinition: layerDefinition,
          popupInfo: null,
          featureSet: featureSetObj.toJson()
        });
      }));

      var featureCollection = {
        layers: layerObj
      };
      return featureCollection;
    },

    _updateCollectionReference: function() {
      this.targetMap.getItemData().then(lang.hitch(this, function(itemData) {
        var operationalLayers = itemData.operationalLayers;
        var baseMapLayers = itemData.baseMap.baseMapLayers;

        operationalLayers.forEach(function(item){
          delete item["layerObject"];
          delete item["itemProperties"];
          delete item["resourceInfo"];
        });

        baseMapLayers.forEach(function(item){
          delete item["layerObject"];
          delete item["itemProperties"];
          delete item["resourceInfo"];
        });

        array.forEach(operationalLayers, lang.hitch(this, function(ol) {
          array.forEach(this.collectionToUpdate, lang.hitch(this, function(fc) {
            if(ol.id === fc.id) {
              ol.itemId = this.newId
            }
          }));
        }));
        var args = {
          "text": JSON.stringify(itemData)
        };
        this.portal.getUser().then(lang.hitch(this, function(user) {
          this.portalUser = user;
          this.portalUser.updateItem(this.targetMap.id, args).then(lang.hitch(this, function(res) {
            this.itemContent.hideBusy();
            if(res.success) {
              new Message({
                message: this.nls.saveOptionsPanel.successFullUpdate
              });
              this.emit("save-complete");
            } else {
              new Message({
                message: this.nls.saveOptionsPanel.failedUpdate
              });
            }
          }));
        }));
      }));
    },


  });
});