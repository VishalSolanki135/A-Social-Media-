const passport = require("passport");
const mongoose = require("mongoose");
const User =  mongoose.model("User");
const Post = mongoose.model("Post");
const Comment = mongoose.model("Comment");
const Message = mongoose.model("Message");
const timeAgo = require("time-ago");
const Squad = mongoose.model("Squad");



const containsDuplicate = function(array) {
  array.sort();
  for(let i = 0; i < array.length; i++) {
    if(array[i] == array[i + 1]) {
      return true;
    }
  }
}

const addCommentDetails = function(posts) {
  return new Promise(function(resolve, reject){
    let promises = [];

    for(let post of posts) {
      for (let comment of post.comments) {
        let promise = new Promise(function(resolve, reject){
          User.findById(comment.commenter_id, "name profile_image", (err, user) => {
            comment.commenter_name = user.name;
            comment.commenter_profile_image = user.profile_image;
            resolve(comment);
          });
        });
        promises.push(promise);
      }
    }

    Promise.all(promises).then((val) => {
      resolve(posts);
    });

  });
}

const getRandom = function(min, max) {
  return Math.floor(Math.random() * (max - min) ) + min;
}

const addToPosts = function(array, user) {
  for(item of array) {
    item.name = user.name;
    item.ago = timeAgo.ago(item.date);
    item.ownerPofileImage= user.profile_image;
    item.ownerid = user._id;
  }
}

const alertUser = function(fromUser, toId, type, postContent) {
  return new Promise(function(resolve, reject) {

    let alert = {
      alert_type: type,
      from_id: fromUser._id,
      from_name: fromUser.name
    }

    if(postContent && postContent.length > 28) {
      postContent = postContent.substring(0, 28) + "...";
    }

    switch(type) {
      case "new_friend":
      alert.alert_text = `${alert.from_name} has accepted your friend request.`;
      break;
      case "liked_post":
      alert.alert_text = `${alert.from_name} has liked your post, '${ postContent }''.`;
      break;
      case "commented_post":
      alert.alert_text = `${alert.from_name} has commented on your post, '${ postContent }'.`;
      break;
      default: return reject("No valid type for alert");
    }

    User.findById(toId, (err, user) => {
      if(err) { reject("ERROR:", err); return res.json({ err: err }) }

      user.new_notifications++;
      user.notifications.splice(18);
      user.notifications.unshift(JSON.stringify(alert));
      user.save((err)=>{
        if(err) { reject("ERROR:", err); return res.json({ err: err }) }
        resolve();
      });

    });

  });
}

//controllers
const registerUser = function({body}, res){

  if(
    !body.first_name||
    !body.last_name||
    !body.email||
    !body.password||
    !body.password_confirm
  ){ return res.send({ message: "All Fields are required" }); }

  if(body.password !== body.password_confirm){
    return res.send({message: "Your Passwords do not match"});
  }

  const user = new User();

  user.name = body.first_name.trim() + " " + body.last_name.trim()
  user.email = body.email;
  user.setPassword(body.password);

  user.save((err, newUser) => {
    if(err) {
      if(err.errmsg && err.errmsg.includes('duplicate key error') && err.errmsg.includes('email')) {
        return res.json({ message: "The Provided email has already been registered." });
      }
      return res.json({ message: "Something Went Wrong!" });
    } else {
      const token = newUser.getJwt();
      res.status(201).json({token});
    }
  })
}

const loginUser = function(req, res, next){
  if(!req.body.email || !req.body.password){
    return res.status(400).json("All Fields are required");
  }

  passport.authenticate("local", (err, user, info)=>{
    if(err) { return res.status(404).json(err) }
    if(user){
      const token = user.getJwt();
      res.status(201).json({token});
    } else { res.json(info); }
  })(req,res,next);
}

const generateFeed = function({ payload }, res) {

  let posts = [];
  let maxPosts= 48;

  function addToPosts(array, user) {
    for(item of array) {
      item.name = user.name;
      item.ago = timeAgo.ago(item.date);
      item.ownerPofileImage= user.profile_image;
      item.ownerid = user._id;
    }
  }

  let myPosts = new Promise(function(resolve, reject) {
    User.findById(payload._id, "name posts profile_image friend",{lean: true}, (err, user)=> {
      if(err) { return res.statusJson(400 , { err: err }); }
      if(!user) { return res.statusJson(404, { message: "User does not exist." }); }
      addToPosts(user.posts, user);
      posts.push(...user.posts);
      resolve(user.friend);
    });
  });

  let myFriendsPosts = myPosts.then((friendsArray)=>{
    return new Promise(function(resolve, reject) {
      User.find({ '_id': { $in: friendsArray } }, "name profile_image posts", { lean: true }, (err, users)=>{
        if(err) { return res.json({ err: err }); }

        for(user of users){
          addToPosts(user.posts, user);
          posts.push(...user.posts);
        }
        resolve();
      });
    });
  });
  myFriendsPosts.then((friendsArray) => {
    posts.sort((a,b) => (a.date > b.date) ? -1 : 1);
    posts = posts.slice(0, maxPosts);

    addCommentDetails(posts).then((posts)=> {
      res.statusJson(200, { posts: posts });
    });
  });
}

