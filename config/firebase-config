// config/firebase-config.js
const firebaseConfig = {
    apiKey: "AIzaSyBq2B8Z6L5M3t7v8w9x0y1z2a3b4c5d6e7f8g",
    authDomain: "beautystore-12345.firebaseapp.com",
    projectId: "beautystore-12345",
    storageBucket: "beautystore-12345.appspot.com",
    messagingSenderId: "123456789012",
    appId: "1:123456789012:web:abcdef1234567890abcdef"
};

// Inicialização do Firebase
if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}

const db = firebase.firestore();
const auth = firebase.auth();

// Exportar para uso global
window.firebaseApp = { db, auth };
