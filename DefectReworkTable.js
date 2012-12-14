Ext.define('DefectReworkTableApp', {
    extend: 'Rally.app.App',
    componentCls: 'app',
    statics: {
        ThirtyDaysBack: -30,
        SixtyDaysBack: -60,
        NinetyDaysBack: -90
    },
    layout: {
      type: 'vbox',
      align: 'stretch'
    },
    indivDefects: null,

    launch: function() {

      this._initGrid();
      this._loadData(DefectTrendRemixedApp.ThirtyDaysBack);
      Rally.environment.getMessageBus().subscribe('DefectTrendRemixedApp.daysShifted', this._onDaysBackChanged, this);
    },

    _onDaysBackChanged: function(daysShift, sender) {

      // prevent consuming own messages
      if (sender === this) {
        return;
      }

      // REFACTOR: copied; need to share
      if (daysShift == -30) {
        //select the "30" label, deselect the other labels
        //check to see if 30 is already the enabled label, is so just no-op
        if(this.down("#daySelection").s30.hasCls('selected') ){
            return;
        }
        console.log(30); 
        // update labels appropriately
        this.down("#daySelection").s30.removeCls('selected').removeCls('notselected').addCls('selected')
        this.down("#daySelection").s60.removeCls('selected').removeCls('notselected').addCls('notselected');
        this.down("#daySelection").s90.removeCls('selected').removeCls('notselected').addCls('notselected');
        this._loadData(DefectTrendRemixedApp.ThirtyDaysBack);
        } else if (daysShift == -60) {
         if(this.down("#daySelection").s60.hasCls('selected')){
                return;
         }
        console.log('60', this);
        this.down("#daySelection").s60.removeCls('selected').removeCls('notselected').addCls('selected')
        this.down("#daySelection").s30.removeCls('selected').removeCls('notselected').addCls('notselected');
        this.down("#daySelection").s90.removeCls('selected').removeCls('notselected').addCls('notselected');

        this._loadData(DefectTrendRemixedApp.SixtyDaysBack);
      } else if (daysShift == -90) {
        if(this.down("#daySelection").s90.hasCls('selected')) {
              return;
          }
        console.log('90');
        this.down("#daySelection").s90.removeCls('selected').removeCls('notselected').addCls('selected')
        this.down("#daySelection").s60.removeCls('selected').removeCls('notselected').addCls('notselected');
        this.down("#daySelection").s30.removeCls('selected').removeCls('notselected').addCls('notselected');
        this._loadData(DefectTrendRemixedApp.NinetyDaysBack);
      }
    },
    // for every element in the store (e.g. 100), slot it into a data structure
    // key'd by the unique defect id.
    _bucketData: function(defectSnapshotStore) {
        console.log('foo', defectSnapshotStore);
        var uniqueDefects = defectSnapshotStore.collect("ObjectID", false, true);
        console.log('# Unique:', uniqueDefects.length);
        this.indivDefects = {};

        // prime unique entries for each defect, seeding empty storage for snapshots
        Ext.Array.each(uniqueDefects, function(defect) {
          console.log('this ', this);
          this.indivDefects[defect] = {"snapshots": []};
        }, this);
        // loop through all (e.g. 100) snapshots and filter/push into data structure
        defectSnapshotStore.each(function(snapshot) {
          this.indivDefects[snapshot.get("ObjectID")].snapshots.push(snapshot);
        }, this);
        
        this._fetchWholeDefects();
        
    }, //End _bucketData
    
    _fetchWholeDefects: function() {
        var uniqueDefects = Ext.Object.getKeys( this.indivDefects);
        var defectQueryFilter = Ext.create('Rally.data.QueryFilter', {
            property: 'ObjectID',
            operator: '=',
            value: uniqueDefects.pop()
        });

        // build querie of or'd ids
        Ext.Array.each(uniqueDefects, function(uniqueDefect) {
            var query = new Rally.data.QueryFilter( {
            property: 'ObjectID',
            operator: '=',
            value: uniqueDefect
            });

            defectQueryFilter = defectQueryFilter.or(query);

        });
        
        Ext.create('Rally.data.WsapiDataStore', {
            model: 'Defect',
            fetch: ['Name', 'State', '_ref','FormattedID'],
            autoLoad: true,
            filters: [defectQueryFilter],
            listeners: {
                scope: this,
                load: function(store, data, success) {
                    Ext.Array.each(data, function(defect) {
                        console.log('defect obj id ', defect.get('ObjectID'));
                        this.indivDefects[defect.get('ObjectID')].Name = defect.get('Name');
                        this.indivDefects[defect.get('ObjectID')].State = defect.get('State');
                        this.indivDefects[defect.get('ObjectID')]._ref = defect.get('_ref');
                        this.indivDefects[defect.get('ObjectID')].FormattedID = defect.get('FormattedID')
                    }, this);
                    this._updateGrid();
                } //End load
            }  // End listeners     
          }); // End Ext.Create ;
        }, // End _fetchWholeDefects
    
    _loadData: function(daysShift) {
         var daysAgo = Ext.Date.add(new Date(), Ext.Date.DAY, daysShift);
         var daysAgoIsoString = Rally.util.DateTime.toIsoString(daysAgo, true); 
         Ext.create('Rally.data.lookback.SnapshotStore', {
           context: this.getContext().getDataContext(), //get workspace, project info, etc from the app context
           autoLoad: true, 
           listeners: {
              scope: this,
              load: function(store, data, success) {
              console.log("Snapshot Count:", store.count());
              this._bucketData(store);
            }
          },
          
          hydrate: ['State', '_PreviousValues'],
          fetch:  ['_UnformattedID', 'Project', 'Name', 'State', 'Owner', '_PreviousValues'],
          filters: [
            {
                property: '_TypeHierarchy',
                operator: 'in',
                value: ['Defect']
            },
            {
                property: 'Project',
                operator: '=',
                value: this.getContext().getProject().ObjectID
            },
            {
                property: 'State',
                operator: '<',
                value: 'Closed'
            },
            {
                property: '_PreviousValues.State',
                operator: '=',
                value: 'Closed' 
            },
            {
                property: '_ValidFrom',
                operator: '>',
                value: daysAgoIsoString
            }
          ], // End filters
          sorters: [
              {
                  property: "_id",
                  direction: "ascending"
              }
          ]
        }); //End EXT.create 

    }, // End _loadData
   
    _updateGrid: function() {
        var gridData = [];
        for(defect in this.indivDefects) {
            var defectMeta = this.indivDefects[defect]; // move data from complex object to simple array
            gridData.push(defectMeta);
        }

       var customStore = Ext.create('Rally.data.custom.Store', {
           data: gridData,
       } );

        // find & populate grid
       this.down('#defectGrid').reconfigure(customStore);
        
        // grid layout hidden on load to prevent showing empty grid and waiting few secs to get data
        // this will re-enable and show the first grid with data
        Ext.resumeLayouts(true);
    },
    _initGrid: function(){

      // prevent rendering grid until first data is retrieved and given to grid
      Ext.suspendLayouts();

      // Add 30/60/90 links
      this.add(
        {
          // Turns free-form text (e.g. 30days) into bonafide Ext objects 
          // to which we can inherit tons-o-methods
          xtype: 'container',
          itemId: 'daySelection',
          renderTpl: '<span id="{id}-s30">30 days</span>  |  <span id="{id}-s60">60 days</span>  |  <span id="{id}-s90">90 days</span>',
          childEls: ["s30", "s60", "s90"],
          listeners: {
            scope: this,
            afterrender: function(cmp) {
                // set defaults for initial loading
                cmp.s30.addCls('selected');
                cmp.s60.addCls('notselected');
                cmp.s90.addCls('notselected');
              
              // click event handlers
              cmp.s30.on('click', function(eventObj) {
                //select the "30" label, deselect the other labels
                //check to see if 30 is already the enabled label, is so just no-op
                if(this.down("#daySelection").s30.hasCls('selected') ){
                    return;
                }
                console.log(30); 
                // update labels appropriately
                this.down("#daySelection").s30.removeCls('selected').removeCls('notselected').addCls('selected')
                this.down("#daySelection").s60.removeCls('selected').removeCls('notselected').addCls('notselected');
                this.down("#daySelection").s90.removeCls('selected').removeCls('notselected').addCls('notselected');
                this._loadData(DefectTrendRemixedApp.ThirtyDaysBack);
                console.log("publish 30" + DefectTrendRemixedApp.ThirtyDaysBack);
                Rally.environment.getMessageBus().publish('DefectTrendRemixedApp.daysShifted', DefectTrendRemixedApp.ThirtyDaysBack, this);
              }, this );
              
              cmp.s60.on('click', function() {
                 if(this.down("#daySelection").s60.hasCls('selected')){
                        return;
                 }
                console.log('60', this);
                this.down("#daySelection").s60.removeCls('selected').removeCls('notselected').addCls('selected')
                this.down("#daySelection").s30.removeCls('selected').removeCls('notselected').addCls('notselected');
                this.down("#daySelection").s90.removeCls('selected').removeCls('notselected').addCls('notselected');

                this._loadData(DefectTrendRemixedApp.SixtyDaysBack);
                console.log("publish 60");
                Rally.environment.getMessageBus().publish('DefectTrendRemixedApp.daysShifted', DefectTrendRemixedApp.ThirtyDaysBack, this);
              }, this);
              
              cmp.s90.on('click', function() {
                if(this.down("#daySelection").s90.hasCls('selected')) {
                      return;
                  }
                console.log('90');
                this.down("#daySelection").s90.removeCls('selected').removeCls('notselected').addCls('selected')
                this.down("#daySelection").s60.removeCls('selected').removeCls('notselected').addCls('notselected');
                this.down("#daySelection").s30.removeCls('selected').removeCls('notselected').addCls('notselected');
                this._loadData(DefectTrendRemixedApp.NinetyDaysBack);
                Rally.environment.getMessageBus().publish('DefectTrendRemixedApp.daysShifted', DefectTrendRemixedApp.ThirtyDaysBack, this);
              }, this);
            }
          },
          style: {
            padding: 10,    // TODO: add bit of padding around 30/60/90
            textAlign: 'center'
          }
        }

      );

       var customStore = Ext.create('Rally.data.custom.Store', {
           data: [],
       } );

       this.add({
          xtype: 'rallygrid',
          itemId: 'defectGrid',
          store: customStore,

          columnCfgs: [
              {   
                  text: 'Defect ID', dataIndex: 'FormattedID', flex: 1,
                  xtype: 'templatecolumn', tpl: Ext.create('Rally.ui.renderer.template.FormattedIDTemplate')
              },
              {
                  text: 'Name', dataIndex: 'Name', flex: 2
              },
              {
                  text: 'State', dataIndex: 'State', flex: 1
              }
          ]
      });

    } //End _loadGrid
});
