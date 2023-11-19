const express = require("express");
const app = express();

const bodyParser = require("body-parser");
app.use(bodyParser.urlencoded({ extended: true }));

var fs = require("fs");
const os = require("os-utils");
const { exec } = require("child_process");

// db 연결
const MongoClient = require("mongodb").MongoClient;
var db;
MongoClient.connect(
  "mongodb+srv://admin:qwer1234@cluster0.ecwllpn.mongodb.net/?retryWrites=true&w=majority",
  function (error, client) {
    if (error) return console.log(error);
    db = client.db("online-compiler");
    app.use(express.static(__dirname));
    app.listen(8080, () => console.log("listening on 8080"));
  }
);

//문법페이지
app.get("/grammer", (req, res) => {
  res.sendFile(__dirname + "/grammer.html");
});

app.get("/grammer/:id", function (req, res) {
  db.collection("grammer").findOne(
    { _id: parseInt(req.params.id) },
    function (error, result) {
      console.log(result);
      res.render("grammer.ejs", { data: result });
    }
  );
});

// 로그인
app.get("/login", (req, res) => {
  res.sendFile(__dirname + "/login.html");
});

const passport = require("passport");
const LocalStrategy = require("passport-local").Strategy;
const session = require("express-session");

app.use(
  session({ secret: "비밀코드", resave: true, saveUninitialized: false })
);
app.use(passport.initialize());
app.use(passport.session());

app.post(
  "/login",
  passport.authenticate("local", {
    failureRedirect: "/fail",
  }),
  (req, res) => {
    //console.log(Object.values(req.body)[0]); //id
    //console.log(Object.values(req.body)[1]); //pw
    const responseData = { redirectTo: "/editor" };
    res.json(responseData);
  }
);

passport.use(
  new LocalStrategy(
    {
      usernameField: "id",
      passwordField: "pw",
      session: true,
      passReqToCallback: false,
    },
    function (입력한아이디, 입력한비번, done) {
      console.log(입력한아이디, 입력한비번);
      db.collection("login").findOne(
        { id: 입력한아이디 },
        function (에러, 결과) {
          if (에러) return done(에러);

          if (!결과)
            return done(null, false, {
              message: "존재하지 않는 아이디입니다.",
            });
          if (입력한비번 == 결과.pw) {
            return done(null, 결과);
          } else {
            return done(null, false, { message: "잘못된 비밀번호입니다." });
          }
        }
      );
    }
  )
);
passport.serializeUser(function (user, done) {
  done(null, user.id);
});
passport.deserializeUser(function (아이디, done) {
  db.collection("login").findOne({ id: 아이디 }, function (error, result) {
    done(null, result);
  });
});

//로그아웃
app.post("/logout", (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.log("세션 삭제시에 에러가 발생했습니다.");
      return;
    }
    console.log("세션이 삭제됐습니다.");
  });

  const responseData = { redirectTo: "/login" };
  res.json(responseData);
});

//회원가입
app.get("/register", (req, res) => {
  res.sendFile(__dirname + "/register.html");
});

app.post("/register", isValid, (req, res) => {
  // isValid: 아이디 유효한지랑 비밀번호 체크하는 함수. 성공했으면 회원가입 하기
  //console.log(Object.values(req.body)[0]); //id
  //console.log(Object.values(req.body)[1]); //pw
  //console.log(Object.values(req.body)[2]); //pw_ck

  // 아이디와 비번을 디비에 저장해주자
  db.collection("login").insertOne(
    { id: Object.values(req.body)[0], pw: Object.values(req.body)[1] },
    function (error, res) {
      if (error) console.log(error);
      console.log("저장완료");
    }
  );

  const responseData = { result: "success", redirectTo: "/login" };
  res.json(responseData);
});

async function isValid(req, res, next) {
  if (await existId(Object.values(req.body)[0])) {
    //디비에 아이디가 이미 있다
    const responseData = {
      result: "fail",
      error: "아이디 중복",
    };
    res.json(responseData);
  } else if (Object.values(req.body)[1] !== Object.values(req.body)[2]) {
    // 비번 틀림
    const responseData = {
      result: "fail",
      error: "비밀번호와 비밀번호 확인 문자가 서로 다름",
    };
    res.json(responseData);
  }
  next();
}

async function existId(입력한아이디) {
  const exist = await db.collection("login").findOne({ id: 입력한아이디 });
  if (exist === null) {
    return false;
  } else {
    return true;
  }
}

//소스코드 저장
app.post("/save", (req, res) => {
  // console.log(Object.values(req.body)[0]); //source

  // 소스코드를 현재 로그인중인 사람의 디비에 함께 저장하자
  db.collection("login").update(req.user, {
    $set: { source: Object.values(req.body)[0] },
  });

  const responseData = { message: "소스코드 저장 완료!" };
  res.json(responseData);
});

//소스코드 불러오기
app.post("/getSource", (req, res) => {
  if (req.user.source === undefined) {
    const responseData = { status: "not_exist" };
    res.json(responseData);
  } else {
    const responseData = { status: "exist", source: req.user.source };
    res.json(responseData);
  }
});

//에디터
app.get("/editor", isLogined, (req, res) => {
  // 로그인 되어있으면
  res.sendFile(__dirname + "/editor.html");
});

function isLogined(req, res, next) {
  if (req.user) {
    //console.log(req.user);
    next();
  } else {
    //console.log(req.user);
    res.sendFile(__dirname + "/login.html");
  }
}

// 소스코드 실행
app.post("/run", (req, res) => {
  console.log(req.body);
  console.log(Object.values(req.body)[0]); //source
  console.log(Object.values(req.body)[1]); //input
  console.log("===========================");

  fs.writeFile("main.txt", Object.values(req.body)[0], function (err) {
    if (err) throw err;
    console.log("source saved!");
  });
  fs.writeFile("input.txt", Object.values(req.body)[1], function (err) {
    if (err) throw err;
    console.log("input saved!");
  });

  const pythonCommand = `./tolelom`;
  let pythonErrorCommand = `${pythonCommand}`; //`${pythonCommand} 2> error.txt`;

  if (Object.values(req.body)[1].trim()) {
    pythonErrorCommand = `${pythonCommand} < input.txt`; //`${pythonCommand} < input.txt 2> error.txt`
  }

  const startTime = new Date();
  exec(pythonErrorCommand, (error, stdout, stderr) => {
    const endTime = new Date();
    const executionTime = (endTime - startTime) / 1000;

    /*
    let errorData = "";
    if (error) {
      console.error(`exec error: ${error}`);
      errorData = fs.readFileSync("error.txt", "utf-8");
      console.error(`stderr: ${errorData}`);
    }
    if (stderr) {
      console.log(`stderr: ${stderr}`);
    }*/

    const memoryUsage = (os.freememPercentage() * os.totalmem()) / 1024;
    os.cpuUsage((cpuUsage) => {
      console.log(`Execution Time: ${executionTime} seconds`);
      console.log(`Estimated Memory Usage: ${memoryUsage.toFixed(2)} KB`);
    });

    res.send(
      JSON.stringify(
        `${stdout}\n\nExecution Time: ${executionTime} seconds\nEstimated Memory Usage: ${memoryUsage.toFixed(
          2
        )} KB`
      )
    );

    //파일 삭제
    fs.unlinkSync("main.txt");
    fs.unlinkSync("input.txt");
    //fs.unlinkSync("error.txt");
  });
});
