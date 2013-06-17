define [
    '../../core'
    '../base'
    './nodes'
], (c, base, nodes) ->

    contextNodeModels =
        branch: nodes.BranchNodeModel
        condition: nodes.ConditionNodeModel
        composite: nodes.CompositeNodeModel


    # Returns the node type for attrs or throws an error if none can be
    # determined
    getContextNodeType = (attrs, options) ->
        if attrs instanceof nodes.ContextNodeModel
            return attrs.nodeType
        for type, model of contextNodeModels
            if not model::validate.call(attrs, attrs, options)
                return type
        throw new nodes.ContextNodeError 'Unknown context node type'


    # Class-level method for create a node instance of the specified type
    nodes.ContextNodeModel.create = (type, attrs, options) ->
        # No type provided, infer the type and validate
        if typeof type is 'object'
            options = attrs
            attrs = type
            type = getContextNodeType(attrs, options)
        if not (klass = contextNodeModels[type])?
            throw new nodes.ContextNodeError 'Unknown context node type'
        return new klass(attrs, options)


    class ContextModel extends base.Model
        rootEventPrefix: 'root'

        constructor: (attrs, options={}) ->
            @root = new nodes.BranchNodeModel

            # Proxy events from the root node through the context model
            @listenTo @root, 'all', (event, args...) =>
                @trigger "#{ @rootEventPrefix }:#{ event }", args...

            options.parse = true
            super(attrs, options)

        initialize: ->

            @on 'request', ->
                @pending()
                c.publish c.CONTEXT_SYNCING, @

            @on 'sync', ->
                @resolve()
                c.publish c.CONTEXT_SYNCED, @, 'success'

            @on 'error', ->
                @resolve()
                c.publish c.CONTEXT_SYNCED, @, 'error'

            @on 'change', ->
                c.publish c.CONTEXT_CHANGED, @

            c.subscribe c.CONTEXT_PAUSE, (id) =>
                if @id is id or not id and @isSession()
                    @pending()

            c.subscribe c.CONTEXT_RESUME, (id) =>
                if @id is id or not id and @isSession()
                    @resolve()

            c.subscribe c.CONTEXT_CLEAR, (id) =>
                if @id is id or not id and @isSession()
                    @root.destroy()

            c.subscribe c.CONTEXT_SAVE, (id, source) =>
                if @id is id or not id and @isSession()
                    @save()

            @resolve()

        parse: (resp) =>
            if (attrs = resp.json)?
                copy = c.$.extend(true, {}, attrs)

                # This is for legacy responses where the root node has not
                # been correctly defined
                if attrs.concept? or attrs.field?
                    @root.children.add(attrs)
                else
                    @root.set(attrs, remove: false, save: true)
                delete resp.json
            super(resp)

        toJSON: (options={}) ->
            attrs = super
            @root.save()
            attrs.json = @root.stableAttributes
            return attrs

        isSession: ->
            @get 'session'

        isArchived: ->
            @get 'archived'

        # Root node proxy methods
        isEnabled: ->
            @root.isEnabled()

        enable: ->
            @root.enable()

        disable: ->
            @root.disable()


    class ContextCollection extends base.Collection
        model: ContextModel

        url: ->
            c.getSessionUrl('contexts')

        initialize: ->
            super
            c.subscribe c.SESSION_OPENED, =>
                @fetch(reset: true).done =>
                    @ensureSession()
                    @resolve()
            c.subscribe c.SESSION_CLOSED, => @reset()

        getSession: ->
            (@filter (model) -> model.get 'session')[0]

        hasSession: ->
            !!@getSession()

        ensureSession: ->
            if not @hasSession()
                defaults = session: true
                defaults.json = c.getOption('defaults.context')
                @create defaults


    { ContextModel, ContextCollection }
