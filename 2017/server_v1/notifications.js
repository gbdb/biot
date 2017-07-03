var serviceAccount = require("./jardiniot-firebase-adminsdk-p1ya9-cf6f3bf45b.json");
var admin = require("firebase-admin");
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: "https://jardiniot.firebaseio.com"
});

var notification = function() {};

notification.prototype.send = function(message) {
  var payload = {
    data: {
      message: message
    }
  };

admin.messaging().sendToTopic("events", payload)
  .then(function(response) {
    // See the MessagingTopicResponse reference documentation for the
    // contents of response.
    console.log("Successfully sent message:", response);
    })
  .catch(function(error) {
    console.log("Error sending message:", error);
  });
}

module.exports = new notification();