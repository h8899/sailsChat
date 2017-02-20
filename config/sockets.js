/**
 * Socket Configuration
 *
 * These configuration options provide transparent access to Sails' encapsulated
 * pubsub/socket server for complete customizability.
 *
 * For more information on using Sails with Sockets, check out:
 * http://sailsjs.org/#documentation
 */

module.exports.sockets = {

  // This custom onDisconnect function will be run each time a socket disconnects
  afterDisconnect: function(session, socket, cb) {
    console.log("DISCONNECT SESSION", session);
      try {
        // Look up the user ID using the connected socket
        var userId = session.users[sails.sockets.id(socket)].id;
      } catch (e) {
        console.log("Error in onDisconnect: ", e);
        return cb();
      }

  }

};