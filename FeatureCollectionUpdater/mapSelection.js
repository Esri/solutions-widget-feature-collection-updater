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
  'dojo/text!./mapSelection.html',
  'jimu/dijit/ItemSelector',
  'jimu/dijit/Popup',
  'jimu/dijit/Message',
  'jimu/dijit/CheckBox',
], function(declare, lang, array, Event, on, Evented, domStyle, domAttr, domConstruct, _WidgetBase, _TemplatedMixin,_WidgetsInTemplateMixin, template, ItemSelector, Popup, Message, CheckBox) {
  return declare([_WidgetBase, _TemplatedMixin, _WidgetsInTemplateMixin, Evented], {
    baseClass: 'map-selection',
    templateString: template,
    nls: null,
    itemSelector: null,
    targetMap: null,
    targetMapLayers: [],
    tempMap: null,
    finalFCList: [],
    layerCheckboxHolder: [],
    portalUrl: null,
    portalUtils: null,
    portal: null,
    config: null,
    itemRequestor: null,

    postCreate: function() {
      this.inherited(arguments);

      if(!this.config.targetMapRuntime) {
        domStyle.set(this.mapPickerPopupIcon,"display","none");
      }

      domStyle.set(this.FCPickerHolder,"display","none");
      this.own(on(this.mapPickerPopupIcon, 'click', lang.hitch(this, this._createItemInspector)));

      if(this.config.targetMapConfig !== null) {
        this._queryMapItem();
      }
    },

    _createItemInspector: function() {
      this.itemSelector = new ItemSelector({
        portalUrl: this.portalUrl,
        itemTypes: ['Web Map'],
        onlyShowOnlineFeaturedItems: false,
        showMyContent: true,
        showMyOrganization: false,
        showMyGroups: true,
        showPublic: false,
        showOnlyEditableGroups: true
      });
      this.own(on(this.itemSelector, 'item-selected', lang.hitch(this, this._onItemSelected)));
      this.own(on(this.itemSelector, 'none-item-selected', lang.hitch(this, this._onNoneItemSelected)));
      //this.selector.placeAt(contentDiv);
      this.itemSelector.startup();

      var popup = new Popup({
        content: this.itemSelector,
        titleLabel: window.jimuNls.featureActions.SaveToMyMap,
        width: 850,
        height: 600,
        buttons: [{
          label: window.jimuNls.common.ok,
          onClick: lang.hitch(this, function() {
            if(this.tempMap !== null) {
              this.targetMap = this.tempMap;
              //check for FC in target Map
              this._checkCollectionsInTarget( popup);
            } else {
              new Message({
                message: this.nls.mapSelectionPanel.noMapSelected
              });
            }
          })
        }, {
          label: window.jimuNls.common.cancel,
          classNames: ['jimu-btn-vacation'],
          onClick: lang.hitch(this, function() {
            this.tempMap = null;
            popup.close();
          })
        }]
      });
    //end _CreateItemSelector
    },

    _onItemSelected: function (evt) {
      this.tempMap = evt;
      console.log(evt);
      this._checkCollectionsInTemp();
    },

    _onNoneItemSelected: function (evt) {
      this.tempMap = null;
    },

    _checkCollectionsInTemp: function() {
      this.itemRequestor = this.tempMap.getItemData().then(lang.hitch(this, function(itemData) {
        var onlyFC = array.filter(itemData.operationalLayers, lang.hitch(this, function(ol) {
          if((ol.hasOwnProperty("type") && ol.type === "Feature Collection") || (ol.hasOwnProperty("featureCollection"))) {
            return ol;
          }
        }));
        if(onlyFC.length <= 0) {
          new Message({
            message: this.nls.mapSelectionPanel.noFeatureCollectionInMap
          });
        }
      }));
    },

    _checkCollectionsInTarget: function(popup) {
      this.itemRequestor = this.targetMap.getItemData().then(lang.hitch(this, function(itemData) {
        var onlyFC = array.filter(itemData.operationalLayers, lang.hitch(this, function(ol) {
          if((ol.hasOwnProperty("type") && ol.type === "Feature Collection") || (ol.hasOwnProperty("featureCollection"))) {
            return ol;
          }
        }));
        if(onlyFC.length > 0) {
          //this._listRemoveLayers(onlyFC, featureSet, layer);
          this.targetMapLayers = onlyFC;
          domStyle.set(this.FCPickerHolder,"display","block");
          this._populateImagePreview();
          this._populateFCChooser();
          this.emit("someChecked");
          popup.close();
        } else {
          new Message({
            message: this.nls.mapSelectionPanel.noFeatureCollectionInMap
          });
        }
      }));
    },

    _populateImagePreview: function() {
      var thumbnail = this.targetMap.thumbnailUrl;
      var title = this.targetMap.title;
      var owner = "Webmap by " + this.targetMap.owner;
      this.mapThumbnailHolder.innerHTML = "<img src="+thumbnail+" width='100' />";
      this.mapDetailsHolder.innerHTML = "<div>"+title+"</div><div>"+owner+"</div>";
    },

    _populateFCChooser: function(selection, layer) {
      this._clearTable();
      this.layerCheckboxHolder = [];
      var row = this.featureCollectionChooserTable.insertRow(-1);
      var cell1 = row.insertCell(0);

      var parentCheckbox = new CheckBox({
        label: this.nls.mapSelectionPanel.selectAllFC,
        checked: true,
        value: "",
        callFrom: "parent"
      }, cell1);
      this.own(on(parentCheckbox, "change", lang.hitch(this, function(value) {
        this._checkboxAllHandler(this.layerCheckboxHolder, value, parentCheckbox.callFrom);
        parentCheckbox.callFrom = "parent";
      })));

      array.forEach(this.targetMapLayers, lang.hitch(this, function(fcl){
        console.log(fcl);
        var graphicRow = this.featureCollectionChooserTable.insertRow(-1);
        var graphicCell1 = graphicRow.insertCell(0);
        var checkboxHolder = domConstruct.create("div");
        domConstruct.place(checkboxHolder, graphicCell1);
        domStyle.set(graphicCell1, "paddingLeft", "25px");
        var checkbox = new CheckBox({
          label: fcl.title,
          checked: true,
          value: fcl.id,
        }, checkboxHolder);
        this.own(on(checkbox, "change", lang.hitch(this, function(value) {
          parentCheckbox.callFrom = "child";
          var anyUnchecked = array.some(this.layerCheckboxHolder, lang.hitch(this, function(chk) {
            return(!chk.getValue());
          }));
          if(anyUnchecked) {
            parentCheckbox.setValue(false);
          } else {
            parentCheckbox.setValue(true);
          }
          var allUnchecked = array.every(this.layerCheckboxHolder, lang.hitch(this, function(chk) {
            return(!chk.getValue());
          }));
          if(allUnchecked) {
            this.emit("allUnchecked");
          } else {
            this.emit("someChecked");
          }
        })));
        this.layerCheckboxHolder.push(checkbox);
      }));
    },

    _getFinalFCToUpdate: function() {
      this.finalFCList = [];
      array.forEach(this.targetMapLayers, lang.hitch(this, function(targetLayer){
        array.forEach(this.layerCheckboxHolder, lang.hitch(this, function(chk) {
          if(chk.value === targetLayer.id) {
            if(chk.getValue()) {
              this.finalFCList.push(targetLayer);
            }
          }
        }));
      }));
      return this.finalFCList;
    },

    _getTargetMap: function() {
      return this.targetMap;
    },

    //support function
    _checkboxAllHandler: function(list, status, callFrom) {
      if(callFrom === "parent") {
        array.forEach(list, lang.hitch(this, function(chk) {
          chk.setValue(status);
        }));
      }
      return true;
    },

    checkboxAllUnchecked: function() {
      var allUnchecked = array.every(this.layerCheckboxHolder, lang.hitch(this, function(chk) {
        return(!chk.getValue());
      }));
      if(allUnchecked) {
        this.emit("allUnchecked");
      } else {
        this.emit("someChecked");
      }
    },

    _clearTable: function() {
      while(this.featureCollectionChooserTable.rows.length > 0) {
        this.featureCollectionChooserTable.deleteRow(0);
      }
    },

    _queryMapItem: function() {
      if(this.config.targetMapConfig !== null) {
        var item = this.portal.getItemById(this.config.targetMapConfig.id).then(lang.hitch(this, function(res) {
          console.log(res);
          this.targetMap = res;
          this.targetMap.getItemData().then(lang.hitch(this, function(itemData) {
            var onlyFC = array.filter(itemData.operationalLayers, lang.hitch(this, function(ol) {
              if((ol.hasOwnProperty("type") && ol.type === "Feature Collection") || (ol.hasOwnProperty("featureCollection"))) {
                return ol;
              }
            }));
            if(onlyFC.length > 0) {
              //this._listRemoveLayers(onlyFC, featureSet, layer);
              this.targetMapLayers = onlyFC;
            }
            domStyle.set(this.FCPickerHolder,"display","block");
            this._populateImagePreview();
            this._populateFCChooser();
            this.emit("someChecked");
          }));
        }));
      }
    }

  });
});