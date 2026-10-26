/* Connects the page's shared lists to Firebase Firestore (used only for the --firebase build).
   It stands in for Claude's built-in storage: everyone who opens the page can read, add, edit,
   remove, and lock or unlock. */
(function () {
  var cfg = window.__FIREBASE_CONFIG__;
  if (!cfg || window.claude || !window.firebase || !firebase.firestore) return;   // no config or SDK blocked: the page shows its offline messages
  firebase.initializeApp(cfg);
  var db = firebase.firestore();
  var uid;
  try {
    uid = localStorage.getItem('malot-uid');
    if (!uid) { uid = 'u' + Math.random().toString(36).slice(2) + Date.now().toString(36); localStorage.setItem('malot-uid', uid); }
  } catch (e) { uid = 'u' + Math.random().toString(36).slice(2); }
  var yes = function () { return Promise.resolve(true); };
  var user = {id: function () { return Promise.resolve(uid); }, canEdit: yes, can: yes};
  window.claude = {use: function (k) { return Promise.resolve(k === 'db' ? db : k === 'user' ? user : null); }};
})();
