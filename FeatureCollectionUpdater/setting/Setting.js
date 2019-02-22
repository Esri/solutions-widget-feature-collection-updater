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

define([
  'dojo/_base/declare',
  'dojo/_base/lang',
  'dojo/_base/array',
  'dojo/on',
  'dojo/dom-style',
  'dojo/dom-construct',
  'jimu/BaseWidgetSetting',
  'jimu/portalUtils',
  'jimu/portalUrlUtils',
  'jimu/tokenUtils',
  'jimu/Role',
  'jimu/LayerInfos/LayerInfos',
  'jimu/dijit/ItemSelector',
  'jimu/dijit/CheckBox',
  'jimu/dijit/Popup',
  'jimu/dijit/Message'
],
function(declare, lang, array, on, domStyle, domConstruct, BaseWidgetSetting, portalUtils, portalUrlUtils, tokenUtils, Role, LayerInfos, ItemSelector, CheckBox, Popup, Message) {

  return declare([BaseWidgetSetting], {
    baseClass: 'jimu-widget-demo-setting',

    portalUrl: null,
    portal: null,
    itemSelector: null,
    targetMap: null,
    tempMap: null,
    onlyValidLayers: [],
    layerCheckboxHolder: [],
    mapChooserRuntimeCkbox: null,
    saveOptionRuntimeChkbox: null,

    postCreate: function(){
      //the config object is passed in
      this.setConfig(this.config);

      domStyle.set(this.saveOptionFieldset, "display", "none");

      var layerInfosObject = LayerInfos.getInstanceSync();
      this.onlyValidLayers = array.filter(layerInfosObject._operLayers, lang.hitch(this, function(fcl){
        return(fcl.hasOwnProperty("layerObject"));
      }));
      this.portalUrl = portalUrlUtils.getStandardPortalUrl(this.appConfig.portalUrl);
      this.portal = portalUtils.getPortal(this.portalUrl);

      this._populateSelectableLayerChooser();
      this._createCheckboxes();

      this.own(on(this.mapChooserIcon, "click", lang.hitch(this, this._createItemSelector)));

      if(this.targetMap !== null) {
        this._populateImagePreview();
      }

    },

    setConfig: function(config){
      //this.textNode.value = config.configText;
      this.onlyValidLayers = config.selectableLayers;
      this.targetMap = config.targetMapConfig;
    },

    getConfig: function(){
      //WAB will get config object through this method
      var validConfig = true;
      var validLayer = [];
      var mapTarget = null;
      array.forEach(this.onlyValidLayers, lang.hitch(this, function(opl){
        var onlyChecked = array.filter(this.layerCheckboxHolder, lang.hitch(this, function(lyrChk){
          return(lyrChk.checked);
        }));
        if(onlyChecked.length > 0) {
          array.forEach(onlyChecked, lang.hitch(this, function(lyrChk){
            if(opl.layerObject.id === lyrChk.value) {
              validLayer.push({
                "id": opl.layerObject.id,
                "displayField": ((opl.layerObject.displayField !== "") ? opl.layerObject.displayField : opl.layerObject.objectIdField)
              });
            }
          }));
        } else {
          validConfig = false;
        }
      }));
      if(this.targetMap !== null) {
        mapTarget = {
          id: this.targetMap.id,
          thumbnailUrl: this.targetMap.thumbnailUrl,
          title: this.targetMap.title,
          owner: this.targetMap.owner
        }
      }

      if(validConfig) {
        return {
          selectableLayers: validLayer,
          targetMapConfig: mapTarget,
          targetMapRuntime: this.mapChooserRuntimeCkbox.checked
        };
      } else {
        new Message({
          message: this.nls.validation.noSelectableLayer
        });
        return false;
      }
    },

    _populateSelectableLayerChooser: function() {
        this._clearTable();
        this.layerCheckboxHolder = [];
        var row = this.LayerListChooserTable.insertRow(-1);
        var cell1 = row.insertCell(0);

        var parentCheckbox = new CheckBox({
          label: "All",
          checked: false,
          value: "",
          callFrom: "parent"
        }, cell1);
        this.own(on(parentCheckbox, "change", lang.hitch(this, function(value) {
          this._checkboxAllHandler(this.layerCheckboxHolder, value, parentCheckbox.callFrom);
          parentCheckbox.callFrom = "parent";
        })));

        array.forEach(this.onlyValidLayers, lang.hitch(this, function(fcl){
          var graphicRow = this.LayerListChooserTable.insertRow(-1);
          var graphicCell1 = graphicRow.insertCell(0);
          var checkboxHolder = domConstruct.create("div");
          domConstruct.place(checkboxHolder, graphicCell1);
          domStyle.set(graphicCell1, "paddingLeft", "25px");
          var checkbox = new CheckBox({
            label: fcl.layerObject.name,
            checked: this._checkIfLayerSelectable(fcl.layerObject.id),
            value: fcl.layerObject.id,
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
          })));
          this.layerCheckboxHolder.push(checkbox);
        }));
    },

    _checkIfLayerSelectable: function(layerId) {
      if(this.config.selectableLayers.length > 0) {
        var checkedLayer = array.some(this.config.selectableLayers, lang.hitch(this, function(sl){
          return(sl.id === layerId);
        }));
        return checkedLayer;
      } else {
        return false;
      }
    },

    _createCheckboxes: function() {
      this.mapChooserRuntimeCkbox = new CheckBox({
        label: this.nls.mapSet.chooserRuntime,
        checked: ((this.config.targetMapRuntime) ? true : false),
      }, this.selectedMapChooserRuntime);

      this.saveOptionRuntimeChkbox = new CheckBox({
        label: this.nls.saveSet.chooserRuntime,
        checked: ((this.config.saveOptionsRuntime) ? true : true),
      }, this.saveOrgChooserRuntime);
    },

    _createItemSelector: function() {
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
      //this.itemSelector.placeAt(this.selectedMapChooserPicker);
      //domConstruct.place(this.itemSelector, this.SelectedMapChooserPicker);
      this.itemSelector.startup();

      var popup = new Popup({
        content: this.itemSelector,
        titleLabel: "map picker",
        width: 850,
        height: 600,
        buttons: [{
          label: window.jimuNls.common.ok,
          onClick: lang.hitch(this, function() {
            if(this.tempMap !== null) {
              this._checkCollectionsInTarget("final", popup);
            } else {
              //this._clearPreview();
              popup.close();
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

    },

    _onItemSelected: function (evt) {
        this.tempMap = evt;
        console.log(this.targetMap);
        this._checkCollectionsInTarget("temp", null);
    },
    _onNoneItemSelected: function (evt) {
      this.tempMap = null;
    },

    _checkCollectionsInTarget: function(status, referrer) {
      this.tempMap.getItemData().then(lang.hitch(this, function(itemData) {
        var onlyFC = array.filter(itemData.operationalLayers, lang.hitch(this, function(ol) {
          if((ol.hasOwnProperty("type") && ol.type === "Feature Collection") || (ol.hasOwnProperty("featureCollection"))) {
            return ol;
          }
        }));
        if(onlyFC.length > 0) {
          if(status === "final") {
            this.targetMap = this.tempMap;
            this._populateImagePreview();
            referrer.close();
          }
          return(true);
        } else {
          new Message({
            message: this.nls.validation.NoFeatureCollection
          });
          return(false);
        }
      }));
    },

    _populateImagePreview: function() {
      var thumbnail = this.targetMap.thumbnailUrl;
      var title = this.targetMap.title;
      var owner = this.nls.mapSet.webmapAuthor + this.targetMap.owner;
      this.mapThumbnailHolder.innerHTML = "<img src="+thumbnail+" width='100' />";
      this.mapDetailsHolder.innerHTML = "<div>"+title+"</div><div>"+owner+"</div>";
    },

    _clearPreview: function() {
      this.mapThumbnailHolder.innerHTML = "";
      this.mapDetailsHolder.innerHTML = "";
    },

    _checkboxAllHandler: function(list, status, callFrom) {
      if(callFrom === "parent") {
        array.forEach(list, lang.hitch(this, function(chk) {
          chk.setValue(status);
        }));
      }
      return true;
    },

    _clearTable: function() {
      while(this.LayerListChooserTable.rows.length > 0) {
        this.LayerListChooserTable.deleteRow(0);
      }
    }


  });
});