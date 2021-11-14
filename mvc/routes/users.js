const express = require('express');
const router = express.Router();
const middleware = require('./middleware/middleware');

const usersCtrl = require('../controllers/users');
const fakeUsersCtrl = require('../controllers/fake-users');

//Logging in & registering
router.post("/register", usersCtrl.registerUser);
router.post("/login", usersCtrl.loginUser);


//Get Requests
router.get("/generate-feed", middleware.authorize,usersCtrl.generateFeed);
router.get("/get-search-results", middleware.authorize,usersCtrl.getSearchResults);
router.get("/get-user-data/:userid", middleware.authorize,usersCtrl.getUserData);
router.get("/generate-squad-feed", middleware.authorize, usersCtrl.generateSquadFeed);

//Routes Handling friend requests
router.get("/get-friend-requests",middleware.authorize, usersCtrl.getFriendRequests);
router.post("/make-friend-request/:from/:to", middleware.authorize,usersCtrl.makeFriendRequest);
router.post("/resolve-friend-request/:from/:to", middleware.authorize,usersCtrl.resolveFriendRequest);

//Routes Handling posts
router.post("/create-post", middleware.authorize, usersCtrl.createPost);
router.post("/like-unlike/:ownerid/:postid", middleware.authorize, usersCtrl.likeUnlike);
router.post("/post-comment/:ownerid/:postid", middleware.authorize, usersCtrl.postCommentOnPost);

//Routes Handling Messages
router.post("/send-message/:to", middleware.authorize, usersCtrl.sendMessage);
router.post("/reset-message-notifications",middleware.authorize, usersCtrl.resetMessageNotifications);
router.post("/delete-messages/:messageid",middleware.authorize, usersCtrl.deleteMessages);


//Misc Routes
router.post("/bestie-enemy-toggle/:userid", middleware.authorize, usersCtrl.bestieEnemyToggle);
router.post("/reset-alert-notifications", middleware.authorize, usersCtrl.resetAlertNotifications);

//SQUAD

router.post("/create-squad", middleware.authorize, usersCtrl.createSquad);

//Development and Testing!

router.get("/all", usersCtrl.getAllUsers);
router.post("/create-fake-users", fakeUsersCtrl.createFakeUsers);
router.delete("/all",usersCtrl.deleteAllUsers);



module.exports = router;