const getSearchResults = function({query, payload}, res) {

  if(!query.query) { return res.json({err: "Missing a Query."}); }
  User.find({ name: { $regex: query.query, $options: "i" } }, "name friend profile_image friend_requests", (err, results)=> {
    if(err) { return res.json({ err: err }); }

    results = results.slice(0,20);

    for(let i=0; i<results.length; i++){
      if(results[i]._id == payload._id){
        results.splice(i, 1);
        break;
      }
    }

    return res.status(200).json({ message: "Getting Search Results", results: results });
  });

}

const makeFriendRequest = function({params}, res){

  User.findById(params.to, (err, user)=>{

    if(err) { return res.json({ err: err }); }

    if(containsDuplicate([params.from, ...user.friend_requests])) {;
      return res.json({ message: "Friend request has already been sent." });
    }

    user.friend_requests.push(params.from);
    user.save((err, user) => {
      if(err) { return res.json({ err: err }); }
      return res.statusJson(201, { message: "Successfully sent a friend request." });

    });

  });

}

const getUserData = function({params}, res) {
  User.findById(params.userid,"-salt, -password", { lean: true }, (err, user) =>{
    if(err) { return res.statusJson(400, {err: err}); }
    if(!user) { return res.statusJson(404, { message: "User does not exist." }); }

    function getRandomFriends(friendsList) {
      let copyOfFriendsList = Array.from(friendsList);
      let randomIds = [];

      for(let i = 0; i < 6; i++) {
        if(friendsList.length <= 6) { randomIds = copyOfFriendsList; break;  }

        let randomId = getRandom(0, copyOfFriendsList.length);
        randomIds.push(copyOfFriendsList[randomId]);
        copyOfFriendsList.splice(randomId, 1);
      }

      return new Promise(function(resolve, reject) {
        User.find({'_id': { $in: randomIds }}, "name profile_image", (err, friends) => {
          if(err) { return res.json({ err: err }); }
          resolve(friends);
        });
      });
    }

    function addMessengerDetails(messages) {
      return new Promise(function(resolve, reject) {
        if(!messages.length) { resolve(messages); }

        let usersArray = [];

        for(let message of messages) {
          usersArray.push(message.from_id);
        }

        User.find({'_id': { $in: usersArray }}, "name profile_image", (err, users) => {
          if(err) { return res.json({ err: err }); }
          for(message of messages) {
            for(let i=0; i < users.length; i++) {
              if(messages.from_id == users._id) {
                message.messengerName = users[i].name;
                message.messengerProfileImage = users[i].profile_image;
                users.splice(i, 1);
                break;
              }
            }
          }
          resolve(messages);
        });

      });
    }


    user.posts.sort((a,b) => (a.date > b.date) ? -1 : 1);

    addToPosts(user.posts, user);

    let randomfriends = getRandomFriends(user.friend);
    let commentDetails = addCommentDetails(user.posts);
    let messageDetails = addMessengerDetails(user.messages);

    let besties = new Promise(function(resolve, reject) {
      User.find({ '_id': { $in: user.besties }}, "name profile_image", (err, users) => {
        user.besties = users;
        resolve();
      });
    });
    let enemies = new Promise(function(resolve, reject) {
      User.find({ '_id': { $in: user.enemies }}, "name profile_image", (err, users) => {
        user.enemies = users;
        resolve();
      });
    });

    let waitFor =  [randomfriends, commentDetails, messageDetails, besties, enemies];

    Promise.all(waitFor).then((val)=>{
      user.random_friends = val[0];
      user.messages = val[2];
      res.statusJson(200, {user: user});
    });

  });

}

const getFriendRequests = function({query}, res) {

  let friendRequests = JSON.parse(query.friend_requests);

  User.find({ '_id':{ $in: friendRequests } }, "name profile_image", (err, users) =>{
    if(err) { return res.json({ err: err }); }

    return res.statusJson(200, { message: "Getting Friend Requests", users: users });
  });


}

