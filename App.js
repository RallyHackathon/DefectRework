Ext.define('DefectTrendRemixedApp', {
    extend: 'Rally.app.App',
    componentCls: 'app',

    layout: {
      type: 'vbox',
      align: 'stretch'
    },
    // define items inside "outer" app container
    items: [
        {
          xtype: 'container',
          itemId: 'bigNumber',
          componentCls: 'reworkCountNumber',
          style: {
            textAlign: 'center'
          }
        },
        {
          xtype: 'container',
          itemId: 'bigNumberText',
          componentCls: 'reworkCountText',
          html: 'Reworked Defects',
          style: {
            textAlign: 'center'
          }
        },
        {
          // Turns free-form text (e.g. 30days) into bonafide Ext objects to which we can inherit tons-o-methods
          xtype: 'container',
          itemId: 'daySelection',
          renderTpl: '<span id="{id}-s30">30 days</span>  |  <span id="{id}-s60">60 days</span>  |  <span id="{id}-s90">90 days</span>',
          childEls: ["s30", "s60", "s90"],
          listeners: {
            afterrender: function(cmp) {
              cmp.s30.addCls('selected');
              cmp.s30.on('click', function() {
                alert('30 days');
              });
              cmp.s60.addCls('notselected');
              cmp.s60.on('click', function() {
                alert('60 days');
              });
              cmp.s90.addCls('notselected');
              cmp.s90.on('click', function() {
                alert('90 days');
              });
            }
          },
          style: {
            paddingTop: 10,
            textAlign: 'center'

          }
        }

      ],
    launch: function() {

      var daysAgo = Ext.Date.add(new Date(), Ext.Date.DAY, -30);
      var daysAgoIsoString = Rally.util.DateTime.toIsoString(daysAgo, true); 

      Ext.create('Rally.data.lookback.SnapshotStore', {
        context: this.getContext().getDataContext(), //get workspace, project info, etc from the app context
        autoLoad: true,

        listeners: {
            scope: this,
          load: function(store, data, success) {
            console.log(data);

            var uniqueDefects = store.collect("_UnformattedID", false, true);
            console.log('Total:', store.count());
            console.log('Unique:', uniqueDefects.length);
            this.down('#bigNumber').update(uniqueDefects.length);

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
        ]
      });
    }
});
    

