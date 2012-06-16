// Generated by CoffeeScript 1.3.3
var __hasProp = {}.hasOwnProperty,
  __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; },
  __slice = [].slice,
  __bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; };

define(['underscore', 'backbone'], function(_, Backbone) {
  var DataContext, DataContextNode, DataContexts, isBranch, isComposite, isCondition;
  isBranch = function(attrs) {
    var _ref;
    return (attrs.type === 'and' || attrs.type === 'or') && ((_ref = attrs.children) != null ? _ref.length : void 0) >= 2;
  };
  isCondition = function(attrs) {
    return attrs.operator && attrs.id && attrs.value !== void 0;
  };
  isComposite = function(attrs) {
    return attrs.composite === true && attrs.id;
  };
  DataContextNode = (function(_super) {

    __extends(DataContextNode, _super);

    function DataContextNode() {
      return DataContextNode.__super__.constructor.apply(this, arguments);
    }

    DataContextNode.prototype.validate = function(attrs) {
      var key, value;
      if (isBranch(attrs) || isCondition(attrs) || isComposite(attrs)) {
        return;
      }
      for (key in attrs) {
        value = attrs[key];
        if (value !== void 0) {
          return 'Unknown node type';
        }
      }
    };

    DataContextNode.prototype.toJSON = function() {
      var json;
      if (this.isBranch()) {
        json = {
          type: this.get('type'),
          children: _.map(this.get('children'), function(model) {
            return model.toJSON();
          })
        };
      } else {
        json = DataContextNode.__super__.toJSON.apply(this, arguments);
      }
      return json;
    };

    DataContextNode.prototype.isRoot = function() {
      return !(this.parent != null);
    };

    DataContextNode.prototype.isEmpty = function() {
      return _.isEmpty(this.attributes);
    };

    DataContextNode.prototype.isBranch = function() {
      return isBranch(this.attributes);
    };

    DataContextNode.prototype.isCondition = function() {
      return isCondition(this.attributes);
    };

    DataContextNode.prototype.isComposite = function() {
      return isComposite(this.attributes);
    };

    DataContextNode.prototype.siblings = function() {
      if (this.isRoot()) {
        return false;
      } else {
        return _.without(this.parent.get('children'), this);
      }
    };

    DataContextNode.prototype.promote = function() {
      var children, nodes, type,
        _this = this;
      nodes = 1 <= arguments.length ? __slice.call(arguments, 0) : [];
      if (nodes.length === 0) {
        throw new Error('At least one node must be supplied');
      }
      if (this.isRoot()) {
        type = 'and';
      } else {
        type = this.parent.get('type') === 'and' ? 'or' : 'and';
      }
      children = _.map([this.attributes].concat(__slice.call(nodes)), function(attrs) {
        return DataContextNode.parseAttrs(attrs, _this);
      });
      this.clear({
        slient: true
      });
      this.set({
        type: type,
        children: children
      });
      return this;
    };

    DataContextNode.prototype.demote = function() {
      if (this.isRoot()) {
        return false;
      }
      if (this.parent.isRoot()) {
        if (this.siblings().length === 0) {
          this.parent.clear({
            silent: true
          });
          this.parent.set(this.attributes);
          return this.parent;
        }
        return false;
      }
      this.parent.parent.get('children').push(this.remove());
      return this;
    };

    DataContextNode.prototype.add = function() {
      var children, nodes,
        _this = this;
      nodes = 1 <= arguments.length ? __slice.call(arguments, 0) : [];
      if (!this.isBranch()) {
        throw new Error('Node is not a branch. Use "promote" to convert it into one');
      }
      (children = this.get('children')).push.apply(children, _.map(nodes, function(attrs) {
        return DataContextNode.parseAttrs(attrs, _this);
      }));
      return this;
    };

    DataContextNode.prototype.remove = function() {
      var children, idx;
      if (this.isRoot()) {
        this.clear();
      } else {
        children = this.parent.get('children');
        if ((idx = children.indexOf(this)) >= 0) {
          children.splice(idx, 1)[0];
          if (children.length === 1) {
            children[0].demote();
          }
        }
      }
      return this;
    };

    return DataContextNode;

  })(Backbone.Model);
  DataContextNode.parseAttrs = function(attrs, parent, callback) {
    var children, node;
    if (!attrs) {
      node = new DataContextNode;
    } else if (attrs instanceof DataContextNode) {
      node = attrs;
    } else if (isBranch(attrs)) {
      node = new DataContextNode({
        type: attrs.type
      });
      children = _.map(attrs.children, function(_attrs) {
        return DataContextNode.parseAttrs(_attrs, node, callback);
      });
      node.set({
        children: children
      });
    } else if (isCondition(attrs)) {
      node = new DataContextNode(attrs);
    } else if (isComposite(attrs)) {
      node = new DataContextNode(attrs);
    } else {
      throw new Error('Unknown node type');
    }
    if (parent) {
      node.parent = parent;
    }
    if (typeof callback === "function") {
      callback(node);
    }
    return node;
  };
  DataContextNode.updateAttrs = function(node, attrs) {
    var children, i, _attrs, _i, _len, _ref, _results;
    if (node.isBranch()) {
      children = node.get('children');
      _ref = attrs.children;
      _results = [];
      for (i = _i = 0, _len = _ref.length; _i < _len; i = ++_i) {
        _attrs = _ref[i];
        _results.push(DataContextNode.updateAttrs(children[i], _attrs));
      }
      return _results;
    } else {
      return node.set(attrs);
    }
  };
  DataContext = (function(_super) {

    __extends(DataContext, _super);

    function DataContext() {
      this._deferenceNode = __bind(this._deferenceNode, this);

      this._cacheNode = __bind(this._cacheNode, this);

      this.parse = __bind(this.parse, this);
      return DataContext.__super__.constructor.apply(this, arguments);
    }

    DataContext.prototype.initialize = function() {
      var _ref;
      return (_ref = this.nodes) != null ? _ref : this.nodes = {};
    };

    DataContext.prototype.url = function() {
      if (this.isNew()) {
        return DataContext.__super__.url.apply(this, arguments);
      } else {
        return this.get('url');
      }
    };

    DataContext.prototype.parse = function(resp) {
      if (resp) {
        if (!this.node) {
          this.nodes = {};
          this.node = DataContextNode.parseAttrs(resp.json, null, this._cacheNode);
        } else {
          DataContextNode.updateAttrs(this.node, resp.json);
        }
      }
      return resp;
    };

    DataContext.prototype.toJSON = function() {
      var attrs;
      attrs = DataContext.__super__.toJSON.apply(this, arguments);
      if (this.node) {
        attrs.json = this.node.toJSON();
      }
      return attrs;
    };

    DataContext.prototype.isRoot = function() {
      return this.node.isRoot();
    };

    DataContext.prototype.isEmpty = function() {
      return this.node.isEmpty();
    };

    DataContext.prototype.isBranch = function() {
      return this.node.isBranch();
    };

    DataContext.prototype.isCondition = function() {
      return this.node.isCondition();
    };

    DataContext.prototype.isComposite = function() {
      return this.node.isComposite();
    };

    DataContext.prototype._cacheNode = function(node) {
      var cache;
      if (node.id) {
        if (!(cache = this.nodes[node.id])) {
          cache = this.nodes[node.id] = [];
        }
        if (cache.indexOf(node) === -1) {
          return cache.push(node);
        }
      }
    };

    DataContext.prototype._deferenceNode = function(node) {
      var cache, idx;
      if ((cache = this.nodes[node.id]) && (idx = cache.indexOf(node)) >= 0) {
        return cache.splice(idx, 1);
      }
    };

    DataContext.prototype.getNodes = function(id) {
      return this.nodes[id] || [];
    };

    DataContext.prototype.promote = function() {
      var node, nodes, _ref;
      node = arguments[0], nodes = 2 <= arguments.length ? __slice.call(arguments, 1) : [];
      if (node === null) {
        (_ref = this.node).promote.apply(_ref, nodes);
      } else {
        node.promote.apply(node, nodes);
      }
      return this.save();
    };

    DataContext.prototype.demote = function(node) {
      node.demote();
      return this.save();
    };

    DataContext.prototype.add = function() {
      var node, nodes, _i, _len, _ref;
      node = arguments[0], nodes = 2 <= arguments.length ? __slice.call(arguments, 1) : [];
      if (!node) {
        if (this.node.isEmpty()) {
          this.node = nodes[0];
          this._cacheNode(this.node);
        } else {
          node = this.node;
        }
      }
      if (node) {
        node.add.apply(node, nodes);
        _ref = node.get('children');
        for (_i = 0, _len = _ref.length; _i < _len; _i++) {
          node = _ref[_i];
          this._cacheNode(node);
        }
      }
      return this.save();
    };

    DataContext.prototype.remove = function(node) {
      node = node || this.node;
      node.remove();
      if (!node.isRoot()) {
        this._deferenceNode(node);
      }
      return this.save();
    };

    return DataContext;

  })(Backbone.Model);
  DataContexts = (function(_super) {

    __extends(DataContexts, _super);

    function DataContexts() {
      return DataContexts.__super__.constructor.apply(this, arguments);
    }

    DataContexts.prototype.model = DataContext;

    DataContexts.prototype.getSession = function() {
      return (this.filter(function(model) {
        return model.get('session');
      }))[0];
    };

    return DataContexts;

  })(Backbone.Collection);
  return {
    DataContextNode: DataContextNode,
    DataContext: DataContext,
    DataContexts: DataContexts
  };
});