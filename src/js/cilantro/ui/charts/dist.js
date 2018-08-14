/* global define */

define([
    'jquery',
    'underscore',
    '../base',
    './core',
    './utils'
], function($, _, base, charts, utils) {

    var ChartLoading = base.LoadView.extend({
        message: 'Chart loading...'
    });

    var FieldChart = charts.Chart.extend({
        template: 'charts/chart',

        loadView: ChartLoading,

        ui: {
            chart: '.chart',
            heading: '.heading',
            status: '.heading .status'
        },

	events: {
	    'form:refresh_selected @ui.chart': 'refreshSelected'
	},

	refreshDelay: 300,

        initialize: function() {
            _.bindAll(this, 'chartClick', 'setValue');
        },

        showLoadView: function () {
            var view = new this.loadView();
            view.render();
            this.ui.chart.html(view.el);
        },

	/*
	 * Update highlighted bar state
	 */
	switchSelect: function(chart, serie, value_x, selected) {
	    if( value_x != "" ) {
	    	bar = chart.series[ serie ].points.find(function(p) { 
	    	    return p.values[0] == value_x 
	    	});
	    	// chart.series[ serie ].points[ bar_x ].select(selected, true);
		if ( typeof(bar) !== "undefined" ) {
	    	    bar.select(selected, true);
		}
	    }
	},

	/* 
	 * Unselect any selected bar and select those corresonponding to range control values 
	 */
	refreshSelected: function(event, options) {
	    var chart = this.chart;
	    var index = 0;

	    // Unselect everything
	    this.chart.series.forEach( function(serie) {
		serie.points.forEach( function(point) {
		    point.select(false);
		});
	    } );

	    // If the graph is used with a range control
	    this.switchSelect(chart, index, options.values[0], true);
	    this.switchSelect(chart, index, options.values[1], true);
	},

	/* 
	 * Update value in range control when chart is clicked 
	 */
        chartClick: function(event) {
	    options = {};
	    options['bar_x'] = event.point.x;
	    options['serie_index'] = event.point.series.index;
	    options['chart'] = this.chart;
	    this.ui.chart.trigger('chart:click', options); // send to form
        },

        interactive: function(options) {
            var type;

            if (options.chart) {
                type = options.chart.type;
            }

            if (type === 'pie' || (type === 'column')) {
                return true;
            }

            return false;
        },

        getChartOptions: function(resp) {
            var options = utils.processResponse(resp, [this.model]);

            if (options.clustered) {
                this.ui.status.text('Clustered').show();
            }
            else {
                this.ui.status.hide();
            }

            if (this.interactive(options)) {
                this.setOption('plotOptions.series.events.click', this.chartClick);
            }

            $.extend(true, options, this.chartOptions);
            options.chart.renderTo = this.ui.chart[0];

            return options;
        },

        getField: function() {
            return this.model.id;
        },

        getValue: function() {
            return _.pluck(this.chart.getSelectedPoints(), 'category');
        },

        getOperator: function() {
            return 'in';
        },

        removeChart: function() {
            charts.Chart.prototype.removeChart.apply(this, arguments);

            if (this.node) {
                this.node.destroy();
            }
        },

        onRender: function() {
            // Explicitly set the width of the chart so Highcharts knows
            // how to fill out the space. Otherwise if this element is
            // not in the DOM by the time the distribution request is finished,
            // the chart will default to an arbitary size.
            if (this.options.parentView) {
                this.ui.chart.width(this.options.parentView.$el.width());
            }

            this.showLoadView();

            var _this = this;
            this.model.distribution(
                function(resp) {
                    if (_this.isClosed) return;

                    resp.data = _.sortBy(resp.data, function(element) {
                        return element.values[0];
                    });

                    var options = _this.getChartOptions(resp);

                    if (resp.size) {
                        _this.renderChart(options);
                    }
                    else {
                        _this.showEmptyView(options);
                    }
              });


	    setTimeout(function() {
		_this.ui.chart.trigger("chart:refresh_selected") // to
	    }, _this.refreshDelay); // wait for the chart to be actually there
        },

        setValue: function(value) {
            if (!_.isArray(value)) value = [];

            if (this.chart !== null) {
                var points = this.chart.series[0].points,
                    point,
                    select;

                for (var i = 0; i < points.length; i++) {
                    point = points[i];
                    select = false;

                    if (point.name !== null || value.indexOf(point.category) !== -1) {
                        select = true;
                    }

                    point.select(select, true);
                }
            }
        }
    });


    return {
        FieldChart: FieldChart
    };

});
