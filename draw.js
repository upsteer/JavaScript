Ext.define('App.ui.viz.charts.bubble.Draw', {
    extend: 'App.ui.viz.charts.Container',
    drawType: 'bubble',
    isScalable: false,
    config: {
        animationMode: false,
        timeOutPeriod: null
    },

    constructor: function() {
        this.callParent(arguments);
        this.initTimeOutPeriod();
    },

    create: function () {
        this._data = this.getData();
        if(this.getAnimationMode()) {
            return;
        }
        //console.log(this._data[0][""]["count()"]);
        this.labelStack = [];
        this.makeBubbleChart(this._data);
    },

    update: function () {
        this._data = this.getData();

        var plottables = this.getPlottables(),
            stateDataset = [],
            me = this;

        this.chartType = plottables.chart;
        this.selections = [plottables.yAxis[0]];
        this.column = plottables.column;
        this.groups = plottables.xAxis;
        this.yellow = [plottables.yAxis[1]];
        if(plottables.chart == 'timechart') {
            var minDateForMinXrange = new Date(me._data[0].timestamp),
                maxDateForMinXrange = new Date(me._data[me._data.length - 1].timestamp),
                minXrange = [new Date(minDateForMinXrange.getTime() - (me.seconds/2) * 500), new Date(maxDateForMinXrange.getTime() + (me.seconds/2) * 500)];
        
            this.xScale.domain(minXrange);
        }
    
        var includeDatasets = function(plot) {
          var ds = [];
          me.plainData.forEach(function(dataObject) {
            //console.log(dataObject)
            if(dataObject.key == "selected") {
              ds.push(dataObject);
              dataObject.key = "unselected";
            }
          });
            plot.removeDataset(plot.datasets()[0]);
            console.log(ds);
            plot.addDataset(new Plottable.Dataset(ds));
        };

        //this.pointPlot.addDataset(new Plottable.Dataset(this.ds));
        includeDatasets(this.pointPlot);
        //this.linePlot.datasets(stateDataset);

        if(this.getAnimationMode()) {
            return;
        }

        setTimeout(function() {
            if(!me.getAnimationMode() && (me.getPlottables().chart == 'timechart')) {
                me.play.attr('transform', function(d) {
                    return 'translate(' + (me.pointPlot.width() - 12) + ', 13)';
                });
            }
        }, me.getTimeOutPeriod());
    },

    onLegendChange: function (state) {
        var me = this;

        this.legendState = state;

        if(this.legendState) {
            this.chart = new Plottable.Components.Table([
                [this.yAxis,     this.group,           this.legend],
                [null,           this.xAxis,           null]
            ]);
        } else {
            this.legend.detach();
        }

        this.chart.renderTo(this.getSVG());

        setTimeout(function() {
            if(!me.getAnimationMode() && (me.getPlottables().chart == 'timechart')) {
                me.play.attr('transform', function(d) {
                    return 'translate(' + (me.pointPlot.width() - 12) + ', 13)';
                });
            }
        }, me.getTimeOutPeriod());
    },


    makeBubbleChart: function (data) {
        var plottables = this.getPlottables(),
            xScale,
            yScale,
            xAxis,
            yAxis,
            stateDataset = [],
            column,
            highlighter = "#6e4b7c",
            pointSize = 7, // for pointPlot
            me = this;

        //console.log(data);
        this.range = [];
        this.chartType = [plottables.chart];
        this.selections = [plottables.yAxis[0]];  // Array to store aggregations e.g. [count(), avg()]
        this.groups = [plottables.xAxis]; // Array to store groups e.g. [action, protocol]
            // for timechart => 'timestamp'
        this.datasets = []; // Array to store aggregation values dataset
        this.yellow = [plottables.yAxis[1]];
        this.column = plottables.column;
        //console.log(data[this.column[1][]])
        /* ****************************************** Zoom Restriction ****************************************** */
        // For x-Axis


        if(plottables.chart == 'timechart') {
            var bucketing = this.getSearcher().getResultResponse().grouping[0], // get bucket contents
                seconds = App.util.Utility.graphs.extractBucketSize(bucketing), // min x-axis zoom extent in seconds
                
                minDateForMinXrange = new Date(me._data[0].timestamp),
                maxDateForMinXrange = new Date(me._data[me._data.length - 1].timestamp),
                
                rangeInMilli = maxDateForMinXrange.getTime() - minDateForMinXrange.getTime() + seconds * 500, // maximum x-axis zoom extent
                minXrange = [new Date(minDateForMinXrange.getTime() - (seconds/2) * 500), new Date(maxDateForMinXrange.getTime() + (seconds/2) * 500)];
        }
        /* ****************************************** Zoom Restriction ****************************************** */




        /* ****************************************** Scale & Axis ****************************************** */
        // Check if the chart response is of normal chart or time-chart
        if(this.chartType == 'chart') {
            xScale = new Plottable.Scales.Category();
            xAxis = new Plottable.Axes.Category(xScale, "bottom");
        } else if(this.chartType == 'timechart') {
            xScale = new Plottable.Scales.Time()
                .domain(minXrange);
            xAxis = new Plottable.Axes.Time(xScale, "bottom");
        }

        // for adjusting the label in single line
        xAxis.formatter(labelFormatter())
            .innerTickLength(0)
            .endTickLength(0)
            .tickLabelPadding(6)
            .addClass('logpoint-default-x-axis');

        // Linear scale or Modified-Log Scale
        if (this.getProvider().getScale() == "log") {
            yScale = new Plottable.Scales.ModifiedLog();
        }else if (this.getProvider().getScale() == "linear") {
            yScale = new Plottable.Scales.Linear();
        }

        yAxis = new Plottable.Axes.Numeric(yScale, "left")
            .innerTickLength(0)
            .endTickLength(0)
            /*.formatter(function(y) {
                return '';
            })*/
            .addClass('logpoint-default-y-axis')
            .formatter(new Plottable.Formatters.shortScale()); // for 1000 => 1k representation
        /* ****************************************** Scale & Axis ****************************************** */




        /* ****************************************** X-label formatter ****************************************** */
        function labelFormatter() {
            return function(x) {
                if(me.chartType == 'chart' && me.groups[0] != undefined)
                    return x == x.substring(0,textScale(me.pointPlot.width()/me._data.length)) ? x : x.substring(0,textScale(me.pointPlot.width()/me._data.length)) + "...";
                return x;
            }
        }
        /* ****************************************** X-label formatter ****************************************** */



        
        /* ****************************************** X-label scale ****************************************** */
        var textScale = d3.scale.linear()
            .domain([50,1200]) // width of container
            .range([3,240]); // character length
        /* ****************************************** X-label scale ****************************************** */


//      /* ****************************************** Colorscale and Radius Scale ****************************************** */

        
        var colorScale, legendScale;
        var radii = [];
        legendScale = new Plottable.Scales.Color().domain(this.column).range((this.getProvider().getColors()))
        colorScale = new Plottable.Scales.Color()
        .domain(this.column)
        .range(this.getProvider().getColors());
        this.plainData = [];
        var spreadData = {};
        //console.log(data);
        // this.column.forEach(function(c){
        //     for(var i = 0; i < data.length; i++){
        //         spreadData[c] = {
        //             x: data[i].timestamp_formatted,
        //             y: data[i][c][this.selections],
        //             r: data[i][c][this.yellow],
        //             color: String(this.column[j]),
        //             key: "selected"
        //         }
        //     }
        // })
        var count = 0;
        for(var j =0; j < this.column.length; j++){
            for(var i=0; i<data.length; i++){
                spreadData = {
                     x : data[i].timestamp_formatted,
                     y : data[i][this.column[j]][this.selections],
                     r : data[i][this.column[j]][this.yellow],
                     color: String(this.column[j]),
                     key: "selected"
                }
                //console.log(spreadData[j])
                this.plainData.push(spreadData);
                //console.log(spreadData);
                count++;
            }
        }
        //console.log(this.plainData)
        //console.log(this.getProvider().getColors());
        
        for(var i=0; i<data.length; i++){
            for(var j =0; j < this.column.length; j++){
                radii[count] = (data[i][this.column[j]][this.yellow]);
                count++;
            }
        }
        //console.log(this.getHeight());
        //console.log(radii);
        //var maxR = 
        var rScale = new Plottable.Scales.Linear().domain([Plottable.Utils.Math.min(radii), Plottable.Utils.Math.max(radii)]).range([0, 0.25*this.getHeight()]);
        var gridLines = new Plottable.Components.Gridlines(xScale, yScale);
        /* ****************************************** Colorscale and Radius Scale ****************************************** */

        

        /* ****************************************** Legend ****************************************** */ 
        this.legend = new Plottable.Components.Legend(legendScale)
            .addClass('logpoint-default-legend');

        this.legend.symbol(function() {
            return Plottable.SymbolFactories.square();
        });
        this.legend.addClass("selectable");

        // var legend = new Plottable.Components.InterpolatedColorLegend(me.legendColorScale)
        //     .orientation('right')
        //     .expands(true)
        //     .addClass('logpoint-heatmap-legend');
        /* ****************************************** Legend ****************************************** */




        /* ****************************************** Plot ****************************************** */
        // pointPlot and linePlot are made object properties for proper formatting of x-labels within a single line
        //console.log(plottables.yAxis);
        // Point plot for interactions
        // this.column.forEach(function(c){
        //     console.log(c);
        // })
        //var j = 1;
        //for(var j = 0; j < this.column.length-1; j++){
        var includeDatasets = function(plot) {
          var ds = [];
          
          //plot.addDataset(new Plottable.Dataset(ds));
          me.plainData.forEach(function(dataObject) {
            //console.log(dataObject)
            if(dataObject.key == "selected") {
              ds.push(dataObject);
              dataObject.key = "unselected";
            }
          });
          plot.removeDataset(plot.datasets()[0]);
          //console.log(plot.datasets());
          plot.addDataset(new Plottable.Dataset(ds));
          console.log(plot.datasets())
          
        };



        this.pointPlot = new Plottable.Plots.Scatter()
                .x(function(d){
                    if(me.column == undefined){
                        return new Date(d[me.groups]);
                    } else {
                        return new Date(d.x);
                    }
                }, xScale)
                .y(function(d, i, dataset){
                    // console.log(me.column)
                    if(me.column == undefined){
                        return isNaN(d[dataset.metadata().name]) ? 0 : d[dataset.metadata().name];
                    }
                    else
                    {
                        return isNaN(d.y) ? 0 : d.y;
                    }
                }, yScale)
                .size(function(d, i, dataset){
                    if(me.column == undefined){
                        return isNaN(d[dataset.metadata().radius]) ? 0 : d[dataset.metadata().radius];
                    }
                    else
                    {
                        return isNaN(d.r) ? 0 : d.r;
                    }
                }, rScale)
                .attr("fill", function(d, i, dataset){
                    if(me.column == undefined){
                        return isNaN(d[dataset.metadata().radius]) ? 0 : d[dataset.metadata().radius];
                    }
                    else{
                    // console.log(me.column[j]);
                    return isNaN(d.color) ? 0 : d.color;
                    }
                }, colorScale)
                .attr('opacity', .65)
                .addClass("selectable")
                .addClass('logpoint-default-plot')
                .animated(true)
                .animator(Plottable.Plots.Animator.MAIN,new Plottable.Animators.Easing().easingMode("quad").stepDuration(200));;

            includeDatasets(this.pointPlot);
        /* ****************************************** Plot ****************************************** */





        /* ****************************************** Label & Title ****************************************** */        
        /*if (plottables.xAxisTitle) { 
            xAxisTitle = new Plottable.Components.AxisLabel(plottables.xAxisTitle, 0);  
        }

        if (plottables.yAxisTitle) {
            yAxisTitle = new Plottable.Components.AxisLabel(plottables.yAxisTitle, -90);
        }

        if (plottables.chartTitle) {
            chartTitle = new Plottable.Components.TitleLabel("CLUSTERED LINE")
                .yAlignment("center")
                .padding(10);   
        }*/
        /* ****************************************** Label & Title ****************************************** */




        /* ****************************************** Dataset ****************************************** */

        //this.pointPlot.addDataset(new Plottable.Dataset(this.plainData));

        /* ****************************************** Dataset ****************************************** */




        /* ****************************************** Dragbox ****************************************** */
        if(this.chartType == 'timechart') {
            var dragbox = new Plottable.Components.XDragBoxLayer()
                .addClass('logpoint-default-x-dragbox');
            
            var boxOldVal;
            dragbox.movable(true);
            dragbox.resizable(true);
            var selector = null;

            dragbox.onDragStart(function(box) {
                if(selector == null) {
                    selector = createSearchIcon(dragbox);
                    me.range = [];
                } else {
                    me.range = [];
                    //selector.hide();
                }
                
            });

            dragbox.onDrag(function(box) {
                selector.drawAt({ x: box.bottomRight.x, y: box.topLeft.y });
            });

            dragbox.onDragEnd(function(box) {
                me.pointPlot.entitiesIn(box).forEach(function(entity) {
                    console.log(entity);
                    if(me.range.indexOf(entity.datum['x']) == -1)
                        me.range.push(entity.datum['x']);
                });
                if(Math.abs(box.topLeft.x - box.bottomRight.x) < 0.1 ) {
                    if(boxOldVal == undefined) {
                        selector.hide();
                    } else if(!(boxOldVal.topLeft.x < box.topLeft.x) || !(boxOldVal.bottomRight.x > box.bottomRight.x)) {
                        boxOldVal = box;
                        selector.hide();   
                    }
                } else {
                    boxOldVal = box;
                }
            });

            // Dragbox region selection confirmation for drilldown
            /*var dragboxInteract = new Plottable.Interactions.Key();
            
            dragboxInteract.onKeyPress(13, function(keyCode) { // 13 corresponds to 'ENTER' key
                alert(range[0] + ", " + range[range.length-1]);
            });

            dragboxInteract.attachTo(dragbox);*/
        }
        /* ****************************************** Dragbox ****************************************** */




        /* ****************************************** DrillDown Search ****************************************** */
        function createSearchIcon(plot) {
            var searchIcon = {};
            var searchIconContainer = plot.foreground().append("g").style("visibility", "hidden");
            
            // Check if browser is IE or not
            if(Ext.isIE) {
                // IE doesnot support foreignObject element so need to implement svg:text
                searchIcon.rect = searchIconContainer.append("svg:text")
                            .attr("font-family","FontAwesome")
                            .attr("font-size",18)
                            .attr("fill","#f09a2d")
                            //.html(function() { return "&#xf18e"; })
                            .text(function() { return "\uf0a9"; })
                            .attr("class","enter")

                searchIcon.drawAt = function(p) {
                    searchIcon.rect.attr({
                        x: p.x - 20,
                        y: p.y + 19
                    });
                    searchIconContainer.style("visibility", "visible");
                }
            } else {
                searchIcon.rect = searchIconContainer.append("foreignObject")
                            .attr("width",20)
                            .attr("height",20)
                            .attr("class","enter")

                searchIcon.rect.html(App.GM.getEl('arrow-circle-arrow-right', '', {
                    style: 'color: #f09a2d; font-size: 18px'
                }));

                searchIcon.drawAt = function(p) {
                    searchIcon.rect.attr({
                        x: p.x - 20,
                        y: p.y + 4
                    });
                    searchIconContainer.style("visibility", "visible");
                }
            }

            $(".enter").click(function() {
                me.drillTimerange(me.range);
            });

            searchIcon.hide = function() {
                searchIconContainer.style("visibility", "hidden");
            }
            return searchIcon;
        }
        /* ****************************************** DrillDown Search ****************************************** */

        


        /* ****************************************** Chart ****************************************** */   
        if(this.chartType == 'timechart') {
            var group = new Plottable.Components.Group([gridLines, this.pointPlot, dragbox]);
        } else if(this.chartType == 'chart') {
            var group = new Plottable.Components.Group([gridLines, this.pointPlot]);
        }

        if(this.getProvider().getDashboard() || this.getProvider().getSearchTemplate()) {
            this.legendState = ((this.getProvider().getSettings() == undefined) || (this.getProvider().getSettings().legend == undefined)) ? false : this.getProvider().getSettings().legend;
        } else {
            this.legendState = true;
        }

        if(this.legendState) {
            this.chart = new Plottable.Components.Table([
                [yAxis,         group,           this.legend],
                [null,          xAxis,           null]
            ]);
        } else {
            this.chart = new Plottable.Components.Table([
                [yAxis,         group],
                [null,          xAxis]
            ]);
        }

        if(this.chartType == 'timechart') {
            this.chart.rowPadding(2);
        }
        this.chart.renderTo(this.getSVG());
        if(this.chartType == 'timechart') {
            this.play = this.createMediaIcon(group, 'play', 12);
        }
        /* ****************************************** Chart ****************************************** */




        /* ****************************************** Interaction ****************************************** */
        var crosshair = createCrosshair(this.pointPlot);
        var interaction = new Plottable.Interactions.Pointer();

        // Inside the plot environment
        interaction.onPointerMove(function(point) {
            // Refresh everything
            var nearestEntity = me.pointPlot.entityNearest(point);

            if(nearestEntity != undefined) {
                nearestEntity.selection.attr("opacity", 0.65);
                crosshair.drawAt(nearestEntity.position, me.pointPlot);
            } else {
                me.pointPlot.attr("opacity", 0.65);
                
            }
        })

        // Outside the plot environment
        interaction.onPointerExit(function() {
            // Reset everything
            me.pointPlot.attr("opacity", .65);
            crosshair.hide();
        });

        // If data is no available disable interactions
        if(data.length != 0) {
            // Attach interaction to plot
            interaction.attachTo(this.pointPlot);
        }

        // Crosshair creator function
        function createCrosshair(plot) {
            var crosshair = {};
            var crosshairContainer = plot.foreground().append("g").style("visibility", "hidden");
            crosshair.vLine = crosshairContainer.append("line")
                            .attr("stroke", highlighter)
                            .attr("y1", 0)
                            .attr("y2", plot.height());
            crosshair.circle = crosshairContainer.append("circle")
                            .attr("fill", highlighter)
                            //.attr("stroke-width",2)
                            //.attr("stroke", highlighter)
                            .attr("r", 3);
            crosshair.drawAt = function(p, plot) {
                crosshair.vLine.attr({
                    x1: p.x,
                    x2: p.x,
                    y1: 0,
                    y2: plot.height()
                });
                crosshair.circle.attr({
                    cx: p.x,
                    cy: p.y
                });
                crosshairContainer.style("visibility", "visible");
            }

            crosshair.hide = function() {
                crosshairContainer.style("visibility", "hidden");
            }

            return crosshair;
        }
        /* ****************************************** Interaction ****************************************** */
    



        /* ****************************************** Drilldown Window ****************************************** */
        var drillInteract = new Plottable.Interactions.Click();
        
        // Inside the plot environment
        drillInteract.onClick(function(point) {

            if(me.pointPlot.entitiesAt(point)[0] != null) {
                var plotEntity = me.pointPlot.entitiesAt(point)[0];
                var filters = {};
                if(me.chartType == 'chart') {
                    filters['grouping'] = formGrouping(me.groups, plotEntity);
                    filters['selection'] = formSelection(plotEntity);
                } else {
                    filters['timestamp'] = plotEntity.datum['x'];
                    filters['selection'] = formSelection(plotEntity);
                }
                if(dragbox != undefined) {
                    if(dragbox.bounds().topLeft.x == dragbox.bounds().bottomRight.x) {
                        me.openDrill({
                            filters: filters,
                            data: plotEntity.datum
                        });
                    }
                } else {
                    me.openDrill({
                        filters: filters,
                        data: plotEntity.datum
                    });
                }
            }
        })
        drillInteract.attachTo(this.pointPlot);


        var formGrouping = function(groups, plotEntity) {
            var _group = [];

            for(var i=0; i<groups.length; i++) {
                var entity = [];
                entity.push(groups[i]);
                entity.push(plotEntity.datum['x'] == null ? "null" : plotEntity.datum['x']);
                _group.push(entity);
            }

            return _group;
        }

        var formSelection = function(plotEntity) {
            var _selection = [];

            var entity = [];
            entity.push(me.selections);
            entity.push(plotEntity.datum['y']);
            entity.push(me.yellow);
            entity.push(plotEntity.datum['r']);
            _selection.push(entity);

            return _selection;
        }

        /* ****************************************** Drilldown Window ****************************************** */




        /* ****************************************** Legend Interaction ****************************************** */

        /* ****************************************** Legend Interaction ****************************************** */
        var toggle = function(plot, label) {
            //plot = Scatter
            //label = ["200"], ["404"]
            for(var i = 0; i < me.plainData.length; i++){
                if(label != me.plainData[i].color){
                    me.plainData[i].key = "unselected";
                    if(me.labelStack.indexOf(label) < 0) {
                        me.labelStack.push(label);
                    }
                
                } else {
                    me.plainData[i].key = "selected";
                    var index = me.labelStack.indexOf(label);
                    if(index > -1) {
                        me.labelStack.splice(index,1);
                    }
                }
            }
            plot.removeDataset(plot.datasets()[0]);

            me.legend.symbolOpacity(function(d) {
                return checker(d);
            });

            var checker = function(legend) {
                for(var i=0; i<me.selections.length; i++) {
                    if(me.legend == me.column[i]) {
                        if(me.plainData[i].key == "selected") {
                            return 0;
                        }
                        return 1;
                    }
                }
            }

            if(me.getProvider().getDashboard() || me.getProvider().getSearchTemplate())
                me.saveLegendState();
            includeDatasets(plot);
        };


        // var toggle = function(plot, label) {
        //     for(var i=0; i<me.selections.length; i++) {
        //         if(me.plainData[i].color == label) {
        //             //console.log(label)
        //             for(var j = 0; j < me.plainData.length ; j++){
        //                 if(me.plainData[j].key == "unselected") {
        //                     plot.removeDataset(me.plainData[j]);
        //                     //me.plainData[j].key = "selected";
                            
        //                     // Done for legend state preservation
        //                     if(me.labelStack.indexOf(label) < 0) {
        //                         me.labelStack.push(label);
        //                     }
        //                 debugger

        //                 } else {
        //                     plot.addDataset(me.plainData[j]);
        //                     me.plainData[j].key = "unselected";
        //                     plot.removeDataset(me.plainData[j]);
        //                     console.log(me.plainData[j])
        //                     // Done for legend state preservation
        //                     var index = me.labelStack.indexOf(label);
        //                     if(index > -1) {
        //                         me.labelStack.splice(index,1);
        //                     }
        //                 }
        //             }
        //             break;
        //         }
        //     }

        //     me.legend.symbolOpacity(function(d) {
        //         return checker(d);
        //     });

        //     // to enable legend symbol toggling
        //     var checker = function(legend) {
        //         for(var i=0; i<me.selections.length; i++) {
        //             if(me.legend == me.column[i]) {
        //                 if(me.plainData[i].key == "selected") {
        //                     return 0;
        //                 }
        //                 return 1;
        //             }
        //         }
        //     }

        //     if(me.getProvider().getDashboard() || me.getProvider().getSearchTemplate())
        //         me.saveLegendState();
        // }

        var interact = new Plottable.Interactions.Click();

        interact.onClick(function(point) {
            if(me.legend.entitiesAt(point)[0] !== undefined) {
                var selected = me.legend.entitiesAt(point)[0].datum;
                toggle(me.pointPlot, selected);
            }
        })

        interact.attachTo(this.legend);

        // Make corresponding plot highlight based upon hovered legend
        var highlightPlot = new Plottable.Interactions.Pointer();

        highlightPlot.onPointerMove(function(point) {
            if(me.legend.entitiesAt(point)[0] !== undefined) {
                me.pointPlot.entities().forEach(function(entity) {
                    entity.selection.attr('opacity', 0.65);
                });

                me.pointPlot.entities().forEach(function(entity) {
                    if(entity.dataset._metadata.name == me.legend.entitiesAt(point)[0].datum) {
                        entity.selection.attr('opacity', 0.65);
                    }
                });
            }
        })

        // Outside the legend environment
        highlightPlot.onPointerExit(function() {
            me.pointPlot.entities().forEach(function(entity) {
                entity.selection.attr("opacity", 0.65);
            })
        })
        highlightPlot.attachTo(this.legend);
        /* ****************************************** Legend Interaction ****************************************** */


        

        /* ****************************************** Zoom ****************************************** */
        // Check if response is time-chart or normal chart
        if(plottables.chart == 'timechart') {
            // First pzi should always be y-scale
            var ypzi = new Plottable.Interactions.PanZoom()
                .addYScale(yScale)
                .maxDomainExtent(yScale, Math.pow(10,15))
                .minDomainExtent(yScale, 1);
                
            ypzi.attachTo(yAxis);

            var xpzi = new Plottable.Interactions.PanZoom()
                .addXScale(xScale)
                .maxDomainExtent(xScale, rangeInMilli)
                .minDomainExtent(xScale, seconds * 500)
                .attachTo(xAxis);
        } else if(plottables.chart == 'chart') {
            var ypzi = new Plottable.Interactions.PanZoom()
                .addYScale(yScale)
                .maxDomainExtent(yScale, Math.pow(10,15))
                .minDomainExtent(yScale, 1);
                
            ypzi.attachTo(yAxis);
        }

        // Re-position crosshair when zoom operation occurs
        /*var zoomListener = new Plottable.Dispatchers.Mouse(this.getSVG());
        zoomListener.onWheel(function(point, wheelEvent) {
            var nearestEntity =me.linePlot.entityNearest(point);
            
            me.pointPlot.size(function(datum) {
                if(me.chartType == 'chart') {
                    for(var i=0; i<me.groups.length; i++) {
                        if(!(datum[me.groups[i]] === nearestEntity.datum[me.groups[i]]))
                            return pointSize;
                    }
                    return pointSize + 5;  
                } else {
                    return datum[me.groups] === nearestEntity.datum[me.groups] ? pointSize + 5 : pointSize;
                }
            });

            crosshair.drawAt(nearestEntity.position, me.pointPlot);
        });*/

        /* ****************************************** Zoom ****************************************** */    

        // Assign variables inside function scope to object scope
        this.xAxis = xAxis;
        this.yAxis = yAxis;
        this.group = group;
        this.legend = this.legend;
        this.xScale = xScale;
        this.yScale = yScale; // for y-Axis zoom interaction
        this.ypzi = ypzi; // for y-Axis zoom interaction
        this.seconds = seconds;

        // Tooltip Interactions
        this.addTooltip(this.pointPlot,"near");
    },

    updateTooltip: function (tip, closest) {
        var plottables = this.getPlottables();
        var tooltipString = "<table id = \"tooltip\">";

        this.chartType = plottables.chart;
        this.selections = plottables.yAxis[0];
        this.groups = plottables.xAxis;
        //console.log(closest);
        if(this.getAnimationMode()) {
            var x = closest.datum['x'],
                y = closest.datum['y'],
                diff = closest.datum['diff'];

            if((x === undefined) || (x === null) || (y === undefined) || (y === null)) {
                return;
            }

            if(this.groups === undefined) {
                return;
            }
            
            tooltipString += "<tr><th>" + Ext.htmlEncode(x) + ": </th>"
                + "<td>" + Ext.htmlEncode(y) + "</td></tr>";

            if(diff > 0) {
                tooltipString += "<tr><th>Difference: </th><td>+" + diff + "</td></tr></table>";
            } else if(diff < 0) {
                tooltipString += "<tr><th>Difference: </th><td style=\"color:#C64944;\">" + diff + "</td></tr></table>";
            }
            
            } else {
            if(this.chartType == 'chart') {
                for(var i=0; i<this.groups.length; i++) {
                    tooltipString += "<tr><th>" + Ext.htmlEncode(this.groups[i]) + ": </th>"
                    + "<td>" + Ext.htmlEncode(closest.datum[this.groups[i]]) + "</td></tr>";
                }    
            } else {
                tooltipString += "<tr><th>" + this.groups + ": </th>"
                + "<td>" + Ext.htmlEncode(closest.datum['x']) + "</td></tr>";
                
                tooltipString += "<tr><th>" + this.selections + ": </th>" 
                + "<td>" + Ext.htmlEncode(closest.datum['y']) + "</td></tr>";

                tooltipString += "<tr><th>" + this.yellow + ": </th>" 
                + "<td>" + Ext.htmlEncode(closest.datum['r']) + "</td></tr></table>";
            }
        }

        tip.setText(tooltipString);
    },

    onContainerResize: function () {
        this.chart.redraw();

        var me = this;

        setTimeout(function() {
            if(me.getAnimationMode()) {
                me.step_backward.attr('transform', function(d) {
                    return 'translate(' + (me.animationPointPlot.width() - 72) + ', 13)';
                });
                me.pause.attr('transform', function(d) {
                    return 'translate(' + (me.animationPointPlot.width() - 52) + ', 13)';
                });
                me.step_forward.attr('transform', function(d) {
                    return 'translate(' + (me.animationPointPlot.width() - 32) + ', 13)';
                });
                me.stop.attr('transform', function(d) {
                    return 'translate(' + (me.animationPointPlot.width() - 12) + ', 13)';
                });

                me.positionScalper(me._animationData);
            } else {
                if(me.getPlottables().chart == 'timechart') {
                    me.play && me.play.attr('transform', function(d) {
                        return 'translate(' + (me.pointPlot.width() - 12) + ', 13)';
                    });
                }
            }
        }, me.getTimeOutPeriod());
    },

    // formatDataForAnimation: function(data, prevData) {
    //     var plottables = this.getPlottables(),
    //         obj,
    //         result = []
    //         me = this;

    //     this.selections = [plottables.yAxis[0]];
    //     this.yellow = [plottables.yAxis[1]];
        
    //     this.column = plottables.column;
    //     //debugger
    //     this.column.forEach(function(c){
    //         obj = {};
    //         obj['x'] = c;
    //         obj['y'] = data[c][me.selections];
    //         obj['r'] = data[c][me.yellow];
    //         //console.log(obj);
    //     })
    //     result.push(obj);
    //     return result;

    //     // if(prevData === undefined) {
    //     //     this.selections.forEach(function(c) {
    //     //         obj = {};
    //     //         obj['x'] = c;
    //     //         if(data.hasOwnProperty(c)) {
    //     //             obj['y'] = data[c];
    //     //         } else {
    //     //             obj['y'] = 0;
    //     //         }
    //     //         obj['rdiff'] = 0;  
    //     //     });
    //     //     this.yellow.forEach(function(c){
    //     //         if(data.hasOwnProperty(c)) {
    //     //             obj['r'] = data[c];
    //     //         } else {
    //     //             obj['r'] = 0;
    //     //         }
    //     //     });
    //     //     result.push(obj);
    //     // } else {
    //     //     this.selections.forEach(function(c) {
    //     //         obj = {};

    //     //         obj['x'] = c;
    //     //         if(data.hasOwnProperty(c)) {
    //     //             obj['y'] = data[c];
    //     //         } else {
    //     //             obj['y'] = 0;
    //     //         }

    //     //         if(prevData.hasOwnProperty(c)) {
    //     //             obj['ydiff'] = obj['y'] - prevData[c];
    //     //         } else {
    //     //             obj['ydiff'] = obj['y'];
    //     //         }
    //     //         //console.log(result);
    //     //     });
    //     //     this.yellow.forEach(function(c){
    //     //         if(data.hasOwnProperty(c)){
    //     //             obj['r'] = data[c];
    //     //         } else {
    //     //             obj['r'] = 0;
    //     //         }

    //     //         if(prevData.hasOwnProperty(c)){
    //     //             obj['rdiff'] = obj['r'] - prevData[c];
    //     //         } else {
    //     //             obj['rdiff'] = obj['r'];
    //     //         }
    //     //     })
    //     // result.push(obj);
    //     // }
    //     // console.log(result);
    //     // return result;
    // },
    formatDataForAnimation: function(data, prevData) {
        var me = this;
        var plottables = this.getPlottables(),
            column = plottables.column,
            obj,
            temp,
            result = [];
        if(prevData == undefined){
            me.column.forEach(function(c){
                obj = {};
                obj['x'] = c;
                obj['y'] = data[c][plottables.yAxis[0]];
                obj['r'] = data[c][plottables.yAxis[1]];
                result.push(obj);
            })
            console.log(result)
        return result;
        } else {
            me.column.forEach(function(c){
                obj = {};
                obj['x'] = c;
                obj['y'] = prevData[c][plottables.yAxis[0]];
                obj['r'] = prevData[c][plottables.yAxis[1]];
                result.push(obj);
            })
            console.log(result);
        return result;
        }
        // debugger
        // if(prevData === undefined) {
        //     plottables.yAxis.forEach(function(g) {
        //         obj = {};

        //         obj['x'] = g.map(function(x) { return x ? x : "null"; }).join(', ');
        //         temp = g.map(function(x) { return x; }).join(',');
        //         if(data.hasOwnProperty(temp)) {
        //             obj['y'] = data[temp];
        //         } else {
        //             obj['y'] = {};
        //             column.forEach(function(c) {
        //                 obj['y'][c] = 0;
        //             });
        //         }
        //         obj['diff'] = {};
        //         column.forEach(function(c) {
        //             obj['diff'][c] = 0;
        //         });
                
        //         result.push(obj);
        //     });
        // } else {
        //     plottables.yAxis.forEach(function(g) {
        //         obj = {};

        //         obj['x'] = g.map(function(x) { return x ? x : "null"; }).join(', ');
        //         temp = g.map(function(x) { return x; }).join(',');
        //         if(data.hasOwnProperty(temp)) {
        //             obj['y'] = data[temp];
        //         } else {
        //             obj['y'] = {};
        //             column.forEach(function(c) {
        //                 obj['y'][c] = 0;
        //             });
        //         }

        //         if(prevData.hasOwnProperty(temp)) {
        //             obj['diff'] = me.subtract(obj['y'], prevData[temp]);
        //         } else {
        //             obj['diff'] = obj['y'];
        //         }
                
        //         result.push(obj);
        //     });
        // }

        // return result;
    },


    updateAnimation: function(data, prevData) {
        var me = this;

        this.counter++;

        if(this.counter > this.animData.length) {
            this.task.stop();
            this.repeatEnabled = true;
            me.changeMediaIcon('#timechart_pause', 'undo');
            me.changeMediaState('#timechart_step-backward', false);
            me.changeMediaState('#timechart_step-forward', false);
            return;
        }

        this._animationData = this.formatDataForAnimation(data, prevData);
        var datasets = [];

        datasets.push(new Plottable.Dataset(me._animationData));

        //this.animationLinePlot.datasets(datasets);
        this.animationPointPlot.datasets(datasets);
        this.animationBandPlot.datasets(datasets);

        setTimeout(function() {
            me.positionScalper(me._animationData);
        }, me.getTimeOutPeriod());

        if(Ext.isIE) {
            d3.select(this.getSVG()).select('#timechart_timestamp').text(function(d) {
                return '\u00A0' + data.timestamp_formatted;
            });
        } else {
            //console.log(data.timestamp_formatted);
            d3.select(this.getSVG()).select('#timechart_timestamp').html(function(d) {
                return '&nbsp;' + data.timestamp_formatted;
            });
        }

        setTimeout(function() {
            me.step_backward.attr('transform', function(d) {
                return 'translate(' + (me.animationPointPlot.width() - 72) + ', 13)';
            });
            me.pause.attr('transform', function(d) {
                return 'translate(' + (me.animationPointPlot.width() - 52) + ', 13)';
            });
            me.step_forward.attr('transform', function(d) {
                return 'translate(' + (me.animationPointPlot.width() - 32) + ', 13)';
            });
            me.stop.attr('transform', function(d) {
                return 'translate(' + (me.animationPointPlot.width() - 12) + ', 13)';
            });
        }, me.getTimeOutPeriod());
    },

    animateChart: function(data) {
        var me = this;
        var runner = new Ext.util.TaskRunner();

        var formattedData = this._animationData = this.formatDataForAnimation(data[0]);

        this.counter = 1;
        this.pauseEnabled = false;
        this.repeatEnabled = false;

        this.task = runner.newTask({
            run: function() {
                console.log(me.counter);
                me.updateAnimation(data[me.counter], data[me.counter - 1]);
            },
            interval: 4000,
            scope: me
        });

        this.task.start();

        if(this.animationGroup) {
            return;
        }

        var plottables = this.getPlottables(),
            column = [plottables.yAxis],
            defaultColor = "#6E4B7C",
            highlighter = "#6E4B7C",
            xScale,
            yScale,
            radius,
            xAxis,
            yAxis,
            pointSize = 7;

        this.yellow = [plottables.yAxis[0]];
        this.selections = [plottables.yAxis[1]];
        xScale = this.animationXScale = new Plottable.Scales.Category();
        xAxis = new Plottable.Axes.Category(xScale, 'bottom')
            .innerTickLength(0)
            .endTickLength(0)
            .tickLabelPadding(6)
            .addClass('logpoint-default-x-axis');

        yScale = this.animationYScale = new Plottable.Scales.Linear();
        yAxis = new Plottable.Axes.Numeric(yScale, 'left')
            .innerTickLength(0)
            .endTickLength(0)
            .formatter(new Plottable.Formatters.shortScale())
            .addClass('logpoint-default-y-axis');


            // .formatter(new Plottable.Formatters.shortScale()); // for 1000 => 1k representation

        //var gridLines = new Plottable.Components.Gridlines(xScale, yScale);
        var radii = {};
        //data[0][this.column[0]][me.selections]
        for(var i = 0 ; i < data.length; i++){
            radii[i] = data[i][(this.yellow)]
        };
        
        var rScale = new Plottable.Scales.Linear().autoDomain(radii).range([0, 40]);

        var bandPlot = new Plottable.Plots.Rectangle()
            .x(function(d, i, dataset) { return d.x; }, xScale)
            .y(0)
            .y2(function() { return bandPlot.height(); })
            .attr('fill', 'white')
            .attr('fill-opacity', 0.3);

        var pointPlot = new Plottable.Plots.Scatter()
            .x(function(d, i, dataset) { return d.x; }, xScale)
            .y(function(d, i, dataset) { return isNaN(d.y) ? 0 : d.y; }, yScale)
            .size(function(d, i, dataset) { return isNaN(d.r) ? 0 : d.r; }, yScale)
            .attr('opacity', 1)
            .attr('fill', defaultColor)
            .addClass('selectable');

        // var linePlot = new Plottable.Plots.Line()
        //     .x(function(d, i, dataset) { return d.x; }, xScale)
        //     .y(function(d, i, dataset) { return isNaN(d.y) ? 0 : d.y; }, yScale)
        //     .attr('stroke', defaultColor)
        //     .attr('opacity', 1)
        //     .attr('stroke-width', 1.5)
        //     .interpolator('cardinal')
        //     .animated(true)
        //     .animator(Plottable.Plots.Animator.MAIN,new Plottable.Animators.Easing().easingMode('quad').stepDuration(350));

        var interaction = new Plottable.Interactions.Pointer();
        
        interaction.onPointerMove(function(point) {
            var nearestEntity = pointPlot.entityNearest(point);

            if(nearestEntity) {
                pointPlot.entities().forEach(function(entity) {
                    entity.selection.attr('fill', 'white');
                });

                var nearestEntity = pointPlot.entityNearest(point);
                nearestEntity.selection.attr('fill', highlighter);
                
                pointPlot.size(function(datum) {
                    if(datum['x'] !== nearestEntity.datum['x']) {
                        //console.log(datum['x']);
                        return nearestEntity.datum['r'];
                    }
                    return nearestEntity.datum['r'] + 50;
                }, rScale);
            }
        })

        interaction.onPointerExit(function() {
            pointPlot.entities().forEach(function(entity) {
                entity.selection.attr('fill', 'white');
            });
            pointPlot.size(function(d, i, dataset) { return isNaN(d[dataset.metadata().radius]) ? 0 : d[dataset.metadata().radius] }, rScale);
        });

        //interaction.attachTo(pointPlot);

        var drillInteract = new Plottable.Interactions.Click();
        
        drillInteract.onClick(function(point) {
            if(pointPlot.entitiesAt(point)[0] != null) {
                var plotEntity = pointPlot.entitiesAt(point)[0],
                    filters = {};

                filters['selection'] = formSelection(plotEntity);

                me.openDrill({
                    filters: filters,
                    data: plotEntity.datum
                });
            }
        })

        //drillInteract.attachTo(pointPlot);

        var formSelection = function(plotEntity) {
            var entity = [];

            entity.push(plotEntity.datum.x);
            entity.push(plotEntity.datum.y);

            return [entity];
        }

        var dataset = new Plottable.Dataset(formattedData);
        //linePlot.addDataset(dataset);
        pointPlot.addDataset(dataset);
        bandPlot.addDataset(dataset);

        var animationGroup = new Plottable.Components.Group([pointPlot]);

        this.chart = new Plottable.Components.Table([
            [yAxis,     animationGroup],
            [null,      xAxis        ]
        ]);

        this.chart.renderTo(me.getSVG());

        this.addTooltip(pointPlot, 'near');

        this.step_backward = me.createMediaIcon(animationGroup, 'step-backward', 72);
        this.pause = me.createMediaIcon(animationGroup, 'pause', 52);
        this.step_forward = me.createMediaIcon(animationGroup, 'step-forward', 32);
        this.stop = me.createMediaIcon(animationGroup, 'stop', 12);
        me.showTimeInformation(animationGroup, data[0]);

        var i = 0;
        var scalperDrawer = function(scalperController) {
            var createScalper = function(scalperContainer, index) {
                scalperContainer.append('svg:text')
                    .attr('id', 'scalper-' + index)
                    .attr('font-family', 'FontAwesome')
                    .attr('font-size', 20);
            }
            //[plottables.yAxis].forEach(function(d) {
                createScalper(scalperController.container, i);
                i++;
            //});

            scalperController.show();
        }

        var createScalperContainer = function(plot) {
            var scalperController = {},
                scalperContainer = plot.foreground().append('g').style('visibility', 'hidden');

            scalperController.container = scalperContainer;

            scalperController.show = function() {
                scalperContainer.style('visibility', 'visible');
            }

            scalperController.hide = function() {
                scalperContainer.style('visibility', 'hidden');
            }

            return scalperController;
        }

        var scalperController = createScalperContainer(animationGroup);
        scalperDrawer(scalperController);

        setTimeout(function() {
            //console.log(me._animationData);
            me.positionScalper(me._animationData);
        }, me.getTimeOutPeriod());

        this.animationGroup = animationGroup;
        //this.animationLinePlot = linePlot;
        this.animationPointPlot = pointPlot;
        this.animationBandPlot = bandPlot;
        this.animationXaxis = xAxis;
        this.animationYaxis = yAxis;
        this.column = column;
    },

    positionScalper: function(data) {
        var me = this,
            selection;

        // data.forEach(function(d, i) {
        //     selection = d3.select(me.getSVG()).select('#scalper-' + i);
        //     var temp = me.animationYScale.scale(d.y);
        //     if(d.ydiff > 0) {
        //         selection.text(function() { return '\uf062'; })
        //             .attr('fill', '#4990A0')
        //             .attr('stroke', '#4990A0')
        //             .attr('fill-opacity', 0.5)
        //             .attr({
        //                 x: me.animationXScale.scale(d.x) - 9,
        //                 y: (temp > 15) ? (temp - 1) : (temp + 16)
        //             });
        //     } else if(d.ydiff < 0) {
        //         selection.text(function() { return '\uf063'; })
        //             .attr('fill', '#C64944')
        //             .attr('stroke', '#C64944')
        //             .attr('fill-opacity', 0.5)
        //             .attr({
        //                 x: me.animationXScale.scale(d.x) - 9,
        //                 y: me.animationYScale.scale(d.y) + 16
        //             });
        //     } else {
        //         selection.text(function() { return ''; })
        //             .attr({
        //                 x: me.animationXScale.scale(d.x) - 9,
        //                 y: me.animationYScale.scale(d.y)
        //             });
        //     }
        // });
    },

    handlePlayButtonClick: function(cmp) {
        var me = this;

        if(this.legendState) {
            this.legend.detach();
        }
        this.group.detach();
        this.xAxis.detach();
        this.yAxis.detach();

        this.animData = Ext.clone(this._data);
        if(this.animationGroup) {
            this.animateChart(this.animData);
            this.chart = new Plottable.Components.Table([
                [this.animationYaxis,   this.animationGroup],
                [null,                  this.animationXaxis]
            ]);

            this.chart.renderTo(this.getSVG());

            if(Ext.isIE) {
                d3.select(this.getSVG()).select('#timechart_timestamp').text(function(d) {
                    return '\u00A0' + me.animData[0]['timestamp_formatted'];
                });
            } else {
                d3.select(this.getSVG()).select('#timechart_timestamp').html(function(d) {
                    return '&nbsp;' + me.animData[0]['timestamp_formatted'];
                });
            }

            this.step_backward.attr('transform', function(d) {
                return 'translate(' + (me.animationPointPlot.width() - 72) + ', 13)';
            });
            this.pause.attr('transform', function(d) {
                return 'translate(' + (me.animationPointPlot.width() - 52) + ', 13)';
            });
            this.step_forward.attr('transform', function(d) {
                return 'translate(' + (me.animationPointPlot.width() - 32) + ', 13)';
            });
            this.stop.attr('transform', function(d) {
                return 'translate(' + (me.animationPointPlot.width() - 12) + ', 13)';
            });
        } else {
            this.animateChart(this.animData);
        }
        this.attachDetachTooltip(this.pointPlot, true);
        this.attachDetachTooltip(this.animationPointPlot);
        this.setAnimationMode(true);
    },

    handlePauseButtonClick: function(cmp) {
        var me = this;

        if(this.repeatEnabled) {
            this.repeatEnabled = false;
            this.counter = 0;
            this.task.restart();
            this.changeMediaIcon(cmp, 'pause');
            this.changeMediaState('#timechart_step-backward', true);
            this.changeMediaState('#timechart_step-forward', true);
            return;
        }
        if(!this.pauseEnabled) {
            this.pauseEnabled = true;
            this.task.stop();
            this.changeMediaIcon(cmp, 'play');
        } else {
            this.pauseEnabled = false;
            this.task.start();
            this.changeMediaIcon(cmp, 'pause');
        }
        this.changeMediaState('#timechart_step-backward', true);
        this.changeMediaState('#timechart_step-forward', true);
    },

    handleStopButtonClick: function() {
        var me = this;

        this.task.destroy();
        this.resetMediaState();
        this.animationGroup.detach();
        this.animationXaxis.detach();
        this.animationYaxis.detach();
        if(this.legendState) {
            this.chart = new Plottable.Components.Table([
                [this.yAxis,   this.group,           this.legend],
                [null,         this.xAxis,           null]
            ]);
        } else {
            this.chart = new Plottable.Components.Table([
                [this.yAxis,   this.group],
                [null,         this.xAxis]
            ]);
        }

        this.chart.rowPadding(2);
        this.chart.renderTo(this.getSVG());
        this.attachDetachTooltip(this.pointPlot);
        this.attachDetachTooltip(this.animationPointPlot, true);
        this.play.attr('transform', function(d) {
            return 'translate(' + (me.pointPlot.width() - 12) + ', 13)';
        });
        this.setAnimationMode(false);
    },

    handleStepBackwardButtonClick: function(cmp) {
        var me = this;

        if(this.repeatEnabled) {
            this.repeatEnabled = false;
        }
        this.pauseEnabled = true;
        this.task.stop();
        this.changeMediaIcon('#timechart_pause', 'play');
        this.counter -= 2;
        if(this.counter < 0) {
            this.counter = 0;
            this.changeMediaState(d3.select(cmp), false);
            return;
        }
        this.changeMediaState('#timechart_step-forward', true);
        this.updateAnimation(this.animData[this.counter], this.animData[this.counter - 1]);
    },

    handleStepForwardButtonClick: function(cmp) {
        var me = this;

        this.pauseEnabled = true;
        this.task.stop();                    
        if(this.animData.length <= this.counter) {
            this.repeatEnabled = true;
            this.changeMediaState(d3.select(cmp), false);
            this.changeMediaIcon('#timechart_pause', 'undo');
            return;
        } else {
            this.changeMediaIcon('#timechart_pause', 'play');
        }
        this.changeMediaState('#timechart_step-backward', true);
        this.updateAnimation(this.animData[this.counter], this.animData[this.counter - 1]);
    },

    initTimeOutPeriod: function() {
        if(Ext.isChrome) {
            this.setTimeOutPeriod(10);
        } else if(Ext.isOpera) {
            this.setTimeOutPeriod(300);
        } else if(Ext.isIE) {
            this.setTimeOutPeriod(500);
        } else if(Ext.isSafari) {
            this.setTimeOutPeriod(300);
        } else {
            this.setTimeOutPeriod(100);
        }
    }
})