const resolveFriendRequest = function({query, params}, res) {

  User.findById(params.to, (err, user) => {
    if(err) { return res.json({ err: err }); }

    for(let i=0; i < user.friend_requests.length; i++) {
      if(user.friend_requests[i] == params.from) {
        user.friend_requests.splice(i, 1);
        break;
      }
    }

    let promise = new Promise(function(resolve, reject) {
      if(query.resolution == "accept") {

        if(containsDuplicate([params.from, ...user.friend])) {
          return res.json({ message: "Duplicate Error" });
        }


        user.friend.push(params.from);

        User.findById(params.from, (err, user)=>{
          if(err) { return res.json({ err: err }); }
          if(containsDuplicate([params.to, ...user.friend])) {
            return res.json({ message: "Duplicate Error" });
          }

          user.friend.push(params.to);
          user.save((err, user) => {
            if(err) { return res.json({ err: err }); }
            resolve();
          });
        });

      } else {
        resolve();
      }
    });

    promise.then(() =>{
      user.save((err, user)=>{
        if(err) { return res.json({ err: err }); }
        alertUser(user, params.from, "new_friend").then(() => {
          res.statusJson(201, { message: "Resolved Friend Request.",});
        });
      });

    });

  });

}

const createPost = function({body, payload}, res) {

  if(!body.content || !body.theme) {
    return res.statusJson(400, { message: "Insufficient Data to send with the request" });
  }

  let userId = payload._id;

  const post = new Post();

  post.theme = body.theme;
  post.content = body.content;

  User.findById(userId, (err, user)=>{
    if(err) { return res.send({ err: err }); }

    let newPost = post.toObject();
    newPost.name = payload.name;
    newPost.ownerid = payload._id;
    newPost.ownerPofileImage = user.profile_image;
    user.posts.push(post);
    user.save((err) => {
      if(err) { return res.json({ err: err }); }
      return res.statusJson(201, { message: "Create Post", newPost: newPost});
    });
  });

}

const getAllUsers = function(req, res) {
  User.find((err, users) => {
    if(err) { return res.send({ err: err }); }
    return res.json({ users: users });
  });
}

const likeUnlike = function({ payload, params }, res) {

  User.findById(params.ownerid, (err, user)=>{
    if(err) { return  res.json({ err: err }); }

    const post = user.posts.id(params.postid);

    let promise = new Promise(function(resolve, reject){
      if(post.likes.includes(payload._id)) {
        post.likes.splice(post.likes.indexOf(payload._id), 1);
        resolve();
      } else {
        post.likes.push(payload._id);

        if(params.ownerid != payload._id) {
          User.findById(payload._id, (err, user) => {
            if(err) { reject("ERROR: ", err); return res.json({ err: err }); }
            alertUser(user, params.ownerid, "liked_post", post.content).then(()=>{
              resolve();
            });
          });
        } else {
          resolve();
        }

      }
    });

    promise.then(()=>{
      user.save((err, user) => {
        if(err) { return res.json({err: err}); }
        res.statusJson(201, { message: "Like or Unlike a Post." });
      });
    });
  });
}

const postCommentOnPost = function({ body, payload, params }, res) {

  User.findById(params.ownerid, (err, user) => {
    if(err) { return res.json({ err: err }); }

    const post = user.posts.id(params.postid);

    let comment = new Comment()
    comment.commenter_id = payload._id;
    comment.commenter_content = body.content;
    post.comments.push(comment);

    user.save((err, user) => {
      if(err) { return res.json({ err: err }); }

      User.findById(payload._id, "name profile_image", (err, user) => {
        if(err) { return res.json({ err: err }); }

        let promise = new Promise(function(resolve, reject) {

          if(payload._id != params.ownerid) {
            alertUser(user, params.ownerid, "commented_post", post.content).then(()=>{
              resolve();
            });
          } else {
            resolve();
          }
        });

        promise.then(()=>{
          res.statusJson(201, {
            message: "POSTED COMMENT",
            comment: comment,
            commenter: user
          });
        });

      });

    });
  });
}

