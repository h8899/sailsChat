module.exports = {

  // Create a new user and tell the world about them.
  // This will be called every time a socket connects, so that each socket
  // represents one user--this is so that it's easy to demonstrate inter-user
  // communication by opening a bunch of tabs or windows.  In the real world,
  // you'd want multiple tabs to represent the same logged-in user.
  announce: function(req, res) {

    // Get the socket ID from the reauest
    var socketId = sails.sockets.id(req);
    // Get the session from the request
    var session = req.session;

    // Create the session.users hash if it doesn't exist already
    session.users = session.users || {};

    User.create({
      name: 'unknown',
      socketId: socketId
    }).exec(function(err, user) {
      if (err) {
        return res.serverError(err);
      }

      // Save this user in the session, indexed by their socket ID.
      // This way we can look the user up by socket ID later.
      session.users[socketId] = user;

      // Subscribe the connected socket to custom messages regarding the user.
      // While any socket subscribed to the user will receive messages about the
      // user changing their name or being destroyed, ONLY this particular socket
      // will receive "message" events.  This allows us to send private messages
      // between users.
      User.subscribe(req, user.id, 'message');

      // Get updates about users being created
      User.watch(req);

      // Get updates about rooms being created
      Room.watch(req);

      // Publish this user creation event to every socket watching the User model via User.watch()
      User.publishCreate(user, req);

      res.json(user);

    });


  },

  tag: function(req, res) {

      var socketId = sails.sockets.id(req.socket);
      // Use that ID to look up the user in the session
      // We need to do this because we can have more than one user
      // per session, since we're creating one user per socket
      User.findOne({name: req.param('to')}).exec(function(err1, receiver) {
         User.findOne(req.session.users[socketId].id).exec(function(err, sender) {
          // Publish a message to that user's "room".  In our app, the only subscriber to that
          // room will be the socket that the user is on (subscription occurs in the onConnect
          // method of config/sockets.js), so only they will get this message.
             if (err1) {
                 return res.serverError(err1);
             } else if (err2) {
                return res.serverError(err2);
             }
              User.message(receiver.id, {
                   tag: true
                   from: sender,
                   roomId: req.param['roomId']
              });
         });
       });

};