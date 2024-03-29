require('dotenv').config()
const express = require("express");
const bodyParser = require("body-parser");
const ejs = require("ejs");
const mongoose = require('mongoose');
const session = require("express-session");
const passport = require("passport");
const passportLocalMongoose = require("passport-local-mongoose");
// const { use } = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const findOrCreate = require('mongoose-findorcreate');

const app = express();

app.set('view engine', 'ejs');

app.use(bodyParser.urlencoded({extended: true}));
app.use(express.static("public"));

app.use(session({
    secret: "PiddoLotti",
    resave: false,
    saveUninitialized:false
}));

app.use(passport.initialize())
app.use(passport.session())



mongoose.connect("mongodb://localhost:27017/userDB",{useNewUrlParser: true, useUnifiedTopology: true});
mongoose.set('useNewUrlParser', true);
mongoose.set('useFindAndModify', false);
mongoose.set('useCreateIndex', true);

const userSchema = new mongoose.Schema({
    email: String,
    password: String,
    googleId: String,
    secret: String
});

userSchema.plugin(passportLocalMongoose);
userSchema.plugin(findOrCreate);

const User = mongoose.model("User",userSchema);

passport.use(User.createStrategy());

passport.serializeUser(function(user, done) {
    done(null, user.id);
  });
  
passport.deserializeUser(function(id, done) {
    User.findById(id, function(err, user) {
      done(err, user);
    });
  });

passport.use(new GoogleStrategy({
    clientID: process.env.CLIENT_ID,
    clientSecret: process.env.CLIENT_SECRET,
    callbackURL: "http://localhost:3000/auth/google/secrets"
  },
  function(accessToken, refreshToken, profile, cb) {
      console.log(profile);
    User.findOrCreate({ googleId: profile.id }, function (err, user) {
      return cb(err, user);
    });
  }
));

app.get("/",function(req,res){

    res.render("home")

})

app.get('/auth/google',

   passport.authenticate('google', { scope: ['profile'] })

);

app.get('/auth/google/secrets', 
  passport.authenticate('google', { failureRedirect: '/login' }),
  function(req, res) {
    // Successful authentication, redirect home.
    res.redirect('/secrets');
  });

app.get("/login",function(req,res){

    res.render("login")

});

///////////////////////////// SUBMIT ////////////////////////////////

app.route("/submit")

.get((req,res)=>{
    if(req.isAuthenticated()){
        res.render("submit");
    }else{
        res.redirect("/")
    }
})

.post((req,res)=>{
    const submittedSecret = req.body.secret

    User.findById(req.user.id, function(err,foundUser){

        if(err){
            console.log(err);
        }else{
            if(foundUser){
                foundUser.secret = submittedSecret
                foundUser.save(()=>{
                    res.redirect("/secrets")
                })
            }
        }


    })
});

app.get("/secrets", function(req,res){

    User.find({secret: {$ne:null}}, (err,foundUsers)=>{
       if(err){
           console.log(err);
       }else{
           res.render("secrets", {usersSecret: foundUsers})
       }
    })

})

app.get("/logout", (req,res)=>{
    req.logout()
    res.redirect("/")
})

app.route("/register")

.get(function(req,res){

    res.render("register")

})

.post(function(req,res){
  
    User.register({username: req.body.username}, req.body.password, function(err, regUser){
        if(err){
            console.log(err);
        }else{
            passport.authenticate("local")(req, res, ()=>{
                res.redirect("/secrets");
            })
        }

    })
 
});


app.post("/login",function(req,res){
 
    const user = new User({
        username: req.body.username,
        password: req.body.password
    })

    req.login(user, function(err){
        if(err){
            res.render(err)
        }else{
            passport.authenticate("local")(req, res, ()=>{
                res.redirect("/secrets");
            })
        }
    })

})

app.listen(3000, function() {
    console.log("Server started on port 3000");
  });