const sendMessage = function({ body, payload, params }, res){

  console.log(params);
  console.log("++++++++++++++++");
  console.log(payload);

  let from = payload._id;
  let to = params.to;

  let fromPromise = new Promise(function(resolve, reject) {
    User.findById(from, "messages", (err, user)=> {
      if(err) { reject("ERROR", err); return res.json({ err: err }); }
      from = user;
      resolve(user);
    });
  });

  let toPromise = new Promise(function(resolve, reject) {
    User.findById(to, "messages new_message_notifications", (err, user)=> {
      if(err) { reject("ERROR", err); return res.json({ err: err }); }
      to = user;
      resolve(user);
    });
  });

  let sendMessagePromise = Promise.all([fromPromise, toPromise]).then(()=>{

    //instead of creating new message component it just push it to content of exisitng component.

    function hasMessageFrom(messages, id) {
      for(let message of messages) {
        if(message.from_id == id) {
          return message;
        }
      }
    }

    //it will actually sends a message to another user!
    function sendMessageTo(to, from, notify = false) {
      return new Promise(function(resolve, reject) {
        // if (to send a message to a user u already have sent a message!) else(to a new user new message)

        if(notify && !to.new_message_notifications.includes(from._id)) {
          to.new_message_notifications.push(from._id);
        }

        if(foundMessage = hasMessageFrom(to.messages, from._id)) {
          foundMessage.content.push(message);
          to.save((err, user)=>{
            if(err) { reject("ERROR", err); return res.json({ err: err }); }
            resolve();
          });
        } else {
          let newMessage = new Message();
          newMessage.from_id = from._id;
          newMessage.content = [message];

          to.messages.push(newMessage);
          to.save((err, user)=>{
            if(err, user) { reject("ERROR", err); return res.json({ err: err }); }
            resolve(user);
          })
        }
      });
    }


    let message = {
      messenger: from._id,
      message: body.content
    }

    let sendMessageToRecipient = sendMessageTo(to, from, true);
    let sendMessageToAuthor = sendMessageTo(from, to);


    return new Promise(function(resolve, reject){
      Promise.all([sendMessageToRecipient, sendMessageToAuthor]).then(()=>{
        resolve();
      });
    });

  });
  sendMessagePromise.then(()=>{
    return res.statusJson(201, { message: "Sending Message" });
  });

}

const deleteMessages = function({ payload, params }, res){

  User.findById(payload._id, (err, user)=>{
    if(err) { return res.json({ err: err }); }
    const message = user.messages.id(params.messageid).remove();

    user.save((err) => {
      if(err) { return res.json({ err: err }); }
      return res.statusJson(201, { message: "Deleted Messages" });
    });
  });
}

const bestieEnemyToggle = function({ payload, params, query }, res) {
  let toggle = query.toggle;
  if(toggle != "besties" && toggle != "enemies") {
    return res.json({ message: "Incorrect query supplied" });
  }

  let myId = payload._id;
  let friendId = params.userid;

  User.findById(myId, (err, user) => {
    if(err) { return res.json({ err: err }); }
    if(!user.friend.includes(friendId)) {
      return res.json({ message: "You are not friends with this user." });
    }

    let arr = user[toggle];


    if(arr.includes(friendId)) {
      arr.splice(arr.indexOf(friendId), 1);
    } else {
      if(toggle == "besties" && user.besties.length >= 2) {
        return res.json({ message: "You have the max amount of besties." });
      }
      arr.push(friendId);
    }

    user.save((err) => {
      if(err) { return res.json({ err: err }); }
      return res.statusJson(201, { message: "Bestie/Enemy Toggle" });
    });
  });
}


const createSquad = function({body, params}, res) {



    let squad = {
        squad: body.squad,
        speciality: body.speciality
    }
    console.log("*******");
    console.log(squad);

    Squad.create(squad, (err, newSquad) => {
        if(err) { return res.json({ err: err }); }
        Squad.find({}, null, {lean: true}, (err, squads) => {
            if(err) { return res.json({ err: err }); }
            return res.statusJson(201, { message: "All Squads", squads: squads });
        });
    });


}


const generateSquadFeed = function(req, res) {
    let squads = [];

    let allSquads = new Promise(function(resolve, reject) {
        Squad.find({}, null, {lean: true}, (err, newSquad) => {
            squads.push(newSquad);
            resolve(squads);
        });
    });

    allSquads.then((squads) => {
        return res.statusJson(201, { message: "Generate Feed", squads :squads});
    })
    console.log("***********");
    console.log(squads);
}








const resetMessageNotifications = function({payload}, res) {
  User.findById(payload._id,(err, user) => {
    if(err) { return res.json({ err: err }); }

    user.new_message_notifications = [];
    user.save((err)=>{
      if(err) { return res.json({ err: err }); }
      return res.statusJson(201, { message: "Reset message notifications" });
    });

  });
}

const resetAlertNotifications = function({ payload }, res) {

  User.findById(payload._id, (err, user)=>{
    if(err) { return res.json({ err: err }); }
    user.new_notifications = 0;
    user.save((err)=>{
      if(err) { return res.json({ err: err }); }
      return res.statusJson(201, { message: "Reset Alert Notifications" });
    });
  });
}

const deleteAllUsers = function(req, res) {
  User.deleteMany({}, (err, info) => {
    if(err) { return res.send({ error: err }); }
    return res.json({ message: "Deleted All Users", info: info });
  });
}


module.exports = {
  deleteAllUsers,
  getAllUsers,
  registerUser,
  loginUser,
  generateFeed,
  getSearchResults,
  makeFriendRequest,
  getUserData,
  getFriendRequests,
  resolveFriendRequest,
  createPost,
  likeUnlike,
  postCommentOnPost,
  sendMessage,
  resetMessageNotifications,
  deleteMessages,
  bestieEnemyToggle,
  resetAlertNotifications,
  createSquad,
  generateSquadFeed
}
