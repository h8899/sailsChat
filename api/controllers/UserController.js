module.exports = {

    // Create a new user and tell the world about them.
    // This will be called every time a socket connects, so that each socket
    // represents one user--this is so that it's easy to demonstrate inter-user
    // communication by opening a bunch of tabs or windows.  In the real world,
    // you'd want multiple tabs to represent the same logged-in user.
    announce: function (req, res) {

        // Get the socket ID from the request
        var socketId = sails.sockets.id(req);


        // Create the session.users hash if it doesn't exist already
        req.session.users = req.session.users || {};

        if (req.session.me) {
            User.findOne({
                id: req.session.me
            }).exec(function (err, user) {
                if (err) {
                    return res.serverError(err);
                }

                // Save this user in the session, indexed by their socket ID.
                // This way we can look the user up by socket ID later.
                req.session.users[socketId] = user;

                // Subscribe the connected socket to custom messages regarding the user.
                // While any socket subscribed to the user will receive messages about the
                // user changing their name or being destroyed, ONLY this particular socket
                // will receive "message" events.  This allows us to send private messages
                // between users.
                User.subscribe(req, req.session.me, 'message');

                // Get updates about users being created
                User.watch(req);

                // Get updates about rooms being created
                Room.watch(req);

                // Publish this user creation event to every socket watching the User model via User.watch()
                User.publishCreate(user, req);
                console.log(user.id);
                res.json(user);

            });
        } else {
            res.redirect('/login');
        }


    },

    tag: function (req, res) {

        var socketId = sails.sockets.id(req.socket);
        // Use that ID to look up the user in the session
        // We need to do this because we can have more than one user
        // per session, since we're creating one user per socket
        User.findOne({name: req.param('to')}).exec(function (err1, receiver) {
            User.findOne(req.session.users[socketId].id).exec(function (err, sender) {
                // Publish a message to that user's "room".  In our app, the only subscriber to that
                // room will be the socket that the user is on (subscription occurs in the onConnect
                // method of config/sockets.js), so only they will get this message.
                if (err1) {
                    return res.serverError(err1);
                } else if (err2) {
                    return res.serverError(err2);
                }
                User.message(receiver.id, {
                    tag: true,
                    from: sender,
                    roomId: req.param['roomId']
                });
            });
        });
    },

    login: function (req, res) {

        // See `api/responses/login.js`
        return res.login({
            email: req.param('email'),
            password: req.param('password'),
            successRedirect: '/',
            invalidRedirect: '/login'
        });
    },


    /**
     * `UserController.logout()`
     */
    logout: function (req, res) {

        // "Forget" the user from the session.
        // Subsequent requests from this user agent will NOT have `req.session.me`.
        req.session.me = null;

        // If this is not an HTML-wanting browser, e.g. AJAX/sockets/cURL/etc.,
        // send a simple response letting the user agent know they were logged out
        // successfully.
        if (req.wantsJSON) {
            return res.ok('Logged out successfully!');
        }

        // Otherwise if this is an HTML-wanting browser, do a redirect.
        return res.redirect('/');
    },


    /**
     * `UserController.signup()`
     */
    signup: function (req, res) {

        // Attempt to signup a user using the provided parameters
        User.signup({
            name: req.param('name'),
            email: req.param('email'),
            password: req.param('password')
        }, function (err, user) {
            // res.negotiate() will determine if this is a validation error
            // or some kind of unexpected server error, then call `res.badRequest()`
            // or `res.serverError()` accordingly.
            if (err) return res.negotiate(err);

            // Go ahead and log this user in as well.
            // We do this by "remembering" the user in the session.
            // Subsequent requests from this user agent will have `req.session.me` set.
            req.session.me = user.id;

            // If this is not an HTML-wanting browser, e.g. AJAX/sockets/cURL/etc.,
            // send a 200 response letting the user agent know the signup was successful.
            if (req.wantsJSON) {
                return res.ok('Signup successful!');
            }

            // Otherwise if this is an HTML-wanting browser, redirect to /.
            return res.redirect('/');
        });
    }
}