const express = require('express');
const session = require('express-session');
const cors = require('cors');
const CryptoJS = require('crypto-js');
const AWS = require('aws-sdk');
const AmazonCognitoIdentity = require('amazon-cognito-identity-js');
const { error } = require('console');
const axios = require('axios');

const app = express();
const port = 8080;

// AWS SDK 설정 및 Cognito 클라이언트 초기화
const cognito = new AWS.CognitoIdentityServiceProvider({ region: 'ap-northeast-2' });

const poolData = {
  UserPoolId: 'ap-northeast-2_SgQNIUSGh',
  ClientId: '37nderka9cgrsim05ns4c5vrb2',
};

app.use(express.json());
app.use(cors());
app.use(session({
  secret: 'a09cda6e3b9c4e5a3f91be8d07df1347',
  resave: false,
  saveUninitialized: true,
  cookie: {
    secure: false,
    maxAge: 600000,
  },
}));

app.post('/api/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.error('세션 삭제 오류:', err);
      res.status(500).send({ error: '로그아웃 실패' });
    } else {
      console.log('로그아웃 성공');
      res.sendStatus(200);
    }
  });
});

app.post('/api/login', (req, res) => {
  const key = CryptoJS.enc.Hex.parse('0123456789abcdef0123456789abcdef');
  const iv = CryptoJS.enc.Hex.parse('abcdef9876543210abcdef9876543210');
  const { id, password } = req.body;
  const ciphertext = CryptoJS.enc.Base64.parse(password);

  const decrypted = CryptoJS.AES.decrypt({ ciphertext: ciphertext }, key, { iv: iv });
  const decryptedPassword = decrypted.toString(CryptoJS.enc.Utf8);

  const authenticationData = {
    Username: id,
    Password: decryptedPassword,
  };

  const authenticationDetails = new AmazonCognitoIdentity.AuthenticationDetails(authenticationData);

  const userData = {
    Username: id,
    Pool: new AmazonCognitoIdentity.CognitoUserPool(poolData),
  };

  const cognitoUser = new AmazonCognitoIdentity.CognitoUser(userData);

  cognitoUser.authenticateUser(authenticationDetails, {
    onSuccess: (session) => {
      req.session.user = userData;
      res.send(id);
    },
    onFailure: (err) => {
      console.error('로그인 실패:', err);
      res.status(401).send({ error: error.message });
    },
  });
});

app.post('/api/users', (req, res) => {
  const key = CryptoJS.enc.Hex.parse('0123456789abcdef0123456789abcdef');
  const iv = CryptoJS.enc.Hex.parse('abcdef9876543210abcdef9876543210');
  const data = req.body;
  const userId = data.id;
  const phoneNumber = '+82' + data.phoneNumber;
  const ciphertext = CryptoJS.enc.Base64.parse(data.password);

  const decrypted = CryptoJS.AES.decrypt({ ciphertext: ciphertext }, key, { iv: iv });
  const password = decrypted.toString(CryptoJS.enc.Utf8);

  // Cognito 회원가입 요청
  const params = {
    ClientId: poolData.ClientId, // ClientId 사용
    Username: userId,
    Password: password,
    UserAttributes: [
      {
        Name: 'phone_number',
        Value: phoneNumber,
      },
    ],
  };

  cognito.signUp(params, (err, data) => {
    if (err) {
      console.log('회원가입 실패:', err);
      res.status(500).json({ error: '회원가입 실패' });
    } else {
      console.log('회원가입 성공:', data);
      res.status(200).send(userId);
    }
  });
});

app.post('/api/vertify', (req, res) => {
  const data = req.body;
  const userId = data.id;
  const vertifyCode = data.vertifyCode; // 사용자가 입력한 인증 코드

  // 사용자 이름과 인증 코드를 사용하여 인증 검증을 수행
  const params = {
    ClientId: poolData.ClientId, // ClientId 사용
    Username: userId,
    ConfirmationCode: vertifyCode,
  };

  cognito.confirmSignUp(params, (err, data) => {
    if (err) {
      console.log('Error:', err);
      res.status(500).json({ error: '인증 실패' });
    } else {
      console.log('Success:', data);
      res.status(200).send('인증 성공');
    }
  });
});

app.post('/api/info', async (req, res) => {
  try {
    const response = await axios.post('https://x3trmla1ka.execute-api.ap-northeast-2.amazonaws.com/api/info');
    res.json(response.data);
  } catch (error) {
    console.error('데이터를 가져오는 중 오류 발생:', error);
    res.status(500).json({ error: '데이터를 가져오는 중 오류 발생' });
  }
});

app.listen(port, function () {
  console.log(`${port} 포트에서 대기 중`);
});
