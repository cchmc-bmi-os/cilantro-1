/* global define */

define([
    'jquery',
    'underscore',
    'backbone',
    '../core',
    './base',
    './field',
    '../query_aware'
], function($, _, Backbone, c, base, field, query_aware) {

    var updateQueryWhenSynced = function() {
        this.fields.fetch();
        reloadWorkspace();
    }

    var reloadWorkspace = function() {
        console.log(this.id);
        setTimeout(function() {
            $('li.active a').trigger("click");
        }, 500);

    }

    var Concept = base.Model.extend({
        constructor: function() {
            this.fields = new field.FieldCollection();
            base.Model.prototype.constructor.apply(this, arguments);
        },

        initialize: function() {
            base.Model.prototype.initialize.call(this, arguments);

            // Fetch the field data the first time a concept receives focus
            c.on(c.CONCEPT_FOCUS, function(id) {
                if (this.id !== id) return;

                // RELOAD EVERY TIME CONCEPT GETS FOCUS
                // IF FIELDS AREN'T LOADED YET (CONCEPT IS NEW), FETCH WITH RESET TRUE
                // OTHERWISE JUST FETCH (RESET=TRUE LEADS TO DUPLICATE QUERY VIEWS AND OTHER BUGS)
                if (this.fields.length === 0) {
                    this.fields.fetch({reset: true});
                } else {
                    this.fields.fetch();
                }
                
                //RELOAD WHENEVER THE QUERY AWARE RADIO TOGGLE IS CHANGED
                $('.query-aware-selector-region').show();
                $('.select-query-aware').unbind().click({model:this}, function(event) {
                    $('.select-query-aware').removeClass('btn-primary');
                    $(this).addClass('btn-primary');
                    event.data.model.fields.fetch();
                    reloadWorkspace();
                });

                // RELOAD EVERY TIME THE CONTEXT IS CHANGED
                c.off(c.CONTEXT_SYNCED, updateQueryWhenSynced);     // remove any existing listeners
                c.on(c.CONTEXT_SYNCED, updateQueryWhenSynced, this);    // add listener for this concept

            }, this);
        },

        parse: function(resp, options) {
            base.Model.prototype.parse.call(this, resp, options);

            var _this = this;

            // Set the endpoint for related fields
            this.fields.url = function() {
                return _this.links.fields;
            };

            // Should only be falsy on a PUT request
            if (!resp) return;

            // Response has the fields data embedded
            if (resp.fields) {
                this.fields.set(resp.fields, options);
                delete resp.fields;
            }

            return resp;
        }
    });


    var BaseConcepts = base.Collection.extend({
        model: Concept,

        // Perform a remote search on this collection
        search: function(query, handler) {
            var url = _.result(this, 'url');
            return Backbone.ajax({
                url: url,
                data: {
                    query: query,
                    brief: 1
                },
                dataType: 'json',
                success: function(resp) {
                    handler(resp);
                }
            });
        }
    });


    var Concepts = BaseConcepts.extend({
        constructor: function() {
            this.queryable = new BaseConcepts();
            this.viewable = new BaseConcepts();

            var _this = this;

            this.queryable.url = function() {
                return _.result(_this, 'url');
            };

            this.viewable.url = function() {
                return _.result(_this, 'url');
            };

            BaseConcepts.prototype.constructor.apply(this, arguments);
        },

        initialize: function() {
            // Update the sub-collections with the specific sets of models
            this.on('add remove reset', function() {
                this.queryable.reset(this.filter(function(model) {
                    return !!model.get('queryable') || !!model.get('queryview');
                }));

                this.viewable.reset(this.filter(function(model) {
                    return !!model.get('viewable') || !!model.get('formatter_name');
                }));
            });
        }
    });


    return {
        Concept: Concept,
        Concepts: Concepts
    };

});
