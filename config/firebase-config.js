// config/firebase-config.js
const firebaseConfig = {
  apiKey: "AIzaSyCRsjqkdRf8BrDYUZsn_PUzL1a0sL3w2y8",
  authDomain: "beautystore-bdcf1.firebaseapp.com",
  projectId: "beautystore-bdcf1",
  storageBucket: "beautystore-bdcf1.firebasestorage.app",
  messagingSenderId: "940337260278",
  appId: "1:940337260278:web:48aa9ebe025a66b05b2ed7",
  measurementId: "G-04PBRXCWQP"
};

// Inicialização do Firebase
if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}

const db = firebase.firestore();
const auth = firebase.auth();

// Exportar para uso global
window.firebaseApp = { db, auth };