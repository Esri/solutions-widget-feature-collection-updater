define([
  'dojo/_base/declare',
  'jimu/BaseWidget',
  'dojo/_base/lang',
  'dojo/_base/html',
  'dojo/_base/array',
  'dojo/on',
  'dojo/dom-style',
  'dojo/dom-attr',
  'dojo/dom-construct',
  'dojo/Deferred',
  'esri/graphic',
  'esri/Color',
  'esri/IdentityManager',
  'esri/layers/FeatureLayer',
  'esri/tasks/query',
  'jimu/LayerInfos/LayerInfos',
  'jimu/WidgetManager',
  'jimu/dijit/CheckBox',
  'jimu/dijit/FeatureSetChooserForMultipleLayers',
  'jimu/portalUtils',
  'jimu/portalUrlUtils',
  'jimu/tokenUtils',
  'jimu/Role',
  'jimu/dijit/Message',
  './mapSelection',
  './saveOptions'
  ],
function(declare, BaseWidget, lang, html, array, on, domStyle, domAttr, domConstruct, Deferred, Graphic, Color, IdentityManager, FeatureLayer, Query, LayerInfos, WidgetManager, CheckBox, FeatureSetChooserForMultipleLayers,
  portalUtils, portalUrlUtils, tokenUtils, Role, Message, mapSelection, saveOptions) {
  //To create a widget, you need to derive from BaseWidget.
  return declare([BaseWidget], {
    // DemoWidget code goes here

    //please note that this property is be set by the framework when widget is loaded.
    //templateString: template,

    baseClass: 'jimu-widget-save-to-map',

    portalUrl: null,
    portal: null,
    selectDijit: null,
    selectedFeatures: [],
    finalSelectedFeatures: [],
    finalSelectedLayers: [],
    finalSelectedCollectionUpdate: [],
    layerInfosObject: [],
    validSelectableLayers: [],
    selectionGraphic: null,
    selctionCheckboxHolder: [],
    mapSelectionObj: null,
    saveOptionsObj: null,
    currentPanel: "selection",
    panelDirection: "forward",

    postCreate: function() {
      this.inherited(arguments);

      this.portalUrl = portalUrlUtils.getStandardPortalUrl(this.appConfig.portalUrl);
      this.portal = portalUtils.getPortal(this.portalUrl);

      this.checkPrivilege().then(lang.hitch(this, function(hasPrivilege) {
        //if user does have priviledges, proceed, if not, widget ends.
        if (hasPrivilege) {
          this.layerInfosObject = LayerInfos.getInstanceSync();
          this.createSelectToolDijit();

          this.initialDisplay();
        } else {
          new Message({
            message: window.jimuNls.noEditPrivileges
          });
        }
      }));
    },

    initialDisplay: function() {
      //Hide other panels at start
      domStyle.set(this.selectionPanel,"display","block");
      domStyle.set(this.mapSelectorPanel,"display","none");
      domStyle.set(this.saveOptionsPanel,"display","none");
      domStyle.set(this.backButtonHolder,"display","none");
      domStyle.set(this.updateButtonHolder,"display","none");
      domStyle.set(this.okButtonHolder,"display","none");

      //in panel hides
      domStyle.set(this.selectionResultChooser,"display","none");
    },

    startup: function() {
      this.inherited(arguments);
      console.log('startup');
    },

    onOpen: function(){
      WidgetManager.getInstance().activateWidget(this);
      this.initialDisplay();
    },

    onClose: function(){
      console.log('onClose');
      this.selectDijit.clear(true);
      this.currentPanel = "selection";
      this.initialDisplay();
      this._clearAllSelections();
    },

    onDeActive: function(){
      console.log('onDeActive');
      if (this.selectDijit.isActive()) {
        this.selectDijit.deactivate();
      }
    },

    onActive: function(){
      if (!this.selectDijit.isActive()) {
        this.selectDijit.activate();
      }
    },

    onDestroy: function() {
      if (this.selectDijit.isActive()) {
        this.selectDijit.deactivate();
      }
      this._clearAllSelections();
    },

    onResize: function() {
      console.log("here");
    },

    createSelectToolDijit: function() {
      // create select dijit
      this.selectDijit = new FeatureSetChooserForMultipleLayers({
        map: this.map,
        updateSelection: true,
        fullyWithin: false,
        geoTypes: ['EXTENT']
      });

      html.place(this.selectDijit.domNode, this.selectionTools);
      this.selectDijit.startup();
      this.selectDijit.setFeatureLayers(this._getSelectableLayers());
      this.selectDijit.activate();

      this.own(on(this.selectDijit, 'user-clear', lang.hitch(this, this._clearAllSelections)));
      this.own(on(this.selectDijit, 'loading', lang.hitch(this, function() {
        //this.shelter.show();
      })));
      this.own(on(this.selectDijit, 'unloading', lang.hitch(this, function(evt) {
        //this.shelter.hide();
        this._clearAllSelections();
        domStyle.set(this.selectionResultChooser,"display","block");
        domStyle.set(this.okButtonHolder,"display","block");
        array.forEach(this.validSelectableLayers, lang.hitch(this, function(selectedLayer) {
          if(selectedLayer.layerObject.getSelectedFeatures().length > 0) {
            var selFeatures = selectedLayer.layerObject.getSelectedFeatures();
            this.selectedFeatures.push({
              features: selFeatures,
              layer: selectedLayer.layerObject
            });
            /*
            array.forEach(selFeatures, lang.hitch(this, function(sel){
              this.selectedFeatures.push({
                features: sel,
                layer: selectedLayer
              });
            }));
            */
            this.featureChooser(selFeatures, selectedLayer);
          }
        }));
      })));
    },

    _getSelectableLayers: function() {
      var layers = [];
      this.validSelectableLayers = array.filter(this.layerInfosObject._operLayers, lang.hitch(this, function(lyrObj){
        var layerIds = array.map(this.config.selectableLayers, function(selLyr){return selLyr.id});
        return this.isInArray(lyrObj.id, layerIds);
      }));
      array.forEach(this.validSelectableLayers, lang.hitch(this, function(layerItem) {
        layers.push(layerItem.layerObject);
      }));
      return layers;
    },

    _clearAllSelections: function() {
      this.map.graphics.remove(this.selectionGraphic);
      this.selectedFeatures = [];
      this.selectionGraphic = null;
      this.selctionCheckboxHolder = [];
      this.finalSelectedFeatures = [];
      this.finalSelectedCollectionUpdate = [];
      if(this.mapSelectionObj !== null) {
        this.mapSelectionObj = null;
        domConstruct.empty(this.mapSelectorHolder);
      }
      if(this.saveOptionsObj !== null) {
        this.saveOptionsObj = null;
        domConstruct.empty(this.saveOptionsHolder);
      }
      while(this.featureChooserTable.rows.length > 0) {
        this.featureChooserTable.deleteRow(0);
      }
      domStyle.set(this.selectionResultChooser,"display","none");
      domStyle.set(this.okButtonHolder,"display","none");
    },

    //FEATURE SELECTION
    featureChooser: function(selection, layer) {
      var row = this.featureChooserTable.insertRow(-1);
      var cell1 = row.insertCell(0);

      var parentCheckbox = new CheckBox({
        label: layer.title,
        checked: true,
        value: layer.id,
        callFrom: "parent"
      }, cell1);
      this.own(on(parentCheckbox, "change", lang.hitch(this, function(value) {
        var onlyMatchParent = array.filter(this.selctionCheckboxHolder, lang.hitch(this, function(selChk){
          return(selChk.group === parentCheckbox.value);
        }));
        this._fieldsAllHandler(onlyMatchParent, value, parentCheckbox.callFrom);
        parentCheckbox.callFrom = "parent";
      })));

      array.forEach(selection, lang.hitch(this, function(sel){
        var graphicRow = this.featureChooserTable.insertRow(-1);
        var graphicCell1 = graphicRow.insertCell(0);
        var checkboxHolder = domConstruct.create("div");
        domConstruct.place(checkboxHolder, graphicCell1);
        domStyle.set(graphicCell1, "paddingLeft", "25px");
        var displayVal = "Unknown";
        if(layer.layerObject.displayField !== "") {
          if(typeof(sel.attributes[layer.layerObject.displayField]) !== "undefined") {
            if(typeof(sel.attributes[layer.layerObject.displayField]) !== "") {
              displayVal = sel.attributes[layer.layerObject.displayField];
              if(!isNaN(displayVal)) {
                displayVal = displayVal.toString();
              }
            }
          }
        }
        var checkbox = new CheckBox({
          label: displayVal,
          checked: true,
          value: sel.attributes[layer.layerObject.objectIdField],
          group: layer.id,
          parent: parentCheckbox
        }, checkboxHolder);
        this.own(on(graphicCell1, "mouseover", lang.hitch(this, function() {
          //highlight this selection
          this.highlightGeom(sel);
        })));
        this.own(on(graphicCell1, "mouseout", lang.hitch(this, function() {
          //highlight this selection
          this.removeHighlightGeom(sel);
        })));
        this.own(on(checkbox, "change", lang.hitch(this, function(value) {
          parentCheckbox.callFrom = "child";
          if(value) {
            this.showSelection(sel);
          } else {
            this.hideSelection(sel);
          }
          var anyUnchecked = array.some(this.selctionCheckboxHolder, lang.hitch(this, function(chk) {
            return(chk.group === checkbox.group && !chk.getValue());
          }));
          if(anyUnchecked) {
            checkbox.parent.setValue(false);
          } else {
            checkbox.parent.setValue(true);
          }
          var allUnchecked = array.every(this.selctionCheckboxHolder, lang.hitch(this, function(chk) {
            return(!chk.getValue());
          }));
          if(allUnchecked) {
            domStyle.set(this.okButtonHolder,"display","none");
          } else {
            domStyle.set(this.okButtonHolder,"display","block");
          }
        })));
        this.selctionCheckboxHolder.push(checkbox);
      }));

    },

    _createFinalSelectionSet: function() {
      this.finalSelectedFeatures = [];
      array.forEach(this.selectedFeatures, lang.hitch(this, function(selLayer){
        var validFeat = [];
        array.forEach(this.selctionCheckboxHolder, lang.hitch(this, function(chk) {
          array.forEach(selLayer.features, lang.hitch(this, function(selFeat){
            if(chk.group === selLayer.layer.id && chk.value === selFeat.attributes[selLayer.layer.objectIdField]) {
              if(chk.getValue()) {
                validFeat.push(selFeat);
              }
            }
          }));
        }));
        if(validFeat.length > 0) {
          this.finalSelectedFeatures.push({
            layer: selLayer.layer,
            features: validFeat
          })
        }
      }));
      console.log(this.finalSelectedFeatures);
    },

    //panels
    _loadMapSelectionPanel: function() {
      if(this.mapSelectionObj === null) {
        this.mapSelectionObj = new mapSelection({
          nls: this.nls,
          portalUrl: this.portalUrl,
          portalUtils: this.portalUtils,
          portal: this.portal,
          config: this.config
        });
        this.mapSelectionObj.placeAt(this.mapSelectorHolder);
        domStyle.set(this.okButtonHolder,"display","none");

        this.own(on(this.mapSelectionObj, "allUnchecked", lang.hitch(this, function() {
          domStyle.set(this.okButtonHolder,"display","none");
        })));

        this.own(on(this.mapSelectionObj, "someChecked", lang.hitch(this, function() {
          domStyle.set(this.okButtonHolder,"display","block");
        })));
      } else {
        this.mapSelectionObj.checkboxAllUnchecked();
      }
    },

    _loadSaveOptionsPanel: function() {
      if(this.saveOptionsObj === null) {
        this.saveOptionsObj = new saveOptions({
          nls: this.nls,
          portalUrl: this.portalUrl,
          appConfig: this.appConfig,
          portalUtils: this.portalUtils,
          portalUser: this.portalUser,
          portal: this.portal,
          config: this.config,
          featureSet: this.finalSelectedFeatures,
          collectionToUpdate: this.finalSelectedCollectionUpdate,
          targetMap: this.mapSelectionObj._getTargetMap()
        });
        this.saveOptionsObj.placeAt(this.saveOptionsHolder);
        domStyle.set(this.okButtonHolder,"display","none");

        this.own(on(this.saveOptionsObj, "save-applyedits", lang.hitch(this, function() {
          this.applyDataEdits();
        })));
        this.own(on(this.saveOptionsObj, "save-complete", lang.hitch(this, function() {
          this.selectDijit.clear(true);
          this.currentPanel = "selection";
          this.initialDisplay();
          this._clearAllSelections();
        })));
      }
    },

    //process the update
    processUpdate: function() {
      this.saveOptionsObj.validate();
    },

    //end process the update

    //support functions
    backButtonPress: function() {
      this.panelDirection = "backward";
      this.panelNavigation();
    },

    nextButtonPress: function() {
      this.panelDirection = "forward";
      this.panelNavigation();
    },

    panelNavigation: function() {
      switch(this.currentPanel) {
        case "selection": {
          if(this.panelDirection === "forward") {
            this._createFinalSelectionSet();
            this._panelVisibleManager("mapSelection", false);
            this._loadMapSelectionPanel();
          }
          break;
        }
        case "mapSelection": {
          if(this.panelDirection === "backward") {
            //domConstruct.empty(this.itemSelectorHolder);
            this._panelVisibleManager("selection", true);
          }
          if(this.panelDirection === "forward") {
            //pull saved parameters
            this. finalSelectedCollectionUpdate = this.mapSelectionObj._getFinalFCToUpdate();
            this._panelVisibleManager("saveOptions", false);
            this._loadSaveOptionsPanel();
          }
          break;
        }
        case "saveOptions": {
          if(this.panelDirection === "backward") {
            //domConstruct.empty(this.itemSelectorHolder);
            this._panelVisibleManager("mapSelection", true);
          }
          break;
        }
      }
    },

    _panelVisibleManager: function(target, nextFlag) {
      switch(target) {
        case "selection": {
          domStyle.set(this.selectionPanel,"display","block");
          domStyle.set(this.mapSelectorPanel,"display","none");
          domStyle.set(this.saveOptionsPanel,"display","none");
          domStyle.set(this.backButtonHolder,"display","none");
          domStyle.set(this.updateButtonHolder,"display","none");
          if(nextFlag) {
            domStyle.set(this.okButtonHolder,"display","block");
          }
          this.currentPanel = "selection";
          break;
        }
        case "mapSelection": {
          domStyle.set(this.selectionPanel,"display","none");
          domStyle.set(this.mapSelectorPanel,"display","block");
          domStyle.set(this.saveOptionsPanel,"display","none");
          domStyle.set(this.backButtonHolder,"display","block");
          domStyle.set(this.updateButtonHolder,"display","none");
          if(nextFlag) {
            domStyle.set(this.okButtonHolder,"display","block");
          }
          this.currentPanel = "mapSelection";
          break;
        }
        case "saveOptions": {
          domStyle.set(this.selectionPanel,"display","none");
          domStyle.set(this.mapSelectorPanel,"display","none");
          domStyle.set(this.saveOptionsPanel,"display","block");
          domStyle.set(this.backButtonHolder,"display","block");
          domStyle.set(this.updateButtonHolder,"display","block");
          domStyle.set(this.okButtonHolder,"display","none");
          this.currentPanel = "saveOptions";
          break;
        }
      }
    },

    highlightGeom: function(sel) {
      var newGeom = sel.geometry;
      var sym = lang.clone(sel.symbol);
      sym.color = new Color([255,0,0,1]);
      this.selectionGraphic = new Graphic(newGeom, sym);
      this.map.graphics.add(this.selectionGraphic);
    },

    removeHighlightGeom: function(sel) {
      this.map.graphics.remove(this.selectionGraphic);
    },

    showSelection: function(sel) {
      sel.show();
      console.log(sel.symbol.color);
    },

    hideSelection: function(sel) {
      sel.hide();
      console.log(sel.symbol.color);
    },

    _fieldsAllHandler: function(list, status, callFrom) {
      if(callFrom === "parent") {
        array.forEach(list, lang.hitch(this, function(chk) {
          chk.setValue(status);
        }));
      }
      return true;
    },

    isInArray: function(value, array) {
      return array.indexOf(value) > -1;
    },

    checkPrivilege: function () {
      if(!this.portal) {
        var def = new Deferred();
        def.resolve(false);
        return def;
      } else if (!this.portal.haveSignIn()) {
        IdentityManager.useSignInPage = false;
        return portal.signIn().then(lang.hitch(this, function(){
          IdentityManager.useSignInPage = true;
          return this._hasPrivilege(portal);
        }), lang.hitch(this, function() {
          IdentityManager.useSignInPage = true;
        }));
      } else {
        return this._hasPrivilege(this.portal);
      }
    },

    _hasPrivilege: function(portal){
      return portal.loadSelfInfo().then(lang.hitch(this, function(res){
        if(res && res.user) {
          var userRole = new Role({
            id: (res.user.roleId) ? res.user.roleId : res.user.role,
            role: res.user.role
          });
          if(res.user.privileges) {
            userRole.setPrivileges(res.user.privileges);
          }
          // Check whether user can create item of type feature collection
          return userRole.canCreateItem() && userRole.canPublishFeatures();
        }else{
          return false;
        }
      }), function() {
        return false;
      });
    }

  });
});