const express= require('express');
const bodyParser=require('body-parser');
const ejs=require('ejs');
const bcrypt = require('bcrypt');
const session=require('express-session');
const mongoose=require('mongoose');
const MongoStore=require('connect-mongo');
const passport=require('passport');
const isAuth=require("./auth").isAuth;
const QRCode=require('qrcode');
var multer  = require('multer')
const Local=require('passport-local').Strategy;
var path = require('path')

const app=express();


// const customFields={
//     usernameField:'uname',
//     passwordFiels:'pw',
// }



const verifyCallBack = (username,password,done) =>{
    
    User.findOne({ username: username }, function (err, user) {
      
        if (err) { return done(err); }
        if (!user) {
            
          return done(null, false, { message: 'Incorrect username.' });
        }
        
        
        
        if (!user.validPassword(password,user.Password)) {
          
          return done(null, false, { message: 'Incorrect password.' });
        }
        
        return done(null, user);
      });

}




const stratergy = new Local(verifyCallBack);

passport.use(stratergy);

passport.serializeUser(function(user, done) {
    done(null, user.id);
  });
  
  passport.deserializeUser(function(id, done) {
    User.findById(id, function(err, user) {
      done(err, user);
    });
  });




mongoose.connect('mongodb://localhost:27017/guneet',{useNewUrlParser: true, useUnifiedTopology: true})
const saltRounds = 10;


app.set('view engine','ejs');


const UserSchema = new mongoose.Schema({
    Photo:String,
    FirstName: String,
    LastName: String,
    username:String,
    email:String,
    Phone:Number,
    Password:String,
});
var res = false;

UserSchema.methods.validPassword = function(pwd,hash ) {
  
  var validPass=bcrypt.compareSync(pwd, hash);
  return validPass;
  
  
};


var Storage = multer.diskStorage({
  destination: "./public/uploads/",
  filename: function (req, file, cb) {
    cb(null, file.fieldname + '-' + Date.now()+ path.extname(file.originalname))
  }
})
 
var upload = multer({ 
  storage: Storage 
}).single('profile_photo');


const User = mongoose.model('user', UserSchema);




app.use(bodyParser.urlencoded({ extended: false }))
// parse application/json
app.use(bodyParser.json())

app.use(express.static('public'))

app.use(session({
    secret: 'keyboard cat',
    resave: false,
    saveUninitialized: true,
    store: MongoStore.create({ mongoUrl: 'mongodb://localhost:27017/guneet' }),
    cookie: { maxAge: 1000 * 60 * 60 * 24  }
  }));



  app.use(passport.initialize());
  app.use(passport.session());
 

app.get("/",(req,res,next)=>{
  res.redirect("/home")
})

app.get("/Home",(req,res,next)=>{
  res.render("home")
})

app.get("/change-password",isAuth,(req,res,next)=>{
  res.render("change-pass",{photo : req.user.Photo,mess: "" })
})

app.post("/change-password",(req,res,next) =>{
  bcrypt.compare(req.body.op, req.user.Password , function(err, result) {
    
    if(result){
      
      const update =  req.body.np ;
      bcrypt.hash(update, saltRounds, function(err, hash) {
        // Store hash in your password DB.
        User.updateOne({username:req.user.username},{
          Password:hash
        }, function (err, docs) {
          if (err){
              console.log(err)
          }
          else{
              console.log("Updated Docs : ", docs);
          }
      })
    });
      

      
      res.render("change-pass",{photo : req.user.Photo,mess: "Password Successfully changed" })
    }else{
      res.render("change-pass",{photo : req.user.Photo,mess: "Wrong Password" })
    }
});
})

app.get("/dashboard/Error404",(req,res,next) =>{
  res.render("404",{photo : req.user.Photo })
})

app.get("/Signin",(req,res,next)=>{
    
    req.session;
    res.render('signin')
})


// Changes required bcrypt compare ko alag karo 

app.post("/Signin",passport.authenticate('local',{ successRedirect: '/dashboard',failureRedirect: '/denied' }));

app.get("/SignUp",(req,res,next)=>{
    res.render('signup');
});
app.get("/success",isAuth,(req,res,next)=>{
    res.render('success')
})

app.get("/dashboard",isAuth,(req,res,next) =>{

  
  res.render('dash',{photo : req.user.Photo })
});

app.get("/dashboard/splitbill",isAuth,(req,res,next)=>{
  res.render("split",{photo : req.user.Photo })
});

app.get("/qrcode",isAuth,(req,res,next) =>{
  res.render('qr')

});

app.get("/dashboard/splitbill/qr-code",isAuth,(req,res,next) =>{
  QRCode.toDataURL(`id:${req.user._id}`, function (err, url) {
    res.render('qr',{cod :url,photo : req.user.Photo});

  })
})

app.get("/dashboard/add-friend",isAuth,(req,res,next)=>{
  res.render('add-friend',{photo : req.user.Photo })
})

app.get("/dashboard/profile",isAuth,(req,res,next)=>{
  res.render("profile",{photo : req.user.Photo })
})
app.get("/dashboard/edit-profile",isAuth,(req,res,next) =>{
  res.render("edit-profile",{photo : req.user.Photo })
})
app.get("/dashboard/all-friend",isAuth,(req,res,next)=>{
  res.render('all-friends',{photo : req.user.Photo})
})

app.get("/contact",isAuth,(req,res,next) =>{
  res.render("contact",{photo : req.user.Photo})
})

app.post("/contact",(req,res,next) =>{
  res.redirect("/dashboard")
})
app.get("/dashboard/friend-list",isAuth,(req,res,next)=>{
  res.render('add-friend',{photo : req.user.Photo })
})

app.get('/error',(req,res,next) =>{
  res.render('error')
})

app.get("/denied",(req,res,next)=>{
    res.render("denied");
    
})
app.get("/logout",(req,res,next) =>{
  req.logOut();
  res.redirect("/")
})

app.post("/Signup",upload,(req,res,next)=>{
    var info=req.body;
    bcrypt.hash(info.pass, saltRounds, function(err, hash) {
        // Store hash in your password DB.
        const data=new User({
            
            FirstName:info.fn,
            LastName:info.ln,
            username:info.us,
            email:info.email,
            Phone:info.pn,
            Password:hash,
            Photo:req.file.filename
            
        });

        data.save().then(() => console.log('Data Saved in Database'));
        

    });
    
    
    res.redirect("/Signin")
    
});

app.listen("3000",()=>{
    console.log("Server is working");
})