define ['underscore'], (_) ->

    channels = {}

    mediator =
        # If `once` is true, immediately unsubscribe after it's first
        # invocation.
        subscribe: (channel, _handler, once) ->
            channels[channel] ?= []
            if once
                handler = ->
                    # Unsubscribe immediately, so no downstream invocations
                    # occur
                    mediator.unsubscribe channel, handler, true
                    _handler.apply null, arguments
            else
                handler = _handler
            channels[channel].push handler

        publish: (channel, args...) ->
            if not (handlers = channels[channel]) then return
            for handler in handlers
                # Catch any errors, allow all handlers to finish prior to
                # throwing the exception.
                try
                    if handler then handler args...
                catch error
                    setTimeout -> throw error
            setTimeout -> channels[channel] = _.compact handlers
            return

        unsubscribe: (channel, handler, defer) ->
            if not (handlers = channels[channel]) then return
            if (idx = handlers.indexOf handler) >= 0
                # Defer to ensure mid-iteration in publish is not broken
                if defer then handlers[idx] = null else handlers.splice(idx, 1)

    return mediator
